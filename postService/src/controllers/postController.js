import { Post } from "../models/Post.js";
import { logger } from "../utils/logger.js";
import { publishEvent } from "../utils/rabbitmq.js";
import { validateCreatePost } from "../utils/validation.js";

async function invalidatePostCache(req, input) {
  const cachedKey = `post:${input}`;
  await req.redisClient.del(cachedKey);
  const keys = await req.redisClient.keys("posts:*");
  if (keys.length > 0) {
    await req.redisClient.del(keys);
  }
}

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
    await invalidatePostCache(req, newlyCreatedPost._id.toString()); //  Invalidate Cache
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
    const postId = req.params.id;
    const cacheKey = `post:${postId}`;
    const cachedPost = await req.redisClient.get(cacheKey);
    if (cachedPost) {
      return res.json(JSON.parse(cachedPost));
    }
    const singlePostdetails = await Post.findById(postId);
    if (!singlePostdetails) {
      return res.status(404).json({
        message: "Post Not Found!!!",
        success: false,
      });
    }
    await req.redisClient.setex(
      cacheKey,
      3600,
      JSON.stringify(singlePostdetails)
    );
    res.json(singlePostdetails);
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
    const post = await Post.findOneAndDelete({
      _id: req.params.id,
      user: req.user.userId,
    });
    if (!post) {
      return res.status(404).json({
        message: "Post Not Found!!!",
        success: false,
      });
    }
    //publish post delete method

    await publishEvent("post.deleted", {
      postId: post._id,
      userId: req.user.userId,
      mediaIds: post.mediaIds,
    });

    await invalidatePostCache(req, req.params.id);
    res.json({
      message: "Post deleted successfully",
    });
  } catch (error) {
    logger.error("Error deleting post", error.message);
    res.status(500).json({
      success: false,
      message: "Error deleting post by Id",
    });
  }
};

export { createPost, getAllPosts, getPost, deletePost };
