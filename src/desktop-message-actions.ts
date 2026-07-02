import {
  recordOutgoingFriendRequest,
  updateOutgoingFriendRequestDeliveryState
} from './contact-book.ts'
import {
  createFriendRequestTargetViewModel,
  shouldBlockChatSendForFriendRequestTarget
} from './friend-request-target-view-model.ts'
import { formatProfileFriendRequestDeliveryState } from './profile-friend-request-delivery.ts'
import {
  createQueuedProfileFriendRequestTransport,
  sendProfileFriendRequest,
  type ProfileFriendRequestTransport
} from './profile-friend-request-transport.ts'
import type { ContactBook } from './contact-book.ts'
import type { MessageRequest } from './message-request.ts'
import type { SigningIdentity } from './signed-record.ts'
import { createDefaultSecureId } from './secure-id.ts'
import type { AvatarMediaReference } from './avatar-media.ts'

type MessageActionPayload = {
  postId?: string
  readAt?: number
  profileId?: string
  text?: string
  toProfileId?: string
}

type HomeDescriptorSnapshot = {
  address?: string
  expiresAt?: number | null
  ownerProfileId?: string
  policy?: string
  proof?: unknown
  roomKey?: string
}

type ProfileRequestTargetSnapshot = {
  avatarMediaSnapshot?: AvatarMediaReference
  avatarUri?: string
  displayName?: string
  homeDescriptor?: HomeDescriptorSnapshot
  profileId?: string
} | null

type HomeRuntime = {
  broadcastControl(message: unknown): unknown
  isJoined(): boolean
  sendMessage(message: { at: number; id: string; text: string }): unknown
}

type DmSendResult =
  | {
      kind?: string
      message?: unknown
      request?: MessageRequest
    }
  | null
  | undefined

type DmRuntime = {
  markThreadRead?(payload: { profileId: string; readAt: number }): unknown
  sendMessageOrRequest(payload: {
    broadcastControl(request: unknown): unknown
    createdAt: number
    messageId: string
    requestId: string
    text: string
    toProfileId: string
  }): DmSendResult
}

type LocalProfileSnapshot = {
  identity?: SigningIdentity
  profileId?: string
}

type TreeholeRuntime = {
  comment(payload: { createdAt: number; id: string; postId?: string; text: string }): unknown
  like(payload: { createdAt: number; postId?: string }): unknown
  post(payload: { createdAt: number; id: string; text: string }): unknown
}

export type DesktopMessageActions = {
  commentTreehole(payload?: MessageActionPayload): Promise<void>
  likeTreehole(postId?: string): Promise<void>
  markDmThreadRead(payload?: MessageActionPayload): void
  postTreehole(payload?: MessageActionPayload): Promise<void>
  retryOutgoingFriendRequest(payload?: MessageActionPayload): Promise<void>
  sendDmMessage(payload?: MessageActionPayload): Promise<void>
  sendHomeMessage(payload?: MessageActionPayload): void
}

