import { Router } from "express";
import * as challenge from "../controllers/challenge.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validate } from "../middleware/validate.middleware.js";
import { addActivitySchema, createChallengeSchema } from "../validators/challenge.validators.js";

export const challengeRouter = Router();

challengeRouter.use(requireAuth);

challengeRouter.get("/", asyncHandler(challenge.listChallenges));
challengeRouter.post("/", validate(createChallengeSchema), asyncHandler(challenge.createChallenge));
challengeRouter.get("/:id", asyncHandler(challenge.getChallengeById));
challengeRouter.post(
  "/:id/activities",
  validate(addActivitySchema),
  asyncHandler(challenge.addActivity),
);
