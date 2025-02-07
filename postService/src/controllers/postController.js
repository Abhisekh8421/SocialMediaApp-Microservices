import { Post } from "../models/Post.js";
import { logger } from "../utils/logger.js";

const createPost = async (req, res) => {
  try {
    const { mediaIds, content } = req.body;
    const newlyCreatedPost = new Post({
      user: req.user.userId,
      content,
      mediaIds: mediaIds || [],
    });
    await newlyCreatedPost.save();
    logger.info("Post Created successfully", newlyCreatedPost);
    res.status(201).json({
      success: true,
      message: "Post Created successfully",
    });
  } catch (error) {
    logger.error("Error creating post", error.message);
    res.status(500).json({
      success: false,
      message: "Error creating post",
    });
  }
};

const getAllPosts = async (req, res) => {
  try {
  } catch (error) {
    logger.error("Error fetching posts", error.message);
    res.status(500).json({
      success: false,
      message: "Error fetching posts",
    });
  }
};

const getPost = async (req, res) => {
  try {
  } catch (error) {
    logger.error("Error fetching post", error.message);
    res.status(500).json({
      success: false,
      message: "Error fetching post by Id",
    });
  }
};

const deletePost = async (req, res) => {
  try {
  } catch (error) {
    logger.error("Error deleting post", error.message);
    res.status(500).json({
      success: false,
      message: "Error deleting post by Id",
    });
  }
};

export { createPost };
