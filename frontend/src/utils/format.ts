/** "89.90° S" / "12.50° E" style coordinate formatting. */
export function formatLatitude(latDeg: number): string {
  return `${Math.abs(latDeg).toFixed(2)}° ${latDeg < 0 ? 'S' : 'N'}`;
}

export function formatLongitude(lonDeg: number): string {
  return `${Math.abs(lonDeg).toFixed(2)}° ${lonDeg < 0 ? 'W' : 'E'}`;
}

export function pluralDays(days: number): string {
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}
