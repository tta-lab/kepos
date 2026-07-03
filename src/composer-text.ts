export function normalizeComposerText(text: unknown): string {
  return typeof text === 'string' ? text.trim() : ''
}
