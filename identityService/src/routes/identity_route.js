import express from "express";
import { registerUser } from "../controller/identity_controller.js";

const router = express.Router();

router.post("/register", registerUser);

export default router;
