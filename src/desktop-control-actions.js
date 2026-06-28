import {
  createDesktopControlMessageResult,
  createDesktopTreeholeControlSendResult
} from './desktop-control-service.js'

export function createDesktopControlActions({
  configureTreeholeRuntime,
  createControlMessageResult = createDesktopControlMessageResult,
  createTreeholeControlSendResult = createDesktopTreeholeControlSendResult,
  getDmRuntime,
  getHomeJoinDetails,
  getHomeRuntime,
  getProfileContext,
  getTreeholeRuntime,
  onChanged = () => {},
  openTreehole,
  setHomeJoinDetails,
  setNotice,
  shortenProfileId
}) {
  async function handleControl(message, peer) {
    if (message.type === 'kepos.message.request.v1') {
      const context = getProfileContext()
      const dmRuntime = getDmRuntime()
      const result = await createControlMessageResult({
        contactBook: context.contactBook,
        currentDmSession: dmRuntime.getSession(),
        fallbackAlias: shortenProfileId(message.fromProfileId),
        message
      })
      if (!result) return

      context.saveContactBook(result.book)
      dmRuntime.appendIncomingRequest(result.appendIncomingRequest)
      setNotice('Message request received.')
      onChanged()
      return
    }

    if (message.type === 'kepos.dm.invite.v1') {
      const { contactBook, profile } = getProfileContext()
      const result = await createControlMessageResult({
        acceptInviteAsRecipient: (payload) => getDmRuntime().acceptInviteAsRecipient(payload),
        contactBook,
        currentDmSession: getDmRuntime().getSession(),
        message,
        recipientEncryptionKeyPair: profile.dmEncryptionKeyPair
      })
      if (!result) return

      setNotice('Direct message ready.')
      onChanged()
      return
    }

    if (message.type === 'kepos.dm.body.v1') {
      if (getDmRuntime().receiveMessage?.(message.message)) {
        onChanged()
      }
      return
    }

    if (message.type === 'treehole.bootstrap') {
      const result = await createControlMessageResult({ message, peer })
      if (!result) return

      if (result.ownerProfileId && getHomeJoinDetails()) {
        setHomeJoinDetails({
          ...getHomeJoinDetails(),
          ownerProfileId: result.ownerProfileId
        })
        configureTreeholeRuntime()
      }
      await openTreehole(result.bootstrapKey)
      sendTreeholeWriter(result.sendWriterPeer)
      return
    }

    if (message.type === 'treehole.writer') {
      const result = await createControlMessageResult({ message, peer })
      if (!result) return

      await getTreeholeRuntime().addWriter(result.writer)
    }
  }

  function sendTreeholeBootstrap(peer, remoteProfileId) {
    const treeholeRuntime = getTreeholeRuntime()
    const result = createTreeholeControlSendResult({
      createBootstrapControl: (profileId) => treeholeRuntime.createBootstrapControl(profileId),
      isHomeJoined: getHomeRuntime().isJoined(),
      peer,
      remoteProfileId,
      type: 'bootstrap'
    })
    if (!result) return

    getHomeRuntime().sendControl(result.peer, result.payload)
  }

  function sendTreeholeWriter(peer) {
    const treeholeRuntime = getTreeholeRuntime()
    const result = createTreeholeControlSendResult({
      createWriterControl: () => treeholeRuntime.createWriterControl(),
      isHomeJoined: getHomeRuntime().isJoined(),
      peer,
      type: 'writer'
    })
    if (!result) return

    getHomeRuntime().sendControl(result.peer, result.payload)
  }

  return {
    handleControl,
    sendTreeholeBootstrap,
    sendTreeholeWriter
  }
}
