/**
 * Parse a semver string into [major, minor, patch] tuple.
 * Returns null if the string is not a valid semver (x.y.z with numeric parts).
 */
function parseSemver(v: string): [number, number, number] | null {
  if (!v || typeof v !== 'string') return null;
  const m = v.trim().match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/**
 * Compare two semver strings numerically.
 * Returns:
 *  -1 if a < b
 *   0 if a == b
 *   1 if a > b
 *   null if either string is unparsable
 */
export function compareSemver(a: string, b: string): -1 | 0 | 1 | null {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (!pa || !pb) return null;

  for (let i = 0; i < 3; i++) {
    if (pa[i]! < pb[i]!) return -1;
    if (pa[i]! > pb[i]!) return 1;
  }
  return 0;
}
