import { normalizeComposerText } from './composer-text.ts'

export type TextComposerStateInput = {
  draft?: unknown
  enabled?: boolean
}

export type TextComposerState = {
  canSubmit: boolean
  text: string
}

export function createTextComposerState({
  draft,
  enabled = true
}: TextComposerStateInput = {}): TextComposerState {
  const text = normalizeComposerText(draft)

  return {
    canSubmit: enabled && Boolean(text),
    text
  }
}
