# This fork is the source of truth

We run this fork, not upstream. Upstream is a **source of changes**, not a
dependency: we do not wait on it, we do not open pull requests, and nothing we
need is allowed to live only upstream.

`main` here is what the laptop runs. Keep it buildable: it is deployed, not just
stored.

## What this fork adds

| Change | Where |
|---|---|
| herdr is not mistaken for a nested multiplexer when remobi is started from inside a herdr pane (`HERDR_ENV` was the one marker `NESTED_MUX_ENV_VARS` did not strip) | `src/session.ts` |
| `toolbar-toggle` action: a floating button hides/shows the button bar **and** the top controls (font size + help), which otherwise cover a full-screen app's own top-right controls (herdr's `switch`) | `src/actions/registry.ts`, `src/index.ts`, `styles/base.css` |
| `scroll-bottom` action plus the ⤓ button in the scroll strip: jumps the terminal to the newest line of its own scrollback, instead of paging the app | `src/controls/scroll-buttons.ts`, `src/client-entry.ts`, `src/actions/registry.ts` |
| Row 1 keeps its buttons inside the viewport on a narrow phone (it used to overflow and clip the outermost ones) | `styles/base.css` |

The per-machine settings (herdr key sequences, floating buttons, gestures) are
**not** here: they live in the ops repo, `herdr-manager-wake/remobi/remobi.config.ts`,
and are passed with `--config`.

## How it runs

`systemd --user` unit `remobi.service` runs this checkout's build:

```bash
node <checkout>/dist/cli.mjs serve --port 7681 --base-path /remobi \
  --config <herdr-manager-wake>/remobi/remobi.config.ts \
  -- herdr --session <name>
```

It is loopback-only; a Cloudflare Tunnel plus Access publishes it. The client
bundle is produced by `pnpm run build:dist`, so **rebuild and restart after
changing anything under `src/` or `styles/`**:

```bash
cd <checkout>
pnpm run build:dist
systemctl --user restart remobi.service
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:7681/remobi/   # 200
```

## Bringing in upstream changes (when we want them)

Nothing forces this; do it deliberately, on a branch, and keep `main` green.

```bash
git fetch upstream
git checkout -b merge-upstream-$(date +%Y%m%d) main
git merge upstream/main          # a rebase is fine too; a merge keeps the history honest
```

Resolve conflicts in favour of this fork for the four areas in the table above —
they are the whole reason the fork exists. Then prove it still works before
`main` moves:

```bash
pnpm install
pnpm exec tsc --noEmit
pnpm run test:coverage           # unit
pnpm run check                   # biome
pnpm run build:dist
LD_LIBRARY_PATH=... pnpm exec playwright test --project=chromium-android
```

and then, on the real thing:

```bash
systemctl --user restart remobi.service
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:7681/remobi/          # 200
curl -s -o /dev/null -w '%{http_code}\n' https://remobi.s1.1us.work/remobi/     # 302 -> Access
```

Merge the branch into `main` and `git push origin main`. If upstream ever
disappears, nothing here breaks: the fork builds and runs on its own.
