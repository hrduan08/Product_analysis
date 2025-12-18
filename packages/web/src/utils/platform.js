const PLATFORM_LABELS = {
    youtube: 'YouTube',
    reddit: 'Reddit',
    x: 'X (Twitter)',
    facebook: 'Facebook'
};
export function formatPlatformList(platforms) {
    if (!Array.isArray(platforms) || platforms.length === 0) {
        return '未设置';
    }
    return platforms.map((platform) => PLATFORM_LABELS[platform] ?? platform).join(' + ');
}
