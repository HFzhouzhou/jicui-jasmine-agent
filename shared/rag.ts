/** Knowledge documents are private until explicitly published by a manager. */
export type DocumentStatus = 'draft' | 'published' | 'archived';
export interface KnowledgeDocument {
  id: string;
  title: string;
  filename: string;
  format: string;
  source: string;
  status: DocumentStatus;
  version: string;
  createdAt: string;
  updatedAt: string;
  chunkCount: number;
  charCount: number;
  pageCount: number;
  warnings: string[];
  hash: string;
}
export interface KnowledgeChunk {
  id: string;
  documentId: string;
  ordinal: number;
  text: string;
  page?: number;
  section?: string;
}
export interface KnowledgeDocumentDetail { document: KnowledgeDocument; chunks: KnowledgeChunk[]; content: string }
export interface KnowledgeHit extends KnowledgeChunk {
  title: string;
  source: string;
  documentVersion: string;
  score: number;
}
export interface KnowledgeSearchResult {
  query: string;
  hits: KnowledgeHit[];
  mode: 'lexical' | 'hybrid';
  elapsedMs: number;
  embeddingCoverage?: {indexed: number; total: number};
}
export interface KnowledgeCitation {
  id: string;
  documentId: string;
  documentTitle: string;
  source: string;
  page?: number;
  section?: string;
  excerpt: string;
}
export interface KnowledgeOverview {
  documents: KnowledgeDocument[];
  stats: { documents: number; published: number; chunks: number; characters: number };
  capabilities: { formats: string[]; ocrAvailable: boolean; embeddingsConfigured: boolean; maxFileBytes: number };
}
