import { Search } from "../models/Search.js";
import { logger } from "../utils/logger.js";

async function handlePostCreated(event) {
  try {
    const newSearchPost = new Search({
      postId: event.postId,
      userId: event.userId,
      content: event.content,
      createdAt: event.createdAt,
    });
    await newSearchPost.save();
    logger.info(
      `Search Post created: ${event.postId}, ${newSearchPost._id.toString()}`
    );
  } catch (error) {
    logger.error(error, "Error handling post creation event");
  }
}

async function handlePostDeleted(event) {
  try {
    await Search.findOneAndDelete({
      postId: event.postId,
    });
    logger.info(`Search Post created: ${event.postId}`);
  } catch (error) {
    logger.error(error, "Error handling post deletion event");
  }
}

export { handlePostCreated, handlePostDeleted };
