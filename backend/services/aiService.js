const Anthropic = require("@anthropic-ai/sdk");

/**
 * The one seam every AI feature in this app calls through (rival banter,
 * natural-language logging, the admin flag explainer). Optional, like
 * Cloudinary and Google sign-in: without ANTHROPIC_API_KEY, isConfigured()
 * is false and callers skip the feature rather than fail the request it's
 * attached to — see bestEffort in notificationService.js for the same shape.
 */
const isConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY);

// Haiku, not the flagship model: every call here is short and structured —
// pull one number out of a sentence, write one line of banter, explain one
// outlier — not open-ended reasoning, so the fast/cheap model is the
// deliberate choice, not a fallback.
const MODEL = "claude-haiku-4-5-20251001";

let client;
const anthropic = () => (client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }));

/**
 * One system+user call, text in, text out. Throws if the key isn't set or
 * the call fails — callers that should degrade quietly (a cron job, an
 * admin nicety) wrap this in bestEffort; callers where the feature *is*
 * the request (natural-language logging) let it surface as a 503/400.
 */
async function complete({ system, prompt, maxTokens = 300 }) {
  if (!isConfigured()) throw new Error("ANTHROPIC_API_KEY isn't set.");
  const res = await anthropic().messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: prompt }],
  });
  const block = res.content.find((b) => b.type === "text");
  if (!block || !block.text.trim()) throw new Error("Claude returned no text.");
  return block.text.trim();
}

module.exports = { isConfigured, complete };
