# ADR-001: Use ytInitialData for Subscription List Extraction

**Status**: Accepted
**Date**: 2026-01-03
**Owner**: Dev

---

## Context

We need to load a user's complete list of YouTube subscriptions. Existing solutions use one of two approaches:
1.  **YouTube Data API**: Reliable, but the `subscriptions.list` endpoint costs 1 unit per call (max 50 items). A user with 5,000 subscriptions would cost 100 units just to read the list, severely limiting scale.
2.  **DOM Scraping**: Free, but extremely fragile. Relies on hardcoded CSS selectors that break with every YouTube UI update.

---

## Decision

We will extract subscription data directly from the `window.ytInitialData` JavaScript object that YouTube injects on page load.

**Key Points:**
-   This is the "Source of Truth" that YouTube's own frontend uses to render the page.
-   The data includes `channelId`, `title`, `thumbnail`, and `continuationToken` for pagination.
-   It is layout-agnostic (works with List or Grid view).

---

## Alternatives Considered

### Option A: YouTube Data API

-   **Pros**: Official, stable, well-documented.
-   **Cons**: Quota cost is prohibitive. 10,000 units/day / (50 items/call + 50 units/delete) makes bulk operations impossible at scale.
-   **Rejected because**: The economic model makes it a trap for our use case.

### Option B: DOM Scraping

-   **Pros**: Free.
-   **Cons**: Breaks with every UI change. Language-dependent (selectors based on "Unsubscribe" text fail for non-English users).
-   **Rejected because**: Unacceptably fragile; maintenance burden is too high.

---

## Consequences

### Positive

-   **Speed**: We can load thousands of subscriptions in seconds without physical scrolling.
-   **Reliability**: We are not dependent on CSS classes or text labels.
-   **Cost**: Zero API quota usage.

### Negative / Risks

-   **Risk**: YouTube could change the structure of `ytInitialData`.
-   **Mitigation**: Implement a versioned parser with clear error handling. If parsing fails, the extension notifies the user and awaits an update.

---

## Verification

### Objectives
- Prove that `ytInitialData` can be reliably captured.
- Prove that pagination via `continuationToken` works for 5,000+ subscriptions.

### Test Commands
- `pnpm test` (once tests are written)
