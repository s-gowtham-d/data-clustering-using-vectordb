import 'dotenv/config';
import { getOrCreateCollection } from './lib/vectordb.js';

const collectionName = process.env.COLLECTION_NAME || 'embeddings';
const collection = await getOrCreateCollection(collectionName);

console.log('🔍 Debugging ChromaDB...\n');

const count = await collection.count();
console.log(`Total items: ${count}`);

const results = await collection.get({
    include: ["embeddings", "metadatas"],
    limit: 1
});

console.log('\nFirst item:');
console.log('ID:', results.ids[0]);
console.log('Metadata:', results.metadatas[0]);
console.log('Embedding type:', typeof results.embeddings?.[0]);
console.log('Embedding length:', results.embeddings?.[0]?.length);
console.log('First 5 values:', results.embeddings?.[0]?.slice(0, 5));