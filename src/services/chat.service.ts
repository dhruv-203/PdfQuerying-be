import { Document } from "@langchain/core/documents";
import ollama from "ollama";
import { getPrompt } from "utils";
import { db } from "../config/db";
import { Conversation } from "../entities/Conversation";
import { User } from "../entities/User";
import { ApiError } from "../types";
export async function createConversation(user: User) {
  const conversation = new Conversation();
  conversation.user = user;
  try {
    await conversation.save();
  } catch (error) {
    return new ApiError(
      500,
      "Internal Server Error, while creating conversation",
      [error]
    );
  }
  return conversation;
}

export async function getAllConversations(user: User) {
  try {
    const conversations = await db.getRepository(Conversation).find({
      where: { user: user },
      order: { createdAt: "DESC" },
    });

    return conversations;
  } catch (error) {
    return new ApiError(
      500,
      "Internal Server Error, while accessing conversations list",
      [error]
    );
  }
}

export async function getConversationById(id: string) {
  try {
    const conversation = await db.getRepository(Conversation).findOne({
      where: { id },
      relations: {
        messages: true,
      },
    });
    if (!conversation) return new ApiError(404, "Conversation not found", []);
    return conversation;
  } catch (error) {
    return new ApiError(
      500,
      "Internal Server Error, while accessing conversation by id",
      [error]
    );
  }
}

export async function generateResponse(
  context: Document[],
  userMessage: string,
  userId: string
) {
  const prompt = getPrompt(context, userMessage);
  try {
    const response = await ollama.chat({
      model: "gemma2:2b",
      messages: [
        {
          role: "system",
          content: prompt,
        },
      ],
    });
    return response.message.content;
  } catch (error) {
    return new ApiError(
      500,
      "Internal Server Error, while generating response",
      [error]
    );
  }
}
