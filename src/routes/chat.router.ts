import { ChatController } from "controllers/chat.controller";
import Router from "express";
import { uploader } from "middlewares/multer.middleware";
import { verifyUser } from "../middlewares/auth.middleware";

const chatRouter = Router();

chatRouter.post(
  "/createConversation",
  verifyUser,
  uploader("pdfFile"),
  ChatController.createConversation
);

chatRouter.get(
    "/getConversations",
    verifyUser,
    ChatController.getConversations
)

chatRouter.get(
  "/getConversationById/:id",
  verifyUser,
  ChatController.getConversationById
)

chatRouter.post("/sendMessage", verifyUser, ChatController.sendMessage)

export default chatRouter;
