require("dotenv/config");
const express = require("express");
const cors = require("cors");

require("./jobs/challengeStatusJob");
require("./jobs/rivalBanterJob");

const cookieParser = require("cookie-parser");
const connectDB = require("./config/dbConfig");
const { notFound, errorHandler } = require("./middleware/errorHandler");
const { syncAchievementCatalog } = require("./services/achievementService");

// Registers every schema with Mongoose before any route can use it — a
// model referenced via `ref: "User"` etc. (see models/*.js) needs its
// schema loaded first, even if this file never uses the export directly.
require("./models/User");
require("./models/Team");
require("./models/Challenge");
require("./models/ChallengeParticipant");
require("./models/Activity");
require("./models/Achievement");
require("./models/UserAchievement");
require("./models/Notification");
require("./models/RefreshToken");

const app = express();

// FRONTEND_ORIGIN is one origin or a comma-separated list — a custom domain
// move needs the old and new origin to both work until DNS and OAuth have
// fully cut over (and www alongside the apex).
const allowedOrigins = (process.env.FRONTEND_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // No Origin header (server-to-server, curl, the app's own SSR fetches)
      // isn't a browser request, so there's nothing to check it against.
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);
// 3mb, not the 100kb default, so a profile photo (sent as a data URL —
// see controllers/userController.js uploadPhoto) fits in the body.
app.use(express.json({ limit: "3mb" }));
app.use(cookieParser());

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/challenges", require("./routes/challengeRoutes"));
app.use("/api/challenge-participants", require("./routes/challengeParticipantRoutes"));
app.use("/api/teams", require("./routes/teamRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/achievements", require("./routes/achievementRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/leaderboard", require("./routes/leaderboardRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));

// TODO(team): mount each resource's routes here as they're built, e.g.
//   app.use("/api/challenges", require("./routes/challengeRoutes"));
// See backend/README.md for the suggested folder layout and the full API
// contract.

app.use(notFound);
app.use(errorHandler); // must be last — Express finds it by its 4-arg signature

const PORT = process.env.PORT || 4000;

connectDB()
  .then(() => syncAchievementCatalog())
  .then(() => {
    app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
  });
