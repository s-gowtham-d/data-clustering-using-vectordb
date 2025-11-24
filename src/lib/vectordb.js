import { ChromaClient } from 'chromadb';

let client = null;
let collection = null;

export async function initDB() {
    if (!client) {
        client = new ChromaClient();
    }
    return client;
}

export async function getOrCreateCollection(name) {
    const db = await initDB();

    try {
        collection = await db.getCollection({ name });
    } catch {
        collection = await db.createCollection({ name });
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

    const results = await collection.get();

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