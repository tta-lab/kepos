import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useCameraPermissions } from 'expo-camera'
import * as Crypto from 'expo-crypto'
import * as FileSystem from 'expo-file-system/legacy'
import * as ImagePicker from 'expo-image-picker'
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StatusBar,
  Text,
  useColorScheme,
  View
} from 'react-native'
import {
  appendLocalMessage,
  appendRemoteMessage,
  type ChatMessage,
  type ChatSession
} from '../src/chat-session.ts'
import { normalizeComposerText } from '../src/composer-text.ts'
import {
  appendLocalSignedDirectMessage,
  appendLocalMessageRequest,
  appendRemoteSignedDirectMessage,
  appendRemoteMessageRequest,
  dismissDirectMessage,
  restoreDirectMessageSession,
  type DirectMessageEntry,
  type DirectMessageSession
} from '../src/dm-session.ts'
import {
  loadDmSessionMessagesFromFileSystem,
  saveDmSessionMessagesToFileSystem
} from '../src/dm-session-storage.ts'
import { loadDmThreadsFromFileSystem, saveDmThreadsToFileSystem } from '../src/dm-thread-storage.ts'
import {
  createDmThreadListView,
  filterDirectMessagesForProfile,
  findSelectedDmThreadView,
  upsertDmThread
} from '../src/dm-thread-list.ts'
import { markDmThreadRead, type DmThread } from '../src/dm-thread.ts'
import { createContactProfileViewModel } from '../src/contact-profile-view-model.ts'
import {
  createFriendRequestTargetViewModel,
  type FriendRequestTargetViewModel
} from '../src/friend-request-target-view-model.ts'
import { createMobileTreeholeAuthorAvatar } from '../src/mobile-avatar-view-model.ts'
import {
  createProfileRecentPostsViewModel,
  type ProfileRecentPostCache,
  type ProfileRecentTreeholePost
} from '../src/profile-recent-posts-view-model.ts'
import { createRequestTargetProfileViewModel } from '../src/request-target-profile-view-model.ts'
import {
  saveProfileRecentPostCacheToFileSystem,
  updateProfileRecentPostCache
} from '../src/profile-recent-post-cache-storage.ts'
import {
  acceptOutgoingFriendRequest,
  acceptMessageRequest,
  allowContactRequests,
  ignoreMessageRequest,
  listBlockedContacts,
  listTrustedContacts,
  recordOutgoingFriendRequest,
  recordMessageRequest,
  updateOutgoingFriendRequestDeliveryState
} from '../src/contact-book.ts'
import type { ContactBook } from '../src/contact-book.ts'
import {
  createTreeholePolicyFromContactBook,
  saveContactBookToFileSystem
} from '../src/contact-book-storage.ts'
import {
  createHomeJoinSession,
  createHomeJoinSessionFromAddress,
  createManualHomeJoinSession
} from '../src/home-session.ts'
import type { HomeJoinSession } from '../src/home-session.ts'
import { parseDirectRoomEndpoint } from '../src/direct-room-endpoint.ts'
import { createIdentityKeyPairFromSeed } from '../src/identity.ts'
import { getOrCreateLocalProfile } from '../src/local-profile.ts'
import {
  getRequiredMobileDocumentDirectory,
  saveMobileProfileDocument
} from '../src/mobile-profile.ts'
import type { AvatarMediaReference } from '../src/avatar-media.ts'
import {
  createMobileLocalAvatarMediaControl,
  storeMobileAvatarMediaBytesControl
} from '../src/mobile-avatar-media-sync.ts'
import { importMobileProfileAvatarMedia } from '../src/mobile-profile-avatar-media.ts'
import {
  getMobileBackendStorageBasePath,
  loadMobileRuntimeProfile
} from '../src/mobile-profile-bootstrap.ts'
import {
  getMobileThemeForScheme,
  mobileThemes,
  type MobileThemeTokens
} from '../src/mobile-theme-tokens.ts'
import { createMobileStyles, type MobileStyles } from './styles.ts'
import { applyMobileHomeQrScan, readMobileProfileRequestTarget } from '../src/mobile-qr-actions.ts'
import { getScannedQrData, type MobileQrScanEvent } from '../src/mobile-qr-event.ts'
import {
  formatMessageRequestSubtitle,
  formatMessageRequestTitle,
  formatMobileTrustSource,
  formatMobileTrustTime,
  formatRequestPreview,
  getMobileBackendNotice,
  getMobileHomeStatus,
  getMobileTreeholeEmptyCopy,
  getMobileTreeholeStatus,
  shortenProfileId
} from '../src/mobile-product-copy.ts'
import { applyLocalContactRevoke } from '../src/revoke-state.ts'
import { createMobileHomeRoomKey, createMobileMessageId } from '../src/mobile-runtime-ids.ts'
import { encodeQrUri } from '../src/signed-qr-payload.ts'
import { createShareQrPayloads } from '../src/share-qr-service.ts'
import { readTrustedContactHomeDescriptor } from '../src/signed-qr-scan.ts'
import { readRpcPayload } from '../src/rpc-payload.ts'
import type { SigningIdentity } from '../src/signed-record.ts'
import type { TransportDebugLabelState } from '../src/transport-debug-label.ts'
import { Worklet } from 'react-native-bare-kit'
import RPC from 'bare-rpc'
import bundle from './app.bundle.mjs'
import { Header, QrCard, QrScanner } from './chrome-components.tsx'
import { Field } from './form-components.tsx'
import { PaneLabel, PanelEmptyState, TaskHeader } from './panel-components.tsx'
import { ContactProfileDetail, MobileProfileAvatar } from './profile-components.tsx'
import { ChatRoom } from './room-components.tsx'
import type { TreeholePostInput } from './treehole-components.tsx'
import {
  RPC_ERROR,
  RPC_DM_ACCEPT,
  RPC_DM_BODY_MESSAGE,
  RPC_DM_BODY_SEND,
  RPC_DM_MESSAGE,
  RPC_DM_REVOKE,
  RPC_DM_THREAD,
  RPC_JOIN,
  RPC_LEAVE,
  RPC_MESSAGE,
  RPC_PEER_COUNT,
  RPC_PROFILE_REQUEST_SEND,
  RPC_PROFILE_REQUEST_STATE,
  RPC_PROFILE_START,
  RPC_AVATAR_MEDIA_BYTES,
  RPC_ROOM_DEBUG,
  RPC_SEND,
  RPC_STATUS,
  RPC_TREEHOLE_COMMENT,
  RPC_TREEHOLE_LIKE,
  RPC_TREEHOLE_POLICY,
  RPC_TREEHOLE_POST,
  RPC_TREEHOLE_STATE,
  RPC_TREEHOLE_STATUS
} from '../rpc-commands.mjs'

