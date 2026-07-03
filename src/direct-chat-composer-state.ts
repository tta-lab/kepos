import {
  getDirectChatComposerCopy,
  type DirectChatComposerCopy
} from './direct-chat-composer-copy.ts'
import type { ProfileRelationshipState } from './profile-relationship-state.ts'

export type DirectChatComposerStateInput = {
  draft?: string | null
  enabled?: boolean
  recipientProfileId?: string | null
  relationshipState?: ProfileRelationshipState | null
  threadLabel?: string | null
}

export type DirectChatComposerState = DirectChatComposerCopy & {
  canSend: boolean
}

export function createDirectChatComposerState({
  draft,
  enabled = true,
  recipientProfileId,
  relationshipState,
  threadLabel
}: DirectChatComposerStateInput = {}): DirectChatComposerState {
  return {
    ...getDirectChatComposerCopy({
      relationshipState,
      threadLabel
    }),
    canSend: enabled && Boolean(draft?.trim()) && Boolean(recipientProfileId?.trim())
  }
}
