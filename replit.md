# AI Agent Design — منصة تصميم الوكلاء

## Overview

A bilingual (Arabic/English, RTL/LTR) AI agent design and configuration platform. Built as a full-stack pnpm monorepo with a React+Vite frontend, Express 5 API server, PostgreSQL database, and OpenAI integration.

Users can design, document, and configure AI agents using the 5-layer ADK model, manage knowledge bases, run AI chat sessions, plan projects, evaluate tools, generate prompts, and more.

## Architecture

### Monorepo Structure
- `artifacts/guidebook/` — React+Vite frontend (port dynamic, preview at `/`)
- `artifacts/api-server/` — Express 5 backend (port 8080, prefix `/api`)
- `lib/db/` — PostgreSQL + Drizzle ORM schema and client
- `lib/api-spec/` — OpenAPI spec + Orval codegen
- `lib/api-zod/` — Generated Zod schemas from OpenAPI spec
- `lib/api-client-react/` — Generated React Query hooks from OpenAPI spec
- `lib/integrations-openai-ai-server/` — OpenAI client via Replit AI Integrations

### Tech Stack
- **Frontend**: React 19, Vite, Wouter (routing), TanStack Query, shadcn/ui, Tailwind CSS
- **Backend**: Express 5 (TypeScript), Drizzle ORM, PostgreSQL
- **AI**: OpenAI gpt-4o-mini via Replit AI Integrations (SSE streaming)
- **Build**: esbuild for API server, Vite for frontend
- **Validation**: Zod v4, drizzle-zod, Orval codegen

### DB Schema
Run `pnpm --filter @workspace/db run push` to apply schema changes.
After changes, rebuild types: `pnpm --filter @workspace/db exec tsc -p tsconfig.json`

## Features

### Design Tools (أدوات التصميم)

#### 1. Dashboard (لوحة القيادة)
- Recent chats, saved plans, knowledge highlights widgets

#### 2. Knowledge Base (قاعدة المعرفة)
- 20 pre-seeded entries covering agent frameworks, graph DBs, personal messaging AI models
- Category filtering, search, tags, status badges
- Entry detail view with full Markdown content
- Full CRUD operations via API

#### 3. AI Chat Sessions (محادثات الذكاء الاصطناعي)
- Create/delete chat sessions with Arabic/English language selection
- Real-time SSE streaming of AI responses (gpt-4o-mini)
- Memory injection: user preferences automatically prepended to system prompt
- KB grounding: retrieves relevant knowledge base entries for each query
- Optional web search integration

#### 4. Project Plans (خطط المشاريع)
- AI-assisted project planning via SSE streaming
- Plan workspace with message history

#### 5. Tool Evaluations (تقييمات الأدوات)
- AI-powered tool/framework evaluation with fit score and recommendation
- SSE streaming of evaluation report

#### 6. Prompt Generator (مولّد المطالبات)
- Generate structured system prompts from role/goal/context/constraints
- SSE streaming, copy-to-clipboard

#### 7. Project Analysis (تحليل المشاريع)
- GitHub repository analysis with AI-generated insights

#### 8. Memory & Learning (الذاكرة والتعلم)
- Store and manage agent memory entries with confidence levels

#### 9. System Settings (إعدادات النظام)
- Edit system instructions per mode (chat, analysis, etc.)

### Agent Layers (طبقات الوكيل — ADK Model)

#### 10. System Architecture (معمارية النظام)
- Design agent architecture using the 5-layer ADK model
- Visual workspace: assign skills, hooks, subagents, plugins, MCP servers per architecture
- Export as Markdown (CLAUDE.md style)

#### 11. Skills (المهارات) — ADK Layer 2
- Define scoped knowledge modules for your agent
- AI content generation (SSE streaming) from name/description
- Categories: general, coding, research, analysis, writing, planning, security, testing

#### 12. Hooks (الخطافات) — ADK Layer 3
- Event-driven guardrail rules
- Event types: PreToolUse, PostToolUse, SessionStart, Stop, SubagentStop
- Toggle enabled/disabled per hook

#### 13. Subagents (الوكلاء الفرعيون) — ADK Layer 4
- Specialized delegation units
- Configure role, model preference, tools, permissions

#### 14. Plugins (الإضافات) — ADK Layer 5
- Distributable packages bundling agent components
- Track version, install command, included component types

#### 15. MCP Servers (خوادم MCP)
- Model Context Protocol server integrations
- Server types: stdio, sse, http
- Track endpoint, capabilities, status

## Navigation
The sidebar has two sections:
1. **أدوات التصميم** (Design Tools) — existing tools (dashboard through settings)
2. **طبقات الوكيل** (Agent Layers) — 6 new ADK-layer pages

## API Patterns
- New ADK routes use direct `fetch()` calls from frontend (not OpenAPI codegen)
- API URL pattern: `const BASE = import.meta.env.BASE_URL.replace(/\/$/, ""); const api = (path) => \`${BASE}${path}\``
- SSE streaming routes use `sseHeaders()` and `sendSSE()` from `lib/ai-client.ts`
- Memory context injected via `buildMemoryContext()` from `lib/memory-helper.ts`

## Bilingual Support
- All UI text is bilingual via `LanguageContext.tsx`
- Translation pattern: `"key": "Arabic"` and `"key.en": "English"`
- RTL/LTR switching via `document.documentElement.dir`
- Language toggle button in sidebar footer

## Key Files
- `artifacts/guidebook/src/contexts/LanguageContext.tsx` — all translation keys
- `artifacts/guidebook/src/components/layout.tsx` — sidebar with two-section nav
- `artifacts/guidebook/src/App.tsx` — all routes
- `artifacts/api-server/src/routes/index.ts` — all API routers registered
- `artifacts/api-server/src/lib/seed.ts` — seed data for DB on startup
- `lib/db/src/schema/index.ts` — exports all tables
