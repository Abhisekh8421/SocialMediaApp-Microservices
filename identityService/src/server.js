import dotenv from "dotenv";
import mongoose from "mongoose";
import { logger } from "./utils/logger.js";
import helmet from "helmet";
import express from "express";
import cors from "cors";
import { RateLimiterRedis } from "rate-limiter-flexible";
import Redis from "ioredis";
import { rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import identityRoutes from "./routes/identity_route.js";
import { errorHandler } from "./middleware/errorHandler.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

mongoose
  .connect(process.env.MONGODB_URI, {
    dbName: "SocialMedia",
  })
  .then(() => logger.info("Connected to mongodb"))
  .catch((e) => logger.error("Mongodb connection error", e));

const redisClient = new Redis(process.env.REDIS_URL);

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  logger.info(`Received ${req.method} request to ${req.url}`); //Received GET request to /api/products.
  logger.info(`Request body, ${req.body}`); //Request body, { name: "John" }
  next();
});

//DDos protection and rate limiting

const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "middleware",
  points: 10,
  duration: 1,
});

app.use((req, res, next) => {
  rateLimiter
    .consume(req.ip)
    .then(() => next())
    .catch((e) => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
      res.status(429).json({
        success: false,
        message: "Too many requests",
      });
    });
});

//Ip based ratelimiting for sensitive endpoints

const sensitiveEndpointsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50, // Limit each IP to 50 requests per windowMs
  standardHeaders: true, // headers can be used to communicate the number of remaining requests
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Sensitive endpoint rate limit exceeded for IP  : ${req.ip}`);
    res.status(429).json({
      success: false,
      message: "Too many requests",
    });
  },
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
});

//small breif about the store (Without Redis, each server would track rate limiting independently, which could lead to inconsistent results (e.g., a client might hit the rate limit on one server but not another). By using Redis, all servers can share the same rate limit data, ensuring that the same client can’t bypass the limit by switching servers)

//apply the endpointslimiter to our routes
app.use("/api/auth/register", sensitiveEndpointsLimiter);

//routes

app.use("/api/auth", identityRoutes);

//error handler
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Identity service running on port ${PORT}`);
});
 
//unhandled promise rejection

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at", promise, "reason:", reason);
});
