import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import Redis from "ioredis";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { logger } from "./utils/logger.js";
import proxy from "express-http-proxy";
import { errorHandler } from "./middleware/errorHandler.js";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const redisClient = new Redis(process.env.REDIS_URL);

app.use(helmet());
app.use(cors());
app.use(express.json());

//ratelimit

const ratelimitOptions = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // Limit each IP to 50 requests per windowMs
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

app.use(ratelimitOptions);

app.use((req, res, next) => {
  logger.info(`Received ${req.method} request to ${req.url}`); //Received GET request to /api/products.
  logger.info(`Request body, ${req.body}`); //Request body, { name: "John" }
  next();
});

const proxyOptions = {
  proxyReqPathResolver: (req) => {
    return req.originalUrl.replace(/^\/v1/, "/api"); //Request: GET /v1/auth/login → Forwarded as: GET /api/auth/login
  },
  proxyErrorHandler: (err, res, next) => {
    logger.error(`Proxy error:${err.message}`);
    res.status(500).message({
      message: "Internal server error",
      error: err.message,
    });
  },
};

app.use(
  "/v1/auth",
  proxy(process.env.IDENTITY_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["Content-Type"] = "application/json";
      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `Response received from Identity service : ${proxyRes.statusCode}`
      );
      return proxyResData;
    },
  })
);

app.use(errorHandler);
app.listen(PORT, () => {
  logger.info(`API Gateway is running on port ${PORT}`);
  logger.info(
    `Identity Service is running on port ${process.env.IDENTITY_SERVICE_URL}`
  );
});
