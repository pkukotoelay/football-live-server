require('dotenv').config();

const { logger } = require('../utils/logger');
const { Pipeline } = require('../services/pipeline');

function print(label, payload) {
  logger.info(label);
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(payload, null, 2));
}

async function main() {
  const force = process.argv.includes('--force');
  const wantHighlights = process.argv.includes('--highlights');
  const wantTips = process.argv.includes('--tips');
  const wantChannels =
    process.argv.includes('--channels') || process.argv.includes('--myanmartv');
  const selected = [wantHighlights, wantChannels, wantTips].filter(Boolean).length;
  const pipeline = new Pipeline(process.env);
  const results = [];

  if (wantHighlights) {
    logger.info('CLI highlight job', { force });
    const result = await pipeline.runHighlights({ force });
    print('highlights', {
      ok: result.ok,
      reason: result.reason,
      uploaded: result.uploaded,
      feeds: result.feeds,
      stats: result.stats,
      github: result.github,
      count: result.delivery?.count,
    });
    results.push(result);
  }

  if (wantChannels) {
    logger.info('CLI MyanmarTV job', { force });
    const result = await pipeline.runMyanmarTv({ force });
    print('channels', {
      ok: result.ok,
      reason: result.reason,
      uploaded: result.uploaded,
      github: result.github,
      count: Array.isArray(result.delivery) ? result.delivery.length : 0,
    });
    results.push(result);
  }

  if (wantTips) {
    logger.info('CLI tips job', { force });
    const result = await pipeline.runTips({ force });
    print('tips', {
      ok: result.ok,
      reason: result.reason,
      uploaded: result.uploaded,
      github: result.github,
      count: result.delivery?.count,
      today: result.delivery?.today?.count,
      tomorrow: result.delivery?.tomorrow?.count,
    });
    results.push(result);
  }

  if (selected > 0) {
    const ok = results.every((r) => r.ok);
    process.exit(ok ? 0 : 1);
  }

  logger.info('CLI pipeline run', { force });
  const result = await pipeline.run({ forceStreamCheck: force });
  print('pipeline', {
    ok: result.ok,
    reason: result.reason,
    matchCount: result.payload?.matches?.length ?? result.kept?.matches?.length ?? 0,
    changed: result.changed,
    github: result.github,
    durationMs: result.durationMs,
  });
  process.exit(result.ok ? 0 : 1);
}

main().catch((err) => {
  logger.error('CLI failed', { error: err.message });
  process.exit(1);
});
