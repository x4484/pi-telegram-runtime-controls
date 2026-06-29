# pi-telegram-runtime-controls

Telegram-native runtime controls for [pi](https://pi.dev) sessions using [`@llblab/pi-telegram`](https://github.com/llblab/pi-telegram).

## Features

- `/reload_runtime` Telegram command
- `/new` Telegram command
- `/start` menu rows: `🔄 Reload runtime` and `🆕 New session`
- Confirmation dialogs from the menu
- Pi-side `/telegram-reload-runtime` command that calls `ctx.reload()`
- Pi-side `/telegram-new-session` command that calls `ctx.newSession()`
- Telegram controls dispatch TUI `/reload` and `/new` into the owning tmux pane

## Requirements

- pi with extensions enabled
- `@llblab/pi-telegram` installed, loaded first, and connected
- The Telegram-owning Pi must be running inside tmux so the addon can send TUI slash commands to `TMUX_PANE`

## Install

```bash
pi install git:github.com/x4484/pi-telegram-runtime-controls
```

Then restart pi or run terminal `/reload` once.

After this extension has loaded once, you can use Telegram to trigger future reloads or fresh sessions:

```text
/reload_runtime
/new
```

Or open `/start` and tap `🔄 Reload runtime` or `🆕 New session`.

## Important limitation

This extension cannot solve the first load of a brand-new extension. Pi must load this package once through restart or terminal `/reload` before its Telegram controls exist.

`/new` starts a fresh Pi session through Pi's built-in `/new` command. It does not delete the current session history.

Why tmux dispatch? Pi extension `sendUserMessage()` intentionally skips slash-command execution, so a companion Telegram command cannot reliably run `/new` by queueing it as a prompt. This addon instead sends the actual TUI slash command to the Telegram-owning tmux pane, matching what a local operator would type.
