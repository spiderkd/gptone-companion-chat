export type SupportedProvider = "openai" | "google";

export const MODEL_OPTIONS: Record<
  SupportedProvider,
  Array<{ value: string; label: string }>
> = {
  openai: [
    { value: "gpt-6-luna", label: "GPT-6 Luna" },
    { value: "gpt-4o-mini", label: "GPT-4o mini" },
    { value: "gpt-4o", label: "GPT-4o" },
  ],
  google: [
    { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
    { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
    { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
    { value: "gemini-3.1-flash", label: "Gemini 3.1 Flash" },
  ],
};

export const DEFAULT_PROVIDER: SupportedProvider = "openai";
export const DEFAULT_MODEL = MODEL_OPTIONS[DEFAULT_PROVIDER][0].value;

export function isSupportedProvider(provider: string | undefined): provider is SupportedProvider {
  return provider === "openai" || provider === "google";
}

export function getDefaultModel(provider: string | undefined) {
  return isSupportedProvider(provider) ? MODEL_OPTIONS[provider][0].value : DEFAULT_MODEL;
}

export function isSupportedModel(provider: string | undefined, model: string | undefined) {
  if (!isSupportedProvider(provider) || !model) return false;
  return MODEL_OPTIONS[provider].some((option) => option.value === model);
}
