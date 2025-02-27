import { NextFunction, Request, Response } from "express";
import { validationResult } from "express-validator";
import {
  createNewUser,
  getUserByEmail,
  isDuplicateUser,
} from "../services/auth.service";
import { ApiError, ApiResponse, cookieOptions } from "../types";
// import { get } from "http";
export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError(400, "Validation Error", errors.array()));
    }
    const { name, email, password, gender } = req.body;

    const check = await isDuplicateUser(email);
    if (check instanceof ApiError) {
      return next(check);
    }
    const user = await createNewUser(email, password, name, gender);
    if (user instanceof ApiError) {
      return next(user);
    }
    res
      .cookie("AccessToken", user.accessToken, cookieOptions)
      .json(new ApiResponse(200, user.savedUser));
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError(400, "Validation Error", errors.array()));
    }
    const { email, password } = req.body;

    const user = await getUserByEmail(email);
    if (user instanceof ApiError) {
      return next(user);
    }
    const check = await user.checkPassword(password);
    if (!check) {
      return next(new ApiError(401, "Invalid Credentials", []));
    }
    const { password: pass, ...responseUser } = user;
    const accessToken = await user.generateAccessToken();
    res
      .cookie("AccessToken", accessToken, cookieOptions)
      .json(new ApiResponse(200, responseUser));
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    if (!req.user) {
      return next(new ApiError(401, "Unauthorized Logout Request", []));
    }
    res
      .clearCookie("AccessToken")
      .json(new ApiResponse(200, "Logout Successful"));
  }
}
