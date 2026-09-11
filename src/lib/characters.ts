import type { CreatureId } from "@/components/characters/creatureModels";

export const CHARACTERS: { id: CreatureId; name: string; role: string; personaId: string }[] = [
  { id: "mushroom", name: "Mushroom Familiar", role: "Friendly", personaId: "friendly" },
  { id: "cloud-sheep", name: "Cloud Sheep", role: "Calm", personaId: "calm" },
  { id: "lantern", name: "Lantern Sprite", role: "Thoughtful", personaId: "thoughtful" },
  { id: "potion", name: "Potion Familiar", role: "Creative", personaId: "creative" },
  { id: "book-goblin", name: "Book Goblin", role: "Curious", personaId: "technical" },
  { id: "grim-reaper", name: "Little Reaper", role: "Candid", personaId: "cynical" },
  { id: "moss-golem", name: "Moss Golem", role: "Patient", personaId: "caretaker" },
  { id: "knight", name: "Knight", role: "Protective", personaId: "guardian" },
  { id: "witch", name: "Witch", role: "Mischievous", personaId: "mischievous" },
  { id: "kitsune", name: "Kitsune", role: "Playful", personaId: "playful" },
  { id: "mermaid", name: "Mermaid", role: "Dreamy", personaId: "dreamy" },
  { id: "dragon", name: "Dragon", role: "Proud", personaId: "proud" },
];

export function getCharacter(personaId: string) {
  const legacy =
    personaId === "strict" ? "guardian" : personaId === "efficient" ? "friendly" : personaId;
  return CHARACTERS.find((character) => character.personaId === legacy) ?? CHARACTERS[0];
}
