import { ChromaClient } from 'chromadb';

let client = null;
let collection = null;

export async function initDB() {
    if (!client) {
        client = new ChromaClient({
            path: process.env.CHROMA_DB_PATH || 'http://localhost:8000'
        });
    }
    return client;
}

export async function getOrCreateCollection(name) {
    const db = await initDB();

    try {
        collection = await db.getCollection({ name });
        console.log(`✓ Using existing collection: ${name}`);
    } catch {
        collection = await db.createCollection({
            name,
            metadata: { "hnsw:space": "cosine" }
        });
        console.log(`✓ Created new collection: ${name}`);
    }

    return collection;
}

export async function addEmbeddings(items) {
    if (!collection) {
        throw new Error('Collection not initialized');
    }

    const ids = items.map(item => String(item.id));
    const embeddings = items.map(item => item.embedding);
    const metadatas = items.map(item => ({
        name: item.name,
        original_id: String(item.id)
    }));

    await collection.add({
        ids,
        embeddings,
        metadatas
    });
}

export async function getAllEmbeddings() {
    if (!collection) {
        throw new Error('Collection not initialized');
    }

    const results = await collection.get({
        include: ["embeddings", "metadatas"]
    });

    if (!results.embeddings || results.embeddings.length === 0) {
        console.error('⚠️  No embeddings found in collection');
        return [];
    }

    return results.ids.map((id, idx) => ({
        id: results.metadatas[idx].original_id,
        name: results.metadatas[idx].name,
        embedding: results.embeddings[idx]
    }));
}

export async function getCollectionCount() {
    if (!collection) return 0;
    const result = await collection.count();
    return result;
}

export async function clearCollection() {
    const db = await initDB();
    const collectionName = process.env.COLLECTION_NAME || 'embeddings';

    try {
        await db.deleteCollection({ name: collectionName });
        console.log(`✓ Deleted collection: ${collectionName}`);
    } catch (error) {
        console.log('Collection does not exist or already deleted');
    }
}