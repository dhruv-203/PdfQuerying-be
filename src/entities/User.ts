import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
  BaseEntity,
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Conversation } from "./Conversation";

interface JwtPayload {
  id: string;
}

export enum Gender {
  MALE = "MALE",
  FEMALE = "FEMALE",
}

@Entity()
export class User extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "text" })
  profilePicture!: string;

  @Column({ type: "text" })
  name!: string;

  @Column({ type: "enum", enum: Gender })
  gender!: Gender;

  @Column({ type: "text" })
  email!: string;

  @Column({ type: "text" })
  password!: string;

  @OneToMany(() => Conversation, (conversation) => conversation.user)
  conversations!: Conversation[];

  async checkPassword(password: string) {
    return await bcrypt.compare(password, this.password);
  }

  async generateAccessToken() {
    try {
      const token = jwt.sign(
        {
          id: this.id,
        } as JwtPayload,
        process.env.SECRET_KEY as string,
        {
          expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
        } as jwt.SignOptions
      );
      console.log("This id: ", this.id);
      return token;
    } catch (error) {
      console.log(error);
      throw new Error("Something went wrong");
    }
  }
}
