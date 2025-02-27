import cookieParser from "cookie-parser";
import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import { existsSync, rmSync } from "fs";
import http from "http";
import jwt, { JwtPayload } from "jsonwebtoken";
import path from "path";
import { Server } from "socket.io";
import { vectorStoreManager } from "vectorStoreManager";
import { ErrorHandler } from "./middlewares/errorHandler.middleware";
import authRouter from "./routes/auth.router";
import chatRouter from "./routes/chat.router";
import { getUserById } from "./services/auth.service";
import { getAllConversations } from "./services/chat.service";
import { ApiError } from "./types";
// import { ApiError } from "../utils/ApiError";
// import { ApiResponse } from "../utils/ApiResponse";
// import { verifyUser } from "./middlware/auth.middleware";
// import { ErrorHandler } from "./middlware/errorHandler.middleware";
// import authRouter from "./routes/auth.router";
// import { chatRouter } from "./routes/chat.router";
// import { getConnectedUsers } from "./services/io.service";
// import { getAllUsers } from "./services/user.service";
const app = express();
const server = http.createServer(app);
app.use(cookieParser());
app.use(express.json());
export const ConnectedUsers: { [key: string]: string } = {};
export const ConversationsFiles: { [key: string]: string } = {};

app.use((req, res, next) => {
  console.log("Incoming request from origin:", req.headers.origin + req.url);
  next();
});

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      // uncomment this if you face cors error with multipart/form-data
      // "Origin",
      // "Accept",
      // "X-Requested-With",
    ],
  })
);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  },
});

app.use("/auth", authRouter);
app.use("/chat", chatRouter);

// app.get(
//   "/getAllUsers",
//   verifyUser,
//   async (req: Request, res: Response, next: NextFunction) => {
//     if (!req.user) {
//       return next(new ApiError(401, "Unauthorized Access", []));
//     }
//     const users = await getAllUsers();
//     if (users instanceof ApiError) {
//       return next(users);
//     }
//     return res.status(200).json(new ApiResponse(200, users));
//   }
// );

// app.use("/chat", verifyUser, chatRouter);

io.use(async (socket, next) => {
  if (!socket.handshake.headers.cookie) {
    return next(new ApiError(404, "Access Token Not Found", []));
  }

  const cookies = socket.handshake.headers.cookie
    .split(";")
    .reduce<{ [key: string]: string }>((acc, val) => {
      acc[val.split("=")[0].trim()] = val.split("=")[1].trim();
      return acc;
    }, {});

  if (!cookies || !cookies["AccessToken"]) {
    return next(new ApiError(401, "Unauthorized", []));
  }
  try {
    const { id: userId } = jwt.verify(
      cookies["AccessToken"],
      process.env.SECRET_KEY as string
    ) as JwtPayload;
    if (userId) {
      ConnectedUsers[userId] = socket.id;
      socket.handshake.query.userId = userId as string;

      next();
    } else {
      return next(new ApiError(500, "Unable to decode access token", []));
    }
  } catch (error) {
    console.log("Error in verifyUser middleware: ", error);
    return next(
      new ApiError(401, "Unauthorised access: invalid access token", [error])
    );
  }
});

io.on("connection", async (socket) => {
  console.log("ConnectedUsers: ", ConnectedUsers);

  socket.on("disconnect", async () => {
    Object.entries(ConnectedUsers).forEach(async ([key, value]) => {
      if (value === socket.id) {
        const user = await getUserById(key);
        if (user instanceof ApiError) throw user;
        const conversations = await getAllConversations(user);
        if (conversations instanceof ApiError) throw conversations;
        vectorStoreManager.deleteCollections(
          conversations.map((conversation) => conversation.id)
        );
        const destPath = path.join(process.cwd(), "public", "users", key);
        // rmdirSync(`${destPath}`, { recursive: true });
        // delete the directory if it exists
        if (existsSync(destPath)) {
          rmSync(destPath, { recursive: true });
        }
        delete ConnectedUsers[key];
      }
    });
    console.log("ConnectedUsers: ", ConnectedUsers);
  });
});

app.use(
  ErrorHandler as (
    err: ApiError,
    req: Request,
    res: Response,
    next: NextFunction
  ) => Response | void
);

export { app, io, server };
