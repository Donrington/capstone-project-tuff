import authMedia from "./auth-media.json";

export interface AboutClip {
  src: string;
  poster: string;
  /** What's in the shot — for whoever swaps it later. */
  description: string;
}

/**
 * Clips for the About page. Both are interim: they reuse the auth-panel clips
 * until About's own set is generated. To swap one, change its `src` and
 * `poster` here — nothing else needs to change. Because these read from
 * auth-media.json, `npm run media:fetch` self-hosts them along with the auth
 * clips.
 */
export const aboutMedia: Record<"hero" | "community", AboutClip> = {
  hero: {
    src: authMedia.clips.signin.src,
    poster: authMedia.clips.signin.poster,
    description: authMedia.clips.signin.description,
  },
  community: {
    src: authMedia.clips.signup.src,
    poster: authMedia.clips.signup.poster,
    description: authMedia.clips.signup.description,
  },
};
