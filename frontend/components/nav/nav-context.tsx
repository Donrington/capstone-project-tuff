"use client";

import { createContext, useContext } from "react";

/** Whether the nav around a component is collapsed to its icon rail. The
 *  mobile drawer is always "expanded". Used to switch tooltips on. */
export const NavContext = createContext({ collapsed: false });

export function useNavContext() {
  return useContext(NavContext);
}
