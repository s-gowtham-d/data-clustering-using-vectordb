import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function generateEmbedding(text) {
    const model = genAI.getGenerativeModel({
        model: process.env.EMBEDDING_MODEL || 'text-embedding-004'
    });

    const result = await model.embedContent(text);
    return result.embedding.values;
}

export async function batchGenerateEmbeddings(texts, onProgress) {
    const embeddings = [];
    const batchSize = 100;

    for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        const batchEmbeddings = await Promise.all(
            batch.map(async (text, idx) => {
                try {
                    const embedding = await generateEmbedding(text);
                    return { text, embedding, index: i + idx };
                } catch (error) {
                    console.error(`Failed for item ${i + idx}: ${text}`);
                    return null;
                }
            })
        );

        embeddings.push(...batchEmbeddings.filter(e => e !== null));

        if (onProgress) {
            onProgress(Math.min(i + batchSize, texts.length), texts.length);
        }

        await new Promise(resolve => setTimeout(resolve, 100));
    }

    return embeddings;
}