import 'dotenv/config';
import { getOrCreateCollection, getAllEmbeddings } from './lib/vectordb.js';
import { hdbscanClustering, generateClusterName } from './lib/clustering.js';
import { writeCondensedCSV } from './lib/csv.js';
import { formatTime } from './utils/helpers.js';

console.log('🧠 Starting clustering process...\n');

const startTime = Date.now();

const collectionName = process.env.COLLECTION_NAME || 'embeddings';
await getOrCreateCollection(collectionName);

console.log('📥 Fetching embeddings from ChromaDB...');
const items = await getAllEmbeddings();
console.log(`✓ Loaded ${items.length} embeddings\n`);

if (items.length === 0) {
    console.error('Error: No embeddings found. Run indexing first: npm run index input.csv');
    process.exit(1);
}

console.log('🔄 Running HDBSCAN clustering...');
const minClusterSize = parseInt(process.env.MIN_CLUSTER_SIZE || '5');
const embeddings = items.map(item => item.embedding);
const clusterResult = hdbscanClustering(embeddings, minClusterSize);

console.log(`✓ Found ${clusterResult.length} clusters\n`);

console.log('✨ Generating cluster names...');
const clusters = clusterResult.map(cluster => {
    const members = cluster.indices.map(idx => items[idx]);
    const names = members.map(m => m.name);

    return {
        id: cluster.id + 1,
        name: generateClusterName(names),
        members: members.map(m => ({ id: m.id, name: m.name }))
    };
});

clusters.sort((a, b) => b.members.length - a.members.length);

console.log('\n📊 Top 5 Clusters:');
clusters.slice(0, 5).forEach((c, idx) => {
    console.log(`  ${idx + 1}. ${c.name} (${c.members.length} items)`);
});

const mergedMap = new Map();

for (const cluster of clusters) {
    const key = cluster.name.trim().toLowerCase();

    if (!mergedMap.has(key)) {
        mergedMap.set(key, {
            name: cluster.name,
            members: [...cluster.members]
        });
    } else {
        mergedMap.get(key).members.push(...cluster.members);
    }
}

let mergedClusters = Array.from(mergedMap.values());

mergedClusters.sort((a, b) => b.members.length - a.members.length);

mergedClusters = mergedClusters.map((c, i) => ({
    id: i + 1,
    name: c.name,
    members: c.members
}));


const outputFile = 'clustered_output.csv';
await writeCondensedCSV(outputFile, clusters);

const elapsed = Math.floor((Date.now() - startTime) / 1000);
const inputRows = items.length;
const outputRows = clusters.length;
const reduction = ((1 - outputRows / inputRows) * 100).toFixed(2);

console.log(`\n✅ Clustering complete!`);
console.log(`   Input rows: ${inputRows}`);
console.log(`   Output rows: ${outputRows}`);
console.log(`   Reduction: ${reduction}%`);
console.log(`   Time taken: ${formatTime(elapsed)}`);
console.log(`   Output: ${outputFile}`);


const mergedOutputFile = 'merged_clustered_output.csv';
await writeCondensedCSV(mergedOutputFile, mergedClusters);

const mergedElapsed = Math.floor((Date.now() - startTime) / 1000);
const mergedInputRows = items.length;
const mergedOutputRows = mergedClusters.length;
const mergedReduction = ((1 - outputRows / inputRows) * 100).toFixed(2);

console.log(`\n✅ Merge Clustering complete!`);
console.log(`   Input rows: ${mergedInputRows}`);
console.log(`   Output rows: ${mergedOutputRows}`);
console.log(`   Reduction: ${mergedReduction}%`);
console.log(`   Time taken: ${formatTime(mergedElapsed)}`);
console.log(`   Output: ${mergedOutputFile}`);
