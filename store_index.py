from sentence_transformers import SentenceTransformer
import os
from pinecone import Pinecone
from pinecone import ServerlessSpec

from Rag_based_Research_Assistant.src.helper import (
    partition_documents_from_folder,
    flatten_all_elements,
    create_chunks_by_title,
    store_child_vectors_pinecone,
    store_parents_in_supabase,
    summarise_chunks
    )


data_folder = "./data"
elements_by_doc = partition_documents_from_folder(data_folder)

all_elements = flatten_all_elements(elements_by_doc)
print(f"\n📊 Total elements across all documents: {len(all_elements)}")

chunks = create_chunks_by_title(all_elements)
clip = SentenceTransformer(
    "jinaai/jina-clip-v1",
    trust_remote_code=True  # required as per model card[web:107][web:146]
)
parent_docs, child_vectors = summarise_chunks(chunks,clip)
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
os.environ["PINECONE_API_KEY"] = PINECONE_API_KEY
pc = Pinecone(api_key=PINECONE_API_KEY)
index_name = "research-assistant"

if not pc.has_index(index_name):
    pc.create_index(
        name = index_name,
        dimension=768,  # Dimension of the embeddings
        metric= "cosine",  # Cosine similarity
        spec=ServerlessSpec(cloud="aws", region="us-east-1")
    )


index = pc.Index(index_name)   # It connects to an existing index , a connection object , which returns a Python object (Client handle)
index = store_child_vectors_pinecone(
    index,
    child_vectors=child_vectors,
    index_name="research-assistant",
    dimension=768
)

store_parents_in_supabase(parent_docs)