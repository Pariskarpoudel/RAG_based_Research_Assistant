from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
import os
import uvicorn
from dotenv import load_dotenv
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware

# using as a package
from RAG_based_Research_Assistant.src.helper import (
    load_pinecone_index,
    retrieve_parent_docs_hybrid,
    embed_text_with_clip,
    load_multiple_parents_from_supabase,
    generate_final_answer_with_groq
)

load_dotenv()

app_state = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup code : Runs once when the app starts
    app_state["clip"] = SentenceTransformer("jinaai/jina-clip-v1", trust_remote_code=True)
    app_state["index"] = load_pinecone_index("research-assistant")
    app_state["COHERE_API_KEY"] = os.getenv("COHERE_API_KEY")

    yield  # App runs here ,handles requests
    app_state.clear()   # Shutdown code : Runs once when the app stops

app = FastAPI(lifespan=lifespan)
# Add this CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace "*" with your actual frontend origin, e.g. "http://localhost:3000"
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods including OPTIONS
    allow_headers=["*"],
)
# input structure validation or query request structure validation through pydantic
class QueryRequest(BaseModel):
    query: str
    k: int = 5
    rerank_top_n: int = 20
    vector_weight: float = 0.7
    bm25_weight: float = 0.3
    # ini ta default vaye, query matra aauxa normally ta frontend bata

@app.post("/query")
async def query(req: QueryRequest):
    try:
        chunks = retrieve_parent_docs_hybrid(
            query=req.query,
            index=app_state["index"],
            clip=app_state["clip"],
            embed_text_with_clip=embed_text_with_clip,
            load_multiple_parents_from_supabase=load_multiple_parents_from_supabase,
            cohere_api_key=app_state["COHERE_API_KEY"],
            k=req.k,
            rerank_top_n=req.rerank_top_n,
            vector_weight=req.vector_weight,
            bm25_weight=req.bm25_weight,
            rerank_model="rerank-english-v3.0"
        )
        
        answer = generate_final_answer_with_groq(chunks, req.query)
          # Serialize chunks for JSON response
        chunks_data = []
        for chunk in chunks:
            chunks_data.append({
                "page_content": chunk.page_content,
                "metadata": chunk.metadata
            })
        
        return {
            "answer": answer,
            "chunks_retrieved": len(chunks),
            "chunks": chunks_data  # ADD THIS
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("app_fastapi:app", host="0.0.0.0", port=8080, reload=True)