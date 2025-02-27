import { NextFunction, Request, Response } from "express";
import fs from "fs";
import multer, { MulterError } from "multer";
import path from "path";
import { ApiError } from "../types";
const storage = multer.diskStorage({
  destination: function (
    req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, destination: string) => void
  ) {
    const destPath = path.join(process.cwd(), "public", "users", req.user!.id);
    console.log(destPath);
    fs.mkdirSync(destPath, { recursive: true }); // Create directory if missing
    cb(null, destPath);
  },

  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 10485760 },
});

export const uploader =
  (fieldName: string) => (req: Request, res: Response, next: NextFunction) => {
    return new Promise<void>((resolve, reject) => {
      /*
        upload.single returns a middleware function which needs to be executed so we have executed that middleware here inside our custom middleware by passing req, res and a callback function which is called when file is uploaded or any errors occured 
        the reason behind using Promise is that the multer operation is an asynchronous operation due to which we have called the next middleware in the chain after our file is uploaded 
      */
      if (!req.user) {
        reject(
          new ApiError(
            401,
            "Unauthorized Access, Please login before uploading any files",
            []
          )
        );
      }
      upload.single(fieldName)(req, res, (err: any) => {
        if (err instanceof MulterError) {
          reject(
            new ApiError(
              400,
              `File Size is too big, upload less than ${(
                10485760 /
                (1024 * 1024)
              ).toFixed(2)}`,
              [err]
            )
          );
        } else if (err) {
          reject(new ApiError(500, "Internal Server Error", [err]));
        }
        
        resolve();
      });
    })
      .then(() => {
        next();
      })
      .catch((err) => next(err));
  };
