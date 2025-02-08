import { Post } from "../models/Post.js";
import { logger } from "../utils/logger.js";
import { validateCreatePost } from "../utils/validation.js";

const createPost = async (req, res) => {
  logger.info("Create Post Endpoint hit!!!! ");
  try {
    const { error } = validateCreatePost(req.body);
    if (error) {
      logger.warn("validation error", error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;
    const cacheKey = `posts:${page}:${limit}`;
    const cachedPosts = await req.redisClient.get(cacheKey);
    if (cachedPosts) {
      return res.json(JSON.parse(cachedPosts));
    }
    const posts = await Post.find({})
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    const totalNoOfPosts = await Post.countDocuments();
    const result = {
      posts,
      currentPage: page,
      totalPages: Math.ceil(totalNoOfPosts / limit),
      totalPosts: totalNoOfPosts,
    };
    //save your posts into cache
    await req.redisClient.setex(cacheKey, 300, JSON.stringify(posts)); //setex(key, expiration, value)
    //After 300 seconds, Redis automatically removes the cache.
    res.json(result);
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

export { createPost, getAllPosts };
