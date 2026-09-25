// Augments Express's Request type so `req.user` (set by auth.middleware.ts)
// is typed everywhere without an import — this file is picked up globally
// because it's a .d.ts under `src` and included by tsconfig.
export {};

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: "member" | "captain" | "admin" };
    }
  }
}
