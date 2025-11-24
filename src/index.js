import 'dotenv/config';
import { readCSV } from './lib/csv.js';
import { batchGenerateEmbeddings } from './lib/embeddings.js';
import { getOrCreateCollection, addEmbeddings, getCollectionCount } from './lib/vectordb.js';
import { calculateProgress, formatTime } from './utils/helpers.js';

const inputFile = process.argv[2];

if (!inputFile) {
    console.error('Usage: node index.js <input.csv>');
    process.exit(1);
}

if (!process.env.GEMINI_API_KEY) {
    console.error('Error: GEMINI_API_KEY not set in .env');
    process.exit(1);
}

console.log('🚀 Starting indexing process...\n');

const startTime = Date.now();

const data = await readCSV(inputFile);
console.log(`✓ Read ${data.length} items from ${inputFile}`);

const collectionName = process.env.COLLECTION_NAME || 'embeddings';
await getOrCreateCollection(collectionName);

const existingCount = await getCollectionCount();
console.log(`✓ ChromaDB collection ready (${existingCount} existing embeddings)\n`);

console.log('⏳ Generating embeddings...');
const embeddings = await batchGenerateEmbeddings(
    data.map(d => d.name),
    (current, total) => {
        process.stdout.write(`\r${calculateProgress(current, total)}`);
    }
);
console.log('\n');

const itemsWithEmbeddings = data.map((item, idx) => ({
    id: item.id,
    name: item.name,
    embedding: embeddings.find(e => e.index === idx)?.embedding
})).filter(item => item.embedding);

console.log('💾 Storing embeddings in ChromaDB...');
const batchSize = 5000;
for (let i = 0; i < itemsWithEmbeddings.length; i += batchSize) {
    const batch = itemsWithEmbeddings.slice(i, i + batchSize);
    await addEmbeddings(batch);
    console.log(`  Stored ${Math.min(i + batchSize, itemsWithEmbeddings.length)}/${itemsWithEmbeddings.length}`);
}

const elapsed = Math.floor((Date.now() - startTime) / 1000);
console.log(`\n✅ Indexing complete!`);
console.log(`   Items indexed: ${itemsWithEmbeddings.length}`);
console.log(`   Time taken: ${formatTime(elapsed)}`);
console.log(`\n▶  Next: Run 'npm run cluster' to generate clusters`);