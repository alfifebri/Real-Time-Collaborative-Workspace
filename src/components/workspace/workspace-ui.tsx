"use client";

import { createContext, useContext } from "react";

type WorkspaceUIContextValue = {
  openMobileSidebar: () => void;
  openCommandPalette: () => void;
};

const WorkspaceUIContext = createContext<WorkspaceUIContextValue | null>(null);

export const WorkspaceUIProvider = WorkspaceUIContext.Provider;

export function useWorkspaceUI(): WorkspaceUIContextValue {
  const context = useContext(WorkspaceUIContext);
  if (!context) {
    return {
      openMobileSidebar: () => {},
      openCommandPalette: () => {},
    };
  }
  return context;
}
