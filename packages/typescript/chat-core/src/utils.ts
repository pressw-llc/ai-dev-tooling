export function generateMessageId(): string {
  return crypto.randomUUID();
}

export function formatTimestamp(date: Date): string {
  return date.toISOString();
}
