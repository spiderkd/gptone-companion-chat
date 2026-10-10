import { CHARACTERS } from "@/lib/characters";

export const SWITCH_CONFIDENCE_THRESHOLD = 0.75;
export const MIN_USER_MESSAGES_BEFORE_SUGGEST = 4;
export const SUGGEST_COOLDOWN_MESSAGES = 4;
export const DISMISS_COOLDOWN_MESSAGES = 8;

export function isCompanionCheckDue(
  userMessageCount: number,
  cooldown: { lastSuggestionAt: number; lastDismissAt: number },
) {
  return (
    userMessageCount >= MIN_USER_MESSAGES_BEFORE_SUGGEST &&
    userMessageCount - cooldown.lastSuggestionAt >= SUGGEST_COOLDOWN_MESSAGES &&
    userMessageCount - cooldown.lastDismissAt >= DISMISS_COOLDOWN_MESSAGES
  );
}

export interface PersonaSwitchSuggestion {
  shouldSuggestSwitch: boolean;
  suggestedPersonaId: string | null;
  confidence: number;
  reason: string;
  source: "codiv" | "heuristic";
}

export function getCharacterByPersonaId(personaId?: string | null) {
  return CHARACTERS.find((character) => character.personaId === personaId) ?? null;
}
