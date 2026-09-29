require("dotenv/config");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/dbConfig");
const { notFound, errorHandler } = require("./middleware/errorHandler");

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

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "http://localhost:3000", credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", require("./routes/authRoutes"));

// TODO(team): mount each resource's routes here as they're built, e.g.
//   app.use("/api/challenges", require("./routes/challengeRoutes"));
// See backend/README.md for the suggested folder layout and the full API
// contract.

app.use(notFound);
app.use(errorHandler); // must be last — Express finds it by its 4-arg signature

const PORT = process.env.PORT || 4000;

connectDB().then(() => {
  app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
});
