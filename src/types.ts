import { CookieOptions } from "express";

export class ApiError extends Error {
  statusCode: number;
  data?: any;
  constructor(statusCode: number, message: string, data: any) {
    super(message);
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
  }
  get JSON() {
    return {
      statusCode: this.statusCode,
      data: this.data,
      message: this.message,
    };
  }
}

export class ApiResponse {
  statusCode: number;
  data?: any;
  constructor(statusCode: number, data: any) {
    this.statusCode = statusCode;
    this.data = data;
  }
}

export const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  maxAge: 24 * (60 * 60) * 1000, //24hrs
};
