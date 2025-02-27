import { ConnectedUsers, io } from "app";
import { NextFunction, Request, Response } from "express";
import { ApiError, ApiResponse } from "types";
import { vectorStoreManager } from "vectorStoreManager";
import { Message } from "../entities/Message";
import {
  createConversation,
  generateResponse,
  getAllConversations,
  getConversationById,
} from "../services/chat.service";
import { getChunks, sendChatLogs, sendLogs, sendUserMessage } from "../utils";
export class ChatController {
  static async createConversation(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    if (!req.user) {
      return next(new ApiError(401, "Unauthorised Access", []));
    }
    // console.log(req.body);
    if (!req.file) {
      return next(new ApiError(400, "No File Uploaded", []));
    }
    sendLogs("File Received, extracting text...", req.user.id);
    const conversation = await createConversation(req.user);
    if (conversation instanceof ApiError) return next(conversation);

    // creating a collection for the conversation
    await vectorStoreManager.createCollection(conversation.id, req.user.id);

    // getting chunks of text from pdf file
    const chunks = await getChunks(req.file.path, req.user.id);
    if (chunks instanceof ApiError) return next(chunks);

    // embedding those chunks in vector store
    const check = await vectorStoreManager.addDocuments(
      conversation.id,
      chunks.chunks,
      req.user.id,
      chunks.ids
    );

    if (check instanceof ApiError) return next(check);
    if (Object.keys(ConnectedUsers).includes(req.user.id))
      io.to(ConnectedUsers[req.user.id]).emit("NewConvo");
    return res.status(200).json(
      new ApiResponse(200, {
        conversationId: conversation.id,
      })
    );
  }

  static async getConversations(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    if (!req.user) {
      return next(
        new ApiError(
          401,
          "Unauthorized Access, please login to access the conversations list",
          []
        )
      );
    }
    const conversations = await getAllConversations(req.user);
    if (conversations instanceof ApiError) return next(conversations);
    // use these conversations ids to display the user the list of conversations he has
    return res.status(200).json(
      new ApiResponse(200, {
        conversations: conversations.map((conversation) => conversation.id),
      })
    );
  }

  static async getConversationById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    if (!req.user) {
      return next(
        new ApiError(
          401,
          "Unauthorized Access, please login to access the conversation",
          []
        )
      );
    }
    const conversation = await getConversationById(req.params.id);
    if (conversation instanceof ApiError) return next(conversation);
    const isActiveCollectionExists =
      await vectorStoreManager.isActiveCollectionExists(conversation.id);
    return res.status(200).json(
      new ApiResponse(200, {
        conversation,
        isActiveCollectionExists,
      })
    );
  }

  static async sendMessage(req: Request, res: Response, next: NextFunction) {
    if (!req.user) {
      return next(
        new ApiError(
          401,
          "Unauthorized Access, please login to access the conversation",
          []
        )
      );
    }
    const { conversationId, message } = req.body;
    if (!conversationId) {
      return next(new ApiError(400, "Conversation Id is required", []));
    }
    if (!message) {
      return next(new ApiError(400, "Message is required", []));
    }
    const isActiveCollectionExists =
      await vectorStoreManager.isActiveCollectionExists(conversationId);
    if (!isActiveCollectionExists) {
      return next(
        new ApiError(
          404,
          "The Context of this conversation does not exist, you can create a new one",
          []
        )
      );
    }
    const conversation = await getConversationById(conversationId);
    if (conversation instanceof ApiError) return next(conversation);
    const userMessage = new Message();
    userMessage.conversation = conversation;
    userMessage.message = message;
    userMessage.type = "USER";
    conversation.messages.push(userMessage);
    try {
      await conversation.save();
    } catch (error) {
      return next(
        new ApiError(500, "Internal Server Error, while saving user message", [
          error,
        ])
      );
    }
    sendUserMessage(userMessage, req.user.id);
    sendChatLogs(
      { message: "Searching vector store...", done: false },
      req.user.id
    );
    //fetch the context of the message from the vector store
    const context = await vectorStoreManager.queryCollection(
      conversationId,
      message,
      7
    );
    if (context instanceof ApiError) return next(context);
    sendChatLogs({ message: "Search completed", done: true }, req.user.id);
    // after getting the context, use ollama to generate a response for the user
    sendChatLogs(
      { message: "Context retrieved, Model is thinking...", done: false },
      req.user.id
    );
    const response = await generateResponse(context, message, req.user.id);
    if (response instanceof ApiError) return next(response);
    sendChatLogs({ message: "Response generated", done: false }, req.user.id);
    const systemMessage = new Message();
    systemMessage.conversation = conversation;
    systemMessage.message = response;
    systemMessage.type = "SYSTEM";
    conversation.messages.push(systemMessage);
    try {
      await conversation.save();
    } catch (error) {
      return next(
        new ApiError(
          500,
          "Internal Server Error, while saving system message",
          [error]
        )
      );
    }
    sendChatLogs({ message: "Conversation Saved", done: true }, req.user.id);
    sendUserMessage(systemMessage, req.user.id);
    return res
      .status(200)
      .json(
        new ApiResponse(200, { message: "Response Generated Successfully" })
      );
  }
}
