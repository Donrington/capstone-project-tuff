import { Schema, model, type InferSchemaType } from "mongoose";

/**
 * The base `Team` (frontend `Team` interface: id, name, memberIds) plus
 * what the dashboard's `TeamSummary` needs. `TeamSummary` itself (rank,
 * gapToRival, extraMembers, …) is a *computed* projection — build it in
 * team.controller.ts by combining this document with a rank query across
 * all teams, not by storing those fields here.
 */
const teamSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    /** Invite code, e.g. "IRON-7Q4K" — see lib/data.ts findByCode on the frontend. */
    code: { type: String, required: true, unique: true },
    captainId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    memberIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true },
);

teamSchema.set("toJSON", {
  transform(_doc, ret: Record<string, unknown>) {
    ret.id = (ret._id as { toString(): string }).toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export type TeamDoc = InferSchemaType<typeof teamSchema>;
export const Team = model("Team", teamSchema);
