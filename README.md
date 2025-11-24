# Data Clustering Using Vectordb

AI-powered data clustering using Google Gemini embeddings with ChromaDB vector storage for efficient processing and reuse.

## Tech Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| **Runtime** | Node.js 18+ | Fast async I/O for batch processing |
| **Embeddings** | Google Gemini API | High-quality 768-dim vectors, free tier available |
| **Vector DB** | ChromaDB (Docker) | Persistent storage, efficient vector operations |
| **Clustering** | HDBSCAN | Auto-determines cluster count, handles noise |
| **Format** | CSV | Universal compatibility |

## Prerequisites

- Node.js 18 or higher
- Docker Desktop
- Google Gemini API key (free tier)

## Installation

```bash
# 1. Clone repository
git clone https://github.com/s-gowtham-d/data-clustering-using-vectordb.git
cd data-clustering-using-vectordb

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
```

## ChromaDB Setup

**Start ChromaDB server:**
```bash
docker run -d -p 8000:8000 --name chromadb chromadb/chroma
```

**Verify it's running:**
```bash
curl http://localhost:8000/api/v2/heartbeat
# Should return: {"nanosecond heartbeat": ...}
```

**Manage ChromaDB:**
```bash
# Stop server
docker stop chromadb

# Start server
docker start chromadb

# Remove server
docker stop chromadb && docker rm chromadb
```

## Usage

### Step 1: Generate Embeddings (One-Time)

```bash
npm run index example.csv
```

- Reads CSV with `id` and `name` columns
- Generates embeddings via Gemini API
- Stores in ChromaDB for reuse
- **Cost:** Free tier: ~1,500 items/day, Paid: $0.00005/item

### Step 2: Cluster Data (Unlimited)

```bash
npm run cluster
```

- Fetches embeddings from ChromaDB (instant)
- Runs HDBSCAN clustering locally
- Outputs condensed CSV
- **Cost:** $0 (local computation)

### Optional: Clear Database

```bash
npm run clear
```

Deletes collection to start fresh.

## Input Format

CSV with two required columns:

```csv
id,name
1,explosive detection system
2,body scanner device
3,security checkpoint
```

## Output Format

Condensed CSV (one row per cluster):

```csv
group_id,group_name,members_id,members_name
1,Security Equipment,"1,2,3","explosive detection system, body scanner device, security checkpoint"
```

**Result:** Drastically reduced rows (e.g., 10K → 25 rows)

## Configuration

Edit `.env`:

```env
GEMINI_API_KEY=your_key_here
CHROMA_DB_PATH=http://localhost:8000
COLLECTION_NAME=embeddings
EMBEDDING_MODEL=text-embedding-004
MIN_CLUSTER_SIZE=5
```

## Limitations

### Gemini API Free Tier
- **1,500 requests/day** - Can embed ~1,500 items daily
- **Rate limits** - 60 requests/minute
- **For large datasets:** Use paid tier or process in batches over multiple days

### Processing Constraints
- **Memory:** 2-4GB RAM minimum
- **ChromaDB:** Requires Docker Desktop running
- **Language:** Optimized for English text
- **Initial run:** Slow due to API rate limits
- **Max tested:** 50K rows (with paid API)

### Performance Estimates

| Dataset Size | Indexing Time | Free Tier | Paid Tier Cost |
|--------------|---------------|-----------|----------------|
| 100 rows     | 2 min         | ✅ Free   | $0.005         |
| 1,000 rows   | 15 min        | ✅ Free   | $0.05          |
| 10,000 rows  | 3 hours       | ❌ 7 days | $0.50          |
| 50,000 rows  | 15 hours      | ❌ 33 days| $2.50          |

**Free tier recommendation:** Process up to 1,500 rows/day

## Example Workflow

```bash
# Start ChromaDB
docker run -d -p 8000:8000 --name chromadb chromadb/chroma

# Setup project
npm install
cp .env.example .env
# Add GEMINI_API_KEY to .env

# Index your data (once)
npm run index data.csv

# Cluster (unlimited times, free)
npm run cluster

# Try different cluster sizes
# Edit MIN_CLUSTER_SIZE in .env
npm run cluster  # Re-run instantly, $0 cost

# Output: clustered_output.csv
```

