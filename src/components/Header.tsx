"use client";

import React from "react";
import { Moon, PanelLeftClose, Sun, Play } from "lucide-react";
import Link from "next/link";
import { useUISettings } from "@/contexts/UISettingsContext";

interface HeaderProps {
  toggleSidebar: () => void;
}
export const Header = ({ toggleSidebar }: HeaderProps) => {
  const { theme, toggleTheme } = useUISettings();

  return (
    <header className="sticky top-0 z-10 flex items-center border-b border-transparent px-4 py-3 dark:border-white/5">
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={toggleSidebar}
            className="mr-4 cursor-pointer rounded-md p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-gray-100"
            aria-label="Toggle navigation"
          >
            <PanelLeftClose size={25} />
          </button>

          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <span className="hidden text-xl font-semibold text-gray-800 sm:block dark:text-gray-100">
                LangGraph & NextJS Agent
              </span>
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/demo"
            className="border-border hover:bg-muted inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs"
          >
            <Play size={14} />
            Start demo
          </Link>
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white/70 text-gray-600 shadow-sm transition-colors hover:bg-gray-100 hover:text-gray-900 dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
