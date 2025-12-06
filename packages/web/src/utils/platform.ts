const PLATFORM_LABELS: Record<string, string> = {
  youtube: 'YouTube',
  reddit: 'Reddit',
  x: 'X (Twitter)',
  facebook: 'Facebook'
};

export function formatPlatformList(platforms: string[]): string {
  if (!Array.isArray(platforms) || platforms.length === 0) {
    return '未设置';
  }
  return platforms.map((platform) => PLATFORM_LABELS[platform] ?? platform).join(' + ');
}
