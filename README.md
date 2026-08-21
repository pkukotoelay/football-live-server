# AWS_Github_Action

GitHub Actions copy of the **football** `AWS_Server` project. Use this repo for scheduled Chrome scrapes. **Do not change** `D:\SCRAPPING_CODE\AWS_Server`.

Live football (every 5 minutes) stays on the 1GB AWS box. This project runs **highlights, MyanmarTV, and tips** on GitHub-hosted runners.

Full production notes: [`docs/PRODUCTION.md`](docs/PRODUCTION.md).

## LocalLL

```bash
npm install
copy .env.example .env
node src/cli/runPipeline.js --tips
```

## GitHub

Push this folder as its own repository. Add secrets (`DELIVERY_GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`). Workflows:

- `scrape.yml` — every 8 hours, or **Run workflow**
- `ci.yml` — parser tests on push
