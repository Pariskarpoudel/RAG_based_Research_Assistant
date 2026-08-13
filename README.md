# Multimodal RAG Research Assistant

An end-to-end RAG system for research documents. Ingests PDFs with text, tables, and images, and answers questions grounded in the source material.

## Architecture

### Parent-Child Retrieval

Full-context parent chunks (text, tables, images) are stored in Supabase (PostgreSQL). Multiple child vectors per parent are stored in Pinecone, linked back to their parent via `parent_id` in the metadata. This allows fine-grained retrieval while still returning full surrounding context.

### Multimodal Embeddings

Uses CLIP embeddings (jina-clip-v1) so text and images share the same vector space, enabling retrieval across both modalities together.

### Hybrid Search Pipeline

- Vector search (Pinecone) for semantic similarity
- BM25 for keyword search
- Reciprocal Rank Fusion (RRF) to merge results from both
- Cohere Rerank for final re-ranking of merged results

## Tech Stack

FastAPI, React, Pinecone, Supabase, LangChain, CLIP, Groq, Unstructured, Cohere, AWS

## Project Structure

```
.
├── src/                  # Core RAG pipeline
├── research/             # Notebooks / experimentation
├── frontenddd/           # React frontend
├── app_fastapi.py        # FastAPI entry point
├── store_index.py        # Builds/updates the vector index
├── test.py                # Tests
└── Dockerfile
```

## Getting Started

```bash
git clone https://github.com/Pariskarpoudel/RAG_based_Research_Assistant.git
cd RAG_based_Research_Assistant

python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

cd frontenddd && npm install && cd ..
```

Set the following in a `.env` file:

```
PINECONE_API_KEY=
SUPABASE_URL=
SUPABASE_KEY=
GROQ_API_KEY=
COHERE_API_KEY=
```

## Usage

```bash
# Index documents
python store_index.py

# Start backend
uvicorn app_fastapi:app --reload

# Start frontend
cd frontenddd && npm run dev
```
