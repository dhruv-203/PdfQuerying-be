import { NextFunction, Request, Response } from "express";
import { ApiError } from "../types";
export function ErrorHandler(
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): Response | void {
  const statusCode = err instanceof ApiError ? err.statusCode : 500;
  const message = err.message || "Internal Server Error";
  return res
    .status(statusCode)
    .json(err instanceof ApiError ? err.JSON : { message });
}
