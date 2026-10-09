import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import type { OAuthClientProvider } from "@modelcontextprotocol/sdk/client/auth.js";
import prisma from "@/lib/database/prisma";
import { ServerOAuthProvider } from "@/lib/mcp/oauth-provider";
import { OAuthStatus } from "../mcp/oauth-detection";
import { sanitizeTool } from "./util";
import type { DynamicStructuredTool } from "@langchain/core/tools";

interface StdioMCPServerConfig {
  transport: "stdio";
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

interface HttpMCPServerConfig {
  transport: "http";
  url: string;
  headers?: Record<string, string>;
  authProvider?: OAuthClientProvider;
}

type MCPServerConfig = StdioMCPServerConfig | HttpMCPServerConfig;

let toolsCache:
  | {
      expiresAt: number;
      tools: DynamicStructuredTool[];
    }
  | undefined;

function getMCPToolsCacheMs() {
  return Number(process.env.MCP_TOOLS_CACHE_MS || 30000);
}

function getMCPToolsLoadTimeoutMs() {
  return Number(process.env.MCP_TOOLS_LOAD_TIMEOUT_MS || 8000);
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

/**
 * Fetches enabled MCP servers from the database and formats them for MultiServerMCPClient
 */
export async function getMCPServerConfigs(): Promise<Record<string, MCPServerConfig>> {
  try {
    const servers = await prisma.mCPServer.findMany({
      where: { enabled: true },
    });

    const configs: Record<string, MCPServerConfig> = {};

    for (const server of servers) {
      if (server.type === "stdio" && server.command) {
        const config: StdioMCPServerConfig = {
          transport: "stdio",
          command: server.command,
        };

        if (server.args && Array.isArray(server.args)) {
          config.args = server.args.filter((arg): arg is string => typeof arg === "string");
        }
        if (server.env && typeof server.env === "object" && server.env !== null) {
          config.env = server.env as Record<string, string>;
        }

        configs[server.name] = config;
      } else if (server.type === "http" && server.url) {
        const config: HttpMCPServerConfig = {
          transport: "http",
          url: server.url,
        };

        if (server.headers && typeof server.headers === "object" && server.headers !== null) {
          config.headers = server.headers as Record<string, string>;
        }

        // Add authProvider for servers that require OAuth and have connected
        if (server.requiresAuth && server.oauthStatus === OAuthStatus.CONNECTED) {
          config.authProvider = new ServerOAuthProvider(server.id, server.name);
        }

        configs[server.name] = config;
      }
    }

    return configs;
  } catch (error) {
    console.error("Failed to fetch MCP server configs:", error);
    return {};
  }
}

/**
 * Creates and initializes a MultiServerMCPClient with the current database configurations
 */
export async function createMCPClient(): Promise<MultiServerMCPClient | null> {
  try {
    const mcpServers = await getMCPServerConfigs();

    if (Object.keys(mcpServers).length === 0) {
      return null;
    }

    const client = new MultiServerMCPClient({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mcpServers: mcpServers as any, // Complex MCP server config types require type assertion
      throwOnLoadError: false, // Don't fail if some servers can't connect
      prefixToolNameWithServerName: true, // Prevent tool name conflicts
    });

    return client;
  } catch (error) {
    console.error("Failed to create MCP client:", error);
    return null;
  }
}

/**
 * Gets tools from the MCP client if available.
 * Sanitizes tool schemas to be compatible with Google Gemini's function calling API.
 */
export async function getMCPTools() {
  const now = Date.now();
  if (toolsCache && toolsCache.expiresAt > now) {
    return toolsCache.tools;
  }

  try {
    const client = await createMCPClient();
    if (!client) {
      return [];
    }

    const tools = await withTimeout(
      client.getTools(),
      getMCPToolsLoadTimeoutMs(),
      "Loading MCP tools",
    );

    // Sanitize tool schemas to remove unsupported JSON Schema keywords
    // that would cause errors with Google Gemini
    const sanitizedTools = tools.map((tool) => sanitizeTool(tool));

    console.log(`Loaded ${sanitizedTools.length} tools from MCP servers`);
    toolsCache = {
      expiresAt: now + getMCPToolsCacheMs(),
      tools: sanitizedTools,
    };
    return sanitizedTools;
  } catch (error) {
    console.error("Failed to get MCP tools:", error);
    return [];
  }
}
