import express from "express";
import {
  createPost,
  deletePost,
  getAllPosts,
  getPost,
} from "../controllers/postController.js";
import { authenticateRequest } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(authenticateRequest);

router.post("/createPost", createPost);
router.get("/allPosts", getAllPosts);
router.get("/:id", getPost);
router.delete("/:id", deletePost);

export default router;
 