import json
from pathlib import Path
from unstructured.partition.pdf import partition_pdf
from unstructured.chunking.title import chunk_by_title
from langchain_huggingface import HuggingFaceEmbeddings 
from groq import Groq
import torch
import os
from langchain_chroma import Chroma
from langchain_core.messages import HumanMessage
from dotenv import load_dotenv
from typing import Any, Callable, List
from langchain_community.retrievers import BM25Retriever
from langchain.retrievers.ensemble import EnsembleRetriever
from langchain_core.retrievers import BaseRetriever
from langchain_core.documents import Document
from supabase import create_client, Client
import base64
import io
from PIL import Image  
from pinecone import Pinecone
from pinecone import ServerlessSpec 
from langchain_cohere import CohereRerank 


def partition_document(file_path: str):
    """Extract elements from PDF using unstructured"""
    print(f"📄 Partitioning document: {file_path}")
    
    elements = partition_pdf(
        filename=file_path,  # Path to your PDF file
        strategy="hi_res", # Use the most accurate (but slower) processing method of extraction
        infer_table_structure=True, # Keep tables as structured HTML, not jumbled text
        extract_image_block_types=["Image"], # Grab images found in the PDF
        extract_image_block_to_payload=True # Store images as base64 data you can actually use
    )
    
    print(f"✅ Extracted {len(elements)} elements")
    return elements


def partition_documents_from_folder(folder_path: str, file_extension: str = ".pdf"):
    """
    Process all documents from a folder
    
    Args:
        folder_path: Path to folder containing documents
        file_extension: File extension to filter (default: .pdf)
    
    Returns:
        Dictionary mapping filename to extracted elements
    """
    folder = Path(folder_path)
    
    # Find all PDF files in the folder
    pdf_files = list(folder.glob(f"*{file_extension}"))    # folder.glob('*.pdf')
    
    if not pdf_files:
        print(f"⚠️  No {file_extension} files found in {folder_path}")
        return {}
    
    print(f"📁 Found {len(pdf_files)} PDF files in {folder_path}")
    print("-" * 50)
    
    all_elements = {}
    
    for pdf_file in pdf_files:
        try:
            elements = partition_document(str(pdf_file))
            all_elements[pdf_file.name] = elements
            print(f"✓ Successfully processed: {pdf_file.name}")
            print("-" * 50)
        except Exception as e:
            print(f"❌ Error processing {pdf_file.name}: {str(e)}")
            print("-" * 50)
            continue
    
    print(f"\n🎉 Successfully processed {len(all_elements)}/{len(pdf_files)} documents")
    return all_elements


def flatten_all_elements(elements_dict: dict) -> list:
    """
    Flatten all elements from multiple documents into a single list
    Useful for creating a unified vector store
    
    Args:
        elements_dict: Dictionary mapping filename to elements
    
    Returns:
        List of all elements with source metadata
    """
    flattened = []
    
    for filename, elements in elements_dict.items():
        for element in elements:
            # Unstructured elements have immutable metadata
            # We can set the filename attribute directly
            if hasattr(element, 'metadata') and hasattr(element.metadata, 'filename'):
                element.metadata.filename = filename
            flattened.append(element)
    
    return flattened

def create_chunks_by_title(elements):
    """Create intelligent chunks using title-based strategy"""
    print("🔨 Creating smart chunks...")
    
    chunks = chunk_by_title(
        elements, # The parsed PDF elements from previous step
        max_characters=3000, # Hard limit - never exceed 3000 characters per chunk
        new_after_n_chars=2400, # Try to start a new chunk after 2400 characters
        combine_text_under_n_chars=500 # Merge tiny chunks under 500 chars with neighbors
    )
    
    print(f"✅ Created {len(chunks)} chunks")
    return chunks

def separate_content_types(chunk) :
    """Analyze what types of content are in a chunk."""
    content_data = {
        "text": chunk.text or "",
        "tables": [],
        "images": [],
        "types": ["text"],
    }

    if hasattr(chunk, "metadata") and hasattr(chunk.metadata, "orig_elements"):
        for element in chunk.metadata.orig_elements:
            element_type = type(element).__name__

            if element_type == "Table":
                content_data["types"].append("table")
                table_html = getattr(element.metadata, "text_as_html", element.text)
                content_data["tables"].append(table_html)

            elif element_type == "Image":
                if hasattr(element, "metadata") and hasattr(element.metadata, "image_base64"):
                    content_data["types"].append("image")
                    content_data["images"].append(element.metadata.image_base64)

    content_data["types"] = list(set(content_data["types"]))
    return content_data



