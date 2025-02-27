import bcrypt from "bcrypt";
import { db } from "../config/db";
import { Gender, User } from "../entities/User";
import { ApiError } from "../types";

export async function isDuplicateUser(email: string) {
  if (!email) {
    return new ApiError(400, "Email is required", []);
  }
  try {
    const user = await db.getRepository(User).findOne({ where: { email } });
    if (user) {
      return new ApiError(400, "Email already exists", []);
    }
    return false;
  } catch (error) {
    return new ApiError(500, "Internal server error", [error]);
  }
}

export async function createNewUser(
  email: string,
  password: string,
  name: string,
  gender: Gender
) {
  if (!email || !password || !name || !gender) {
    return new ApiError(400, "Invalid data", []);
  }
  const user = new User();
  user.email = email;
  user.password = bcrypt.hashSync(password, 10);
  user.name = name;
  user.gender = gender;
  user.profilePicture = `https://avatar.iran.liara.run/public/${
    gender === "MALE" ? "boy" : "girl"
  }?username=${user.email}`;
  try {
    const { password, ...savedUser } = await user.save();
    const accessToken = await user.generateAccessToken();
    return { accessToken, savedUser };
  } catch (error) {
    return new ApiError(500, "Internal server error", [error]);
  }
}

export async function getUserByEmail(email: string) {
  try {
    const user = await db.getRepository(User).findOne({ where: { email } });
    if (!user) {
      return new ApiError(404, "User not found", []);
    }
    return user;
  } catch (error) {
    return new ApiError(500, "Internal server error", [error]);
  }
}

export async function getUserById(id: string): Promise<User | ApiError> {
  try {
    const user = await db.getRepository(User).findOne({ where: { id } });
    if (!user) {
      return new ApiError(404, "User not found", []);
    }
    return user;
  } catch (error) {
    return new ApiError(500, "Internal server error", [error]);
  }
}