const ROOM_KEY_PATTERN = /^[0-9a-f]{64}$/

type TreeholePolicy = ReturnType<typeof createTreeholePolicyFromContactBook>
type ScanTarget = 'home' | 'profile' | null
type RpcCommand = number
type RpcRequest = {
  command: RpcCommand
  data?: Uint8Array | null
}
type RpcClient = {
  request(command: RpcCommand): {
    send(value: string): void
  }
}
type BackendStartResult = {
  joined: Promise<boolean>
  rpc: RpcClient
}
type ProfileRequestDeliveryPayload = {
  requestId?: string
  state?: string
  toProfileId?: string
}
type WorkletHandle = {
  IPC: unknown
  start(path: string, bundle: unknown, args: unknown[]): void
}
type MobileThemeContextValue = {
  styles: MobileStyles
  theme: MobileThemeTokens
}
type MessageRequestPayload = {
  createdAt: number
  fromProfileId: string
  id?: string
  profileId?: string
  requestId: string
  senderEncryptionPublicKey?: string
  text: string
  toProfileId: string
}
type TreeholeCommentDraft = {
  postId: string
  text: string
}
type TreeholeStatus = 'idle' | 'starting' | 'waiting' | string
type MobileTreeholePost = ProfileRecentTreeholePost & TreeholePostInput

const fallbackMobileStyles = createMobileStyles(mobileThemes.neoCozy)

const MobileThemeContext = React.createContext<MobileThemeContextValue>({
  styles: fallbackMobileStyles,
  theme: mobileThemes.neoCozy
})

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined
}

function asMessageRequestPayload(value: unknown): MessageRequestPayload {
  const record = asRecord(value)
  return {
    createdAt: asNumber(record.createdAt) || Date.now(),
    fromProfileId: asString(record.fromProfileId) || '',
    id: asString(record.id),
    profileId: asString(record.profileId),
    requestId: asString(record.requestId) || '',
    senderEncryptionPublicKey: asString(record.senderEncryptionPublicKey),
    text: asString(record.text) || '',
    toProfileId: asString(record.toProfileId) || ''
  }
}

