"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Pause, Play, RotateCcw, Sparkles, X } from "lucide-react";
import { ChatCompanion } from "@/components/characters/ChatCompanion";
import { getCharacter } from "@/lib/characters";
import { getPersona } from "@/lib/personas";
import { DemoFlow } from "./DemoFlow";
import {
  DISMISS_COOLDOWN_MESSAGES,
  MIN_USER_MESSAGES_BEFORE_SUGGEST,
  SUGGEST_COOLDOWN_MESSAGES,
  SWITCH_CONFIDENCE_THRESHOLD,
} from "@/lib/personaSwitch";

const conversation = [
  {
    user: "My best friend's birthday is this weekend. I want to do something nice, but planning it feels like a lot.",
    reply:
      "We can keep it small. How many people are coming, and what would feel comfortable to spend?",
  },
  {
    user: "Six friends, about $60 total. We can use my living room.",
    reply:
      "That's enough for a relaxed evening at home. Let's focus on food, one activity, and time together.",
  },
  {
    user: "One friend is vegetarian, and I really don't want to cook a big dinner.",
    reply:
      "A build-your-own sandwich or snack table could work. Keep the vegetarian options separate, and ask about any allergies.",
  },
  {
    user: "That feels manageable. I mostly want everyone to have a good time without making a big production of it.",
    reply:
      "Then simple is a good choice. You've already settled the budget, the guest list, and the food plan.",
  },
];
const nextMessage =
  "Now can you brainstorm a few fun themes and a game we could play? Something a little more imaginative than just movie night.";
const summary =
  "Birthday gathering this weekend for six friends in the user's living room. Budget: $60 total. One guest is vegetarian. Avoid a big cooked dinner or elaborate preparation. User now wants creative themes and a group game.";
const creativeReply =
  "Three low-effort directions: a tiny living-room film festival with homemade awards; a nostalgic school-night party with childhood snacks; or a 'terrible talents' show where everyone teaches one useless skill. For a game, try drawing each other's dream holiday in 30 seconds and guessing whose is whose. Keep the snacks vegetarian-friendly and use what you already own.";
const calmReply =
  "Let's keep it easy: pick a favourite colour for the table, put on a shared playlist, and play a simple drawing-and-guessing game. You don't need a big theme for it to feel special.";

