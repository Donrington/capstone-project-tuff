require("dotenv/config");
const express = require("express");
const cors = require("cors");

const cookieParser = require("cookie-parser");
const connectDB = require("./config/dbConfig");
const { notFound, errorHandler } = require("./middleware/errorHandler");
const securityHeaders = require("./middleware/securityHeaders");
const { assertProductionJwtSecret } = require("./utils/jwt");
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

app.disable("x-powered-by");
app.use(securityHeaders); // first, so even error and 404 responses carry the headers

// The app sits behind one reverse proxy in production. Without this, Express
// sees the proxy's address as req.ip and the public invite limiter would count
// every visitor as the same client. One hop is deliberate; more would need a
// matching trust depth from the deployment.
app.set("trust proxy", 1);

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
// Everything except the avatar upload gets the small limit; a photo is a
// base64 data URL and needs the route-level 3mb parser in userRoutes.js.
const jsonParser = express.json({ limit: "100kb" });
app.use((req, res, next) => {
  if (req.path === "/api/users/me/photo") return next();
  return jsonParser(req, res, next);
});
app.use(cookieParser());

app.get("/health", (req, res) => res.json({ ok: true }));

// Public: validated code, minimal payload, per-IP rate limit (see the route).
app.use("/api/invites", require("./routes/inviteRoutes"));

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/challenges", require("./routes/challengeRoutes"));
app.use("/api/challenge-participants", require("./routes/challengeParticipantRoutes"));
app.use("/api/teams", require("./routes/teamRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/achievements", require("./routes/achievementRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/leaderboard", require("./routes/leaderboardRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));

app.use(notFound);
app.use(errorHandler); // must be last — Express finds it by its 4-arg signature

// Exporting the app keeps the route table importable for checks without
// opening a DB connection or starting the cron jobs; `npm start` still runs
// this block because it's the entry module.
if (require.main === module) {
  assertProductionJwtSecret(); // fail before connecting or listening with a weak secret

  require("./jobs/challengeStatusJob");
  require("./jobs/rivalBanterJob");

  const PORT = process.env.PORT || 4000;

  connectDB()
    .then(() => syncAchievementCatalog())
    .then(() => {
      app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
    });
}

module.exports = app;
