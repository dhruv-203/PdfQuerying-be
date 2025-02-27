import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

import { ConnectedUsers, io } from "app";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { Message } from "./entities/Message";
import { ApiError } from "./types";

function checkFilePath(filePath: string) {
  if (fs.existsSync(filePath)) {
    return true;
  } else {
    return false;
  }
}

export async function getChunks(
  filePath: string,
  userId: string
): Promise<
  | ApiError
  | {
      chunks: Document[];
      ids: string[];
    }
> {
  if (!checkFilePath(filePath)) {
    return new ApiError(500, "File does not exist", []);
  }
  sendLogs("File path is valid", userId);
  sendLogs("Loading the file...", userId);
  const pdfLoader = new PDFLoader(filePath);

  sendLogs("File loaded", userId);
  sendLogs("Splitting the file...", userId);
  // Split text into chunks
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 512,
    chunkOverlap: 128,
  });

  const docs = await pdfLoader.load();
  if (docs.length === 0) {
    return new ApiError(
      404,
      "No documents found, Please upload proper pdf file",
      []
    );
  }
  sendLogs("Chunks split", userId);
  sendLogs("Loading chunks...", userId);
  const chunks = await textSplitter.splitDocuments(docs);
  console.log("Summarising chunks...");
  return {
    chunks: chunks,
    ids: getIds(chunks.length),
  };
}

function getIds(chunksLength: number) {
  const ids = [];
  for (let i = 0; i < chunksLength; i++) {
    ids.push(uuidv4());
  }
  return ids;
}

export function sendLogs(message: string, userID: string) {
  if (
    Object.keys(ConnectedUsers).length > 0 &&
    Object.keys(ConnectedUsers).includes(userID)
  ) {
    const socketID = ConnectedUsers[userID];
    io.to(socketID).emit("pdfUploadLogs", message);
  }
}

export function sendChatLogs(
  message: { message: string; done: boolean },
  userID: string
) {
  if (
    Object.keys(ConnectedUsers).length > 0 &&
    Object.keys(ConnectedUsers).includes(userID)
  ) {
    const socketID = ConnectedUsers[userID];
    io.to(socketID).emit("chatLogs", message);
  }
}

export function sendUserMessage(message: Message, userID: string) {
  const { conversation, ...cleanMessage } = message;
  if (
    Object.keys(ConnectedUsers).length > 0 &&
    Object.keys(ConnectedUsers).includes(userID)
  ) {
    const socketID = ConnectedUsers[userID];
    io.to(socketID).emit("userMessage", cleanMessage);
  }
}

export const getPrompt = (context: Document[], user_query: string) => {
  const retrieved_context = context.map((doc) => doc.pageContent).join("\n\n");
  return `
    You are a helpful assistant that responds to user queries based on two inputs:
      1. CONTEXT: ${retrieved_context}
      2. USER_PROMPT: ${user_query}

Follow these principles:

  1. Understand that the CONTEXT contains information specifically retrieved for this query. This is your primary source for answering.

  2. The USER_PROMPT represents exactly what the user is asking. Address this prompt directly.

  3. If the CONTEXT is sufficient, base your answer primarily on it.

  4. If the CONTEXT is insufficient or partially relevant, supplement with your general knowledge to provide a complete answer.

  5. Intelligently infer the desired response length from the USER_PROMPT:
      - Look for explicit indicators like "briefly," "in detail," "summarize," "elaborate," etc.
      - Consider implicit cues like question complexity, format requests, or time constraints mentioned.
      - Adjust response length based on the nature of the question (simple facts vs. complex explanations).
      - Default to concise but complete responses when no length preference is indicated.
      - If the USER_PROMPT is unclear or ambiguous, default to a concise response answering in at max 100 words.

  6. Speak directly to the user in a natural, conversational tone. Never refer to "the user" in third person or mention that you're responding to "the context" or "the prompt."

  7. Format your responses using proper GitHub-flavored markdown to enhance readability:
      - Use headings (##, ###) to organize information
      - Use **bold** and *italic* for emphasis when appropriate
      - Create tables when presenting structured data
      - Use code blocks with language specification for code snippets
      - Use bulleted or numbered lists for sequential information
      - Add horizontal rules (---) to separate sections when helpful
      - Only use markdown formatting when it genuinely improves readability
      - always provide proper formatting for the response, don't use vague markdown formatting

  8. Adapt your responses to address what the user is truly asking for in the USER_PROMPT, even if vaguely worded.

  9. When CONTEXT is insufficient and you must rely on general knowledge, maintain confidence but avoid presenting speculation as fact.

  10. When the user requests information outside your capabilities or knowledge, clearly state your limitations and offer alternatives when possible.
 `;
};