def embed_text_with_clip(text: str,clip) -> List[float]:
    text = text.strip() or "[EMPTY CHUNK]"
    try:
        return clip.encode([text], convert_to_numpy=True)[0].tolist()
    except Exception:
        return clip.encode(["[EMPTY CHUNK]"], convert_to_numpy=True)[0].tolist()


def embed_images_with_clip(images_base64: List[str],clip) -> List[List[float]]:
    if not images_base64:
        return []

    pil_images = []
    for img_b64 in images_base64:
        try:
            img_bytes = base64.b64decode(img_b64)
            pil_img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
            pil_images.append(pil_img)
        except Exception:
            continue

    if not pil_images:
        return []

    img_embs = clip.encode(pil_images, convert_to_numpy=True)
    return [emb.tolist() for emb in img_embs]



import uuid

def summarise_chunks(chunks,clip):
    """Process all chunks WITHOUT LLM summaries, and build multi-vector data"""
    print("🧠 Processing chunks with CLIP embeddings (multi-vector)...")

    parent_documents: List[Document] = []
    # Each entry: { "parent_id": str, "vector": List[float], "metadata": {...} }
    child_vectors = []  # : List[Dict[str, Any]]

    total_chunks = len(chunks)

    for i, chunk in enumerate(chunks):
        current_chunk = i + 1
        print(f"   Processing chunk {current_chunk}/{total_chunks}")

        content_data = separate_content_types(chunk)
        text = content_data["text"]
        tables = content_data["tables"]
        images_b64 = content_data["images"]

        print(f"     Types found: {content_data['types']}")
        print(f"     Tables: {len(tables)}, Images: {len(images_b64)}")

        # ---- Build full text content (raw) ----
        # You can concatenate tables as text if you want them in retrieval text
        tables_as_text = "\n\n".join(tables) if tables else ""
        full_text = text
        if tables_as_text:
            full_text += "\n\n[TABLES]\n" + tables_as_text

        # ---- Create parent Document (what you will feed to LLaVA) , each chunk : parent doc, org chunk : parentdoc ----
        parent_id = str(uuid.uuid4())
        parent_doc = Document(
            page_content=full_text,  # text  + tables as text
            metadata={
                "parent_id": parent_id,
                "original_content": json.dumps({
                    "raw_text": text,
                    "tables_html": tables,
                    "images_base64": images_b64,
                }),
            },
        )
        parent_documents.append(parent_doc)

        # ---- Child vector: text embedding ----
        text_vec = embed_text_with_clip(full_text,clip)
        child_vectors.append({
            "parent_id": parent_id,
            "vector": text_vec,
            "metadata": {
                "modality": "text",
                "parent_id": parent_id,
            },
        })

        # ---- Child vectors: image embeddings ----
        # suppose tei auta chunk ma 3 images  
        if images_b64:
            img_vecs = embed_images_with_clip(images_b64,clip)
            for idx, vec in enumerate(img_vecs):
                child_vectors.append({
                    "parent_id": parent_id,
                    "vector": vec,
                    "metadata": {
                        "modality": "image",
                        "image_index": idx,  # eg: parentid 2 -> chunk no 2 ->has 3 images , idx 0,1,2
                        "parent_id": parent_id,  
                    },
                })

    print(f"✅ Processed {len(parent_documents)} parent chunks and {len(child_vectors)} child vectors")
    return parent_documents, child_vectors



def store_child_vectors_pinecone(
    index,
    child_vectors: List[dict[str, Any]],
    index_name: str = "research-assistant",
    dimension: int = 768
):
    """Store only child vectors in Pinecone"""
    
    print("🔮 Storing child vectors in Pinecone...")
    
    # Prepare vectors
    vectors_to_upsert = []
    for i, cv in enumerate(child_vectors):
        vectors_to_upsert.append({
            "id": f"child_{i}",
            "values": cv["vector"],
            "metadata": cv["metadata"]
        })
    
    # Upsert in batches
    batch_size = 100
    total_batches = (len(vectors_to_upsert) + batch_size - 1) // batch_size
    
    for i in range(0, len(vectors_to_upsert), batch_size):
        batch = vectors_to_upsert[i:i + batch_size]
        index.upsert(vectors=batch)
        print(f"   ✓ Batch {i//batch_size + 1}/{total_batches}")
    
    # Verify
    stats = index.describe_index_stats()
    print(f"✅ Total vectors in Pinecone: {stats['total_vector_count']}")
    
    return index


