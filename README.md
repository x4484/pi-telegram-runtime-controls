# pi-telegram-runtime-controls

Telegram-native runtime controls for [pi](https://pi.dev) sessions using [`@llblab/pi-telegram`](https://github.com/llblab/pi-telegram).

## Features

- `/reload_runtime` Telegram command
- `/start` menu row: `🔄 Reload runtime`
- Confirmation dialog before reload
- Pi-side `/telegram-reload-runtime` command that calls `ctx.reload()`

## Requirements

- pi with extensions enabled
- `@llblab/pi-telegram` installed, loaded first, and connected

## Install

```bash
pi install git:github.com/x4484/pi-telegram-runtime-controls
```

Then restart pi or run terminal `/reload` once.

After this extension has loaded once, you can use Telegram to trigger future reloads:

```text
/reload_runtime
```

Or open `/start` and tap `🔄 Reload runtime`.

## Important limitation

This extension cannot solve the first load of a brand-new extension. Pi must load this package once through restart or terminal `/reload` before its Telegram controls exist.
