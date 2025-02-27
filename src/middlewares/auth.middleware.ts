import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { db } from "../config/db";
import { User } from "../entities/User";
import { ApiError } from "../types";
export async function verifyUser(
  req: Request,
  _: Response,
  next: NextFunction
) {
  const token: string =
    req.cookies?.AccessToken ||
    req.headers?.authorization?.replace("Bearer ", "");
  if (!token || token.trim() === "") {
    return next(new ApiError(404, "Unauthorised access: missing token", []));
  }
  try {
    // console.log("Token: ", token);
    const { id } = jwt.verify(
      token,
      process.env.SECRET_KEY as string
    ) as JwtPayload;
    if (id) {
      const user = await db.getRepository(User).findOne({
        where: { id },
      });

      if (!user) {
        return next(new ApiError(404, "User not found on this access key", []));
      }
      req.user = user;
    } else {
      return next(new ApiError(500, "Unable to decode access token", []));
    }
  } catch (error) {
    console.log("Error in verifyUser middleware: ", error);
    return next(
      new ApiError(401, "Unauthorised access: invalid access token", [error])
    );
  }
  next();
}