def load_pinecone_index(index_name: str = "research-assistant"):
    """Load existing Pinecone index"""
    
    print(f"📂 Loading Pinecone index: {index_name}")
    
    # Initialize Pinecone
    pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
    
    # Check if index exists
    # if not pc.has_index(index_name):
    #     raise ValueError(f"❌ Index '{index_name}' does not exist!")
    
    # Connect to index
    index = pc.Index(index_name)
    
    # Get stats
    stats = index.describe_index_stats()
    print(f"✅ Loaded index: {index_name}")
    print(f"   Total vectors: {stats['total_vector_count']}")
    print(f"   Dimension: {stats['dimension']}")
    
    return index


def store_parents_in_supabase(parent_documents: List[Document]):
    """Store parent documents in Supabase PostgreSQL"""
    
    print("💾 Storing parent documents in Supabase...")
    
    # Initialize Supabase client
    supabase: Client = create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_KEY"]
    )
    
    # Prepare data for batch insert
    records = []
    for doc in parent_documents:
        records.append({
            "parent_id": doc.metadata["parent_id"],
            "content": doc.page_content,  # full_text (text + tables as text)
            "original_content": doc.metadata["original_content"]  # JSON string with raw_text, tables_html, images_base64
        })
    
    # Insert all records (upsert to handle duplicates)
    response = supabase.table('parent_documents').upsert(records).execute()
    
    print(f"✅ Stored {len(records)} parent documents in Supabase")
    return response


def load_parent_from_supabase(parent_id: str) -> Document:
    """Load a single parent document by parent_id"""
    
    supabase: Client = create_client(
        os.environ.get("SUPABASE_URL"),
        os.environ.get("SUPABASE_KEY")
    )
    
    # Query by parent_id
    result = supabase.table('parent_documents')\
        .select('*')\
        .eq('parent_id', parent_id)\
        .execute()
    
    if not result.data:
        return None
    
    row = result.data[0]
    
    # Reconstruct Document
    doc = Document(
        page_content=row['content'],  # fulltext= text + tables as text 
        metadata={
            "parent_id": row['parent_id'],
            "original_content": row['original_content']
        }
    )
    
    return doc



def load_multiple_parents_from_supabase(parent_ids: List[str]) -> List[Document]:
    """Load multiple parent documents by their IDs"""
    
    supabase: Client = create_client(
        os.environ.get("SUPABASE_URL"),
        os.environ.get("SUPABASE_KEY")
    )
    
    # Query multiple IDs
    result = supabase.table('parent_documents')\
        .select('*')\
        .in_('parent_id', parent_ids)\
        .execute()
    
    documents = []
    for row in result.data:
        doc = Document(
            page_content=row['content'],
            metadata={
                "parent_id": row['parent_id'],
                "original_content": row['original_content']
            }
        )
        documents.append(doc)
    
    return documents


# NEW: Helper to load all parent documents from Supabase (for BM25)
def load_all_parents_from_supabase() -> List[Document]:
    """Load all parent documents from Supabase for BM25 indexing."""
    print("📥 Loading all parent documents from Supabase...")
    
    supabase: Client = create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_KEY"]
    )
    
    response = supabase.table('parent_documents').select('*').execute()
    
    if not response.data:
        raise ValueError("No parent documents found in Supabase.")
    
    parent_documents = []
    for row in response.data:
        doc = Document(
            page_content=row['content'],
            metadata={
                "parent_id": row['parent_id'],
                "original_content": row['original_content']
            }
        )
        parent_documents.append(doc)
    
    print(f"✅ Loaded {len(parent_documents)} parent documents")
    return parent_documents




class PineconeRetriever(BaseRetriever):
    # Declare your fields here with type hints
    index: Any
    clip: Any
    embed_text_with_clip: Callable
    load_multiple_parents_from_supabase: Callable
    k: int = 20

    def _get_relevant_documents(self, query: str) -> List[Document]:
        print(f"🔍 Vector search: '{query}'")
        
        # Access variables using self.fieldname as usual
        q_vec = self.embed_text_with_clip(query,self.clip)
        if hasattr(q_vec, 'tolist'):
            q_vec = q_vec.tolist()
        
        results = self.index.query(
            vector=q_vec,
            top_k=self.k,
            include_metadata=True
        )
        
        seen = set()
        parent_ids = []
        if 'matches' in results:
            for match in results['matches']:
                pid = match['metadata'].get("parent_id")
                if pid and pid not in seen:
                    parent_ids.append(pid)
                    seen.add(pid)
        
        parents = self.load_multiple_parents_from_supabase(parent_ids)
        print(f"✅ Vector retrieved {len(parents)} unique parents")
        return parents
    

