import {
  BaseEntity,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Message } from "./Message";
import { User } from "./User";

@Entity()
export class Conversation extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;
  @ManyToOne(() => User, (user) => user.conversations, { cascade: true })
  @JoinColumn({ name: "userId" })
  user!: User;
  @OneToMany(() => Message, (message) => message.conversation, {
    cascade: true,
  })
  messages!: Message[];
  @CreateDateColumn()
  createdAt!: Date;
}
