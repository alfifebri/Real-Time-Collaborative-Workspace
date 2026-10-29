"use client";

import { Menu } from "lucide-react";
import { useWorkspaceUI } from "./workspace-ui";

export function MobileMenuButton({ className = "" }: { className?: string }) {
  const { openMobileSidebar } = useWorkspaceUI();
  return (
    <button
      type="button"
      onClick={openMobileSidebar}
      className={`icon-button lg:hidden ${className}`}
      aria-label="Open sidebar"
    >
      <Menu size={17} />
    </button>
  );
}
