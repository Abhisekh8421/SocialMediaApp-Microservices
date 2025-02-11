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
import { validateToken } from "./middleware/authMiddleware.js";
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
    res.status(500).json({
      message: "Internal server error",
      error: err.message,
    });
  },
};
//setting up proxy for identity service
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

//setting up proxy for post service

app.use(
  "/v1/posts",
  validateToken,
  proxy(process.env.POST_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["Content-Type"] = "application/json";
      // console.log("User in srcReq:", srcReq.user); debugging
      proxyReqOpts.headers["x-user-id"] = srcReq.user.userId;

      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `Response received from Post service : ${proxyRes.statusCode}`
      );
      return proxyResData;
    },
  })
);

//setting up proxy for Media service

app.use(
  "/v1/media",
  validateToken,
  proxy(process.env.MEDIA_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["x-user-id"] = srcReq.user.userId;
      if (
        !srcReq.headers["content-type"] ||
        !srcReq.headers["content-type"]?.startsWith("multipart/form-data")
      ) {
        proxyReqOpts.headers["Content-Type"] = "application/json";
      }
      // else {
      //   proxyReqOpts.headers["Content-Type"] = srcReq.headers["content-type"];
      // }
      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `Response received from Media service : ${proxyRes.statusCode}`
      );
      return proxyResData;
    },
    parseReqBody: false,
  })
);
//parseReqBody: false ***imp** for media service
// In http-proxy-middleware, the default behavior is that it parses the request body before forwarding it to the target service.
// This works fine for JSON requests, but it breaks file uploads (multipart/form-data).

app.use(errorHandler);
app.listen(PORT, () => {
  logger.info(`API Gateway is running on port ${PORT}`);
  logger.info(
    `Identity Service is running on port ${process.env.IDENTITY_SERVICE_URL}`
  );
  logger.info(
    `post Service is running on port ${process.env.POST_SERVICE_URL}`
  );
  logger.info(
    `Media Service is running on port ${process.env.MEDIA_SERVICE_URL}`
  );
});
