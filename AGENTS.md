# AGENTS.md

SubZero — Chrome Extension | React + TypeScript + Vite + CRXJS

Follows [MCAF](https://mcaf.managed-code.com/)

---

## Project Overview

**SubZero** is a Chrome Extension for surgical YouTube subscription management. It uses a hybrid architecture:
1.  **ytInitialData Extraction**: Reads subscription data directly from YouTube's internal JSON.
2.  **RSS Inactivity Heuristic**: Uses free RSS feeds to determine channel activity.
3.  **DOM Automation**: Executes unsubscribe actions via simulated Trusted Events.

---

## Conversations (Self-Learning)

Before ANY task, evaluate the user's message for new rules. If detected, update this file FIRST.

**Keywords to watch:**
- Prohibition: `never`, `don't`, `avoid` → Add `NEVER` rule.
- Requirement: `always`, `must` → Add `ALWAYS` rule.
- Process: `the workflow is...` → Add to Task Delivery.
- Preference: `I like`, `I prefer` → Add to Likes.
- Correction: `this is wrong` → Add emphatic rule.

---

## Rules to Follow (Mandatory)

### Commands

- **build**: `npm run build`
- **dev**: `npm run dev`
- **test**: `npm run test`
- **format**: `npm run format`
- **lint**: `npm run lint`

### Tech Stack

| Layer          | Technology                                   |
| -------------- | -------------------------------------------- |
| Language       | TypeScript                                   |
| UI Framework   | React 18                                     |
| Build System   | Vite + CRXJS (HMR for extensions)            |
| State/Async    | TanStack Query (React Query)                 |
| Storage        | Dexie.js (IndexedDB wrapper)                 |
| Styling        | Tailwind CSS (scoped via Shadow DOM)         |
| Virtualization | `@tanstack/react-virtual`                    |

### Task Delivery (MCAF Cycle)

1.  **Describe**: Ensure `docs/Features/` and `docs/ADR/` cover the work.
2.  **Plan**: Propose files to change, tests to add.
3.  **Implement**: Write tests (red) → Write code (green).
4.  **Verify**: Run `npm test` and `npm run lint`.
5.  **Review**: Update docs/AGENTS.md if a new pattern is learned.

### Coding Rules

- **No Magic Literals**: All constants (selectors, URLs, timeouts) go in `src/constants/`.
- **TypeScript Strict**: `strict: true` in `tsconfig.json`. No `any`.
- **Manifest V3**: All background work is in Service Workers. No persistent background pages.
- **Shadow DOM**: All injected UI must be scoped to prevent style bleeding.
- **Rate Limiting**: All network fetches (RSS) must use the Leaky Bucket algorithm.

### Testing

- **Strategy**: Prioritize Integration tests (Playwright for extension UI).
- **Unit Tests**: For pure logic (RSS parsing, rate limiter, data transforms).
- **Mocking**: Only for external services (YouTube RSS). Never mock internal logic.

### Critical (NEVER Violate)

- **NEVER** use the YouTube Data API for write operations (quota trap).
- **NEVER** hardcode CSS selectors without a fallback strategy.
- **NEVER** commit secrets or API keys.
- **NEVER** skip tests to make a PR green.
- **NEVER** force push to `main`.

### Boundaries

**ALWAYS Ask First:**
- Changing the `manifest.json` permissions.
- Adding a new external dependency.
- Modifying the core ytInitialData extraction logic.

---

## Preferences

### Likes
- Concise, well-documented code.
- Aggressive anti-pattern avoidance.
- "Surgical" solutions over "bloatware".

### Dislikes
- "Hacky" scripts.
- Unnecessary complexity (e.g., PocketTube).

---

## Lessons Learned

### Main World Injection (2026-01-03) - REVISED
**Problem**: Loading `injected.ts` as `script.src` doesn't work because CRXJS copies the raw `.ts` file to `dist/` without compiling it. Browsers can't execute TypeScript. Additionally, `ytInitialData` is unreliable and may not contain all subscriptions.

**Solution**: Use DOM scraping with `document.querySelectorAll('ytd-channel-renderer')` as reference repos do. This reads the rendered DOM directly, which is more reliable than parsing internal JSON. Trigger extraction on button click, not on page load.

### Data Persistence (2026-01-03)
**Problem**: `upsertSubscriptions` was overwriting `isSafeListed` and RSS data every time subscriptions were re-extracted from YouTube.

**Solution**: Use Dexie transactions to read-modify-write, preserving user preferences (`isSafeListed`) and expensive fetch data (`lastUpload`, `activityStatus`).

---

## Feature Status

| Feature                | Status   | Notes                              |
| ---------------------- | -------- | ---------------------------------- |
| ytInitialData Extract  | ✅ Done  | Inline injection pattern           |
| RSS Inactivity Scan    | ✅ Done  | Leaky Bucket rate limiter          |
| Progress Indicator     | ✅ Done  | Real-time modal with blur/block    |
| Safelist               | ✅ Done  | Persistent star, excludes from bulk|
| Unit Tests             | ✅ Done  | 14/14 passing                      |
| Manual Verification    | 🔄 WIP   | User testing required              |
