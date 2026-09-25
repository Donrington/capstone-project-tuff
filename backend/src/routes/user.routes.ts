import { Router } from "express";
import * as user from "../controllers/user.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validate } from "../middleware/validate.middleware.js";
import { updatePhotoSchema, updateProfileSchema } from "../validators/user.validators.js";

export const userRouter = Router();

userRouter.use(requireAuth); // every /me route needs a signed-in user

userRouter.get("/", asyncHandler(user.getMe));
userRouter.patch("/", validate(updateProfileSchema), asyncHandler(user.updateMe));
userRouter.put("/photo", validate(updatePhotoSchema), asyncHandler(user.updateMyPhoto));
userRouter.get("/stats/today", asyncHandler(user.getTodayStats));
userRouter.get("/activity/week", asyncHandler(user.getWeeklyActivity));
userRouter.get("/profile", asyncHandler(user.getMyProfile));
