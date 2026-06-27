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
      if (!text?.trim()) return

      await getTreeholeRuntime()?.comment({
        createdAt: now(),
        id: createId(),
        postId,
        text
      })
    },
    async likeTreehole(postId) {
      await getTreeholeRuntime()?.like({
        createdAt: now(),
        postId
      })
    },
    async postTreehole({ text } = {}) {
      if (!text || !getTreeholeCanPost()) return

      await getTreeholeRuntime()?.post({
        createdAt: now(),
        id: createId(),
        text
      })
    },
    sendDmMessage({ text, toProfileId } = {}) {
      const homeRuntime = getHomeRuntime()
      const dmRuntime = getDmRuntime()

      if (!homeRuntime?.isJoined() || !getDmSession() || !toProfileId || !text) return

      const result = dmRuntime?.sendMessageOrRequest({
        broadcastControl: (request) => homeRuntime.broadcastControl(request),
        createdAt: now(),
        messageId: createId(),
        requestId: createId(),
        text,
        toProfileId
      })

      if (!result) return

      onChanged()
    },
    sendHomeMessage({ text } = {}) {
      const homeRuntime = getHomeRuntime()
      const session = getSession()

      if (!homeRuntime?.isJoined() || !session || !text) return

      const nextSession = homeRuntime.sendMessage({
        at: now(),
        id: createId(),
        text
      })

      setSession(nextSession)
      onChanged()
    }
  }
}
