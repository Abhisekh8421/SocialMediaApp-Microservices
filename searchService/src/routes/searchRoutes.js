import express from "express";
import { searchPostController } from "../controllers/searchController.js";
import { authenticateRequest } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(authenticateRequest);

router.get("/posts", searchPostController);

export default router;
