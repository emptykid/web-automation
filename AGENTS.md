# AGENTS.md

## Cursor Cloud specific instructions

This is a **Playwright-based CLI browser automation tool** for Zhihu and Baidu Zhidao. There is no web server, database, or multi-service architecture — it is a single-process Node.js CLI app.

### Key commands

- **Install deps:** `npm install`
- **Build:** `npm run build` (runs `tsc`)
- **Run scripts:** All automation scripts are listed in `package.json` under `scripts` (e.g. `npm run zhihu:search`, `npm run zhidao:search`). They use `ts-node` directly so no build step is required to run them.
- **Lint/Test:** No linting or test framework is configured in this project.

### Environment configuration

- Copy `.env.example` to `.env` before running scripts. Set `HEADLESS=true` in cloud/headless environments (the default in `.env.example` is `false`).
- The project uses Playwright with `channel: 'chrome'`, meaning **Google Chrome must be installed** on the system (it does not use Playwright's bundled Chromium).

### Session management

- Most commands require a saved login session. Run `npm run zhihu:save-session` or `npm run zhidao:save-session` first — these open a browser for manual login, which is interactive and requires a display.
- Without a saved session, search commands still work (with a warning), but commands that post/modify content will fail.
- Sessions are stored in `.session/{zhihu,zhidao}/` (gitignored).

### Gotchas

- Zhihu search results require login to render properly; without it, `zhihu:search` will time out waiting for results. Baidu Zhidao search works without login.
- All commands support `--dry-run` to preview actions without submitting.
