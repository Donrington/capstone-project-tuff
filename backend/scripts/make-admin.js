/**
 * Makes an existing account an admin (or takes it back). The one way to
 * create the first admin: run it yourself, on a machine that has the
 * database's connection string.
 *
 *   node scripts/make-admin.js someone@example.com
 *   node scripts/make-admin.js someone@example.com --revoke
 *
 * There is deliberately no "ADMIN_EMAILS" setting that promotes whoever
 * signs up with a listed address: TUFF doesn't verify the email at sign-up,
 * so anyone could register that address first and walk in as an admin.
 * Once there's one admin, they can promote others from the dashboard.
 */
require("dotenv/config");
const mongoose = require("mongoose");
const User = require("../models/User");

async function main() {
  const [email, flag] = process.argv.slice(2);
  if (!email || email.startsWith("--") || (flag && flag !== "--revoke")) {
    console.error("Usage: node scripts/make-admin.js <email> [--revoke]");
    process.exit(1);
  }
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI isn't set. Put it in backend/.env or the environment.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  try {
    const role = flag === "--revoke" ? "member" : "admin";
    const user = await User.findOneAndUpdate({ email: email.trim().toLowerCase() }, { $set: { role } }, { new: true });
    if (!user) {
      console.error(`No account with the email ${email}. They need to sign up first.`);
      process.exitCode = 1;
      return;
    }
    console.log(`${user.email} is now ${role === "admin" ? "an admin" : "a member"}. The app reads the role from the database, so the Admin link appears on their next page load.`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
