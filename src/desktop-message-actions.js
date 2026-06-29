export function createDesktopMessageActions({
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
} = {}) {
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
      if (result.kind === 'message') {
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

function cleanMessageText(text) {
  return typeof text === 'string' ? text.trim() : ''
}
