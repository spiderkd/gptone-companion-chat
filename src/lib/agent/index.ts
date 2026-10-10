import { DEFAULT_SYSTEM_PROMPT as SYSTEM_PROMPT } from "./prompt";
import { ensurePostgresMemory, postgresCheckpointer } from "./memory";
import type { DynamicTool, StructuredToolInterface } from "@langchain/core/tools";
import {
  AgentConfigOptions,
  createChatModel,
  DEFAULT_MODEL_NAME,
  DEFAULT_MODEL_PROVIDER,
} from "./util";
import { getMCPTools } from "./mcp";
import { AgentBuilder } from "./builder";

/**
 * Create a new agent instance with the given configuration.
 * @param cfg Configuration options for the agent
 * @returns
 */
async function createAgent(cfg?: AgentConfigOptions) {
  // Resolve model/provider from cfg or defaults.
  const provider = cfg?.provider || DEFAULT_MODEL_PROVIDER;
  const modelName = cfg?.model || DEFAULT_MODEL_NAME;
  const llm = createChatModel({ provider, model: modelName, temperature: 1, apiKey: cfg?.apiKey });

  // Load MCP tools
  const mcpTools = await getMCPTools();
  const configTools = (cfg?.tools || []) as StructuredToolInterface[];
  const allTools = [...configTools, ...mcpTools] as DynamicTool[];

  const agent = new AgentBuilder({
    llm,
    tools: allTools,
    prompt: cfg?.systemPrompt || SYSTEM_PROMPT,
    checkpointer: postgresCheckpointer,
    approveAllTools: cfg?.approveAllTools || false,
  }).build();

  return agent;
}

// Public helper if explicit readiness is ever needed elsewhere.
export async function ensureAgent(cfg?: AgentConfigOptions) {
  // Ensure checkpointer is ready before returning an agent instance.
  await ensurePostgresMemory();
  return createAgent(cfg);
}

// Named export to explicitly fetch a configured agent.
export async function getAgent(cfg?: AgentConfigOptions) {
  return ensureAgent(cfg);
}
