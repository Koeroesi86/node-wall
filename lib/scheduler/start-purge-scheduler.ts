export const PURGE_INTERVAL_MS = 60 * 60 * 1000;
export const PURGE_FIRST_RUN_DELAY_MS = 60 * 1000;

/**
 * Runs `purge` shortly after start and then every interval. The timers are unref'd so they never keep a
 * process alive (for example a one-off `node -e "require('./serverConfig.js')"` check). Returns a stop function.
 */
export function startPurgeScheduler(
  purge: () => Promise<void>,
  intervalMs = PURGE_INTERVAL_MS,
  firstRunDelayMs = PURGE_FIRST_RUN_DELAY_MS,
) {
  const first = setTimeout(() => void purge(), firstRunDelayMs);
  const repeating = setInterval(() => void purge(), intervalMs);

  first.unref();
  repeating.unref();

  return () => {
    clearTimeout(first);
    clearInterval(repeating);
  };
}
