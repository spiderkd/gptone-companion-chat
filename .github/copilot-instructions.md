# Copilot Instructions

This project is GPTone: a Next.js companion chat app with LangGraph, personas, BYOK model keys, JEV/Codiv companion classification, MCP tools, Postgres memory, and S3-compatible uploads.

Prefer existing project patterns:

- Route handlers live under `src/app/api`.
- Agent orchestration lives under `src/lib/agent` and `src/services/agentService.ts`.
- Persona and companion definitions live in `src/lib/personas.ts` and `src/lib/characters.ts`.
- UI settings and BYOK behavior live in React context/components under `src/contexts` and `src/components`.
- Storage helpers live under `src/lib/storage`.

Do not reintroduce generic starter/template marketing language. Keep docs and comments tied to GPTone's actual companion chat behavior.
