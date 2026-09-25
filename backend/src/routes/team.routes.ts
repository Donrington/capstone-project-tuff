import { Router } from "express";
import * as team from "../controllers/team.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

export const teamRouter = Router();

teamRouter.use(requireAuth);

teamRouter.get("/", asyncHandler(team.getMyTeam));
teamRouter.get("/mates", asyncHandler(team.getTeammates));
