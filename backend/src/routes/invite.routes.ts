import { Router } from "express";
import * as invite from "../controllers/invite.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

export const inviteRouter = Router();

// Public: the join preview page (app/join/[code]) reads this before sign-in.
inviteRouter.get("/:code", asyncHandler(invite.getInvite));
inviteRouter.post("/:code/accept", requireAuth, asyncHandler(invite.acceptInvite));