export default function DemoPage() {
  return <DemoFlow />;

  const [step, setStep] = useState(0);
  const [initialPersona, setInitialPersona] = useState("calm");
  const [decision, setDecision] = useState<"yes" | "no" | null>(null);
  const [playing, setPlaying] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const switched = decision === "yes" && step >= 8;
  const personaId = switched ? "creative" : initialPersona;
  const character = getCharacter(personaId);
  const initialCharacter = getCharacter(initialPersona);
  const thinking = step === 5 || step === 7;
  const finished = step === 9;

  useEffect(() => {
    if (!playing || step === 0 || (step >= 6 && step !== 7 && step !== 8)) return;
    const timer = setTimeout(
      () => setStep((value) => Math.min(9, value + 1)),
      step === 5 || step >= 7 ? 2500 : 5500,
    );
    return () => clearTimeout(timer);
  }, [playing, step]);
  useEffect(() => {
    const area = bottom.current?.parentElement;
    if (!area) return;
    const scrollToLatest = () => {
      area.scrollTop = area.scrollHeight;
    };
    scrollToLatest();
    const observer = new ResizeObserver(scrollToLatest);
    observer.observe(area);
    return () => observer.disconnect();
  }, [step, decision]);

  const notes =
    step === 0
      ? {
          title: "Choose a starting companion",
          body: "A relaxed conversation about planning a friend's birthday. Pick the companion you would start with.",
        }
      : step <= 4
        ? {
            title: "A little context first",
            body:
              "The companion helps with the conversation. Automatic recommendations wait until " +
              MIN_USER_MESSAGES_BEFORE_SUGGEST +
              " user messages have been completed. You are seeing message " +
              step +
              " of " +
              MIN_USER_MESSAGES_BEFORE_SUGGEST +
              ".",
          }
        : step === 5
          ? {
              title: "A new kind of request",
              body: "Four user messages are complete. The next prompt asks for brainstorming. In a live chat, JEV receives that prompt and only the two most recent conversation messages to classify the best response approach.",
            }
          : step === 6
            ? {
                title: "A recommendation, your decision",
                body:
                  "This scripted JEV result selects Potion Familiar with 94% confidence, above the " +
                  Math.round(SWITCH_CONFIDENCE_THRESHOLD * 100) +
                  "% threshold. The prompt waits here: neither the avatar nor the system prompt changes until you accept.",
              }
            : step === 7
              ? {
                  title: "Carry the facts forward",
                  body: "After Yes, the selected OpenAI or Gemini model summarizes the previous conversation without the old personality. The budget, food needs and plans remain. The demo shows a prepared example summary.",
                }
              : step === 8
                ? {
                    title: "A new companion takes over",
                    body: "The old character turns away and the new one turns into view. The next LLM request uses the Creative system prompt, the neutral summary and your waiting message. Visible chat history stays intact.",
                  }
                : {
                    title:
                      decision === "yes"
                        ? "Same plans, a different approach"
                        : "Your original companion stays",
                    body:
                      decision === "yes"
                        ? "The creative response still respects the budget and vegetarian guest. The summary persists for future replies. Another automatic suggestion waits for " +
                          SUGGEST_COOLDOWN_MESSAGES +
                          " further completed user messages."
                        : "No summary was generated and the system prompt stayed the same. Your message was answered by the original companion. Declining starts an " +
                          DISMISS_COOLDOWN_MESSAGES +
                          "-message cooldown.",
                  };

  return (
    <main className="bg-background text-foreground flex min-h-dvh flex-col">
      <header className="border-border flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4 sm:px-8">
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm"
        >
          <ArrowLeft size={16} />
          Back to chat
        </Link>
        <span className="text-muted-foreground text-xs">Scripted demo · No API calls</span>
      </header>
      <div className="mx-auto grid w-full max-w-6xl flex-1 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section aria-label="Demo conversation" className="flex min-w-0 flex-col px-4 py-6 sm:px-8">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold">A birthday, without the stress</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                One conversation. A companion that adapts.
              </p>
            </div>
            <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
              {step + 1} / 10
            </span>
          </div>
          <div className="bg-muted h-1 overflow-hidden rounded">
            <div
              className="h-full bg-teal-500 transition-[width]"
              style={{ width: ((step + 1) / 10) * 100 + "%" }}
            />
          </div>
          {step === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-8">
              <div className="h-52 w-52">
                <ChatCompanion personaId={initialPersona} thinking={false} />
              </div>
              <div className="mt-4 grid w-full max-w-sm grid-cols-2 gap-3">
                {["calm", "friendly"].map((id) => {
                  const companion = getCharacter(id);
                  return (
                    <button
                      key={id}
                      onClick={() => setInitialPersona(id)}
                      aria-pressed={initialPersona === id}
                      className={
                        "flex min-w-0 flex-col items-center rounded-lg border p-3 text-sm " +
                        (initialPersona === id
                          ? "border-teal-500 bg-teal-500/10"
                          : "border-border hover:bg-muted")
                      }
                    >
                      <img
                        src={"/characters/" + companion.id + ".webp"}
                        alt=""
                        width={64}
                        height={64}
                        className="h-16 w-16 object-contain"
                      />
                      <span className="font-medium">{companion.name}</span>
                      <span className="text-muted-foreground mt-1 text-xs">{companion.role}</span>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => {
                  setStep(1);
                  setPlaying(true);
                }}
                className="bg-primary text-primary-foreground mt-6 inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm"
              >
                <Play size={16} />
                Start walkthrough
              </button>
            </div>
          ) : (
            <>
              <div
                className="mt-4 h-[min(44dvh,420px)] min-h-48 space-y-5 overflow-y-auto pr-2"
                aria-label="Scripted messages"
              >
                {conversation.slice(0, Math.min(step, 4)).map((message, index) => (
                  <div key={index} className="space-y-3">
                    <p className="bg-muted ml-auto max-w-[85%] rounded-lg px-3 py-2 text-sm leading-6">
                      {message.user}
                    </p>
                    <div className="flex items-start gap-2">
                      <img
                        src={"/characters/" + initialCharacter.id + ".webp"}
                        alt=""
                        width={28}
                        height={28}
                        className="h-7 w-7 object-contain"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-medium">
                          {initialCharacter.name}{" "}
                          <span className="text-muted-foreground ml-1">
                            {initialCharacter.role}
                          </span>
                        </p>
                        <p className="mt-1 text-sm leading-6">{message.reply}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {step >= 5 && (
                  <p className="bg-muted ml-auto max-w-[85%] rounded-lg px-3 py-2 text-sm leading-6">
                    {nextMessage}
                  </p>
                )}
                {step === 6 && (
                  <div
                    className="rounded-lg border border-teal-500/40 bg-teal-500/5 p-4"
                    role="region"
                    aria-label="Demo companion recommendation"
                  >
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <Sparkles size={16} />
                      Try Potion Familiar?
                    </p>
                    <p className="text-muted-foreground mt-2 text-sm">
                      A creative approach could help with imaginative party ideas.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          setDecision("no");
                          setStep(9);
                          setPlaying(false);
                        }}
                        className="border-border inline-flex items-center gap-1 rounded-md border px-3 py-2 text-xs"
                      >
                        <X size={14} />
                        No, stay
                      </button>
                      <button
                        onClick={() => {
                          setDecision("yes");
                          setStep(7);
                        }}
                        className="inline-flex items-center gap-1 rounded-md bg-teal-600 px-3 py-2 text-xs text-white"
                      >
                        <Check size={14} />
                        Yes, switch
                      </button>
                    </div>
                  </div>
                )}
                {step === 7 && (
                  <div className="border-l-2 border-teal-500 pl-3">
                    <p className="text-xs font-semibold">Neutral summary</p>
                    <p className="text-muted-foreground mt-2 text-sm leading-6">{summary}</p>
                  </div>
                )}
                {finished && (
                  <div className="flex items-start gap-2">
                    <img
                      src={"/characters/" + character.id + ".webp"}
                      alt=""
                      width={28}
                      height={28}
                      className="h-7 w-7 object-contain"
                    />
                    <div>
                      <p className="text-xs font-medium">
                        {character.name}{" "}
                        <span className="text-muted-foreground ml-1">{character.role}</span>
                      </p>
                      <p className="mt-1 text-sm leading-6">
                        {decision === "yes" ? creativeReply : calmReply}
                      </p>
                    </div>
                  </div>
                )}
                <div ref={bottom} />
              </div>
              <div className="mt-4 flex items-end gap-3">
                <div className="h-28 w-28 shrink-0 sm:h-36 sm:w-36">
                  <ChatCompanion personaId={personaId} thinking={thinking} />
                </div>
                <div
                  role="status"
                  className="border-border text-muted-foreground mb-3 min-w-0 flex-1 border-b pb-3 text-sm"
                >
                  {step === 5
                    ? "Checking companion..."
                    : step === 6
                      ? "Waiting for your choice"
                      : step === 7
                        ? "Preparing neutral context..."
                        : step === 8
                          ? "Switching companion..."
                          : finished
                            ? "Conversation continues"
                            : "Chatting with " + character.name}
                </div>
              </div>
            </>
          )}
          <div className="border-border mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <div className="flex gap-2">
              <button
                title="Restart demo"
                aria-label="Restart demo"
                onClick={() => {
                  setStep(0);
                  setDecision(null);
                  setPlaying(false);
                }}
                className="border-border hover:bg-muted rounded-md border p-2"
              >
                <RotateCcw size={16} />
              </button>
              <button
                title={playing ? "Pause demo" : "Play demo"}
                aria-label={playing ? "Pause demo" : "Play demo"}
                disabled={step === 0 || step === 6 || finished}
                onClick={() => setPlaying(!playing)}
                className="border-border hover:bg-muted rounded-md border p-2 disabled:opacity-40"
              >
                {playing ? <Pause size={16} /> : <Play size={16} />}
              </button>
            </div>
            <div className="flex gap-2">
              <button
                disabled={step === 0}
                onClick={() => {
                  setPlaying(false);
                  setStep(decision === "no" && finished ? 6 : Math.max(0, step - 1));
                  if (step <= 7 || decision === "no") setDecision(null);
                }}
                className="border-border inline-flex items-center gap-1 rounded-md border px-3 py-2 text-xs disabled:opacity-40"
              >
                <ArrowLeft size={14} />
                Back
              </button>
              <button
                disabled={step === 0 || step === 6 || finished}
                onClick={() => {
                  setPlaying(false);
                  setStep(Math.min(9, step + 1));
                }}
                className="border-border inline-flex items-center gap-1 rounded-md border px-3 py-2 text-xs disabled:opacity-40"
              >
                Next
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </section>
        <aside
          className="border-border min-w-0 border-t px-5 py-6 lg:border-t-0 lg:border-l lg:px-6"
          aria-label="How the demo works"
        >
          <p className="mb-3 text-xs font-medium text-teal-600 uppercase dark:text-teal-400">
            Behind this step
          </p>
          <h2 className="text-lg font-semibold">{notes.title}</h2>
          <p className="text-muted-foreground mt-3 text-sm leading-6" aria-live="polite">
            {notes.body}
          </p>
          <div className="border-border mt-6 border-t pt-5">
            <h3 className="text-sm font-medium">Suggestion rules</h3>
            <ul className="text-muted-foreground mt-3 space-y-3 text-xs leading-5">
              <li>
                {MIN_USER_MESSAGES_BEFORE_SUGGEST} completed user messages before the first check.
              </li>
              <li>
                At least {Math.round(SWITCH_CONFIDENCE_THRESHOLD * 100)}% confidence; no suggestion
                for the current companion.
              </li>
              <li>
                {SUGGEST_COOLDOWN_MESSAGES} further messages after a suggestion;{" "}
                {DISMISS_COOLDOWN_MESSAGES} after No.
              </li>
              <li>No switch while a response or tool approval is pending.</li>
              <li>Only Yes changes the avatar and system prompt.</li>
            </ul>
          </div>
          {step >= 8 && (
            <details className="border-border mt-6 border-t pt-4">
              <summary className="cursor-pointer text-sm font-medium">Active system prompt</summary>
              <pre className="text-muted-foreground mt-3 max-h-64 overflow-auto text-xs leading-5 break-words whitespace-pre-wrap">
                {getPersona(personaId).prompt}
              </pre>
            </details>
          )}
        </aside>
      </div>
    </main>
  );
}
