import { User } from "../models/user.js";
import { generateTokens } from "../utils/generateToken.js";
import { logger } from "../utils/logger.js";
import { validateLogin, validateRegistration } from "../utils/validation.js";
import { RefreshToken } from "../models/RefreshToken.js";

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

const loginUser = async (req, res) => {
  logger.info("Login Endpoint Hit...");
  try {
    const { error } = validateLogin(req.body);
    if (error) {
      logger.warn("validation error", error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      logger.warn("Invalid User");
      return res.status(400).json({
        success: false,
        message: "Invalid Credentials",
      });
    }
    //valid password
    const invalidPassword = await user.comparePassword(password);
    if (!invalidPassword) {
      logger.warn("Invalid Password");
      return res.status(400).json({
        success: false,
        message: "Invalid Credentials",
      });
    }
    const { accessToken, refreshToken } = await generateTokens(user);
    res.json({
      accessToken,
      refreshToken,
      userId: user._id,
    });
  } catch (error) {
    logger.error("Login error", error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const refreshTokenController = async (req, res) => {
  logger.info("Refresh Token endpoint hit...");
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      logger.warn("Refresh Token is missing");
      return res.status(400).json({
        success: false,
        message: "Refresh token missing",
      });
    }

    const storedToken = await RefreshToken.findOne({ token: refreshToken });
    if (!storedToken || storedToken.expiresAt < new Date()) {
      logger.warn("Invalid or expired refresh token");
      return res.status(401).json({
        success: false,
        message: `Invalid or expired refresh token`,
      });
    }
    const user = await User.findById(storedToken.user);
    if (!user) {
      logger.warn("User is Not found");
      return res.status(401).json({
        success: false,
        message: `User is Not found`,
      });
    }

    const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
      generateTokens(user);
    //delete the old tokens
    await RefreshToken.deleteOne({ _id: storedToken._id });
    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    logger.error("Registration error", error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export { registerUser, loginUser };
