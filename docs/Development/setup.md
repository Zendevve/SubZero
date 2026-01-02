# Development Setup

## Prerequisites

- **Node.js**: v18 or higher
- **Package Manager**: npm (or pnpm)
- **Browser**: Google Chrome (Canary or Stable)

## Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/Zendevve/SubZero.git
    cd SubZero
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Start the development server:
    ```bash
    npm run dev
    ```
    This will start Vite in watch mode.

## Loading the Extension

1.  Open Chrome and navigate to `chrome://extensions/`.
2.  Toggle **Developer mode** (top right).
3.  Click **Load unpacked**.
4.  Select the `dist/` folder adjacent to this project root.

## Architecture Guidelines

- **Sensible Defaults**: The app should work "out of the box" without heavy configuration.
- **Type Safety**: All messages between contexts (Content Script <-> Background <-> UI) must be typed in `src/types/`.
- **Assets**: Put static assets in `public/`.
- **CSS**: Use Tailwind classes. For Content Scripts, ensure CSS injection uses Shadow DOM to avoid bleeding.

## Troubleshooting

- **"Service Worker Inactive"**: Click "Service Worker" in `chrome://extensions` to inspect the background script console. It wakes up on events.
- **"Content Script not loading"**: Reload the YouTube page. Content scripts only inject on page load.
