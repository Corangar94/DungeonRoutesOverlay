# Method Route Planner Overlay

A custom Electron-based overlay for [Method's Route Planner](https://www.method.gg/fellowship/route-planner). This app allows you to view and interact with dungeon routes as an always-on-top, transparent overlay while gaming.

## Download & Install

**[Download the latest release here](https://github.com/your-username/method-route-overlay/releases)**

1.  Go to the **Releases** page (link above).
2.  Download the `.exe` file (e.g., `Method.Route.Overlay-1.0.0-Setup.exe`).
3.  Run the installer. It will install the app and create a desktop shortcut.

## Features

*   **Always-on-Top**: Stays over your game window (works best with Borderless Windowed mode).
*   **Two Modes**:
    *   **Overlay Mode**: Transparent, click-through (mouse clicks go to the game), and optimized for viewing.
    *   **Configure Mode**: Interactive, opaque, and focused so you can use the Method UI (load routes, import, export).
*   **Global Hotkeys**: Control the overlay even when you are playing.
*   **Auto-Declutter**: Automatically hides headers, navigation, and footers from the website.
*   **Persistence**: Remembers your last visited route, opacity settings, and hotkey preferences.

## Hotkeys

| Key Combination | Action |
| :--- | :--- |
| **`Alt + M`** | Toggle Overlay Visibility (Show/Hide) |
| **`Alt + Shift + M`** | Toggle Mode (Overlay ↔ Configure) |
| **`Alt + ]`** | Increase Opacity |
| **`Alt + [`** | Decrease Opacity |
| **`Alt + R`** | Reload Page |

## Troubleshooting

*   **Overlay not showing over game?** Ensure your game is in **Windowed** or **Borderless Windowed** mode. "Exclusive Fullscreen" often blocks other windows.
*   **Website cluttered?** If headers reappear, try toggling modes (`Alt+Shift+M`) or reloading (`Alt+R`).

---

## For Developers

If you want to modify the code or build it yourself:

### Prerequisites
*   [Node.js](https://nodejs.org/) (LTS version recommended).

### Running Locally
1.  Open a terminal in this folder.
2.  Install dependencies: `npm install`
3.  Start the app: `npm start`

### Building the Executable manually
To create the `.exe` yourself:
```bash
npm run make
```
The output will be in the `out/` folder.
