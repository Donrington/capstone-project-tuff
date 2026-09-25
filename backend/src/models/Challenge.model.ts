import { Schema, model, type InferSchemaType } from "mongoose";

/** Mirrors the frontend's `Challenge` interface (frontend/lib/types.ts). */
const challengeSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    unit: { type: String, required: true }, // "steps" | "reps" | "seconds"
    target: { type: Number, required: true },
    current: { type: Number, default: 0 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    totalDays: { type: Number, required: true },
    teamId: { type: Schema.Types.ObjectId, ref: "Team", default: null },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    /** Exercise slug, e.g. "pushups" — links to the exercise library, if/when it exists. */
    activity: { type: String },
    /** Invite code, team challenges only — e.g. "PUSH-9T3X". */
    code: { type: String, sparse: true, unique: true },
    featured: { type: Boolean, default: false },
  },
  { timestamps: true },
);

challengeSchema.set("toJSON", {
  virtuals: true,
  transform(_doc, ret: Record<string, unknown>) {
    ret.id = (ret._id as { toString(): string }).toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

// `dayIndex` on the frontend type is 1-based and derived from today vs.
// startDate/endDate — compute it as a virtual instead of storing (and
// forgetting to update) it.
challengeSchema.virtual("dayIndex").get(function (this: { startDate: Date }) {
  const diffMs = Date.now() - this.startDate.getTime();
  return Math.max(0, Math.floor(diffMs / 86_400_000) + 1);
});

export type ChallengeDoc = InferSchemaType<typeof challengeSchema>;
export const Challenge = model("Challenge", challengeSchema);
