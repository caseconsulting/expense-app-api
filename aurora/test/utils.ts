/**
 * Formats an iso string the way kysely-data-api does
 */
export function fixTimeString(date: Date): string {
  return date.toISOString().replace('T', ' ').replace('Z', '');
}
