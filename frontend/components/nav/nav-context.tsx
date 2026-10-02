"use client";

import { createContext, useContext } from "react";

/** Whether the nav around a component is collapsed to its icon rail, and
 *  whether it's the small-screen drawer (always "expanded"). */
export const NavContext = createContext({ collapsed: false, inDrawer: false });

export function useNavContext() {
  return useContext(NavContext);
}