export function createDesktopMessageActions({
  allowHomeDmBodyFallback = false,
  createId = createDefaultSecureId,
  getContactBook = () => null,
  getDmRuntime = () => null,
  getDmSession = () => null,
  getFriendRequestTransport = () => createQueuedProfileFriendRequestTransport(),
  getHomeRuntime = () => null,
  getLocalProfile = () => null,
  getProfileRequestTarget = () => null,
  getSession = () => null,
  getTreeholeCanPost = () => false,
  getTreeholeRuntime = () => null,
  now = () => Date.now(),
  onChanged = () => {},
  saveContactBook = () => {},
  setNotice = () => {},
  setSession = () => {}
}: {
  allowHomeDmBodyFallback?: boolean
  createId?: () => string
  getContactBook?: () => ContactBook | null
  getDmRuntime?: () => DmRuntime | null
  getDmSession?: () => unknown
  getFriendRequestTransport?: () => ProfileFriendRequestTransport | null
  getHomeRuntime?: () => HomeRuntime | null
  getLocalProfile?: () => LocalProfileSnapshot | null
  getProfileRequestTarget?: () => ProfileRequestTargetSnapshot
  getSession?: () => unknown
  getTreeholeCanPost?: () => boolean
  getTreeholeRuntime?: () => TreeholeRuntime | null
  now?: () => number
  onChanged?: () => void
  saveContactBook?: (book: ContactBook) => void
  setNotice?: (notice: string) => void
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
    markDmThreadRead({ profileId, readAt } = {}) {
      const cleanProfileId = cleanMessageText(profileId)
      if (!cleanProfileId) return

      const result = getDmRuntime()?.markThreadRead?.({
        profileId: cleanProfileId,
        readAt: Number.isSafeInteger(readAt) ? (readAt as number) : now()
      })

      if (result) onChanged()
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
    async retryOutgoingFriendRequest({ profileId } = {}) {
      const cleanProfileId = cleanMessageText(profileId)
      const contactBook = getContactBook()
      const request = cleanProfileId
        ? contactBook?.outgoingRequestsByProfileId?.get(cleanProfileId)
        : null
      const signedRequest = request?.signedRequest

      if (!contactBook || !request || !signedRequest || !request.requestId) {
        setNotice('This friend request cannot be retried yet.')
        return
      }

      const deliveryState = await sendDesktopProfileFriendRequest({
        getFriendRequestTransport,
        getLocalProfile,
        request: signedRequest
      })
      const nextBook = updateOutgoingFriendRequestDeliveryState(contactBook, {
        deliveryState,
        profileId: cleanProfileId,
        requestId: request.requestId
      })

      saveContactBook(nextBook)
      setNotice(`Friend request retry: ${formatProfileFriendRequestDeliveryState(deliveryState)}.`)
      onChanged()
    },
    async sendDmMessage({ text, toProfileId } = {}) {
      const cleanText = cleanMessageText(text)
      const dmRuntime = getDmRuntime()
      const contactBook = getContactBook()
      let requestTarget: ReturnType<typeof createFriendRequestTargetViewModel> | null = null

      if (!getDmSession() || !toProfileId || !cleanText) return
      if (contactBook) {
        const profileRequestTarget = getProfileRequestTarget()
        requestTarget = createFriendRequestTargetViewModel({
          contactBook,
          shortenProfileId: (profileId) => `${profileId.slice(0, 8)}...${profileId.slice(-8)}`,
          target:
            profileRequestTarget?.profileId === toProfileId
              ? { ...profileRequestTarget, profileId: toProfileId }
              : { profileId: toProfileId }
        })

        if (shouldBlockChatSendForFriendRequestTarget(requestTarget)) {
          setNotice(requestTarget.copy)
          return
        }
      }

      const result = dmRuntime?.sendMessageOrRequest({
        broadcastControl: () => {},
        createdAt: now(),
        messageId: createId(),
        requestId: createId(),
        text: cleanText,
        toProfileId
      })

      if (!result) return
      if (result.kind === 'request') {
        const deliveryState = await sendDesktopProfileFriendRequest({
          getFriendRequestTransport,
          getLocalProfile,
          request: result.request
        })
        if (contactBook && result.request?.toProfileId && result.request.requestId) {
          const homeDescriptor = readMatchingHomeDescriptor({
            profileId: result.request.toProfileId,
            target: getProfileRequestTarget()
          })
          saveContactBook(
            recordOutgoingFriendRequest(contactBook, {
              alias: result.request.toProfileId.slice(0, 12),
              avatarMediaSnapshot: requestTarget?.avatarMediaSnapshot,
              avatarUriSnapshot: requestTarget?.avatarUri,
              displayNameSnapshot: requestTarget?.displayName,
              homeAddress: homeDescriptor?.address,
              homeExpiresAt: homeDescriptor?.expiresAt ?? undefined,
              homePolicy: homeDescriptor?.policy,
              homeRoomKey: homeDescriptor?.roomKey,
              profileId: result.request.toProfileId,
              proof: homeDescriptor?.proof,
              deliveryState,
              requestedAt: now(),
              requestId: result.request.requestId,
              signedRequest: result.request,
              source: 'profile_qr',
              text: result.request.text
            })
          )
        }
      }
      if (allowHomeDmBodyFallback && result.kind === 'message') {
        getHomeRuntime()?.broadcastControl({
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

async function sendDesktopProfileFriendRequest({
  getFriendRequestTransport,
  getLocalProfile,
  request
}: {
  getFriendRequestTransport: () => ProfileFriendRequestTransport | null
  getLocalProfile: () => LocalProfileSnapshot | null
  request?: MessageRequest
}): Promise<string> {
  const localProfile = getLocalProfile()

  if (
    !request ||
    !localProfile?.profileId ||
    !localProfile.identity ||
    localProfile.identity.publicKey !== localProfile.profileId
  ) {
    return 'queued'
  }

  const delivery = await sendProfileFriendRequest({
    localProfile: {
      identity: localProfile.identity,
      profileId: localProfile.profileId
    },
    request,
    targetProfileId: request.toProfileId,
    transport: getFriendRequestTransport()
  })

  return delivery.state
}

function readMatchingHomeDescriptor({
  profileId,
  target
}: {
  profileId: string
  target: ProfileRequestTargetSnapshot
}): HomeDescriptorSnapshot | null {
  if (!target?.homeDescriptor || target.profileId !== profileId) {
    return null
  }

  return target.homeDescriptor
}

function cleanMessageText(text: unknown): string {
  return typeof text === 'string' ? text.trim() : ''
}
