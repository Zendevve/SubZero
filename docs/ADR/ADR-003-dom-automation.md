# ADR-003: DOM Automation for Unsubscribe Actions

**Status**: Accepted
**Date**: 2026-01-03
**Owner**: Dev

---

## Context

To unsubscribe from a channel, we must interact with YouTube's DOM. The YouTube Data API `subscriptions.delete` endpoint costs 50 units per call, making it economically impossible at scale (200 deletes/day max).

---

## Decision

We will automate the unsubscribe action via DOM manipulation using:
1.  **Simulated Mouse Events**: `MouseEvent` with proper `clientX/Y` coordinates.
2.  **MutationObserver**: To detect when the confirmation modal appears.
3.  **Randomized Delays (Jitter)**: Using Box-Muller transform for normal distribution, making timing human-like.

**Key Points:**
-   Click the "Subscribed" button → Wait for modal → Click "Confirm".
-   Use a queue system with pause/resume and configurable delay.
-   Default delay: 2.5 seconds ± 0.5 seconds (jitter).

---

## Alternatives Considered

### Option A: YouTube Data API

-   **Pros**: Official, reliable.
-   **Cons**: 50 units/delete = 200 deletes/day max. Economically non-viable.
-   **Rejected because**: Quota trap.

### Option B: Native `element.click()`

-   **Pros**: Simple.
-   **Cons**: Creates `isTrusted: false` events. YouTube's Polymer framework may ignore them.
-   **Rejected because**: Unreliable on YouTube's modern frontend.

---

## Consequences

### Positive

-   **Free**: No API quota consumed.
-   **Fast**: Can process hundreds of channels per session.

### Negative / Risks

-   **Risk**: YouTube may change the DOM structure or add anti-bot detection.
-   **Mitigation**: Selectors are centralized in `src/constants/index.ts`. Jitter and session limits reduce detection risk.
-   **Risk**: User account could be flagged for "unusual activity".
-   **Mitigation**: Default to 1 action per 2.5 seconds. Prompt user to "take a break" after 500 actions.

---

## Verification

### Objectives
- Prove that the simulated click triggers the modal.
- Prove that the unsubscribe action completes.

### Test Commands
- Manual testing in Chrome DevTools on a real YouTube account.
- Visual verification that the channel is removed from the subscription list.
