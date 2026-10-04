import type Lenis from "lenis";

/**
 * The app shell's Lenis instance, when there is one (fine pointers, no
 * reduced motion). Under Lenis the html element's `scroll-behavior` is forced
 * to `auto`, so anything that wants a glide has to go through it.
 */
let current: Lenis | null = null;

export const setLenis = (lenis: Lenis | null) => {
  current = lenis;
};
export const getLenis = () => current;
