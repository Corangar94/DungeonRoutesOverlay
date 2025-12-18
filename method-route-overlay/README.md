# Method Route Planner Overlay

A custom Electron-based overlay for [Method's Route Planner](https://www.method.gg/fellowship/route-planner). This app allows you to view and interact with dungeon routes as an always-on-top, transparent overlay while gaming.

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

## Getting Started

### Prerequisites

*   [Node.js](https://nodejs.org/) (LTS version recommended) installed on your computer.

### Installation & Running

1.  **Open a terminal** (Command Prompt or PowerShell on Windows) in this folder.
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Start the app**:
    ```bash
    npm start
    ```

**Tip for Windows Users:** You can simply double-click the `start.bat` file included in this folder to install dependencies and run the app automatically.

## Building (Creating an .exe)

To create a standalone executable (e.g., for sharing or running without a terminal):

1.  Run the make command:
    ```bash
    npm run make
    ```
2.  Once finished, check the `out/` folder. You will find a `method-route-overlay-...` folder containing the executable.

## Troubleshooting

*   **Overlay not showing over game?** Ensure your game is in **Windowed** or **Borderless Windowed** mode. "Exclusive Fullscreen" often blocks other windows.
*   **Website cluttered?** If headers reappear, try toggling modes (`Alt+Shift+M`) or reloading (`Alt+R`).
