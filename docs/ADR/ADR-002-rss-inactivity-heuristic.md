# ADR-002: Use RSS Feeds for Channel Inactivity Heuristic

**Status**: Accepted
**Date**: 2026-01-03
**Owner**: Dev

---

## Context

A core feature is filtering subscriptions by "last upload date" to identify inactive channels. We need a way to get this data at scale.

1.  **YouTube Data API (`channels.list` or `search.list`)**: Returns video data, but costs 1-100 units per call. Scanning 5,000 channels would exceed the daily quota.
2.  **RSS Feeds**: Every YouTube channel has a public RSS feed at `youtube.com/feeds/videos.xml?channel_id=...`. This is cost-free.

---

## Decision

We will use the public RSS feed endpoint to determine channel inactivity.

**Key Points:**
-   The RSS feed returns the most recent videos with their `<published>` date.
-   The first `<entry>` in the XML is the latest video.
-   Since this is a standard HTTP request (not an API call), there is no quota cost.

**Rate Limiting:**
-   To avoid IP bans, we will implement a "Leaky Bucket" throttle.
-   **Capacity**: 20 tokens.
-   **Refill Rate**: 5 tokens per second.
-   This limits requests to a sustainable ~5/second.

---

## Alternatives Considered

### Option A: YouTube Data API (`videos.list`)

-   **Pros**: Structured, reliable data.
-   **Cons**: 1 unit per video. Scanning 5,000 channels' latest videos = 5,000 units = 50% of daily quota.
-   **Rejected because**: Economically non-viable.

---

## Consequences

### Positive

-   **Zero Cost**: No API quota used.
-   **Speed**: Can scan thousands of channels in a few minutes.

### Negative / Risks

-   **Risk**: RSS feed structure could change.
-   **Mitigation**: The RSS feed is a W3C standard (Atom). Changes are unlikely and would be minor.
-   **Risk**: YouTube could rate-limit or block excessive requests.
-   **Mitigation**: The Leaky Bucket algorithm keeps our request rate low and human-like.

---

## Verification

### Objectives
- Prove that the RSS feed returns the latest video's published date.
- Prove that the Leaky Bucket prevents 429 errors.

### Test Commands
- Unit tests for the RSS parser and rate limiter.
