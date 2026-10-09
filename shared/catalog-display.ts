/** Keep collection notes in the source record, not in customer-facing cup labels. */
export function formatVolumeLabel(volume: string): string {
  return volume.replace(/^截图所见[：:]\s*/u, '').trim();
}
