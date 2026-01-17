export interface ChunkMetadata {
  parent_id: string;
  original_content: string;
}

export interface Chunk {
  page_content: string;
  metadata: ChunkMetadata;
}

export interface ParsedOriginalContent {
  raw_text: string;
  tables_html: string[];
  images_base64: string[];
}

export interface QueryResponse {
  answer: string;
  chunks_retrieved: number;
  chunks: Chunk[];
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  chunks?: Chunk[];
  chunksRetrieved?: number;
  timestamp: Date;
}
