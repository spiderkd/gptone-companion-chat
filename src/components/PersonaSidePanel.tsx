"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, PanelRightClose, PanelRightOpen } from "lucide-react";
import { getPersona } from "@/lib/personas";
import { CHARACTERS, getCharacter } from "@/lib/characters";
import { useThreads } from "@/hooks/useThreads";
import { useUISettings } from "@/contexts/UISettingsContext";

interface PersonaSidePanelProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function PersonaSidePanel({ isOpen, onToggle }: PersonaSidePanelProps) {
  const router = useRouter();
  const { personaId, setPersonaId } = useUISettings();
  const { createThread } = useThreads();
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const expanded = isOpen || mobileOpen;
  const togglePanel = () => {
    if (window.matchMedia("(max-width: 1279px)").matches) setMobileOpen(false);
    else onToggle();
  };

  const handlePersonaSelect = async (nextPersonaId: string) => {
    if (switchingTo) return;
    if (nextPersonaId === personaId) {
      setMobileOpen(false);
      return;
    }

    setSwitchingTo(nextPersonaId);
    setSelectionError(null);
    try {
      const thread = await createThread(nextPersonaId);
      setPersonaId(nextPersonaId);
      setMobileOpen(false);
      router.push(`/thread/${thread.id}`);
    } catch {
      setSelectionError("Could not start this chat. Please try again.");
    } finally {
      setSwitchingTo(null);
    }
  };

  return (
    <>
      {!mobileOpen && (
        <button
          type="button"
          aria-label="Choose character"
          title="Choose character"
          onClick={() => setMobileOpen(true)}
          className="fixed top-20 right-3 z-30 rounded-md border border-gray-200 bg-white/90 p-2 text-gray-600 shadow-sm backdrop-blur xl:hidden dark:border-white/10 dark:bg-gray-900/90 dark:text-gray-200"
        >
          <PanelRightOpen className="h-4 w-4" />
        </button>
      )}
      <aside
        onKeyDown={(event) => {
          if (event.key === "Escape") setMobileOpen(false);
        }}
        className={`${mobileOpen ? "fixed top-16 right-0 z-40 flex h-[calc(100dvh-4rem)] shadow-xl" : "hidden"} shrink-0 flex-col overflow-hidden border-l border-gray-200 bg-white transition-[width] duration-300 ease-in-out xl:static xl:flex xl:h-screen xl:shadow-none dark:border-gray-800 dark:bg-gray-900 ${
          expanded ? "w-80 max-w-[90vw] px-4 py-5" : "w-14 px-2 py-5"
        }`}
        aria-label="Avatar persona panel"
      >
        <div className={expanded ? "mb-4" : "mb-4 flex justify-center"}>
          {expanded ? (
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Avatars</h2>
              </div>
              <button
                type="button"
                onClick={togglePanel}
                className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                aria-label="Collapse avatar panel"
                title="Collapse avatar panel"
              >
                <PanelRightClose className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onToggle}
              className="rounded-md p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-gray-800 dark:hover:text-gray-100"
              aria-label="Open avatar panel"
              title="Open avatar panel"
            >
              <PanelRightOpen className="h-4 w-4" />
            </button>
          )}
        </div>

        <div
          className={`min-h-0 flex-1 space-y-3 overflow-y-auto transition-opacity duration-200 ${
            expanded ? "pr-1 opacity-100" : "pointer-events-none opacity-0"
          }`}
          aria-hidden={!expanded}
        >
          {selectionError && (
            <p role="alert" className="text-xs text-red-700">
              {selectionError}
            </p>
          )}
          {expanded &&
            CHARACTERS.map((character) => {
              const persona = getPersona(character.personaId);
              const isActive = character.id === getCharacter(personaId).id;
              const isSwitching = switchingTo === persona.id;

              return (
                <button
                  key={persona.id}
                  type="button"
                  onClick={() => void handlePersonaSelect(persona.id)}
                  disabled={!!switchingTo}
                  className={`group flex w-full items-center gap-3 rounded-lg border px-3 py-3.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-70 ${
                    isActive
                      ? persona.accentClass
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200 dark:hover:bg-gray-800"
                  }`}
                  aria-pressed={isActive}
                >
                  <img
                    src={`/characters/${character.id}.webp`}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    width={88}
                    height={88}
                    className="h-[88px] w-[88px] shrink-0 object-contain"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold">{character.name}</span>
                      {isSwitching && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    </div>
                    <p className="mt-1 text-xs leading-4 opacity-75">{character.role}</p>
                  </div>
                </button>
              );
            })}
        </div>
      </aside>
    </>
  );
}
