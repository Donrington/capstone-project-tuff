import { Schema, model, type InferSchemaType } from "mongoose";

/**
 * One logged entry (frontend's `Activity` interface). `addActivity` in
 * challenge.controller.ts creates one of these AND bumps the parent
 * Challenge's `current` — keep those two writes together (a Mongo
 * transaction if the two collections must stay perfectly in sync, a plain
 * sequential write is fine for a capstone project).
 */
const activitySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    challengeId: { type: Schema.Types.ObjectId, ref: "Challenge", required: true },
    loggedAt: { type: Date, required: true, default: Date.now },
    value: { type: Number, required: true }, // steps, reps, seconds — unit comes from the challenge
  },
  { timestamps: true },
);

activitySchema.index({ challengeId: 1, loggedAt: -1 });
activitySchema.index({ userId: 1, loggedAt: -1 });

activitySchema.set("toJSON", {
  transform(_doc, ret: Record<string, unknown>) {
    ret.id = (ret._id as { toString(): string }).toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export type ActivityDoc = InferSchemaType<typeof activitySchema>;
export const Activity = model("Activity", activitySchema);
