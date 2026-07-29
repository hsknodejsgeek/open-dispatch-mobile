const MAX_SAMPLES = 30;
const samples: number[] = [];

/** Records one request's round-trip time (ms). Keeps only the most recent MAX_SAMPLES. */
export function recordLatency(ms: number) {
  samples.push(ms);
  if (samples.length > MAX_SAMPLES) samples.shift();
}

export function getLatencyStats(): { samples: number[]; avgMs: number | null } {
  if (samples.length === 0) return { samples: [], avgMs: null };
  const avgMs = Math.round(samples.reduce((sum, ms) => sum + ms, 0) / samples.length);
  return { samples: [...samples], avgMs };
}
