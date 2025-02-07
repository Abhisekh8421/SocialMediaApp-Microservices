import express from "express";
import { createPost } from "../controllers/postController.js";
import { authenticateRequest } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(authenticateRequest);

router.post("/createPost", createPost);

export default router;
