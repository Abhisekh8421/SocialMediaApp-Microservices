import express from "express";
import multer from "multer";
import { uploadMedia } from "../controllers/mediaController.js";
import { authenticateRequest } from "../middlewares/authMiddleware.js";
import { logger } from "../utils/logger.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
}).single("file");

router.post("/upload", authenticateRequest, (req, res, next) => {
  upload(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      logger.error("Multer error while uploading", err);
      return res.status(400).json({
        message: "Multer error while uploading",
        error: err.message,
        stack: err.stack,
      });
    } else if (err) {
      logger.error("Unknown error  occured while uploading", err);
      return res.status(500).json({
        message: "Unknown error occured while uploading",
        error: err.message,
        stack: err.stack,
      });
    }
    if (!req.file) {
      return res.status(400).json({
        message: "No file is found",
      });
    }

    next();
  });
},uploadMedia);

export default router;
