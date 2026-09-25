import { Router } from "express";
import { authRouter } from "./auth.routes.js";
import { challengeRouter } from "./challenge.routes.js";
import { inviteRouter } from "./invite.routes.js";
import { leaderboardRouter } from "./leaderboard.routes.js";
import { teamRouter } from "./team.routes.js";
import { userRouter } from "./user.routes.js";

/** Mounted at /api in app.ts. Add a new module's router here as it's built. */
export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/me", userRouter);
apiRouter.use("/me/team", teamRouter);
apiRouter.use("/challenges", challengeRouter);
apiRouter.use("/leaderboard", leaderboardRouter);
apiRouter.use("/invites", inviteRouter);
