import dotenv from "dotenv";
dotenv.config();
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import Redis from "ioredis";
import { errorHandler } from "./middlewares/errorHandler.js";
import { logger } from "./utils/logger.js";
import { connectToRabbitMq, consumeEvent } from "./utils/rabbitmq.js";
import searchRoutes from "./routes/searchRoutes.js";
import {
  handlePostCreated,
  handlePostDeleted,
} from "./events/serachEventHandler.js";

const app = express();

const PORT = process.env.PORT || 3004;

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

app.use("/api/search", searchRoutes);

app.use(errorHandler);

async function startServer() {
  try {
    await connectToRabbitMq();
    //consume the events / subscribe the events
    await consumeEvent("post.created", handlePostCreated);
    await consumeEvent("post.deleted", handlePostDeleted);
    app.listen(PORT,()=>{
      logger.info(`Search service is running on port:${PORT}`)
    })
  } catch (error) {
    logger.error(error, "failed to start search service");
    process.exit(1);
  }
}

startServer();

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at", promise, "reason:", reason);
});
