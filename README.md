# Lingo

A mobile-first vocabulary quiz app. Create a language, build decks of word pairs, and test yourself with multiple-choice games. Leaderboards are scoped per deck so scores are meaningful.

## How it works

**Languages → Decks → Words**

- A **language** (e.g. _French_, _Zulu_) is the top-level container. It can be public or private, and you can invite collaborators.
- **Decks** (e.g. _Chapter 1_, _Verbs_, _Animals_) live inside a language. Games are played at the deck level, so each deck has its own leaderboard and high score.
- **Words** are target-language / English pairs added to the language. A word can belong to multiple decks.

## Roles

| Role | Can do |
|---|---|
| Owner | Everything — manage words, decks, members, delete language |
| Editor | Add/remove words, create/delete decks, assign words to decks |
| Viewer | Play games, view leaderboards |

## Game

Each session shuffles all words in a deck into multiple-choice questions (4 options). A session runs until every word has been answered. Your personal best per deck is tracked, and a per-deck leaderboard shows all players' top scores.

## Tech

- [TanStack Start](https://tanstack.com/start) (React, file-based routing, SSR)
- [Supabase](https://supabase.com) (Postgres + Auth + RLS)
- [Tailwind CSS v4](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com) component primitives
- [Framer Motion](https://www.framer.com/motion) for animations
- Deployed on [Netlify](https://netlify.com)

## Local development

```bash
bun install
bun run dev
```

Requires a `.env` with:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```
