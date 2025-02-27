import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Conversation } from "./Conversation";

@Entity()
export class Message extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: string;
  @Column({ type: "text" })
  message!: string;
  @CreateDateColumn()
  createdAt!: Date;
  @Column({ type: "enum", enum: ["SYSTEM", "USER"] })
  type!: "SYSTEM" | "USER";
  @ManyToOne(() => Conversation, (conversation) => conversation.messages)
  @JoinColumn({ name: "conversationId" })
  conversation!: Conversation;
}
