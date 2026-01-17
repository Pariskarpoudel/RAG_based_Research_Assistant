# testing before using in backend with fastapi
from sentence_transformers import SentenceTransformer
import os
from dotenv import load_dotenv
# using as a package
from RAG_based_Research_Assistant.src.helper import (
    load_pinecone_index,
    retrieve_parent_docs_hybrid,
    embed_text_with_clip,
    load_multiple_parents_from_supabase,
    generate_final_answer_with_groq
)

load_dotenv()

print("=" * 60)
print("🚀 Testing RAG Pipeline")
print("=" * 60)

# Step 1: Load models
print("\n📦 Loading CLIP model...")
clip = SentenceTransformer("jinaai/jina-clip-v1", trust_remote_code=True)
print("✅ CLIP loaded")

# Step 2: Load Pinecone index
print("\n📦 Loading Pinecone index...")
index = load_pinecone_index("research-assistant")
print("✅ Pinecone index loaded")

# Step 3: Get API keys
COHERE_API_KEY = os.getenv("COHERE_API_KEY")
print(f"\n🔑 Cohere API Key: {'✅ Found' if COHERE_API_KEY else '❌ Missing'}")

# Step 4: Test query
query = "How many hidden layers and neurons does the neural network use in this landslide PINN model?"
print(f"\n❓ Query: {query}")
print("\n" + "=" * 60)

# Step 5: Retrieve chunks
print("\n🔍 Retrieving relevant chunks...")
try:
    chunks = retrieve_parent_docs_hybrid(
        query=query,
        index=index,
        clip=clip,
        embed_text_with_clip=embed_text_with_clip,
        load_multiple_parents_from_supabase=load_multiple_parents_from_supabase,
        cohere_api_key=COHERE_API_KEY,
        k=5,
        rerank_top_n=20,
        vector_weight=0.7,
        bm25_weight=0.3,
        rerank_model="rerank-english-v3.0"
    )
    print(f"✅ Retrieved {len(chunks)} chunks")
    
    # # Show chunk preview
    # for i, chunk in enumerate(chunks[:3], 1):
    #     print(f"\n📄 Chunk {i} preview: {chunk.page_content[:150]}...")
    
except Exception as e:
    print(f"❌ Error retrieving chunks: {str(e)}")
    exit(1)

# Step 6: Generate answer
print("\n" + "=" * 60)
print("\n🤖 Generating answer with Groq...")
try:
    answer = generate_final_answer_with_groq(chunks, query)
    print("✅ Answer generated")
    
    print("\n" + "=" * 60)
    print("📝 FINAL ANSWER:")
    print("=" * 60)
    print(answer)
    print("=" * 60)
    
except Exception as e:
    print(f"❌ Error generating answer: {str(e)}")
    exit(1)

print("\n✅ Test completed successfully!")