import { Router } from "express";
import * as leaderboard from "../controllers/leaderboard.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

export const leaderboardRouter = Router();

leaderboardRouter.get("/", requireAuth, asyncHandler(leaderboard.getLeaderboard));
