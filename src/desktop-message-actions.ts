type MessageActionPayload = {
  postId?: string
  text?: string
  toProfileId?: string
}

type HomeRuntime = {
  broadcastControl(message: unknown): unknown
  isJoined(): boolean
  sendMessage(message: { at: number; id: string; text: string }): unknown
}

type DmSendResult =
  | {
      kind?: string
      message?: unknown
    }
  | null
  | undefined

type DmRuntime = {
  sendMessageOrRequest(payload: {
    broadcastControl(request: unknown): unknown
    createdAt: number
    messageId: string
    requestId: string
    text: string
    toProfileId: string
  }): DmSendResult
}

type TreeholeRuntime = {
  comment(payload: { createdAt: number; id: string; postId?: string; text: string }): unknown
  like(payload: { createdAt: number; postId?: string }): unknown
  post(payload: { createdAt: number; id: string; text: string }): unknown
}

export type DesktopMessageActions = {
  commentTreehole(payload?: MessageActionPayload): Promise<void>
  likeTreehole(postId?: string): Promise<void>
  postTreehole(payload?: MessageActionPayload): Promise<void>
  sendDmMessage(payload?: MessageActionPayload): void
  sendHomeMessage(payload?: MessageActionPayload): void
}

export function createDesktopMessageActions({
  allowHomeDmBodyFallback = false,
  createId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
  getDmRuntime = () => null,
  getDmSession = () => null,
  getHomeRuntime = () => null,
  getSession = () => null,
  getTreeholeCanPost = () => false,
  getTreeholeRuntime = () => null,
  now = () => Date.now(),
  onChanged = () => {},
  setSession = () => {}
}: {
  allowHomeDmBodyFallback?: boolean
  createId?: () => string
  getDmRuntime?: () => DmRuntime | null
  getDmSession?: () => unknown
  getHomeRuntime?: () => HomeRuntime | null
  getSession?: () => unknown
  getTreeholeCanPost?: () => boolean
  getTreeholeRuntime?: () => TreeholeRuntime | null
  now?: () => number
  onChanged?: () => void
  setSession?: (session: unknown) => void
} = {}): DesktopMessageActions {
  return {
    async commentTreehole({ postId, text } = {}) {
      const cleanText = cleanMessageText(text)
      if (!cleanText) return

      await getTreeholeRuntime()?.comment({
        createdAt: now(),
        id: createId(),
        postId,
        text: cleanText
      })
    },
    async likeTreehole(postId) {
      await getTreeholeRuntime()?.like({
        createdAt: now(),
        postId
      })
    },
    async postTreehole({ text } = {}) {
      const cleanText = cleanMessageText(text)
      if (!cleanText || !getTreeholeCanPost()) return

      await getTreeholeRuntime()?.post({
        createdAt: now(),
        id: createId(),
        text: cleanText
      })
    },
    sendDmMessage({ text, toProfileId } = {}) {
      const cleanText = cleanMessageText(text)
      const homeRuntime = getHomeRuntime()
      const dmRuntime = getDmRuntime()

      if (!homeRuntime?.isJoined() || !getDmSession() || !toProfileId || !cleanText) return

      const result = dmRuntime?.sendMessageOrRequest({
        broadcastControl: (request) => homeRuntime.broadcastControl(request),
        createdAt: now(),
        messageId: createId(),
        requestId: createId(),
        text: cleanText,
        toProfileId
      })

      if (!result) return
      if (allowHomeDmBodyFallback && result.kind === 'message') {
        homeRuntime.broadcastControl({
          message: result.message,
          type: 'kepos.dm.body.v1'
        })
      }

      onChanged()
    },
    sendHomeMessage({ text } = {}) {
      const cleanText = cleanMessageText(text)
      const homeRuntime = getHomeRuntime()
      const session = getSession()

      if (!homeRuntime?.isJoined() || !session || !cleanText) return

      const nextSession = homeRuntime.sendMessage({
        at: now(),
        id: createId(),
        text: cleanText
      })

      setSession(nextSession)
      onChanged()
    }
  }
}

function cleanMessageText(text: unknown): string {
  return typeof text === 'string' ? text.trim() : ''
}
