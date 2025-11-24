# data-clustering-using-vectordb

Intelligent data clustering using Google Gemini embeddings and ChromaDB vector storage.

## Tech Stack

- **Node.js 18+** - Async I/O for batch processing
- **Google Gemini** - High-quality text embeddings (768-dim vectors)
- **ChromaDB** - In-process vector database, no server setup
- **HDBSCAN** - Density-based clustering, auto-determines cluster count

## Why These Choices

| Technology | Reason |
|------------|--------|
| Gemini API | Best quality embeddings, generous free tier |
| ChromaDB | Simplest vector DB, runs locally, zero config |
| HDBSCAN | Automatic cluster detection, handles noise |
| CSV format | Universal compatibility, easy inspection |

## Installation
```bash
npm install
cp .env.example .env
```

Add your Gemini API key to `.env`

## Usage

**Generate embeddings (one-time):**
```bash
npm run index input.csv
```
- Reads CSV with `id` and `name` columns
- Generates embeddings via Gemini API
- Stores in ChromaDB for instant retrieval
- **Time:** ~4-6 hours for 300K rows
- **Cost:** ~$20-25 (one-time)

**Cluster data (unlimited runs):**
```bash
npm run cluster
```
- Fetches embeddings from ChromaDB (instant)
- Runs HDBSCAN clustering locally
- Generates AI-powered cluster names
- Outputs condensed CSV
- **Time:** 5-10 minutes
- **Cost:** $0 (local computation)

## Input Format
```csv
id,name
1,explosive detection system
2,body scanner device
3,security checkpoint
```

## Output Format
```csv
group_id,group_name,members_id,members_name
1,Security Equipment,"1,2,3","explosive detection system, body scanner device, security checkpoint"
```

**Result:** 300K rows → ~87 rows (99.97% reduction)

## Limitations

- **Memory:** Requires 4-8GB RAM for 300K rows
- **First run:** Takes 4-6 hours for embedding generation
- **API dependency:** Requires internet for initial indexing
- **Language:** Optimized for English text
- **Max items:** Tested up to 500K rows

## Performance

| Dataset Size | Index Time | Cluster Time | Output Rows |
|--------------|------------|--------------|-------------|
| 10K rows     | 15 min     | 30 sec       | ~25         |
| 100K rows    | 2 hours    | 2 min        | ~50         |
| 300K rows    | 5 hours    | 8 min        | ~87         |

## Project Structure
```
ai-data-clustering/
├── src/
│   ├── index.js          # Step 1: Embedding generation
│   ├── cluster.js        # Step 2: Clustering
│   ├── lib/
│   │   ├── embeddings.js # Gemini API wrapper
│   │   ├── vectordb.js   # ChromaDB operations
│   │   ├── clustering.js # HDBSCAN implementation
│   │   └── csv.js        # CSV I/O utilities
│   └── utils/
│       └── helpers.js    # Common utilities
├── package.json
├── .env.example
└── README.md
```

## License

MIT