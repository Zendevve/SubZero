# Testing Strategy

## Overview

SubZero prioritizes reliability and user safety. Because the extension interacts with a third-party DOM (YouTube) that changes frequently, our testing strategy focuses on:

1.  **Isolation**: Unit testing core logic (RSS, Rate Limiter) independent of the browser.
2.  **Safety**: Verifying that the DOM Automation engine respects rate limits and user confirmation.
3.  **Resilience**: End-to-End tests to simulate YouTube DOM interactions (future scope).

## Test Layers

### 1. Unit Tests (Vitest)
- **Scope**: `src/lib/`, `src/utils/`
- **Coverage**:
    - `rss-parser.ts`: Parsing invalid/valid XML, handling feed timeouts.
    - `rate-limiter.ts`: Verifying token bucket refill and consumption.
    - `db.ts`: IndexedDB schema validation and data migrations.
    - `unsubscribe.ts`: Logic flow (queue management, jitter calculation) *without* actual DOM manipulation.

### 2. Integration Tests
- **Scope**: Components and Service Workers
- **Tools**: Vitest + React Testing Library
- **Coverage**:
    - Dashboard components rendering correct states.
    - Service Worker message routing.

### 3. Manual Verification (Current Primary)
- **Scope**: Full extension lifecycle
- **Process**:
    1. Load unpacked extension.
    2. Navigate to `youtube.com/feed/channels`.
    3. Verify data extraction (Redux/JSON interception).
    4. Run "Scan Inactivity".
    5. Test "Unsubscribe" on a test channel.

## Commands

```bash
# Run Unit Tests
npm run test

# Run Watch Mode
npm run test:watch
```
