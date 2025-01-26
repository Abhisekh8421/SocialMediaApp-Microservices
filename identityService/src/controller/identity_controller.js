import { User } from "../models/user.js";
import { generateTokens } from "../utils/generateToken.js";
import { logger } from "../utils/logger.js";
import { validateRegistration } from "../utils/validation.js";

const registerUser = async (req, res) => {
  logger.info("Registration endpoint starts");
  try {
    const { error } = validateRegistration(req.body);
    if (error) {
      logger.warn("validation error", error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }
    const { email, password, username } = req.body;

    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) {
      logger.warn("User already exists");
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }
    user = await User.create({ username, email, password });
    logger.warn("User saved successfully", user._id);
    const { accessToken, refreshToken } = await generateTokens(user);
    res.status(201).json({
      success: true,
      message: "User registered successfully",
      accessToken,
      refreshToken,
    });
  } catch (error) {
    logger.error("Registration error", error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export { registerUser }; 