def retrieve_parent_docs_hybrid(
    query: str,
    index,  # Pinecone index
    clip,
    embed_text_with_clip,
    load_multiple_parents_from_supabase,  # Pass this function
    cohere_api_key: str,  # Required for Cohere reranking
    k: int = 5,
    rerank_top_n: int = 20,  # Initial retrieve per retriever, then fuse, then rerank top N
    vector_weight: float = 0.7,
    bm25_weight: float = 0.3,
    rerank_model: str = "rerank-english-v3.0",  # Cohere model
) -> List[Document]:
    """Hybrid retrieval: Vector (Pinecone) + BM25 → RRF Fusion via EnsembleRetriever → Cohere Rerank → Top K
    
    Note: For large corpora, consider caching parent_documents globally instead of loading every time.
    Requires Cohere API key for reranking.
    """
    
    print(f"🔍 Hybrid search: '{query}'")
    
    # Load all parents for BM25 (cache this if possible)
    parent_documents = load_all_parents_from_supabase()
    
    # Setup BM25 retriever
    bm25_retriever = BM25Retriever.from_documents(parent_documents)
    bm25_retriever.k = rerank_top_n
    
    # Setup vector retriever
    vector_retriever = PineconeRetriever(
        index=index,
        clip=clip,
        embed_text_with_clip=embed_text_with_clip,
        load_multiple_parents_from_supabase=load_multiple_parents_from_supabase,
        k=rerank_top_n,
    )
    
    # Hybrid via Ensemble (uses RRF internally)
    hybrid_retriever = EnsembleRetriever(
        retrievers=[vector_retriever, bm25_retriever],
        weights=[vector_weight, bm25_weight]
    )
    
    # Get fused candidates
    candidate_docs = hybrid_retriever.invoke(query)
    # after rrf pani , this candidate_docs contains all the chunks ,not top 25 ranking chunks , it orders and ranks through rrf internally 
    # but still returns all the candidates it found from both retrievers
    candidate_docs = candidate_docs[:20]  # take top 20 candidates for reranking
    print(f"📊 Hybrid retrieved {len(candidate_docs)} candidates")
    
    # Cohere reranking
    print("🎯 Reranking with Cohere...")
    cohere_reranker = CohereRerank(
        cohere_api_key=cohere_api_key,
        model=rerank_model,
        top_n=k   # k=5
    )
    reranked_docs = cohere_reranker.compress_documents(
        documents=candidate_docs,
        query=query
    )
    print(f"✅ Returned top {len(reranked_docs)} after reranking")
    return reranked_docs

def generate_final_answer_with_groq(
    chunks: List[Document],
    query: str,
    text_model: str = "llama-3.3-70b-versatile",
    vision_model: str = "meta-llama/llama-4-scout-17b-16e-instruct",
    temperature: float = 0.2,
    max_tokens: int = 1024,
    max_images: int = 5,
) -> str:
    """Route to text or vision model depending on whether images are present."""

    context_parts = []
    all_images = []

    # Build context and collect images
    for i, chunk in enumerate(chunks):
        part = []

        original_json = chunk.metadata.get("original_content")
        if original_json:
            original_data = json.loads(original_json)

            raw_text = original_data.get("raw_text", "")
            if raw_text:
                part.append(raw_text)

            tables_html = original_data.get("tables_html", []) or []
            if tables_html:
                part.append("\n--- Tables ---")
                part.extend(tables_html)

            images = original_data.get("images_base64", []) or []
            all_images.extend(images)
        else:
            part.append(chunk.page_content)

        context_parts.append("\n".join(part))

    context_text = "\n\n".join(context_parts)

    base_instructions = """Answer the question naturally and directly using the information from the provided context.

IMPORTANT RULES:
- Do NOT mention "Document 1", "Document 2", or any document numbers in your response
- Write as if you're explaining the answer naturally, synthesizing information from all sources
- Be precise and concise
- If the provided context does not contain enough information to answer the question, simply respond: "I don't know" or "I couldn't find information about that in the available documents."
- Do not make up or infer information beyond what is explicitly stated in the context
- Focus on directly answering what the user asked
"""

    client = Groq(api_key=os.getenv("GROQ_API_KEY"))

    # Case 1: no images -> pure text model
    if not all_images:
        combined_input = f"""Question: {query}

Context:
{context_text}

{base_instructions}

Answer:"""
        
        messages = [
            {
                "role": "system",
                "content": "You are a helpful research assistant. Answer questions naturally based only on the provided context. Never mention document numbers or references. If you don't have enough information, simply say 'I don't know' or 'I couldn't find that information.'",
            },
            {
                "role": "user",
                "content": combined_input,
            },
        ]
        model = text_model

    # Case 2: images present -> vision model with multimodal message
    else:
        prompt = f"""Question: {query}

Context:
{context_text}

{base_instructions}

Answer:"""
        
        user_content = [{"type": "text", "text": prompt}]
        for img_b64 in all_images[:max_images]:
            user_content.append(
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:image/jpeg;base64,{img_b64}"},
                }
            )

        messages = [
            {
                "role": "system",
                "content": "You are a helpful research assistant. Answer questions naturally based only on the provided context (text, tables, and images). Never mention document numbers or references. If you don't have enough information, simply say 'I don't know' or 'I couldn't find that information.'",
            },
            {
                "role": "user",
                "content": user_content,
            },
        ]
        model = vision_model

    try:
        response = client.chat.completions.create(
            messages=messages,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"❌ Groq answer generation failed: {e}")
        return "Sorry, I encountered an error while generating the answer."

