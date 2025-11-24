import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const CONCURRENT_REQUESTS = process.env.CONCURRENT_REQUESTS ? parseInt(process.env.CONCURRENT_REQUESTS) : 50;
const BATCH_DELAY = process.env.BATCH_DELAY ? parseInt(process.env.BATCH_DELAY) : 500;
const MAX_RETRIES = 3;
const CHECKPOINT_INTERVAL = 1000;
const CHECKPOINT_FILE = 'embedding_checkpoint.json';

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function loadCheckpoint() {
    try {
        if (fs.existsSync(CHECKPOINT_FILE)) {
            const data = fs.readFileSync(CHECKPOINT_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.log('No checkpoint found, starting fresh');
    }
    return { embeddings: [], lastIndex: 0 };
}

function saveCheckpoint(embeddings, lastIndex) {
    fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify({
        embeddings,
        lastIndex,
        timestamp: new Date().toISOString()
    }));
}

export async function generateEmbedding(text, retryCount = 0) {
    const model = genAI.getGenerativeModel({
        model: process.env.EMBEDDING_MODEL || 'text-embedding-004'
    });

    try {
        const result = await model.embedContent(text);
        return result.embedding.values;
    } catch (error) {
        if (retryCount < MAX_RETRIES) {
            const isRateLimit = error.message?.includes('429') ||
                error.message?.includes('quota') ||
                error.message?.includes('RESOURCE_EXHAUSTED') ||
                error.message?.includes('rate limit');

            if (isRateLimit) {
                const backoffDelay = 2000 * Math.pow(2, retryCount);
                await sleep(backoffDelay);
                return generateEmbedding(text, retryCount + 1);
            }
        }
        throw error;
    }
}

export async function batchGenerateEmbeddings(texts, onProgress) {
    const checkpoint = loadCheckpoint();
    const embeddings = checkpoint.embeddings || [];
    const startIndex = checkpoint.lastIndex || 0;

    if (startIndex > 0) {
        console.log(`\n📂 Resuming from checkpoint: ${startIndex}/${texts.length} items completed`);
    }

    const failed = [];
    const remaining = texts.slice(startIndex);

    console.log(`\n📊 Processing ${remaining.length} items (${texts.length} total)`);
    console.log(`⚡ Concurrent requests: ${CONCURRENT_REQUESTS}`);
    const avgLatencyPerBatch = 1000; // Conservative estimate (1 sec per batch processing)
    const totalBatches = Math.ceil(remaining.length / CONCURRENT_REQUESTS);
    const estimatedMs = totalBatches * (avgLatencyPerBatch + BATCH_DELAY);
    const estimatedMinutes = Math.ceil(estimatedMs / 60000);

    console.log(`⏱️  Estimated time: ~${estimatedMinutes} minutes (accounting for API latency)\n`);

    for (let i = 0; i < remaining.length; i += CONCURRENT_REQUESTS) {
        const batch = remaining.slice(i, i + CONCURRENT_REQUESTS);
        const globalStartIndex = startIndex + i;

        const results = await Promise.allSettled(
            batch.map(async (text, localIdx) => {
                const globalIdx = globalStartIndex + localIdx;
                try {
                    const embedding = await generateEmbedding(text);
                    return { text, embedding, index: globalIdx, success: true };
                } catch (error) {
                    return {
                        text,
                        index: globalIdx,
                        success: false,
                        error: error.message
                    };
                }
            })
        );

        results.forEach((result) => {
            if (result.status === 'fulfilled' && result.value.success) {
                embeddings.push(result.value);
            } else {
                const data = result.status === 'fulfilled' ? result.value : {
                    index: globalStartIndex,
                    text: 'unknown',
                    error: result.reason?.message
                };
                failed.push(data);
                console.error(`❌ Failed: ${data.index} - ${data.text.substring(0, 40)}`);
            }
        });

        const processed = startIndex + i + batch.length;

        if (processed % CHECKPOINT_INTERVAL === 0) {
            saveCheckpoint(embeddings, processed);
            console.log(`💾 Checkpoint saved at ${processed}/${texts.length}`);
        }

        if (onProgress) {
            onProgress(processed, texts.length);
        }

        if (i + CONCURRENT_REQUESTS < remaining.length) {
            await sleep(BATCH_DELAY);
        }
    }

    saveCheckpoint(embeddings, texts.length);

    if (failed.length > 0) {
        console.log(`\n⚠️  ${failed.length}/${texts.length} items failed`);
        fs.writeFileSync('failed_items.json', JSON.stringify(failed, null, 2));
        console.log('📄 Failed items saved to failed_items.json');
    }

    if (failed.length === 0 && fs.existsSync(CHECKPOINT_FILE)) {
        fs.unlinkSync(CHECKPOINT_FILE);
        console.log('✅ Checkpoint file removed (completed successfully)');
    }

    return embeddings;
}

export async function retryFailedItems() {
    try {
        const failedData = JSON.parse(fs.readFileSync('failed_items.json', 'utf8'));
        console.log(`\n🔄 Retrying ${failedData.length} failed items...`);

        const texts = failedData.map(item => item.text);
        const embeddings = [];

        for (let i = 0; i < texts.length; i++) {
            try {
                const embedding = await generateEmbedding(texts[i]);
                embeddings.push({
                    text: texts[i],
                    embedding,
                    index: failedData[i].index
                });
                console.log(`✓ Recovered item ${failedData[i].index}`);
                await sleep(500);
            } catch (error) {
                console.error(`❌ Still failing: ${failedData[i].index}`);
            }
        }

        return embeddings;
    } catch (error) {
        console.log('No failed items file found');
        return [];
    }
}