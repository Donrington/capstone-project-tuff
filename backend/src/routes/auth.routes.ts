import { Router } from "express";
import * as auth from "../controllers/auth.controller.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validate } from "../middleware/validate.middleware.js";
import { signInSchema, signUpSchema } from "../validators/auth.validators.js";

export const authRouter = Router();

authRouter.post("/sign-up", validate(signUpSchema), asyncHandler(auth.signUp));
authRouter.post("/sign-in", validate(signInSchema), asyncHandler(auth.signIn));
authRouter.post("/sign-out", asyncHandler(auth.signOut));
authRouter.post("/refresh", asyncHandler(auth.refresh));
