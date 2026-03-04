export function parseRange(value: string): { from: number; to: number } | null {
  const match = value.match(/^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/);
  if (!match) return null;
  return { from: Number(match[1]), to: Number(match[2]) };
}
