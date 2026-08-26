"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  DEFAULT_MODEL,
  DEFAULT_PROVIDER,
  getDefaultModel,
  isSupportedProvider,
} from "@/lib/aiModels";

const STORAGE_KEY = "agent_model_settings";

function loadSettings(): Record<string, unknown> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveSetting(key: string, value: string | boolean | Record<string, string>) {
  if (typeof window === "undefined") return;
  try {
    const current = loadSettings();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, [key]: value }));
  } catch {}
}

interface UISettingsContextType {
  hideToolMessages: boolean;
  toggleToolMessages: () => void;
  theme: "light" | "dark";
  toggleTheme: () => void;
  provider: string;
  setProvider: (provider: string) => void;
  model: string;
  setModel: (model: string) => void;
  apiKeys: Record<string, string>;
  setApiKey: (provider: string, apiKey: string) => void;
  clearApiKeys: () => void;
  personaId: string;
  setPersonaId: (personaId: string) => void;
  approveAllTools: boolean;
  setApproveAllTools: (v: boolean) => void;
}

const UISettingsContext = createContext<UISettingsContextType | undefined>(undefined);

interface UISettingsProviderProps {
  children: ReactNode;
}

export const UISettingsProvider = ({ children }: UISettingsProviderProps) => {
  const [hideToolMessages, setHideToolMessages] = useState(false);
  const [theme, setThemeState] = useState<"light" | "dark">("light");
  const [provider, setProviderState] = useState<string>(DEFAULT_PROVIDER);
  const [model, setModelState] = useState<string>(DEFAULT_MODEL);
  const [apiKeys, setApiKeysState] = useState<Record<string, string>>({});
  const [personaId, setPersonaIdState] = useState<string>("efficient");
  const [approveAllTools, setApproveAllToolsState] = useState<boolean>(false);

  useEffect(() => {
    const saved = loadSettings();
    if (typeof saved.provider === "string" && isSupportedProvider(saved.provider)) {
      setProviderState(saved.provider);
    }
    if (typeof saved.model === "string") {
      setModelState(saved.model);
    }
    if (saved.apiKeys && typeof saved.apiKeys === "object" && !Array.isArray(saved.apiKeys)) {
      setApiKeysState(saved.apiKeys as Record<string, string>);
    }
    if (typeof saved.personaId === "string") {
      setPersonaIdState(saved.personaId);
    }
    if (typeof saved.approveAllTools === "boolean") {
      setApproveAllToolsState(saved.approveAllTools);
    }
    if (saved.theme === "dark" || saved.theme === "light") {
      setThemeState(saved.theme);
    } else if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
      setThemeState("dark");
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const toggleToolMessages = () => setHideToolMessages((prev) => !prev);
  const toggleTheme = () => {
    setThemeState((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      saveSetting("theme", next);
      return next;
    });
  };
  const setProvider = (v: string) => {
    const nextModel = getDefaultModel(v);
    setProviderState(v);
    setModelState(nextModel);
    saveSetting("provider", v);
    saveSetting("model", nextModel);
  };
  const setModel = (v: string) => {
    setModelState(v);
    saveSetting("model", v);
  };
  const setPersonaId = (v: string) => {
    setPersonaIdState(v);
    saveSetting("personaId", v);
  };
  const setApproveAllTools = (v: boolean) => {
    setApproveAllToolsState(v);
    saveSetting("approveAllTools", v);
  };
  const setApiKey = (provider: string, apiKey: string) => {
    setApiKeysState((previous) => {
      const next = { ...previous, [provider]: apiKey.trim() };
      if (!apiKey.trim()) {
        delete next[provider];
      }
      saveSetting("apiKeys", next);
      return next;
    });
  };
  const clearApiKeys = () => {
    setApiKeysState({});
    saveSetting("apiKeys", {});
  };

  return (
    <UISettingsContext.Provider
      value={{
        hideToolMessages,
        toggleToolMessages,
        theme,
        toggleTheme,
        provider,
        setProvider,
        model,
        setModel,
        apiKeys,
        setApiKey,
        clearApiKeys,
        personaId,
        setPersonaId,
        approveAllTools,
        setApproveAllTools,
      }}
    >
      {children}
    </UISettingsContext.Provider>
  );
};

export const useUISettings = () => {
  const context = useContext(UISettingsContext);
  if (context === undefined) {
    throw new Error("useUISettings must be used within a UISettingsProvider");
  }
  return context;
};