## Project Structure

```
src/
├── index.js              # Embedding generation & storage
├── cluster.js            # Clustering & output
├── clear-db.js           # Database cleanup
├── lib/
│   ├── embeddings.js     # Gemini API wrapper
│   ├── vectordb.js       # ChromaDB operations
│   ├── clustering.js     # HDBSCAN implementation
│   └── csv.js            # CSV I/O
└── utils/
    └── helpers.js        # Utilities
```

## Troubleshooting

**ChromaDB connection error:**
```bash
# Check if ChromaDB is running
docker ps | grep chromadb

# Restart if needed
docker restart chromadb
```

**Gemini API quota exceeded:**
```bash
# Wait 24 hours for free tier reset
# Or upgrade to paid tier
```

**Out of memory:**
```bash
NODE_OPTIONS="--max-old-space-size=4096" npm run index input.csv
```

**Clear and restart:**
```bash
npm run clear
npm run index input.csv
```

## Cost Comparison

**Without this system (re-embed every time):**
- 1,000 items × 10 runs = $0.50
- 10,000 items × 10 runs = $5.00

**With this system:**
- 1,000 items: $0.05 (one-time) + $0 (unlimited clustering)
- 10,000 items: $0.50 (one-time) + $0 (unlimited clustering)
- **Savings:** 90% after first run

## Future Enhancements

### Planned Features
- [ ] **Ollama integration** - Local embeddings, zero API cost
- [ ] **Batch processing** - Auto-split large files for free tier
- [ ] **Progress persistence** - Resume interrupted indexing
- [ ] **Web UI** - Visual cluster exploration
- [ ] **Multiple algorithms** - K-Means, DBSCAN options
- [ ] **Export formats** - JSON, Parquet, SQL exports
- [ ] **Incremental updates** - Only process new items

### Under Consideration
- [ ] **Hierarchical clustering** - Multi-level grouping
- [ ] **Quality metrics** - Silhouette scores, validation
- [ ] **Auto-optimization** - Best parameter detection
- [ ] **Cloud deployment** - One-click deploy to Heroku/Railway
- [ ] **API server** - REST API for programmatic access
- [ ] **Multi-language** - Support non-English text
- [ ] **Streaming mode** - Process CSV without loading into memory

### Advanced Ideas
- [ ] **Hybrid embeddings** - Mix Gemini + local models
- [ ] **Active learning** - User feedback improves clustering
- [ ] **Real-time updates** - Process new items on-the-fly
- [ ] **Comparison tool** - Compare different clustering runs
- [ ] **Deduplication** - Detect and merge similar items
- [ ] **Custom models** - Fine-tune embeddings for domain

## Docker Compose (Alternative Setup)

Create `docker-compose.yml`:

```yaml
version: '3.8'
services:
  chromadb:
    image: chromadb/chroma
    ports:
      - "8000:8000"
    volumes:
      - chroma-data:/chroma/chroma
volumes:
  chroma-data:
```

Run:
```bash
docker-compose up -d
```

## License

MIT

## Support

- Open issues on GitHub
- Check Docker logs: `docker logs chromadb`
- Verify ChromaDB: `curl http://localhost:8000/api/v2/heartbeat`

## Changelog

**v1.0.0** - Initial Release
- Google Gemini embeddings
- ChromaDB vector storage
- HDBSCAN clustering
- Condensed CSV output
- Docker-based setup

---

## Quick Reference

```bash
# Daily workflow
docker start chromadb           # Start DB
npm run index new_data.csv     # Index once (free tier: <1500 rows)
npm run cluster                # Cluster (free, unlimited)

# Cleanup
npm run clear                  # Clear database
docker stop chromadb           # Stop server
```

**Free tier sweet spot:** Process 200-400 rows/day for optimal results.