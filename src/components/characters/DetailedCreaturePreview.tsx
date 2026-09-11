"use client";
import { useState } from "react";
import { Brain, Pause, Play } from "lucide-react";
import { CHARACTERS as creatures } from "@/lib/characters";
import { CreatureCanvas } from "./CreatureCanvas";

export function DetailedCreaturePreview() {
  const [paused, setPaused] = useState(false);
  const [thinking, setThinking] = useState(false);
  return (
    <main className="min-h-screen bg-[#efefef] px-5 py-8 text-[#343039] sm:px-10">
      <div className="mx-auto max-w-[1440px]">
        <header className="flex items-center justify-between border-b border-black/10 pb-5">
          <h1 className="text-2xl font-semibold">The Familiars</h1>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setThinking((value) => !value)}
              title="Preview thinking expression"
              aria-label="Preview thinking expression"
              aria-pressed={thinking}
              className={`rounded-md border p-2 ${thinking ? "border-teal-600 bg-teal-50 text-teal-800" : "border-black/15 hover:bg-white"}`}
            >
              <Brain size={18} />
            </button>
            <button
              type="button"
              onClick={() => setPaused((v) => !v)}
              title={paused ? "Play animations" : "Pause animations"}
              aria-label={paused ? "Play animations" : "Pause animations"}
              className="rounded-md border border-black/15 p-2 hover:bg-white"
            >
              {paused ? <Play size={18} /> : <Pause size={18} />}
            </button>
          </div>
        </header>
        <section className="grid grid-cols-1 gap-x-6 gap-y-8 py-6 sm:grid-cols-2 xl:grid-cols-3">
          {creatures.map((creature) => (
            <article key={creature.id} className="min-w-0">
              <CreatureCanvas id={creature.id} paused={paused} thinking={thinking} />
              <div className="text-center">
                <h2 className="text-xl font-semibold">{creature.name}</h2>
                <p className="mt-2 text-sm text-[#78717c]">{creature.role}</p>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
