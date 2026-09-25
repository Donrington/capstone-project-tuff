import { Schema, model, type InferSchemaType } from "mongoose";

/**
 * Mirrors the frontend's `User` interface (frontend/lib/types.ts) plus
 * auth-only fields (passwordHash) that never leave this file — the toJSON
 * transform below strips them before a document reaches `res.json()`.
 */
const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    firstName: { type: String, required: true, trim: true },
    displayName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    initials: { type: String, required: true },
    teamId: { type: Schema.Types.ObjectId, ref: "Team", default: null },
    plan: { type: String, enum: ["free", "pro"], default: "free" },
    role: { type: String, enum: ["member", "captain", "admin"], default: "member" },
    stepGoal: { type: Number, default: 10000 },
    bio: { type: String, default: "", maxlength: 160 },
    photoUrl: { type: String, default: null },
  },
  { timestamps: { createdAt: "memberSince", updatedAt: true } },
);

userSchema.set("toJSON", {
  virtuals: true,
  transform(_doc, ret: Record<string, unknown>) {
    ret.id = (ret._id as { toString(): string }).toString();
    delete ret._id;
    delete ret.__v;
    delete ret.passwordHash;
    return ret;
  },
});

export type UserDoc = InferSchemaType<typeof userSchema>;
export const User = model("User", userSchema);
