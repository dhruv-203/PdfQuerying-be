import "reflect-metadata";
import { DataSource } from "typeorm";
import { Conversation } from "../entities/Conversation";
import { Message } from "../entities/Message";
// import { Message } from "../entities/message";
import { User } from "../entities/User";

export const db = new DataSource({
  type: "postgres",
  synchronize: true,
  logging: ["error"],
  url: process.env.DATABASE_URL,
  //   entities: [User, Message],
  entities: [User, Conversation, Message],
});
