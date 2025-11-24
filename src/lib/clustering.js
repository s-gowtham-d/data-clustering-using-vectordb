import { euclideanDistance } from '../utils/helpers.js';

export function hdbscanClustering(embeddings, minClusterSize = 5) {
    const n = embeddings.length;
    const distances = calculateDistanceMatrix(embeddings);
    const coreDistances = calculateCoreDistances(distances, minClusterSize);
    const mst = buildMST(distances, coreDistances);
    const clusters = extractClusters(mst, n, minClusterSize);

    return clusters;
}

function calculateDistanceMatrix(embeddings) {
    const n = embeddings.length;
    const distances = Array(n).fill(0).map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            const dist = euclideanDistance(embeddings[i], embeddings[j]);
            distances[i][j] = distances[j][i] = dist;
        }
    }

    return distances;
}

function calculateCoreDistances(distances, k) {
    const n = distances.length;
    const coreDistances = new Array(n);

    for (let i = 0; i < n; i++) {
        const sorted = [...distances[i]].sort((a, b) => a - b);
        coreDistances[i] = sorted[Math.min(k, sorted.length - 1)];
    }

    return coreDistances;
}

function buildMST(distances, coreDistances) {
    const n = distances.length;
    const edges = [];

    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            const mutualReachDist = Math.max(
                distances[i][j],
                coreDistances[i],
                coreDistances[j]
            );
            edges.push({ from: i, to: j, weight: mutualReachDist });
        }
    }

    edges.sort((a, b) => a.weight - b.weight);

    const parent = Array(n).fill(0).map((_, i) => i);
    const mst = [];

    for (const edge of edges) {
        const rootFrom = find(parent, edge.from);
        const rootTo = find(parent, edge.to);

        if (rootFrom !== rootTo) {
            mst.push(edge);
            parent[rootFrom] = rootTo;
            if (mst.length === n - 1) break;
        }
    }

    return mst;
}

function find(parent, i) {
    if (parent[i] !== i) {
        parent[i] = find(parent, parent[i]);
    }
    return parent[i];
}

function extractClusters(mst, n, minSize) {
    const parent = Array(n).fill(0).map((_, i) => i);
    const size = Array(n).fill(1);

    mst.sort((a, b) => b.weight - a.weight);

    for (const edge of mst) {
        const rootFrom = find(parent, edge.from);
        const rootTo = find(parent, edge.to);

        if (rootFrom !== rootTo) {
            if (size[rootFrom] < minSize && size[rootTo] < minSize) {
                parent[rootFrom] = rootTo;
                size[rootTo] += size[rootFrom];
            }
        }
    }

    const clusterMap = {};
    for (let i = 0; i < n; i++) {
        const root = find(parent, i);
        if (!clusterMap[root]) clusterMap[root] = [];
        clusterMap[root].push(i);
    }

    return Object.values(clusterMap)
        .filter(cluster => cluster.length >= minSize)
        .map((cluster, idx) => ({ id: idx, indices: cluster }));
}

// export function generateClusterName(items) {
//     const words = {};
//     const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with']);

//     items.forEach(name => {
//         const tokens = name.toLowerCase()
//             .replace(/[^a-z0-9\s]/g, ' ')
//             .split(/\s+/)
//             .filter(w => w.length > 3 && !stopWords.has(w));

//         tokens.forEach(word => {
//             words[word] = (words[word] || 0) + 1;
//         });
//     });

//     const sorted = Object.entries(words)
//         .filter(([_, count]) => count >= Math.ceil(items.length * 0.2))
//         .sort((a, b) => b[1] - a[1]);

//     if (sorted.length === 0) return 'Miscellaneous Group';
//     if (sorted.length === 1) return capitalize(sorted[0][0]) + ' Items';

//     return capitalize(sorted[0][0]) + ' & ' + capitalize(sorted[1][0]);
// }


const CATEGORY_KEYWORDS = {
    medical: [
        "hernia", "arthritis", "transplant", "orthopedic", "orthopaedic",
        "implant", "orthosis", "orthotics", "organ", "surgery", "disease",
        "health", "clinic", "hospital", "therapy", "physio"
    ],
    finance: [
        "payroll", "salary", "compensation", "dividend", "benefits",
        "finance", "financial", "account", "budget", "billing"
    ],
    management: [
        "management", "admin", "administration", "supervision",
        "planning", "operations", "organizing", "executive"
    ],
    construction: [
        "building", "construction", "structure", "material", "cement",
        "hardware", "tools", "fabrication"
    ],
    technology: [
        "software", "system", "network", "tech", "cloud", "data", "ai",
        "algorithm", "digital", "application"
    ],
    creative: [
        "creative", "design", "art", "drawing", "graphics", "direction",
        "illustration", "content", "media"
    ],
    education: [
        "training", "learning", "course", "education", "teaching", "study"
    ],
    legal: [
        "law", "legal", "compliance", "regulation", "contract"
    ]
};


export function generateClusterName(items) {
    const score = {};

    for (const item of items) {
        const words = item
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, " ")
            .split(/\s+/)
            .filter(w => w.length > 2);

        for (const w of words) {
            for (const [category, keys] of Object.entries(CATEGORY_KEYWORDS)) {
                if (keys.some(k => w.includes(k))) {
                    score[category] = (score[category] || 0) + 1;
                }
            }
        }
    }

    const best = Object.entries(score)
        .sort((a, b) => b[1] - a[1])[0];

    if (!best) {
        return createFallbackName(items);
    }

    return formatCategoryName(best[0]);
}


function formatCategoryName(cat) {
    return {
        medical: "Medical / Healthcare",
        finance: "Finance / Payroll",
        management: "Management",
        construction: "Construction / Materials",
        technology: "Technology & Systems",
        creative: "Creative / Design",
        education: "Education & Training",
        legal: "Legal & Compliance"
    }[cat] || capitalize(cat);
}


function createFallbackName(items) {
    const frequency = {};

    for (const item of items) {
        const words = item
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, " ")
            .split(/\s+/)
            .filter(w => w.length > 3);

        for (const w of words) {
            frequency[w] = (frequency[w] || 0) + 1;
        }
    }

    const sorted = Object.entries(frequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2);

    if (sorted.length === 0) return "General Category";

    if (sorted.length === 1) return capitalize(sorted[0][0]);

    return `${capitalize(sorted[0][0])} & ${capitalize(sorted[1][0])}`;
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}