# def generate_final_answer_with_groq(
#     chunks: List[Document],
#     query: str,
#     text_model: str = "llama-3.3-70b-versatile",
#     vision_model: str = "meta-llama/llama-4-scout-17b-16e-instruct",
#     temperature: float = 0.2,
#     max_tokens: int = 1024,
#     max_images: int = 5,
# ) -> str:
#     """Route to text or vision model depending on whether images are present."""

#     context_parts = []
#     all_images = []

#     # Build context and collect images
#     for i, chunk in enumerate(chunks):
#         part = [f"--- Document {i+1} ---"]

#         original_json = chunk.metadata.get("original_content")
#         if original_json:
#             original_data = json.loads(original_json)

#             raw_text = original_data.get("raw_text", "")
#             if raw_text:
#                 part.append("TEXT:")
#                 part.append(raw_text)

#             tables_html = original_data.get("tables_html", []) or []
#             if tables_html:
#                 part.append("TABLES (HTML):")
#                 part.extend(tables_html)

#             images = original_data.get("images_base64", []) or []
#             all_images.extend(images)
#         else:
#             part.append(chunk.page_content)

#         context_parts.append("\n".join(part))

#     context_text = "\n\n".join(context_parts)

#     base_instructions = """Use only the information from these documents.
# If the documents don't contain enough information to answer, say:
# "I don't have enough information to answer that question based on the provided documents."
# Be precise and concise, and reference key details from the text/tables/images when needed.
# """

#     client = Groq(api_key=os.getenv("GROQ_API_KEY"))

#     # Case 1: no images -> pure text model
#     if not all_images:
#         combined_input = f"""Based on the following documents, please answer this question.

# Question:
# {query}

# Documents:
# {context_text}

# Instructions:
# {base_instructions}
# """
#         messages = [
#             {
#                 "role": "system",
#                 "content": "You are a helpful assistant that answers strictly based on the provided documents.",
#             },
#             {
#                 "role": "user",
#                 "content": combined_input,
#             },
#         ]
#         model = text_model

#     # Case 2: images present -> vision model with multimodal message
#     else:
#         prompt = f"""You are a helpful assistant that must answer based ONLY on the documents, tables, and images.

# Question:
# {query}

# Documents:
# {context_text}

# Instructions:
# {base_instructions}
# """
#         user_content = [{"type": "text", "text": prompt}]
#         for img_b64 in all_images[:max_images]:
#             user_content.append(
#                 {
#                     "type": "image_url",
#                     "image_url": {"url": f"data:image/jpeg;base64,{img_b64}"},
#                 }
#             )

#         messages = [
#             {
#                 "role": "system",
#                 "content": "You answer strictly based on the provided documents, tables, and images.",
#             },
#             {
#                 "role": "user",
#                 "content": user_content,
#             },
#         ]
#         model = vision_model

#     try:
#         response = client.chat.completions.create(
#             messages=messages,
#             model=model,
#             temperature=temperature,
#             max_tokens=max_tokens,
#         )
#         return response.choices[0].message.content
#     except Exception as e:
#         print(f"❌ Groq answer generation failed: {e}")
#         return "Sorry, I encountered an error while generating the answer."


