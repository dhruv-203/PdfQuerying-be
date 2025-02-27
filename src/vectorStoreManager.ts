// src/services/VectorStoreManager.ts
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { Document } from "@langchain/core/documents";
import { OllamaEmbeddings } from "@langchain/ollama";
import { ApiError } from "types";
import { sendLogs } from "utils";
// import { v4 as uuidv4 } from 'uuid';

class VectorStoreManager {
  private embeddings: OllamaEmbeddings;
  private activeCollections: Map<string, Chroma>;
  private chunksIDMapping: Map<string, string[]>;
  constructor() {
    this.embeddings = new OllamaEmbeddings({
      model: "bge-large:latest", // Default value
      baseUrl: "http://localhost:11434", // Default value,
      keepAlive: "5m", // Increase timeout to 60 seconds
    });
    this.activeCollections = new Map();
    this.chunksIDMapping = new Map();
  }

  //   async isConversationExists(userID: string): Promise<boolean> {}

  async createCollection(
    conversationId: string,
    userId: string
  ): Promise<boolean> {
    // const collectionId = uuidv4();
    sendLogs("Creating Collection...", userId);
    const vectorStore = new Chroma(this.embeddings, {
      collectionName: conversationId,
      url: "http://localhost:8080",
      collectionMetadata: { "hnsw:space": "cosine" },
    });
    // await vectorStore
    this.activeCollections.set(conversationId, vectorStore);
    sendLogs("Collection Created", userId);
    return true;
  }

  async addDocuments(
    conversationId: string,
    documents: Document[],
    userId: string,
    ids: string[]
  ): Promise<ApiError | void> {
    const vectorStore = this.activeCollections.get(conversationId);
    if (!vectorStore) return new ApiError(500, "Collection not found", []);
    sendLogs("Embedding Documents...", userId);

    const batchSize = 20;
    for (let i = 0; i < documents.length; i += batchSize) {
      try {
        await vectorStore.addDocuments(documents.slice(i, i + batchSize), {
          ids: ids.slice(i, i + batchSize),
        });
      } catch (error) {
        return new ApiError(500, "Error while adding documents", [error]);
      }
      sendLogs(
        `Embedding Documents in Batches: Added batch ${
          i / batchSize + 1
        } of ${Math.ceil(documents.length / batchSize)}`,
        userId
      );
    }
    this.chunksIDMapping.set(conversationId, ids);
  } //cover in try-catch before using

  async queryCollection(
    conversationId: string,
    query: string,
    k = 3
  ): Promise<ApiError | Document[]> {
    const vectorStore = this.activeCollections.get(conversationId);
    if (!vectorStore) return new ApiError(500, "Collection not found", []);
    return vectorStore.similaritySearch(query, k);
  }

  async isActiveCollectionExists(conversationId: string): Promise<boolean> {
    return this.activeCollections.has(conversationId);
  }

  async deleteCollections(conversationIds: string[]): Promise<ApiError | void> {
    // this conversationIds are the all the conversations that user had in past, filter them by comparing with activeCollections, then delete them
    const activeConversation = conversationIds.filter((id) => {
      console.log("Conversation Id: ", this.activeCollections.has(id));
      return this.activeCollections.has(id);
    });

    console.log("Deleting Collections...", activeConversation);

    activeConversation.forEach(async (id) => {
      console.log("Deleting collection: ", id);
      const vectorStore = this.activeCollections.get(id);
      if (!vectorStore) return new ApiError(500, "Collection not found", []);
      const chunks = this.chunksIDMapping.get(id);
      if (!chunks) return new ApiError(500, "Chunks not found", []);
      try {
        await vectorStore.delete({ ids: chunks });
      } catch (error) {
        return new ApiError(500, "Error while deleting collection", [error]);
      }
      this.chunksIDMapping.delete(id);
      this.activeCollections.delete(id);
    });
  }
}

export const vectorStoreManager = new VectorStoreManager();
