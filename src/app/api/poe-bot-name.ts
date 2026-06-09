const POE_BOT_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

export const INVALID_POE_BOT_NAME_ERROR =
  'Bot name may only contain letters, numbers, underscores, and hyphens';

export function normalizePoeBotName(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const botName = value.trim();
  if (!POE_BOT_NAME_PATTERN.test(botName)) return null;

  return botName;
}

export function normalizeRequiredText(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const text = value.trim();
  return text || null;
}
