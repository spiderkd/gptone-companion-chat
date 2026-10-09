"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, KeyRound, Save, Trash2, X } from "lucide-react";
import { useUISettings } from "@/contexts/UISettingsContext";

const providers = [
  {
    id: "openai",
    name: "OpenAI",
    detail: "GPT conversations and summaries",
    placeholder: "OpenAI API key",
  },
  {
    id: "google",
    name: "Gemini",
    detail: "Gemini conversations and summaries",
    placeholder: "Gemini API key",
  },
  {
    id: "codiv",
    name: "JEV / Codiv",
    detail: "Companion recommendations",
    placeholder: "Codiv API key",
  },
];

export function KeyManagement({ onClose }: { onClose: () => void }) {
  const { apiKeys, setApiKey, clearApiKeys } = useUISettings();
  const [draft, setDraft] = useState({ ...apiKeys });
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      onCancel={onClose}
      aria-labelledby="keys-title"
      className="border-border bg-background text-foreground m-auto max-h-[90dvh] w-[min(480px,calc(100vw-32px))] overflow-y-auto rounded-lg border p-0 shadow-xl backdrop:bg-black/50"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          providers.forEach(({ id }) => setApiKey(id, draft[id] || ""));
          onClose();
        }}
      >
        <header className="border-border flex items-center justify-between border-b px-5 py-4">
          <h2 id="keys-title" className="flex items-center gap-2 text-base font-semibold">
            <KeyRound size={18} />
            Key Management
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close key management"
            title="Close"
            className="hover:bg-muted rounded p-2"
          >
            <X size={18} />
          </button>
        </header>
        <div className="space-y-5 p-5">
          {providers.map(({ id, name, detail, placeholder }) => (
            <div key={id}>
              <label htmlFor={"key-" + id} className="text-sm font-medium">
                {name}
              </label>
              <p className="text-muted-foreground mb-2 text-xs">{detail}</p>
              <div className="border-input bg-background flex items-center gap-1 rounded-md border px-2">
                <input
                  id={"key-" + id}
                  type={revealed[id] ? "text" : "password"}
                  value={draft[id] || ""}
                  onChange={(event) => setDraft({ ...draft, [id]: event.target.value })}
                  placeholder={placeholder}
                  autoComplete="off"
                  spellCheck={false}
                  className="min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none"
                />
                <button
                  type="button"
                  onClick={() => setRevealed({ ...revealed, [id]: !revealed[id] })}
                  aria-label={(revealed[id] ? "Hide " : "Show ") + name + " key"}
                  title={revealed[id] ? "Hide key" : "Show key"}
                  className="hover:bg-muted rounded p-2"
                >
                  {revealed[id] ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button
                  type="button"
                  onClick={() => setDraft({ ...draft, [id]: "" })}
                  aria-label={"Remove " + name + " key"}
                  title="Remove key"
                  className="hover:bg-muted rounded p-2"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
          <p className="text-muted-foreground text-xs leading-5">
            Saved in this browser's local storage. Keys are sent to this app's server only for the
            relevant provider request; they are not stored in conversation history.
          </p>
        </div>
        <footer className="border-border flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4">
          <button
            type="button"
            onClick={() => {
              clearApiKeys();
              setDraft({});
            }}
            className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-xs"
          >
            <Trash2 size={14} />
            Clear saved keys
          </button>
          <button
            type="submit"
            className="bg-primary text-primary-foreground flex items-center gap-2 rounded-md px-4 py-2 text-sm"
          >
            <Save size={16} />
            Save keys
          </button>
        </footer>
      </form>
    </dialog>
  );
}
