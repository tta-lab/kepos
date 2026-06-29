import {
  createDesktopControlMessageResult,
  createDesktopTreeholeControlSendResult
} from './desktop-control-service.js'
import type { DesktopProfileContext } from './desktop-profile-context-core.ts'

type ControlMessage = Record<string, unknown> & {
  fromProfileId?: string
  key?: string
  message?: unknown
  ownerProfileId?: string
  type?: string
}

type DmRuntime = {
  acceptInviteAsRecipient(payload: unknown): unknown | Promise<unknown>
  appendIncomingRequest(request: unknown): unknown
  getSession(): unknown
  receiveMessage?: (message: unknown) => boolean
}

type HomeRuntime = {
  isJoined(): boolean
  sendControl(peer: unknown, payload: unknown): unknown
}

type TreeholeRuntime = {
  addWriter(writer: unknown): unknown | Promise<unknown>
  createBootstrapControl(profileId?: string): unknown
  createWriterControl(): unknown
}

type HomeJoinDetails = Record<string, unknown>

type ControlMessageResult = {
  appendIncomingRequest?: unknown
  book?: DesktopProfileContext['contactBook']
  bootstrapKey?: unknown
  kind: string
  ownerProfileId?: string
  sendWriterPeer?: unknown
  writer?: unknown
} | null

type TreeholeControlSendResult = {
  payload: unknown
  peer: unknown
} | null

type ControlMessageResultFactory = (
  options: Record<string, unknown>
) => ControlMessageResult | Promise<ControlMessageResult>

type TreeholeControlSendResultFactory = (
  options: Record<string, unknown>
) => TreeholeControlSendResult

export type DesktopControlActions = {
  handleControl(message: ControlMessage, peer?: unknown): Promise<void>
  sendTreeholeBootstrap(peer: unknown, remoteProfileId?: string): void
  sendTreeholeWriter(peer: unknown): void
}

export function createDesktopControlActions({
  allowHomeDmBodyFallback = false,
  configureTreeholeRuntime,
  createControlMessageResult = createDesktopControlMessageResult as unknown as ControlMessageResultFactory,
  createTreeholeControlSendResult = createDesktopTreeholeControlSendResult as unknown as TreeholeControlSendResultFactory,
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
}: {
  allowHomeDmBodyFallback?: boolean
  configureTreeholeRuntime: () => void
  createControlMessageResult?: ControlMessageResultFactory
  createTreeholeControlSendResult?: TreeholeControlSendResultFactory
  getDmRuntime: () => DmRuntime
  getHomeJoinDetails: () => HomeJoinDetails | null
  getHomeRuntime: () => HomeRuntime
  getProfileContext: () => Pick<
    DesktopProfileContext,
    'contactBook' | 'profile' | 'saveContactBook'
  >
  getTreeholeRuntime: () => TreeholeRuntime
  onChanged?: () => void
  openTreehole: (bootstrapKey?: unknown) => unknown | Promise<unknown>
  setHomeJoinDetails: (details: HomeJoinDetails) => void
  setNotice: (notice: string) => void
  shortenProfileId: (profileId?: string) => string
}): DesktopControlActions {
  async function handleControl(message: ControlMessage, peer?: unknown): Promise<void> {
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

      if (result.book) {
        context.saveContactBook(result.book)
      }
      dmRuntime.appendIncomingRequest(result.appendIncomingRequest)
      setNotice('Message request received.')
      onChanged()
      return
    }

    if (message.type === 'kepos.dm.invite.v1') {
      const { contactBook, profile } = getProfileContext()
      const result = await createControlMessageResult({
        acceptInviteAsRecipient: (payload: unknown) =>
          getDmRuntime().acceptInviteAsRecipient(payload),
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
      if (!allowHomeDmBodyFallback) return

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

  function sendTreeholeBootstrap(peer: unknown, remoteProfileId = ''): void {
    const treeholeRuntime = getTreeholeRuntime()
    const result = createTreeholeControlSendResult({
      createBootstrapControl: (profileId?: string) =>
        treeholeRuntime.createBootstrapControl(profileId),
      isHomeJoined: getHomeRuntime().isJoined(),
      peer,
      remoteProfileId,
      type: 'bootstrap'
    })
    if (!result) return

    getHomeRuntime().sendControl(result.peer, result.payload)
  }

  function sendTreeholeWriter(peer: unknown): void {
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
