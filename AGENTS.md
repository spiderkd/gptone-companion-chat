# Contributor Notes

GPTone is a companion chat app, not a generic agent scaffold. Keep product language, docs, and examples focused on companion personas, BYOK model access, JEV/Codiv classification, MCP tools, memory, and file storage.

## Development

Use the existing stack unless a change clearly needs something new:

- Next.js App Router
- React components under `src/components`
- LangGraph agent code under `src/lib/agent`
- Prisma and Postgres for server persistence
- S3-compatible storage for uploads

Common commands:

```bash
pnpm install
docker compose up -d
pnpm prisma:generate
pnpm prisma:migrate
pnpm dev
```

## Product Rules

- Persona changes must reach the backend prompt; frontend-only style changes are not enough.
- JEV/Codiv suggestions should be recommendations, not automatic silent switches.
- BYOK keys should not be committed or stored in chat history.
- MCP tool execution should stay visible and approval-oriented.
- Keep third-party license notices with any retained third-party files.

## Documentation Rules

When routes, providers, personas, storage, or MCP behavior changes, update `README.md`, `docs/ARCHITECTURE.md`, `.env.example`, and `docs/API.md` in the same change.
