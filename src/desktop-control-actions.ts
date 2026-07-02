import { isContactTrusted, recordContactHomeDescriptor, type ContactBook } from './contact-book.ts'
import {
  verifyProfileHomeDescriptorFrame,
  type ProfileHomeDescriptorFrame
} from './profile-friend-request-transport.ts'
import {
  createDesktopControlMessageResult,
  createDesktopTreeholeControlSendResult
} from './desktop-control-service.ts'
import {
  createAvatarMediaBytesControl,
  storeAvatarMediaBytesControl as storeAvatarMediaBytesControlDefault
} from './avatar-media-sync.ts'
import type { AvatarMediaReference } from './avatar-media.ts'
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
  book?: ContactBook
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
type AvatarMediaBytesControlStore = (
  options: Record<string, unknown>
) => null | unknown | Promise<null | unknown>
type AvatarMediaBytesReader = (
  reference: AvatarMediaReference
) => Uint8Array | null | Promise<Uint8Array | null>

export type DesktopControlActions = {
  handleControl(
    message: ControlMessage,
    peer?: unknown,
    options?: { source?: 'home' | 'profile' }
  ): Promise<void>
  sendProfileAvatarMedia(peer: unknown): Promise<void>
  sendTreeholeBootstrap(peer: unknown, remoteProfileId?: string): void
  sendTreeholeWriter(peer: unknown): void
}

export function createDesktopControlActions({
  allowHomeDmBodyFallback = false,
  allowHomeTrustFallback = false,
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
  readLocalAvatarMediaBytes = () => null,
  setHomeJoinDetails,
  setNotice,
  storeAvatarMediaBytesControl = storeAvatarMediaBytesControlDefault as unknown as AvatarMediaBytesControlStore,
  shortenProfileId
}: {
  allowHomeDmBodyFallback?: boolean
  allowHomeTrustFallback?: boolean
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
  readLocalAvatarMediaBytes?: AvatarMediaBytesReader
  setHomeJoinDetails: (details: HomeJoinDetails) => void
  setNotice: (notice: string) => void
  storeAvatarMediaBytesControl?: AvatarMediaBytesControlStore
  shortenProfileId: (profileId?: string) => string
}): DesktopControlActions {
  const pendingHomeDescriptorsByProfileId = new Map<string, ProfileHomeDescriptorFrame>()

  async function handleControl(
    message: ControlMessage,
    peer?: unknown,
    options: { source?: 'home' | 'profile' } = {}
  ): Promise<void> {
    const isProfileSource = options.source === 'profile'

    if (message.type === 'kepos.avatar.media.bytes.v1') {
      const context = getProfileContext()
      const result = await storeAvatarMediaBytesControl({
        book: context.contactBook,
        message
      })
      if (!result) return

      setNotice('Profile image received.')
      onChanged()
      return
    }

    if (message.type === 'kepos.message.request.v1') {
      if (!isProfileSource && !allowHomeTrustFallback) return

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
      setNotice('Friend request received.')
      onChanged()
      return
    }

    if (message.type === 'kepos.dm.invite.v1') {
      if (!isProfileSource && !allowHomeTrustFallback) return

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

      if (result.book) {
        getProfileContext().saveContactBook(
          applyPendingHomeDescriptor(result.book, message.fromProfileId)
        )
      }
      setNotice('Message thread ready.')
      onChanged()
      return
    }

    if (message.type === 'kepos.profile.home-descriptor.v1') {
      if (!isProfileSource || !verifyProfileHomeDescriptorFrame(message)) return

      const context = getProfileContext()
      const descriptorFrame = message as ProfileHomeDescriptorFrame
      const nextBook = applyHomeDescriptor(context.contactBook, descriptorFrame)
      if (nextBook) {
        context.saveContactBook(nextBook)
        setNotice('Home entry details received.')
        onChanged()
      } else if (
        !isContactTrusted(context.contactBook, descriptorFrame.descriptor.ownerProfileId)
      ) {
        pendingHomeDescriptorsByProfileId.set(
          descriptorFrame.descriptor.ownerProfileId,
          descriptorFrame
        )
      }
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

  async function sendProfileAvatarMedia(peer: unknown): Promise<void> {
    if (!peer || !getHomeRuntime().isJoined()) return

    const { profile } = getProfileContext()
    if (!profile.avatarMedia || !profile.id) return

    const bytes = await readLocalAvatarMediaBytes(profile.avatarMedia)
    if (!bytes) return

    getHomeRuntime().sendControl(
      peer,
      createAvatarMediaBytesControl({
        bytes,
        profileId: profile.id,
        reference: profile.avatarMedia
      })
    )
  }

  function applyPendingHomeDescriptor(book: ContactBook, profileId = ''): ContactBook {
    const pending = pendingHomeDescriptorsByProfileId.get(profileId)
    if (!pending) return book

    const nextBook = applyHomeDescriptor(book, pending)
    if (!nextBook) return book

    pendingHomeDescriptorsByProfileId.delete(profileId)
    return nextBook
  }

  function applyHomeDescriptor(
    book: ContactBook,
    descriptorFrame: ProfileHomeDescriptorFrame
  ): ContactBook | null {
    const descriptor = descriptorFrame.descriptor
    try {
      return recordContactHomeDescriptor(book, {
        address: descriptor.address,
        expiresAt: descriptor.expiresAt,
        ownerProfileId: descriptor.ownerProfileId,
        policy: descriptor.policy,
        proof: descriptor.proof,
        roomKey: descriptor.roomKey
      })
    } catch {
      return null
    }
  }

  return {
    handleControl,
    sendProfileAvatarMedia,
    sendTreeholeBootstrap,
    sendTreeholeWriter
  }
}
