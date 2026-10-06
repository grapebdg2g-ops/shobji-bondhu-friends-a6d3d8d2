export const YOUTUBE_URL_PATTERN = /^https:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)[A-Za-z0-9_-]+/i;

export function isYouTubeUrl(value: string) {
  return YOUTUBE_URL_PATTERN.test(value.trim());
}