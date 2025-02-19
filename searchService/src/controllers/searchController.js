import { Search } from "../models/Search.js";
import { logger } from "../utils/logger.js";

const searchPostController = async (req, res) => {
  logger.info("Search endpoint hit!!!");
  try {
    const { query } = req.query;
    const results = await Search.find(
      { $text: { $search: query } },
      { score: { $meta: "textScore" } } // calculates a relevance score for each document based on how well it matches the query
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(10);
    res.json(results);
  } catch (error) {
    logger.error("Error while Searching post", error.message);
    res.status(500).json({
      success: false,
      message: "Error while Searching post",
    });
  }
};

export { searchPostController };