export default function App() {
  const colorScheme = useColorScheme()
  const theme = getMobileThemeForScheme(colorScheme)
  const themedStyles = useMemo(() => createMobileStyles(theme), [theme])
  const styles = themedStyles
  const [nick, setNick] = useState('Neil')
  const [localAvatarMedia, setLocalAvatarMedia] = useState<AvatarMediaReference | null>(null)
  const [localAvatarUri, setLocalAvatarUri] = useState('')
  const [profileId, setProfileId] = useState<string | null>(null)
  const [identity, setIdentity] = useState<SigningIdentity | null>(null)
  const [homeRoomKey, setHomeRoomKey] = useState<string | null>(null)
  const [contactBook, setContactBook] = useState<ContactBook | null>(null)
  const [treeholePolicy, setTreeholePolicy] = useState<TreeholePolicy | null>(null)
  const [roomKey, setRoomKey] = useState('')
  const [directRoomEndpoint, setDirectRoomEndpoint] = useState('')
  const [homeQrUri, setHomeQrUri] = useState('')
  const [trustAlias, setTrustAlias] = useState('')
  const [trustQrUri, setTrustQrUri] = useState('')
  const [draft, setDraft] = useState('')
  const [dmDraft, setDmDraft] = useState('')
  const [dmMessages, setDmMessages] = useState<DirectMessageEntry[]>([])
  const [dmRecipient, setDmRecipient] = useState('')
  const [profileRequestTarget, setProfileRequestTarget] =
    useState<FriendRequestTargetViewModel | null>(null)
  const [contactProfileTargetId, setContactProfileTargetId] = useState<string | null>(null)
  const [dmSession, setDmSession] = useState<DirectMessageSession | null>(null)
  const [dmThreads, setDmThreads] = useState<DmThread[]>([])
  const [treeholeDraft, setTreeholeDraft] = useState('')
  const [treeholeCanInteract, setTreeholeCanInteract] = useState(false)
  const [treeholeCanPost, setTreeholeCanPost] = useState(false)
  const [treeholePosts, setTreeholePosts] = useState<MobileTreeholePost[]>([])
  const [profileRecentPostCache, setProfileRecentPostCache] = useState<ProfileRecentPostCache>({})
  const [treeholeStatus, setTreeholeStatus] = useState<TreeholeStatus>('idle')
  const [activeHomeOwnerProfileId, setActiveHomeOwnerProfileId] = useState('')
  const [activeTab, setActiveTab] = useState('chat')
  const [session, setSession] = useState<ChatSession | null>(null)
  const [notice, setNotice] = useState('Open your home or enter a trusted home.')
  const [lastError, setLastError] = useState('')
  const [peerCount, setPeerCount] = useState(0)
  const [transportDebug, setTransportDebug] = useState<TransportDebugLabelState | null>(null)
  const [, setRpc] = useState<RpcClient | null>(null)
  const [scanTarget, setScanTarget] = useState<ScanTarget>(null)
  const [scannerPermissionDenied, setScannerPermissionDenied] = useState(false)
  const [showAdvancedJoin, setShowAdvancedJoin] = useState(false)
  const [cameraPermission, requestCameraPermission] = useCameraPermissions()
  const scanLockRef = useRef(false)
  const rpcRef = useRef<RpcClient | null>(null)
  const workletRef = useRef<WorkletHandle | null>(null)
  const contactBookRef = useRef<ContactBook | null>(null)
  const profileIdRef = useRef<string | null>(null)
  const backendTreeholeOwnerProfileIdRef = useRef('')
  const resolveHomeJoinedRef = useRef<((ready: boolean) => void) | null>(null)

  useEffect(() => {
    contactBookRef.current = contactBook
  }, [contactBook])

  useEffect(() => {
    profileIdRef.current = profileId
  }, [profileId])

  const canJoin = ROOM_KEY_PATTERN.test(roomKey.trim())
  const shareQrPayloads = useMemo(() => {
    if (!identity) return ''
    return createShareQrPayloads({
      avatarMedia: localAvatarMedia,
      avatarUri: localAvatarUri,
      displayName: nick,
      homeRoom: homeRoomKey
        ? {
            address: homeRoomKey,
            policy: 'trusted_only',
            roomKey: homeRoomKey
          }
        : null,
      identity
    })
  }, [homeRoomKey, identity, localAvatarMedia, localAvatarUri, nick])
  const profileQrUri = shareQrPayloads ? shareQrPayloads.primaryUri : ''
  const myHomeQrUri = shareQrPayloads ? shareQrPayloads.debugHomeUri : ''
  const dmContactOptions = useMemo(
    () => (contactBook ? listTrustedContacts(contactBook) : []),
    [contactBook]
  )
  const blockedContactOptions = useMemo(
    () => (contactBook ? listBlockedContacts(contactBook) : []),
    [contactBook]
  )
  const profileReady = Boolean(identity && profileId && homeRoomKey && contactBook)
  const pendingMessageRequests = useMemo(
    () => (contactBook ? Array.from(contactBook.pendingRequestsByProfileId.values()) : []),
    [contactBook]
  )
  const outgoingMessageRequests = useMemo(
    () => (contactBook ? Array.from(contactBook.outgoingRequestsByProfileId.values()) : []),
    [contactBook]
  )
  const homeStatusLabel = getMobileHomeStatus({ online: peerCount, session })
  const treeholeStatusLabel = getMobileTreeholeStatus(treeholeStatus)

  useEffect(() => {
    let cancelled = false

    loadMobileRuntimeProfile({
      createHomeRoomKey: () => createMobileHomeRoomKey({ randomBytes: Crypto.getRandomBytes }),
      createIdentity: () => createIdentityKeyPairFromSeed(Crypto.getRandomBytes(32)),
      fileSystem: FileSystem
    })
      .then(async (profile) => {
        const messages = await loadDmSessionMessagesFromFileSystem({
          baseUri: getRequiredMobileDocumentDirectory(FileSystem),
          fileSystem: FileSystem,
          ownerProfileId: profile.profileId
        })
        const nextDmSession = restoreDirectMessageSession({
          localProfileId: profile.profileId,
          messages,
          nick
        })
        const storageBasePath = await getMobileBackendStorageBasePath({ fileSystem: FileSystem })

        if (!cancelled) {
          setProfileId(profile.profileId)
          setLocalAvatarMedia(profile.avatarMedia || null)
          setLocalAvatarUri(profile.avatarUri || '')
          setIdentity(profile.identity)
          setHomeRoomKey(profile.homeRoomKey)
          setContactBook(profile.contactBook)
          setDmSession(nextDmSession)
          setDmMessages(nextDmSession.messages)
          setDmThreads(profile.dmThreads)
          setProfileRecentPostCache(profile.profileRecentPostCache)
          setTreeholePolicy(profile.treeholePolicy)
          startProfileBackend({
            identity: profile.identity,
            nick,
            profileId: profile.profileId,
            storageBasePath,
            treeholePolicy: profile.treeholePolicy
          })
        }
      })
      .catch((error: unknown) => {
        console.error('Profile storage unavailable', error)
        if (!cancelled) {
          setLastError(errorMessage(error))
          setNotice('Could not load this profile.')
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  async function updateLocalAvatarUri(value: string) {
    const cleanAvatarUri = value.trim()
    setLocalAvatarMedia(null)
    setLocalAvatarUri(cleanAvatarUri)

    try {
      await saveMobileProfileDocument({
        avatarUri: cleanAvatarUri,
        baseUri: getRequiredMobileDocumentDirectory(FileSystem),
        fileSystem: FileSystem
      })
    } catch (error) {
      console.error('Could not save profile avatar', error)
      setLastError(errorMessage(error))
      setNotice('Could not save this profile image.')
    }
  }

  async function chooseLocalAvatarImage() {
    try {
      if (!profileReady) {
        setNotice('Profile is still loading.')
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        mediaTypes: ['images'],
        quality: 0.85
      })
      const asset = result.canceled ? null : result.assets?.[0]
      if (!asset?.uri) return

      const avatar = await importMobileProfileAvatarMedia({
        baseUri: getRequiredMobileDocumentDirectory(FileSystem),
        fileSystem: FileSystem,
        mimeType: asset.mimeType || inferAvatarMimeType(asset.uri),
        sha256Hex: createMobileSha256Hex,
        sourceUri: asset.uri
      })

      setLocalAvatarMedia(avatar.avatarMedia)
      setLocalAvatarUri(avatar.avatarUri)
      setNotice('Profile image updated.')
    } catch (error) {
      console.error('Could not import profile avatar', error)
      setLastError(errorMessage(error))
      setNotice('Could not save this profile image.')
    }
  }

  async function createHomeSessionPayload(nextSession: HomeJoinSession & Record<string, unknown>) {
    return {
      ...nextSession,
      localAvatarMediaControl: await createMobileLocalAvatarMediaControl({
        baseUri: getRequiredMobileDocumentDirectory(FileSystem),
        fileSystem: FileSystem,
        profileId,
        reference: localAvatarMedia,
        sha256Hex: createMobileSha256Hex
      })
    }
  }

  async function createRoom() {
    try {
      if (!identity || !profileId || !homeRoomKey) {
        setNotice('Profile is still loading.')
        return
      }

      const profile = getOrCreateLocalProfile({
        avatarMedia: localAvatarMedia,
        avatarUri: localAvatarUri,
        displayName: nick,
        homeRoomKey,
        createIdentity: () => identity,
        storage: null
      })
      const homeJoin = createHomeJoinSession({ nick, profile })
      const storageBasePath = await getMobileBackendStorageBasePath({ fileSystem: FileSystem })
      const nextDmSession = await restoreMobileDirectMessageSession()
      setRoomKey(homeJoin.roomKey)
      setSession(homeJoin.session)
      setActiveHomeOwnerProfileId(profileId)
      setDmSession(nextDmSession)
      setDmMessages(nextDmSession.messages)
      setPeerCount(0)
      setTreeholePosts([])
      setTreeholeCanInteract(false)
      setTreeholeCanPost(false)
      setTreeholeStatus('starting')
      startBackend(
        await createHomeSessionPayload({
          ...homeJoin,
          createTreehole: true,
          nick,
          storageBasePath,
          treeholePolicy
        })
      )
    } catch (error) {
      console.error('Could not start home', error)
      setLastError(errorMessage(error))
      setNotice('Could not start this home.')
    }
  }

  async function joinRoom() {
    if (!canJoin) {
      setNotice('Manual home key must be 64 lowercase hex characters.')
      return
    }

    try {
      if (!identity || !profileId) {
        setNotice('Profile is still loading.')
        return
      }

      const storageBasePath = await getMobileBackendStorageBasePath({ fileSystem: FileSystem })
      const homeJoin = createManualHomeJoinSession({
        identity,
        nick,
        profileId,
        roomKey: roomKey.trim()
      })
      const directEndpoint = parseDirectRoomEndpoint(directRoomEndpoint)
      const nextDmSession = await restoreMobileDirectMessageSession()
      setSession(homeJoin.session)
      setActiveHomeOwnerProfileId('')
      setDmSession(nextDmSession)
      setDmMessages(nextDmSession.messages)
      setPeerCount(0)
      setTreeholePosts([])
      setTreeholeCanInteract(false)
      setTreeholeCanPost(false)
      setTreeholeStatus('waiting')
      startBackend(
        await createHomeSessionPayload({
          ...homeJoin,
          nick,
          createTreehole: false,
          ...(directEndpoint
            ? {
                directTransport: {
                  endpoint: directEndpoint,
                  mode: 'guest'
                }
              }
            : {}),
          storageBasePath,
          treeholePolicy
        })
      )
    } catch (error) {
      console.error('Could not join home', error)
      setLastError(errorMessage(error))
      setNotice('Could not join this home.')
    }
  }

  async function joinHomeQr(uriOverride = '') {
    const uri = (uriOverride || homeQrUri).trim()

    if (!contactBook || !uri || !identity || !profileId) {
      return
    }

    try {
      const result = applyMobileHomeQrScan({
        book: contactBook,
        localProfileId: profileId,
        uri
      })

      if (!result.canEnter) {
        setNotice('This trusted-only home is not trusted locally.')
        return
      }

      if (result.book && result.book !== contactBook) {
        await saveContactBookToFileSystem({
          baseUri: getRequiredMobileDocumentDirectory(FileSystem),
          book: result.book,
          fileSystem: FileSystem
        })
        setContactBook(result.book)
      }

      const storageBasePath = await getMobileBackendStorageBasePath({ fileSystem: FileSystem })
      const homeJoin = createHomeJoinSessionFromAddress({
        address: result.address,
        identity,
        nick,
        ownerProfileId: result.ownerProfileId,
        policy: result.policy,
        profileId,
        roomKey: result.roomKey
      })
      const nextDmSession = await restoreMobileDirectMessageSession()
      setRoomKey(homeJoin.roomKey)
      setSession(homeJoin.session)
      setActiveHomeOwnerProfileId(result.ownerProfileId || '')
      setDmSession(nextDmSession)
      setDmMessages(nextDmSession.messages)
      setPeerCount(0)
      setTreeholePosts([])
      setTreeholeCanInteract(false)
      setTreeholeCanPost(false)
      setTreeholeStatus('waiting')
      setHomeQrUri('')
      startBackend(
        await createHomeSessionPayload({
          ...homeJoin,
          createTreehole: false,
          nick,
          storageBasePath,
          treeholePolicy
        })
      )
    } catch (error) {
      console.error('Could not read Home QR', error)
      setLastError(errorMessage(error))
      setNotice('Could not read this Home QR.')
    }
  }

  async function enterContactHome(profileIdToEnter: string) {
    if (!contactBook || !identity || !profileId || !profileIdToEnter) {
      return
    }

    try {
      const homeDescriptor = readTrustedContactHomeDescriptor({
        book: contactBook,
        profileId: profileIdToEnter
      })
      const storageBasePath = await getMobileBackendStorageBasePath({ fileSystem: FileSystem })
      const homeJoin = createHomeJoinSessionFromAddress({
        address: homeDescriptor.address,
        identity,
        nick,
        ownerProfileId: homeDescriptor.ownerProfileId,
        policy: homeDescriptor.policy,
        profileId,
        roomKey: homeDescriptor.roomKey
      })
      const nextDmSession = await restoreMobileDirectMessageSession()
      setRoomKey(homeJoin.roomKey)
      setSession(homeJoin.session)
      setActiveHomeOwnerProfileId(homeDescriptor.ownerProfileId)
      setDmSession(nextDmSession)
      setDmMessages(nextDmSession.messages)
      setPeerCount(0)
      setTreeholePosts([])
      setTreeholeCanInteract(false)
      setTreeholeCanPost(false)
      setTreeholeStatus('waiting')
      startBackend(
        await createHomeSessionPayload({
          ...homeJoin,
          createTreehole: false,
          nick,
          storageBasePath,
          treeholePolicy
        })
      )
    } catch (error) {
      console.error('Could not enter contact home', error)
      setLastError(errorMessage(error))
      setNotice('Could not enter this home.')
    }
  }

  function chooseProfileRequestTargetFromInput(uriOverride = '') {
    const uri = (uriOverride || trustQrUri).trim()

    if (!uri) {
      return
    }

    try {
      chooseProfileRequestTarget(uri, trustAlias)
      setTrustAlias('')
      setTrustQrUri('')
    } catch (error) {
      console.error('Could not read Profile QR', error)
      setLastError(errorMessage(error))
      setNotice('Could not read this Profile QR.')
    }
  }

  function chooseProfileRequestTarget(uri: string, displayNameOverride = '') {
    const target = readMobileProfileRequestTarget({ uri })
    const cleanDisplayName = displayNameOverride.trim()
    const targetWithDisplayName = cleanDisplayName
      ? { ...target, displayName: cleanDisplayName }
      : target
    const targetView = createFriendRequestTargetViewModel({
      contactBook,
      shortenProfileId,
      target: targetWithDisplayName
    })

    setProfileRequestTarget(targetView)
    setDmRecipient(target.profileId)
    setActiveTab('dm')
    setNotice(targetView.copy)
  }

  async function revokeTrustedContact(contactProfileId: string) {
    if (!contactBook) {
      return
    }

    const result = applyLocalContactRevoke({
      book: contactBook,
      profileId: contactProfileId,
      threads: dmThreads
    })
    const baseUri = getRequiredMobileDocumentDirectory(FileSystem)

    await saveContactBookToFileSystem({
      baseUri,
      book: result.book,
      fileSystem: FileSystem
    })
    await saveDmThreadsToFileSystem({
      baseUri,
      fileSystem: FileSystem,
      threads: result.nextThreads
    })

    setContactBook(result.book)
    setTreeholePolicy(result.treeholePolicy)
    syncTreeholePolicy(result.treeholePolicy)
    setDmThreads(result.nextThreads)
    if (dmRecipient === contactProfileId) {
      setDmRecipient('')
    }

    rpcRef.current?.request(RPC_DM_REVOKE).send(
      JSON.stringify({
        profileId: contactProfileId,
        revokedAt: result.revokedAt
      })
    )
    setNotice('Friend removed.')
  }

  async function allowRequestsFromContact(contactProfileId: string) {
    if (!contactBook) {
      return
    }

    const nextBook = allowContactRequests(contactBook, { profileId: contactProfileId })
    const nextPolicy = createTreeholePolicyFromContactBook(nextBook)

    await saveContactBookToFileSystem({
      baseUri: getRequiredMobileDocumentDirectory(FileSystem),
      book: nextBook,
      fileSystem: FileSystem
    })

    setContactBook(nextBook)
    setTreeholePolicy(nextPolicy)
    syncTreeholePolicy(nextPolicy)
    setNotice('Requests allowed again.')
  }

  function markMobileThreadRead(profileId: string) {
    const cleanProfileId = profileId?.trim()
    if (!cleanProfileId) return

    const thread = dmThreads.find(
      (entry) =>
        entry.remoteProfileId === cleanProfileId &&
        entry.state === 'accepted' &&
        entry.revokedAt === undefined
    )
    if (!thread) return

    const nextThread = markDmThreadRead(thread, { readAt: Date.now() })
    const nextThreads = upsertDmThread(dmThreads, nextThread)
    const baseUri = getRequiredMobileDocumentDirectory(FileSystem)
    setDmThreads(nextThreads)
    saveDmThreadsToFileSystem({
      baseUri,
      fileSystem: FileSystem,
      threads: nextThreads
    }).catch((error: unknown) => {
      console.error('DM thread storage unavailable', error)
      setLastError(errorMessage(error))
      setNotice('Could not save this message thread.')
    })
  }

  function syncTreeholePolicy(nextPolicy: TreeholePolicy | null) {
    rpcRef.current?.request(RPC_TREEHOLE_POLICY).send(
      JSON.stringify({
        treeholePolicy: nextPolicy
      })
    )
  }

  async function startQrScan(target: Exclude<ScanTarget, null>) {
    setScannerPermissionDenied(false)

    if (!cameraPermission?.granted) {
      const nextPermission = await requestCameraPermission()

      if (!nextPermission.granted) {
        setScanTarget(target)
        setScannerPermissionDenied(true)
        setNotice('Camera permission denied.')
        return
      }
    }

    scanLockRef.current = false
    setScanTarget(target)
  }

  async function handleQrScanned(event: MobileQrScanEvent) {
    const data = getScannedQrData(event)

    if (!scanTarget || scanLockRef.current || !data) {
      return
    }

    scanLockRef.current = true
    setScanTarget(null)

    try {
      if (scanTarget === 'home') {
        await joinHomeQr(data)
      } else {
        chooseProfileRequestTarget(data)
      }
    } finally {
      scanLockRef.current = false
    }
  }

  function leaveRoom() {
    rpcRef.current?.request(RPC_LEAVE).send(JSON.stringify({}))
    setSession(null)
    setActiveHomeOwnerProfileId('')
    setDraft('')
    setDmDraft('')
    setProfileRequestTarget(null)
    setTreeholeDraft('')
    setTreeholeCanInteract(false)
    setTreeholeCanPost(false)
    setTreeholePosts([])
    setTreeholeStatus('idle')
    setActiveTab('chat')
    setPeerCount(0)
    setNotice('Left home.')
  }

  function sendMessage() {
    const cleanText = normalizeComposerText(draft)
    if (!session || !cleanText) {
      return
    }

    const message = {
      id: createMobileMessageId({
        randomBytes: Crypto.getRandomBytes,
        randomUUID: globalThis.crypto?.randomUUID?.bind(globalThis.crypto)
      }),
      text: cleanText,
      at: Date.now()
    }

    setSession(appendLocalMessage(session, message.text, message))
    rpcRef.current?.request(RPC_SEND).send(JSON.stringify(message))
    setDraft('')
  }

  function sendMessageRequest() {
    const cleanText = normalizeComposerText(dmDraft)
    const cleanRecipient = dmRecipient.trim()
    if (!dmSession || !cleanText || !cleanRecipient) {
      return
    }

    const message = {
      createdAt: Date.now(),
      fromProfileId: profileId,
      requestId: createMobileMessageId({
        randomBytes: Crypto.getRandomBytes,
        randomUUID: globalThis.crypto?.randomUUID?.bind(globalThis.crypto)
      }),
      toProfileId: cleanRecipient,
      text: cleanText,
      type: 'kepos.message.request.v1'
    }
    const thread = dmThreads.find(
      (entry) =>
        entry.remoteProfileId === message.toProfileId &&
        entry.state === 'accepted' &&
        entry.revokedAt === undefined
    )

    if (thread) {
      rpcRef.current?.request(RPC_DM_BODY_SEND).send(
        JSON.stringify({
          createdAt: message.createdAt,
          messageId: message.requestId,
          text: message.text,
          threadId: thread.threadId
        })
      )
      setDmDraft('')
      setProfileRequestTarget(null)
      return
    }

    const requestTargetView = createFriendRequestTargetViewModel({
      contactBook,
      shortenProfileId,
      target:
        profileRequestTarget?.profileId === cleanRecipient
          ? profileRequestTarget
          : { profileId: cleanRecipient }
    })
    if (!requestTargetView.canSendRequest) {
      setNotice(requestTargetView.copy)
      return
    }

    const nextSession = appendLocalMessageRequest(dmSession, message)
    if (contactBook) {
      const nextBook = recordOutgoingFriendRequest(contactBook, {
        alias: shortenProfileId(message.toProfileId),
        avatarMediaSnapshot: requestTargetView.avatarMediaSnapshot,
        avatarUriSnapshot: requestTargetView.avatarUri,
        displayNameSnapshot: requestTargetView.displayName,
        deliveryState: 'queued',
        profileId: message.toProfileId,
        requestedAt: message.createdAt,
        requestId: message.requestId,
        source: 'profile_qr',
        text: message.text
      })

      setContactBook(nextBook)
      saveContactBookToFileSystem({
        baseUri: getRequiredMobileDocumentDirectory(FileSystem),
        book: nextBook,
        fileSystem: FileSystem
      }).catch((error: unknown) => {
        console.error('Contact book storage unavailable', error)
        setLastError(errorMessage(error))
        setNotice('Could not save this contact.')
      })
    }

    setDmSession(nextSession)
    setDmMessages(nextSession.messages)
    rpcRef.current?.request(RPC_PROFILE_REQUEST_SEND).send(
      JSON.stringify({
        at: message.createdAt,
        id: message.requestId,
        text: message.text,
        toProfileId: message.toProfileId
      })
    )
    saveMobileDmSessionMessages(nextSession.messages).catch((error: unknown) => {
      console.error('DM session storage unavailable', error)
      setLastError(errorMessage(error))
      setNotice('Could not save this friend request.')
    })
    setNotice('Friend request pending.')
    setDmDraft('')
    setProfileRequestTarget(null)
  }

  function sendTreeholePost() {
    const cleanText = normalizeComposerText(treeholeDraft)
    if (!session || !cleanText) {
      return
    }

    rpcRef.current?.request(RPC_TREEHOLE_POST).send(
      JSON.stringify({
        id: createMobileMessageId({
          randomBytes: Crypto.getRandomBytes,
          randomUUID: globalThis.crypto?.randomUUID?.bind(globalThis.crypto)
        }),
        text: cleanText,
        createdAt: Date.now()
      })
    )
    setTreeholeDraft('')
  }

  function sendTreeholeComment({ postId, text }: TreeholeCommentDraft) {
    const cleanText = normalizeComposerText(text)
    if (!session || !treeholeCanInteract || !cleanText) {
      return
    }

    rpcRef.current?.request(RPC_TREEHOLE_COMMENT).send(
      JSON.stringify({
        createdAt: Date.now(),
        id: createMobileMessageId({
          randomBytes: Crypto.getRandomBytes,
          randomUUID: globalThis.crypto?.randomUUID?.bind(globalThis.crypto)
        }),
        postId,
        text: cleanText
      })
    )
  }

  function sendTreeholeLike(postId: string) {
    if (!session || !treeholeCanInteract) {
      return
    }

    rpcRef.current?.request(RPC_TREEHOLE_LIKE).send(
      JSON.stringify({
        createdAt: Date.now(),
        postId
      })
    )
  }

  function startProfileBackend(payload: {
    identity: SigningIdentity
    nick: string
    profileId: string
    storageBasePath: string
    treeholePolicy: TreeholePolicy | null
  }) {
    try {
      const nextRpc = getOrCreateBackendRpc()
      nextRpc.request(RPC_PROFILE_START).send(JSON.stringify(payload))
      setRpc(nextRpc)
      setNotice('Profile ready.')
    } catch (error) {
      console.error('Could not start profile service', error)
      setLastError(errorMessage(error))
      setNotice('Could not start profile services.')
    }
  }

  function getOrCreateBackendRpc(): RpcClient {
    if (rpcRef.current) return rpcRef.current

    const worklet = new Worklet() as WorkletHandle
    worklet.start('/app.bundle', bundle, [])
    workletRef.current = worklet

    const RpcConstructor = RPC as unknown as new (
      ipc: unknown,
      onrequest: (req: RpcRequest) => void
    ) => RpcClient
    const nextRpc = new RpcConstructor(worklet.IPC, handleBackendRequest)

    rpcRef.current = nextRpc
    return nextRpc
  }

  function handleBackendRequest(req: RpcRequest) {
    const payload = readRpcPayload(req)
    const payloadRecord = asRecord(payload)

    if (req.command === RPC_MESSAGE) {
      setSession((current) =>
        current ? appendRemoteMessage(current, payloadRecord as ChatMessage) : current
      )
      return
    }

    if (req.command === RPC_DM_MESSAGE) {
      handleIncomingMessageRequest(asMessageRequestPayload(payload)).catch((error: unknown) => {
        console.error('Message request unavailable', error)
        setLastError(errorMessage(error))
        setNotice('Could not save this friend request.')
      })
      return
    }

    if (req.command === RPC_PROFILE_REQUEST_STATE) {
      applyProfileRequestDeliveryState(payloadRecord as ProfileRequestDeliveryPayload)
      return
    }

    if (req.command === RPC_DM_BODY_MESSAGE) {
      setDmSession((current) => {
        if (!current) {
          return current
        }

        const next =
          payloadRecord.direction === 'out'
            ? appendLocalSignedDirectMessage(current, payloadRecord, {
                remoteProfileId: asString(payloadRecord.remoteProfileId) || ''
              })
            : appendRemoteSignedDirectMessage(current, payloadRecord)
        setDmMessages(next.messages)
        saveMobileDmSessionMessages(next.messages).catch((error: unknown) => {
          console.error('DM session storage unavailable', error)
          setLastError(errorMessage(error))
          setNotice('Could not save this message.')
        })
        return next
      })
      return
    }

    if (req.command === RPC_DM_THREAD) {
      const threadPayload = payloadRecord as DmThread
      setDmThreads((current) => upsertDmThread(current, threadPayload))
      setContactBook((current) => {
        if (!current?.outgoingRequestsByProfileId?.has(threadPayload.remoteProfileId)) {
          return current
        }

        const nextBook = acceptOutgoingFriendRequest(current, {
          acceptedAt: threadPayload.acceptedAt || Date.now(),
          profileId: threadPayload.remoteProfileId
        })
        const nextPolicy = createTreeholePolicyFromContactBook(nextBook)

        contactBookRef.current = nextBook
        setTreeholePolicy(nextPolicy)
        syncTreeholePolicy(nextPolicy)
        saveContactBookToFileSystem({
          baseUri: getRequiredMobileDocumentDirectory(FileSystem),
          book: nextBook,
          fileSystem: FileSystem
        }).catch((error: unknown) => {
          console.error('Contact book storage unavailable', error)
          setLastError(errorMessage(error))
          setNotice('Could not save this contact.')
        })
        return nextBook
      })
      saveMobileDmThread(threadPayload).catch((error: unknown) => {
        console.error('DM thread unavailable', error)
        setLastError(errorMessage(error))
        setNotice('Could not save this message.')
      })
      return
    }

    if (req.command === RPC_PEER_COUNT) {
      setPeerCount(asNumber(payloadRecord.count) || 0)
      return
    }

    if (req.command === RPC_ROOM_DEBUG) {
      setTransportDebug(payloadRecord as TransportDebugLabelState)
      return
    }

    if (req.command === RPC_AVATAR_MEDIA_BYTES) {
      storeMobileAvatarMediaBytesControl({
        baseUri: getRequiredMobileDocumentDirectory(FileSystem),
        book: contactBookRef.current,
        fileSystem: FileSystem,
        message: payloadRecord,
        sha256Hex: createMobileSha256Hex
      })
        .then((result) => {
          if (result) setNotice('Profile image received.')
        })
        .catch((error: unknown) => {
          console.error('Profile image unavailable', error)
          setLastError(errorMessage(error))
          setNotice('Could not save this profile image.')
        })
      return
    }

    if (req.command === RPC_STATUS) {
      const status = asString(payloadRecord.status)
      if (status !== 'opening-dm') {
        setNotice(getMobileBackendNotice(status))
      }
      if (status === 'joined') {
        resolveHomeJoinedRef.current?.(true)
        resolveHomeJoinedRef.current = null
      }
      return
    }

    if (req.command === RPC_TREEHOLE_STATUS) {
      setTreeholeStatus(asString(payloadRecord.status) || 'idle')
      if (Object.hasOwn(payloadRecord, 'canInteract')) {
        setTreeholeCanInteract(Boolean(payloadRecord.canInteract))
      }
      if (Object.hasOwn(payloadRecord, 'canPost')) {
        setTreeholeCanPost(Boolean(payloadRecord.canPost))
      }
      return
    }

    if (req.command === RPC_TREEHOLE_STATE) {
      const nextPosts = Array.isArray(payloadRecord.posts)
        ? (payloadRecord.posts as MobileTreeholePost[])
        : []
      setTreeholePosts(nextPosts)
      const ownerProfileId = backendTreeholeOwnerProfileIdRef.current
      if (ownerProfileId && nextPosts.length > 0) {
        setProfileRecentPostCache((current) => {
          const nextCache = updateProfileRecentPostCache(current, {
            ownerProfileId,
            posts: nextPosts
          })
          saveProfileRecentPostCacheToFileSystem({
            baseUri: getRequiredMobileDocumentDirectory(FileSystem),
            cache: nextCache,
            fileSystem: FileSystem
          }).catch((error) => {
            console.warn('Recent posts cache unavailable', error)
          })
          return nextCache
        })
      }
      return
    }

    if (req.command === RPC_ERROR) {
      resolveHomeJoinedRef.current?.(false)
      resolveHomeJoinedRef.current = null
      setLastError(asString(payloadRecord.message) || 'Home connection error')
      setNotice('Home connection error.')
    }
  }

  function applyProfileRequestDeliveryState(delivery: ProfileRequestDeliveryPayload) {
    if (!delivery.toProfileId || !delivery.requestId || !delivery.state) {
      return
    }

    setContactBook((current) => {
      if (!current) return current

      const nextBook = updateOutgoingFriendRequestDeliveryState(current, {
        deliveryState: delivery.state || 'queued',
        profileId: delivery.toProfileId || '',
        requestId: delivery.requestId || ''
      })

      if (nextBook === current) return current

      contactBookRef.current = nextBook
      saveContactBookToFileSystem({
        baseUri: getRequiredMobileDocumentDirectory(FileSystem),
        book: nextBook,
        fileSystem: FileSystem
      }).catch((error: unknown) => {
        console.error('Contact book storage unavailable', error)
        setLastError(errorMessage(error))
        setNotice('Could not save this contact.')
      })
      return nextBook
    })
  }

  function startBackend(
    nextSession: HomeJoinSession & Record<string, unknown>
  ): BackendStartResult | null {
    try {
      const nextRpc = getOrCreateBackendRpc()

      let joinedSettled = false
      let joinedTimeout: ReturnType<typeof setTimeout> | null = null
      let resolveJoined: (ready: boolean) => void = () => {}
      const joined = new Promise<boolean>((resolve) => {
        resolveJoined = resolve
      })
      const resolveHomeJoined = (ready: boolean) => {
        if (joinedSettled) return
        joinedSettled = true
        if (joinedTimeout) clearTimeout(joinedTimeout)
        resolveJoined(ready)
      }
      joinedTimeout = setTimeout(() => resolveHomeJoined(false), 10000)

      resolveHomeJoinedRef.current = resolveHomeJoined
      backendTreeholeOwnerProfileIdRef.current = asString(nextSession.ownerProfileId) || ''
      nextRpc.request(RPC_JOIN).send(JSON.stringify(nextSession))
      setRpc(nextRpc)
      setNotice('Starting home...')
      return { joined, rpc: nextRpc }
    } catch (error) {
      console.error('Could not connect home', error)
      setLastError(errorMessage(error))
      setNotice('Could not connect this home.')
      return null
    }
  }

  async function handleIncomingMessageRequest(request: MessageRequestPayload) {
    const stored = await persistIncomingMessageRequest(request)
    if (!stored) {
      return
    }

    setDmSession((current) => {
      if (!current) {
        return current
      }

      const next = appendRemoteMessageRequest(current, request)
      setDmMessages(next.messages)
      saveMobileDmSessionMessages(next.messages).catch((error: unknown) => {
        console.error('DM session storage unavailable', error)
        setLastError(errorMessage(error))
        setNotice('Could not save this friend request.')
      })
      return next
    })
  }

  async function persistIncomingMessageRequest(request: MessageRequestPayload) {
    const currentBook = contactBookRef.current
    const currentProfileId = profileIdRef.current
    if (!currentBook || request.toProfileId !== currentProfileId) {
      return false
    }

    const nextBook = recordMessageRequest(currentBook, {
      profileId: request.fromProfileId,
      requestedAt: request.createdAt,
      requestId: request.requestId,
      senderEncryptionPublicKey: request.senderEncryptionPublicKey,
      source: 'profile_request',
      text: request.text
    })

    await saveContactBookToFileSystem({
      baseUri: getRequiredMobileDocumentDirectory(FileSystem),
      book: nextBook,
      fileSystem: FileSystem
    })
    contactBookRef.current = nextBook
    setContactBook(nextBook)
    return true
  }

  async function acceptIncomingMessageRequest(requestInput: unknown) {
    const request = asMessageRequestPayload(requestInput)
    const activeRpc = rpcRef.current
    if (!contactBook || !identity || !activeRpc) {
      return
    }

    const acceptedAt = Date.now()
    const threadId = createMobileMessageId({
      randomBytes: Crypto.getRandomBytes,
      randomUUID: globalThis.crypto?.randomUUID?.bind(globalThis.crypto)
    })
    const nextBook = acceptMessageRequest(contactBook, {
      acceptedAt,
      profileId: request.fromProfileId
    })
    const nextPolicy = createTreeholePolicyFromContactBook(nextBook)

    await saveContactBookToFileSystem({
      baseUri: getRequiredMobileDocumentDirectory(FileSystem),
      book: nextBook,
      fileSystem: FileSystem
    })
    setContactBook(nextBook)
    setTreeholePolicy(nextPolicy)
    syncTreeholePolicy(nextPolicy)
    activeRpc.request(RPC_DM_ACCEPT).send(
      JSON.stringify({
        acceptedAt,
        request,
        threadId
      })
    )
    setNotice('Friend request accepted.')
  }

  async function ignoreIncomingMessageRequest(requestInput: unknown) {
    const request = asMessageRequestPayload(requestInput)
    if (!contactBook) {
      return
    }

    const requestProfileId = request.profileId || request.fromProfileId
    const nextBook = ignoreMessageRequest(contactBook, {
      profileId: requestProfileId
    })

    await saveContactBookToFileSystem({
      baseUri: getRequiredMobileDocumentDirectory(FileSystem),
      book: nextBook,
      fileSystem: FileSystem
    })
    setContactBook(nextBook)
    setDmSession((current) => {
      if (!current || !request.id) {
        return current
      }

      const nextSession = dismissDirectMessage(current, { id: request.id })
      setDmMessages(nextSession.messages)
      saveMobileDmSessionMessages(nextSession.messages).catch((error: unknown) => {
        console.error('DM session storage unavailable', error)
        setLastError(errorMessage(error))
        setNotice('Could not save this friend request.')
      })
      return nextSession
    })
    setNotice('Friend request ignored.')
  }

  async function restoreMobileDirectMessageSession(): Promise<DirectMessageSession> {
    if (!profileId) {
      throw new Error('Profile is still loading.')
    }

    const messages = await loadDmSessionMessagesFromFileSystem({
      baseUri: getRequiredMobileDocumentDirectory(FileSystem),
      fileSystem: FileSystem,
      ownerProfileId: profileId
    })

    return restoreDirectMessageSession({
      localProfileId: profileId,
      messages,
      nick
    })
  }

  async function saveMobileDmSessionMessages(messages: DirectMessageEntry[]) {
    if (!profileId) return

    await saveDmSessionMessagesToFileSystem({
      baseUri: getRequiredMobileDocumentDirectory(FileSystem),
      fileSystem: FileSystem,
      messages,
      ownerProfileId: profileId
    })
  }

  async function saveMobileDmThread(thread: DmThread) {
    const baseUri = getRequiredMobileDocumentDirectory(FileSystem)
    const threads = await loadDmThreadsFromFileSystem({
      baseUri,
      fileSystem: FileSystem
    })
    const nextThreads = upsertDmThread(threads, thread)

    await saveDmThreadsToFileSystem({
      baseUri,
      fileSystem: FileSystem,
      threads: nextThreads
    })
    setDmThreads(nextThreads)
  }

  return (
    <MobileThemeContext.Provider value={{ styles: themedStyles, theme }}>
      <View style={styles.safe}>
        <StatusBar barStyle={theme.statusBar} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.screen}
        >
          {scanTarget ? (
            <QrScanner
              onCancel={() => {
                setScannerPermissionDenied(false)
                setScanTarget(null)
              }}
              onScanned={handleQrScanned}
              permissionDenied={scannerPermissionDenied}
              styles={styles}
              theme={theme}
            />
          ) : (
            <>
              <Header
                notice={notice}
                statusLabel={homeStatusLabel}
                styles={styles}
                theme={theme}
                treeholeStatusLabel={treeholeStatusLabel}
                title={session ? 'Home' : 'Kepos'}
              />
              <ChatRoom
                activeHomeOwnerProfileId={activeHomeOwnerProfileId}
                activeTab={activeTab}
                blockedContacts={blockedContactOptions}
                canJoin={profileReady && canJoin}
                contactProfileTargetId={contactProfileTargetId}
                directRoomEndpoint={directRoomEndpoint}
                draft={draft}
                dmContactOptions={dmContactOptions}
                dmDraft={dmDraft}
                dmMessages={dmMessages}
                dmRecipient={dmRecipient}
                dmThreads={dmThreads}
                homeQrUri={homeQrUri}
                lastError={lastError}
                localAvatarUri={localAvatarUri}
                myHomeQrUri={myHomeQrUri}
                nick={nick}
                onAcceptRequest={acceptIncomingMessageRequest}
                onAllowContactRequests={allowRequestsFromContact}
                onChooseLocalAvatarImage={chooseLocalAvatarImage}
                onContactProfileTargetChange={setContactProfileTargetId}
                onCreateRoom={createRoom}
                onDirectRoomEndpointChange={setDirectRoomEndpoint}
                onDmDraftChange={setDmDraft}
                onDmRecipientChange={setDmRecipient}
                onDraftChange={setDraft}
                onEnterContactHome={enterContactHome}
                onHomeQrChange={setHomeQrUri}
                onIgnoreRequest={ignoreIncomingMessageRequest}
                onJoinHomeQr={joinHomeQr}
                onJoinRoom={joinRoom}
                onLeave={leaveRoom}
                onLocalAvatarUriChange={updateLocalAvatarUri}
                onMarkThreadRead={markMobileThreadRead}
                onNickChange={setNick}
                onRevokeContact={revokeTrustedContact}
                onRoomKeyChange={setRoomKey}
                onScanHomeQr={() => startQrScan('home')}
                onScanProfileQr={() => startQrScan('profile')}
                onSend={sendMessage}
                onSendDm={sendMessageRequest}
                onTabChange={setActiveTab}
                onToggleAdvancedJoin={() => setShowAdvancedJoin((value) => !value)}
                onTreeholeComment={sendTreeholeComment}
                onTreeholeDraftChange={setTreeholeDraft}
                onTreeholeLike={sendTreeholeLike}
                onTreeholePost={sendTreeholePost}
                onTrustAliasChange={setTrustAlias}
                onTrustProfile={chooseProfileRequestTargetFromInput}
                onTrustQrChange={setTrustQrUri}
                outgoingRequests={outgoingMessageRequests}
                pendingRequests={pendingMessageRequests}
                profileId={profileId}
                profileQrUri={profileQrUri}
                profileReady={profileReady}
                profileRecentPostCache={profileRecentPostCache}
                profileRequestTarget={profileRequestTarget}
                roomKey={roomKey}
                session={session}
                showAdvancedJoin={showAdvancedJoin}
                styles={styles}
                theme={theme}
                transportDebug={transportDebug}
                treeholeCanInteract={treeholeCanInteract}
                treeholeCanPost={treeholeCanPost}
                treeholeDraft={treeholeDraft}
                treeholePosts={treeholePosts}
                treeholeStatus={treeholeStatus}
                trustAlias={trustAlias}
                trustQrUri={trustQrUri}
              />
            </>
          )}
        </KeyboardAvoidingView>
      </View>
    </MobileThemeContext.Provider>
  )
}

async function createMobileSha256Hex(bytes: Uint8Array): Promise<string> {
  const copy = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(copy).set(bytes)
  return arrayBufferToHex(await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, copy))
}

function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function inferAvatarMimeType(uri: string): string {
  const cleanUri = uri.toLowerCase()
  if (cleanUri.endsWith('.jpg') || cleanUri.endsWith('.jpeg')) return 'image/jpeg'
  if (cleanUri.endsWith('.webp')) return 'image/webp'
  if (cleanUri.endsWith('.png')) return 'image/png'
  return ''
}
