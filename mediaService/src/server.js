import dotenv from "dotenv";
import { logger } from "./utils/logger.js";
import express from "express";
import mongoose from "mongoose";
import Redis from "ioredis";
import helmet from "helmet";
import cors from "cors";
import { errorHandler } from "./middlewares/errorHandler.js";
import mediaRoutes from "./routes/mediaRoutes.js";
import { rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { connectToRabbitMq, consumeEvent } from "./utils/rabbitmq.js";
import { handlePostDeleted } from "./events/media_event_handlers.js";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 3003;

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

const sensitiveEndpointsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50, // Limit each IP to 50 requests per windowMs
  standardHeaders: true, // headers can be used to communicate the number of remaining requests eg: X-RateLimit-Limit
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

app.use("/api/media", mediaRoutes);
app.use(errorHandler);

async function startServer() {
  try {
    await connectToRabbitMq();
    //consume events
    await consumeEvent("post.deleted",handlePostDeleted)
    app.listen(PORT, () => {
      logger.info(`Media service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error("Failed to connect to server", error);
    process.exit(1); //Exit the process if RabbitMQ fails
  }
}
// process.exit(1) stops the Node.js process and exits with a failure code (1).
// It signals that something went wrong.

startServer();

//unhandled promise rejection

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at", promise, "reason:", reason);
});
