"use client";

import dynamic from "next/dynamic";
import { getCharacter } from "@/lib/characters";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

const AnimatedCreature = dynamic(
  () => import("./CreatureCanvas").then((module) => module.CreatureCanvas),
  { ssr: false },
);

export function ChatCompanion({ personaId, thinking }: { personaId: string; thinking: boolean }) {
  const character = getCharacter(personaId);
  const [shown, setShown] = useState(character.id);
  const [phase, setPhase] = useState<"idle" | "exit" | "enter">("idle");
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (shown !== character.id && phase !== "exit") setPhase("exit");
  }, [character.id, shown, phase]);
  return (
    <motion.div
      className="relative h-full w-full"
      data-chat-companion={shown}
      data-switch-phase={phase}
      animate={{ opacity: phase === "exit" ? 0.25 : 1 }}
      transition={{ duration: reducedMotion ? 0 : 0.45 }}
    >
      <AnimatedCreature
        key={shown}
        id={shown}
        paused={false}
        thinking={thinking}
        transitionPhase={phase}
        onTransitionComplete={() => {
          if (phase === "exit") {
            setShown(character.id);
            setPhase("enter");
          } else if (phase === "enter") setPhase("idle");
        }}
      />
    </motion.div>
  );
}
