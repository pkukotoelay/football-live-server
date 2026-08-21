# Production description — football scrapes on GitHub Actions

This directory is a **standalone GitHub Actions project** with the same layout as `D:\SCRAPPING_CODE\AWS_Server` (`src/`, `config/`, `scripts/`, CLI). The live AWS tree is left alone. Push **this** folder to GitHub; enable Actions here.

---

## 1. Two folders, two jobs

| Location | Role |
|----------|------|
| `D:\SCRAPPING_CODE\AWS_Server` | Always-on 1GB EC2: admin panel, Flutter JSON HTTP, **football live pipeline** (5-minute cron). **Do not edit this tree for Actions.** |
| `D:\SCRAPPING_CODE\AWS_Github_Action` | Same app structure + `.github/workflows`. Chrome and RAM live on GitHub runners. |

Do not run the same highlight/TV/tips job on both at the same time.

---

## 2. What Actions runs (automatic)

You do **not** need admin “Run now” for these jobs.

| Trigger | What |
|---------|------|
| Every 8 hours (`0 */8 * * *` UTC) | Highlights → MyanmarTV → tips, one after another |
| **Run workflow** | Same, or a single job |

Football match URL / stream extract stays on AWS. Putting it on Actions every 8 hours would miss kickoff windows.

Each step uses existing CLI only:

- `node src/cli/runPipeline.js --highlights`
- `node src/cli/runPipeline.js --channels`
- `node src/cli/runPipeline.js --tips`

Axios first, Puppeteer if needed. Runner installs Google Chrome. `LOW_MEMORY_MODE=false` (do not copy 1GB Chrome flags here).

Failed scrape: keep previous delivery JSON. Wait for the next 8-hour run. Do not loop re-runs.

---

## 3. Topology

```
Flutter / admin on AWS  →  last good GitHub JSON + local API

GitHub Actions (this repo)
  → Chrome on ubuntu-latest
  → upload changed highlight1/2, myanmartv, tips JSON to the delivery repo
```

Actions RAM is not the EC2 cap. An Action OOM only fails that workflow.

---

## 4. Secrets (this GitHub repo)

| Secret | Maps to app env |
|--------|-----------------|
| `DELIVERY_GITHUB_TOKEN` | `GITHUB_TOKEN` (PAT for the **JSON delivery** repo) |
| `GITHUB_OWNER` | Delivery owner |
| `GITHUB_REPO` | Delivery repo |
| `GITHUB_BRANCH` | Optional, default `main` |

Optional: `GITHUB_HIGHLIGHT1_PATH`, `GITHUB_HIGHLIGHT2_PATH`, `GITHUB_CHANNELS_PATH`, `GITHUB_TIPS_PATH`.

Never commit `.env`. Do not commit `data/admin/admins.json`.

---

## 5. IP blocks

GitHub datacenter IPs can get a **temporary** 403. Keep last JSON. Retry next schedule. Optional one Axios run from the AWS IP. Nobody can “unblock” GitHub’s IP from admin.

---

## 6. Go-live

1. Create a GitHub repository from **this folder only**.
2. Add secrets above.
3. Run workflow once by hand.
4. Confirm JSON on the delivery repo.
5. Confirm the 8-hour schedule in Actions.
6. Leave `AWS_Server` PM2 as it is for football + admin.

That is the intended production split: **AWS = live football + API. This repo = 8-hour Chrome scrapes.**
