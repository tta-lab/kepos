import React, { useEffect, useMemo, useRef, useState } from 'react'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as Crypto from 'expo-crypto'
import * as FileSystem from 'expo-file-system/legacy'
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View
} from 'react-native'
import {
  ArrowRight,
  Heart,
  LogOut,
  MessageCircle,
  Plus,
  QrCode,
  Send,
  Settings,
  Sprout,
  UserMinus,
  Users
} from 'lucide-react-native'
import QRCode from 'react-native-qrcode-svg'
import { appendLocalMessage, appendRemoteMessage } from '../src/chat-session.js'
import {
  appendLocalSignedDirectMessage,
  appendLocalMessageRequest,
  appendRemoteSignedDirectMessage,
  appendRemoteMessageRequest,
  dismissDirectMessage,
  restoreDirectMessageSession
} from '../src/dm-session.js'
import {
  loadDmSessionMessagesFromFileSystem,
  saveDmSessionMessagesToFileSystem
} from '../src/dm-session-storage.js'
import { loadDmThreadsFromFileSystem, saveDmThreadsToFileSystem } from '../src/dm-thread-storage.js'
import {
  acceptMessageRequest,
  ignoreMessageRequest,
  listTrustedContacts,
  recordMessageRequest
} from '../src/contact-book.ts'
import {
  createTreeholePolicyFromContactBook,
  loadContactBookFromFileSystem,
  saveContactBookToFileSystem
} from '../src/contact-book-storage.js'
import {
  createHomeJoinSession,
  createHomeJoinSessionFromAddress,
  createManualHomeJoinSession
} from '../src/home-session.js'
import { createIdentityKeyPairFromSeed } from '../src/identity.js'
import { getOrCreateLocalProfile } from '../src/local-profile.js'
import {
  getOrCreateMobileHomeRoomKey,
  getOrCreateMobileIdentity,
  getRequiredMobileDocumentDirectory
} from '../src/mobile-profile.js'
import { applyMobileHomeQrScan, applyMobileProfileQrScan } from '../src/mobile-qr-actions.js'
import { getScannedQrData } from '../src/mobile-qr-event.js'
import { applyLocalContactRevoke } from '../src/revoke-state.js'
import {
  createSignedHomeAddressPayload,
  createSignedTrustInvitePayload,
  encodeQrUri
} from '../src/signed-qr-payload.ts'
import { Worklet } from 'react-native-bare-kit'
import RPC from 'bare-rpc'
import b4a from 'b4a'
import bundle from './app.bundle.mjs'
import {
  RPC_ERROR,
  RPC_DM_ACCEPT,
  RPC_DM_BODY_MESSAGE,
  RPC_DM_BODY_SEND,
  RPC_DM_MESSAGE,
  RPC_DM_REVOKE,
  RPC_DM_SEND,
  RPC_DM_THREAD,
  RPC_JOIN,
  RPC_LEAVE,
  RPC_MESSAGE,
  RPC_PEER_COUNT,
  RPC_SEND,
  RPC_STATUS,
  RPC_TREEHOLE_COMMENT,
  RPC_TREEHOLE_LIKE,
  RPC_TREEHOLE_POST,
  RPC_TREEHOLE_STATE,
  RPC_TREEHOLE_STATUS
} from '../rpc-commands.mjs'

const ROOM_KEY_PATTERN = /^[0-9a-f]{64}$/

const mobileThemes = {
  neoCozy: {
    accent: '#d9714b',
    accentInk: '#fffaf0',
    accentStrong: '#143d2b',
    border: '#d9dfcf',
    borderStrong: '#c9d3bf',
    danger: '#8e351f',
    dangerBorder: '#d88b72',
    disabled: '#b7bdae',
    disabledBorder: '#c6cdc1',
    field: '#fffdf7',
    iconMuted: '#56715f',
    ink: '#162119',
    inkMuted: '#6f766b',
    inkSoft: '#4b554c',
    panel: '#f6f1e4',
    placeholder: '#8b9188',
    quickPanel: '#dfe9ce',
    quickPanelBorder: '#b9caa6',
    raised: '#fffdf7',
    scanner: '#101711',
    statusBar: 'dark-content',
    statusDot: '#2f8f61',
    statusText: '#324137',
    surface: '#fffaf0',
    treeComment: '#f4f6ed',
    treeCommentBorder: '#9bb68d'
  },
  indieConsole: {
    accent: '#ffcf3d',
    accentInk: '#171d33',
    accentStrong: '#ffcf3d',
    border: '#384264',
    borderStrong: '#4a567d',
    danger: '#ff9c88',
    dangerBorder: '#ff6f61',
    disabled: '#4a5269',
    disabledBorder: '#4a5269',
    field: '#11182b',
    iconMuted: '#a9b1cf',
    ink: '#f8f2df',
    inkMuted: '#a9b1cf',
    inkSoft: '#c6cce3',
    panel: '#1d2542',
    placeholder: '#8d96b8',
    quickPanel: '#27345b',
    quickPanelBorder: '#4a567d',
    raised: '#222a49',
    scanner: '#080d18',
    statusBar: 'light-content',
    statusDot: '#ffcf3d',
    statusText: '#f8f2df',
    surface: '#171d33',
    treeComment: '#202a4a',
    treeCommentBorder: '#ffcf3d'
  }
}

const fallbackMobileStyles = createMobileStyles(mobileThemes.neoCozy)

const MobileThemeContext = React.createContext({
  styles: fallbackMobileStyles,
  theme: mobileThemes.neoCozy
})

function useMobileTheme() {
  return React.useContext(MobileThemeContext)
}

export default function App() {
  const colorScheme = useColorScheme()
  const theme = colorScheme === 'dark' ? mobileThemes.indieConsole : mobileThemes.neoCozy
  const themedStyles = useMemo(() => createMobileStyles(theme), [theme])
  const styles = themedStyles
  const [nick, setNick] = useState('Neil')
  const [profileId, setProfileId] = useState(null)
  const [identity, setIdentity] = useState(null)
  const [homeRoomKey, setHomeRoomKey] = useState(null)
  const [contactBook, setContactBook] = useState(null)
  const [treeholePolicy, setTreeholePolicy] = useState(null)
  const [roomKey, setRoomKey] = useState('')
  const [homeQrUri, setHomeQrUri] = useState('')
  const [trustAlias, setTrustAlias] = useState('')
  const [trustQrUri, setTrustQrUri] = useState('')
  const [draft, setDraft] = useState('')
  const [dmDraft, setDmDraft] = useState('')
  const [dmMessages, setDmMessages] = useState([])
  const [dmRecipient, setDmRecipient] = useState('')
  const [dmSession, setDmSession] = useState(null)
  const [dmThreads, setDmThreads] = useState([])
  const [treeholeDraft, setTreeholeDraft] = useState('')
  const [treeholeCanInteract, setTreeholeCanInteract] = useState(false)
  const [treeholeCanPost, setTreeholeCanPost] = useState(false)
  const [treeholePosts, setTreeholePosts] = useState([])
  const [treeholeStatus, setTreeholeStatus] = useState('idle')
  const [activeTab, setActiveTab] = useState('chat')
  const [session, setSession] = useState(null)
  const [notice, setNotice] = useState('Create your home or join a friend.')
  const [lastError, setLastError] = useState('')
  const [peerCount, setPeerCount] = useState(0)
  const [rpc, setRpc] = useState(null)
  const [scanTarget, setScanTarget] = useState(null)
  const [scannerPermissionDenied, setScannerPermissionDenied] = useState(false)
  const [showAdvancedJoin, setShowAdvancedJoin] = useState(false)
  const [cameraPermission, requestCameraPermission] = useCameraPermissions()
  const scanLockRef = useRef(false)
  const workletRef = useRef(null)

  const canJoin = ROOM_KEY_PATTERN.test(roomKey.trim())
  const profileQrUri = useMemo(() => {
    if (!identity) return ''

    return encodeQrUri(
      createSignedTrustInvitePayload({
        displayName: nick,
        identity
      })
    )
  }, [identity, nick])
  const myHomeQrUri = useMemo(() => {
    if (!identity || !homeRoomKey) return ''

    return encodeQrUri(
      createSignedHomeAddressPayload({
        address: homeRoomKey,
        identity,
        policy: 'trusted_only',
        roomKey: homeRoomKey
      })
    )
  }, [homeRoomKey, identity])
  const dmContactOptions = useMemo(
    () => (contactBook ? listTrustedContacts(contactBook) : []),
    [contactBook]
  )
  const profileReady = Boolean(identity && profileId && homeRoomKey && contactBook)
  const pendingMessageRequests = useMemo(
    () => (contactBook ? Array.from(contactBook.pendingRequestsByProfileId.values()) : []),
    [contactBook]
  )
  const homeStatusLabel = getMobileHomeStatus({ online: peerCount, session })
  const treeholeStatusLabel = getMobileTreeholeStatus(treeholeStatus)

  useEffect(() => {
    let cancelled = false

    loadMobileProfile()
      .then((profile) => {
        if (!cancelled) {
          setProfileId(profile.profileId)
          setIdentity(profile.identity)
          setHomeRoomKey(profile.homeRoomKey)
          setContactBook(profile.contactBook)
          setDmThreads(profile.dmThreads)
          setTreeholePolicy(profile.treeholePolicy)
        }
      })
      .catch((error) => {
        console.error('Profile storage unavailable', error)
        if (!cancelled) {
          setLastError(error.message)
          setNotice('Could not load this profile.')
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  async function createRoom() {
    try {
      if (!identity || !profileId || !homeRoomKey) {
        setNotice('Profile is still loading.')
        return
      }

      const profile = getOrCreateLocalProfile({
        displayName: nick,
        homeRoomKey,
        createIdentity: () => identity,
        storage: null
      })
      const homeJoin = createHomeJoinSession({ nick, profile })
      const storageBasePath = await getBackendStorageBasePath()
      const nextDmSession = await restoreMobileDirectMessageSession()
      setRoomKey(homeJoin.roomKey)
      setSession(homeJoin.session)
      setDmSession(nextDmSession)
      setDmMessages(nextDmSession.messages)
      setPeerCount(0)
      setTreeholePosts([])
      setTreeholeCanInteract(false)
      setTreeholeCanPost(false)
      setTreeholeStatus('starting')
      startBackend({
        ...homeJoin,
        createTreehole: true,
        nick,
        storageBasePath,
        treeholePolicy
      })
    } catch (error) {
      console.error('Could not start home', error)
      setLastError(error.message)
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

      const storageBasePath = await getBackendStorageBasePath()
      const homeJoin = createManualHomeJoinSession({
        identity,
        nick,
        profileId,
        roomKey: roomKey.trim()
      })
      const nextDmSession = await restoreMobileDirectMessageSession()
      setSession(homeJoin.session)
      setDmSession(nextDmSession)
      setDmMessages(nextDmSession.messages)
      setPeerCount(0)
      setTreeholePosts([])
      setTreeholeCanInteract(false)
      setTreeholeCanPost(false)
      setTreeholeStatus('waiting')
      startBackend({
        ...homeJoin,
        nick,
        createTreehole: false,
        storageBasePath,
        treeholePolicy
      })
    } catch (error) {
      console.error('Could not join home', error)
      setLastError(error.message)
      setNotice('Could not join this home.')
    }
  }

  async function joinHomeQr(uriOverride) {
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

      const storageBasePath = await getBackendStorageBasePath()
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
      setDmSession(nextDmSession)
      setDmMessages(nextDmSession.messages)
      setPeerCount(0)
      setTreeholePosts([])
      setTreeholeCanInteract(false)
      setTreeholeCanPost(false)
      setTreeholeStatus('waiting')
      setHomeQrUri('')
      startBackend({
        ...homeJoin,
        createTreehole: false,
        nick,
        storageBasePath,
        treeholePolicy
      })
    } catch (error) {
      console.error('Could not read Home QR', error)
      setLastError(error.message)
      setNotice('Could not read this Home QR.')
    }
  }

  async function trustProfileQr(uriOverride) {
    const uri = (uriOverride || trustQrUri).trim()

    if (!contactBook || !uri) {
      return
    }

    try {
      const result = applyMobileProfileQrScan({
        alias: trustAlias,
        book: contactBook,
        localIdentity: identity,
        uri
      })

      await saveContactBookToFileSystem({
        baseUri: getRequiredMobileDocumentDirectory(FileSystem),
        book: result.book,
        fileSystem: FileSystem
      })
      setContactBook(result.book)
      setTreeholePolicy(createTreeholePolicyFromContactBook(result.book))
      setTrustAlias('')
      setTrustQrUri('')
      setNotice('Trusted friend added.')
    } catch (error) {
      console.error('Could not read Profile QR', error)
      setLastError(error.message)
      setNotice('Could not read this Profile QR.')
    }
  }

  async function revokeTrustedContact(contactProfileId) {
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
    setDmThreads(result.nextThreads)
    if (dmRecipient === contactProfileId) {
      setDmRecipient('')
    }

    rpc?.request(RPC_DM_REVOKE).send(
      JSON.stringify({
        profileId: contactProfileId,
        revokedAt: result.revokedAt
      })
    )
    setNotice('Trust revoked.')
  }

  async function startQrScan(target) {
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

  async function handleQrScanned(event) {
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
        await trustProfileQr(data)
      }
    } finally {
      scanLockRef.current = false
    }
  }

  function leaveRoom() {
    rpc?.request(RPC_LEAVE).send(JSON.stringify({}))
    setSession(null)
    setDmSession(null)
    setDraft('')
    setDmDraft('')
    setDmMessages([])
    setTreeholeDraft('')
    setTreeholeCanInteract(false)
    setTreeholeCanPost(false)
    setTreeholePosts([])
    setTreeholeStatus('idle')
    setActiveTab('chat')
    setPeerCount(0)
    setRpc(null)
    workletRef.current = null
    setNotice('Left home.')
  }

  function sendMessage() {
    if (!session || !draft.trim()) {
      return
    }

    const message = {
      id: createMessageId(),
      text: draft,
      at: Date.now()
    }

    setSession(appendLocalMessage(session, message.text, message))
    rpc?.request(RPC_SEND).send(JSON.stringify(message))
    setDraft('')
  }

  function sendMessageRequest() {
    if (!dmSession || !dmDraft.trim() || !dmRecipient.trim()) {
      return
    }

    const message = {
      createdAt: Date.now(),
      fromProfileId: profileId,
      requestId: createMessageId(),
      toProfileId: dmRecipient.trim(),
      text: dmDraft,
      type: 'kepos.message.request.v1'
    }
    const thread = dmThreads.find(
      (entry) =>
        entry.remoteProfileId === message.toProfileId &&
        entry.state === 'accepted' &&
        entry.revokedAt === undefined
    )

    if (thread) {
      rpc?.request(RPC_DM_BODY_SEND).send(
        JSON.stringify({
          createdAt: message.createdAt,
          messageId: message.requestId,
          text: message.text,
          threadId: thread.threadId
        })
      )
      setDmDraft('')
      return
    }

    const nextSession = appendLocalMessageRequest(dmSession, message)

    setDmSession(nextSession)
    setDmMessages(nextSession.messages)
    saveMobileDmSessionMessages(nextSession.messages).catch((error) => {
      console.error('DM session storage unavailable', error)
      setLastError(error.message)
      setNotice('Could not save this message request.')
    })
    rpc?.request(RPC_DM_SEND).send(
      JSON.stringify({
        at: message.createdAt,
        id: message.requestId,
        text: message.text,
        toProfileId: message.toProfileId
      })
    )
    setDmDraft('')
  }

  function sendTreeholePost() {
    if (!session || !treeholeDraft.trim()) {
      return
    }

    rpc?.request(RPC_TREEHOLE_POST).send(
      JSON.stringify({
        id: createMessageId(),
        text: treeholeDraft,
        createdAt: Date.now()
      })
    )
    setTreeholeDraft('')
  }

  function sendTreeholeComment({ postId, text }) {
    if (!session || !treeholeCanInteract || !text.trim()) {
      return
    }

    rpc?.request(RPC_TREEHOLE_COMMENT).send(
      JSON.stringify({
        createdAt: Date.now(),
        id: createMessageId(),
        postId,
        text
      })
    )
  }

  function sendTreeholeLike(postId) {
    if (!session || !treeholeCanInteract) {
      return
    }

    rpc?.request(RPC_TREEHOLE_LIKE).send(
      JSON.stringify({
        createdAt: Date.now(),
        postId
      })
    )
  }

  function startBackend(nextSession) {
    try {
      const worklet = new Worklet()
      worklet.start('/app.bundle', bundle, [])
      workletRef.current = worklet

      const nextRpc = new RPC(worklet.IPC, (req) => {
        const payload = readRpcPayload(req)

        if (req.command === RPC_MESSAGE) {
          setSession((current) => (current ? appendRemoteMessage(current, payload) : current))
          return
        }

        if (req.command === RPC_DM_MESSAGE) {
          persistIncomingMessageRequest(payload).catch((error) => {
            console.error('Message request unavailable', error)
            setLastError(error.message)
            setNotice('Could not save this message request.')
          })
          setDmSession((current) => {
            if (!current) {
              return current
            }

            const next = appendRemoteMessageRequest(current, payload)
            setDmMessages(next.messages)
            saveMobileDmSessionMessages(next.messages).catch((error) => {
              console.error('DM session storage unavailable', error)
              setLastError(error.message)
              setNotice('Could not save this message request.')
            })
            return next
          })
          return
        }

        if (req.command === RPC_DM_BODY_MESSAGE) {
          setDmSession((current) => {
            if (!current) {
              return current
            }

            const next =
              payload.direction === 'out'
                ? appendLocalSignedDirectMessage(current, payload, {
                    remoteProfileId: payload.remoteProfileId
                  })
                : appendRemoteSignedDirectMessage(current, payload)
            setDmMessages(next.messages)
            saveMobileDmSessionMessages(next.messages).catch((error) => {
              console.error('DM session storage unavailable', error)
              setLastError(error.message)
              setNotice('Could not save this direct message.')
            })
            return next
          })
          return
        }

        if (req.command === RPC_DM_THREAD) {
          saveMobileDmThread(payload).catch((error) => {
            console.error('DM thread unavailable', error)
            setLastError(error.message)
            setNotice('Could not save this direct message.')
          })
          return
        }

        if (req.command === RPC_PEER_COUNT) {
          setPeerCount(payload.count || 0)
          return
        }

        if (req.command === RPC_STATUS) {
          setNotice(getMobileBackendNotice(payload.status))
          return
        }

        if (req.command === RPC_TREEHOLE_STATUS) {
          setTreeholeStatus(payload.status || 'idle')
          if (Object.hasOwn(payload, 'canInteract')) {
            setTreeholeCanInteract(Boolean(payload.canInteract))
          }
          if (Object.hasOwn(payload, 'canPost')) {
            setTreeholeCanPost(Boolean(payload.canPost))
          }
          return
        }

        if (req.command === RPC_TREEHOLE_STATE) {
          setTreeholePosts(payload.posts || [])
          return
        }

        if (req.command === RPC_ERROR) {
          console.error('Home connection error', payload)
          setLastError(payload.message || 'Home connection error')
          setNotice('Home connection error.')
        }
      })

      nextRpc.request(RPC_JOIN).send(JSON.stringify(nextSession))
      setRpc(nextRpc)
      setNotice('Starting home...')
    } catch (error) {
      console.error('Could not connect home', error)
      setLastError(error.message)
      setNotice('Could not connect this home.')
    }
  }

  async function persistIncomingMessageRequest(request) {
    if (!contactBook || request.toProfileId !== profileId) {
      return
    }

    const nextBook = recordMessageRequest(contactBook, {
      alias: shortenProfileId(request.fromProfileId),
      profileId: request.fromProfileId,
      requestedAt: request.createdAt,
      requestId: request.requestId,
      senderEncryptionPublicKey: request.senderEncryptionPublicKey,
      source: 'home_room',
      text: request.text
    })

    await saveContactBookToFileSystem({
      baseUri: getRequiredMobileDocumentDirectory(FileSystem),
      book: nextBook,
      fileSystem: FileSystem
    })
    setContactBook(nextBook)
  }

  async function acceptIncomingMessageRequest(request) {
    if (!contactBook || !identity || !rpc) {
      return
    }

    const acceptedAt = Date.now()
    const threadId = createMessageId()
    const nextBook = acceptMessageRequest(contactBook, {
      acceptedAt,
      alias: shortenProfileId(request.fromProfileId),
      profileId: request.fromProfileId
    })

    await saveContactBookToFileSystem({
      baseUri: getRequiredMobileDocumentDirectory(FileSystem),
      book: nextBook,
      fileSystem: FileSystem
    })
    setContactBook(nextBook)
    setTreeholePolicy(createTreeholePolicyFromContactBook(nextBook))
    rpc.request(RPC_DM_ACCEPT).send(
      JSON.stringify({
        acceptedAt,
        request,
        threadId
      })
    )
    setNotice('Message request accepted.')
  }

  async function ignoreIncomingMessageRequest(request) {
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
      saveMobileDmSessionMessages(nextSession.messages).catch((error) => {
        console.error('DM session storage unavailable', error)
        setLastError(error.message)
        setNotice('Could not save this message request.')
      })
      return nextSession
    })
    setNotice('Message request ignored.')
  }

  async function restoreMobileDirectMessageSession() {
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

  async function saveMobileDmSessionMessages(messages) {
    if (!profileId) return

    await saveDmSessionMessagesToFileSystem({
      baseUri: getRequiredMobileDocumentDirectory(FileSystem),
      fileSystem: FileSystem,
      messages,
      ownerProfileId: profileId
    })
  }

  async function saveMobileDmThread(thread) {
    const baseUri = getRequiredMobileDocumentDirectory(FileSystem)
    const threads = await loadDmThreadsFromFileSystem({
      baseUri,
      fileSystem: FileSystem
    })
    const nextThreads = [
      ...threads.filter((existing) => existing.threadId !== thread.threadId),
      thread
    ]

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
            />
          ) : (
            <>
              <Header
                notice={notice}
                statusLabel={homeStatusLabel}
                treeholeStatusLabel={treeholeStatusLabel}
                title={session ? 'Home' : 'Kepos'}
              />
              {session ? (
                <ChatRoom
                  draft={draft}
                  dmDraft={dmDraft}
                  dmContactOptions={dmContactOptions}
                  dmMessages={dmMessages}
                  dmRecipient={dmRecipient}
                  activeTab={activeTab}
                  homeQrUri={homeQrUri}
                  myHomeQrUri={myHomeQrUri}
                  onAcceptRequest={acceptIncomingMessageRequest}
                  onDraftChange={setDraft}
                  onDmDraftChange={setDmDraft}
                  onDmRecipientChange={setDmRecipient}
                  onHomeQrChange={setHomeQrUri}
                  onIgnoreRequest={ignoreIncomingMessageRequest}
                  onJoinHomeQr={joinHomeQr}
                  onLeave={leaveRoom}
                  onRevokeContact={revokeTrustedContact}
                  onScanHomeQr={() => startQrScan('home')}
                  onScanProfileQr={() => startQrScan('profile')}
                  onSend={sendMessage}
                  onSendDm={sendMessageRequest}
                  onTabChange={setActiveTab}
                  onTrustAliasChange={setTrustAlias}
                  onTrustProfile={trustProfileQr}
                  onTrustQrChange={setTrustQrUri}
                  onTreeholeDraftChange={setTreeholeDraft}
                  onTreeholeComment={sendTreeholeComment}
                  onTreeholeLike={sendTreeholeLike}
                  onTreeholePost={sendTreeholePost}
                  pendingRequests={pendingMessageRequests}
                  profileId={profileId}
                  profileReady={profileReady}
                  profileQrUri={profileQrUri}
                  lastError={lastError}
                  session={session}
                  treeholeCanInteract={treeholeCanInteract}
                  treeholeCanPost={treeholeCanPost}
                  treeholeDraft={treeholeDraft}
                  treeholePosts={treeholePosts}
                  treeholeStatus={treeholeStatus}
                  trustAlias={trustAlias}
                  trustQrUri={trustQrUri}
                />
              ) : (
                <Lobby
                  canJoin={profileReady && canJoin}
                  homeQrUri={homeQrUri}
                  myHomeQrUri={myHomeQrUri}
                  nick={nick}
                  onCreateRoom={createRoom}
                  onHomeQrChange={setHomeQrUri}
                  onJoinRoom={joinRoom}
                  onJoinHomeQr={joinHomeQr}
                  onNickChange={setNick}
                  onRoomKeyChange={setRoomKey}
                  onScanHomeQr={() => startQrScan('home')}
                  onScanProfileQr={() => startQrScan('profile')}
                  onToggleAdvancedJoin={() => setShowAdvancedJoin((value) => !value)}
                  onRevokeContact={revokeTrustedContact}
                  onTrustAliasChange={setTrustAlias}
                  onTrustProfile={trustProfileQr}
                  onTrustQrChange={setTrustQrUri}
                  profileReady={profileReady}
                  profileQrUri={profileQrUri}
                  roomKey={roomKey}
                  showAdvancedJoin={showAdvancedJoin}
                  trustAlias={trustAlias}
                  trustQrUri={trustQrUri}
                  trustedContacts={dmContactOptions}
                />
              )}
            </>
          )}
        </KeyboardAvoidingView>
      </View>
    </MobileThemeContext.Provider>
  )
}

function Header({ title, notice, statusLabel, treeholeStatusLabel }) {
  const { styles, theme } = useMobileTheme()

  return (
    <View style={styles.header}>
      <View style={styles.brandRow}>
        <View style={styles.mark}>
          <Sprout color={theme.accentStrong} size={22} strokeWidth={2.4} />
        </View>
        <View>
          <Text style={styles.kicker}>private garden</Text>
          <Text style={styles.title} testID={title === 'Home' ? 'home-title' : 'lobby-title'}>
            {title}
          </Text>
        </View>
      </View>
      <View style={styles.mobileStatusStrip}>
        <View style={styles.homeStatusPill}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>{statusLabel}</Text>
        </View>
        <View style={styles.treeholeStatusPill}>
          <Text style={styles.treeholeStatusText}>{treeholeStatusLabel}</Text>
        </View>
      </View>
      <Text style={styles.notice} testID='app-notice'>
        {notice}
      </Text>
    </View>
  )
}

function QrCard({ value }) {
  const { styles, theme } = useMobileTheme()

  if (!value) {
    return null
  }

  return (
    <View style={styles.qrCard}>
      <QRCode backgroundColor={theme.raised} ecl='M' quietZone={8} size={154} value={value} />
    </View>
  )
}

function QrScanner({ onCancel, onScanned, permissionDenied }) {
  const { styles, theme } = useMobileTheme()

  return (
    <View style={styles.scannerOverlay} testID='qr-scanner-overlay'>
      {permissionDenied ? (
        <View style={styles.scannerPermission} testID='qr-scanner-permission'>
          <QrCode color={theme.accentStrong} size={42} />
          <Text style={styles.scannerPermissionTitle}>Camera access is off.</Text>
          <Text style={styles.scannerPermissionCopy}>
            Enable camera permission to scan QR codes.
          </Text>
        </View>
      ) : (
        <CameraView
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={onScanned}
          style={styles.scannerCamera}
          testID='qr-scanner-camera'
        />
      )}
      <View style={styles.scannerControls}>
        <Pressable onPress={onCancel} style={styles.scannerCancel} testID='qr-scanner-cancel'>
          <Text style={styles.scannerCancelText}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  )
}

function Lobby({
  canJoin,
  homeQrUri,
  myHomeQrUri,
  nick,
  onCreateRoom,
  onHomeQrChange,
  onJoinRoom,
  onJoinHomeQr,
  onNickChange,
  onRoomKeyChange,
  onRevokeContact,
  onScanHomeQr,
  onScanProfileQr,
  onToggleAdvancedJoin,
  onTrustAliasChange,
  onTrustProfile,
  onTrustQrChange,
  profileReady,
  profileQrUri,
  roomKey,
  showAdvancedJoin,
  trustAlias,
  trustQrUri,
  trustedContacts
}) {
  const { styles, theme } = useMobileTheme()
  const [showPeopleSetup, setShowPeopleSetup] = useState(false)

  return (
    <ScrollView
      contentContainerStyle={styles.lobby}
      keyboardShouldPersistTaps='handled'
      style={styles.lobbyScroll}
      testID='lobby-scroll'
    >
      <QuickStartPanel
        myHomeQrUri={myHomeQrUri}
        nick={nick}
        onCreateRoom={onCreateRoom}
        onNickChange={onNickChange}
        onScanHomeQr={onScanHomeQr}
        onScanProfileQr={onScanProfileQr}
        profileReady={profileReady}
      />

      <Pressable
        onPress={() => setShowPeopleSetup((value) => !value)}
        style={styles.secondaryButton}
        testID='people-setup-toggle'
      >
        <Users color={theme.accentStrong} size={18} />
        <Text style={styles.secondaryButtonText}>People setup</Text>
      </Pressable>
      {showPeopleSetup ? (
        <PeopleActions
          canJoinHome={true}
          homeQrUri={homeQrUri}
          myHomeQrUri={myHomeQrUri}
          onHomeQrChange={onHomeQrChange}
          onJoinHomeQr={onJoinHomeQr}
          onRevokeContact={onRevokeContact}
          onScanHomeQr={onScanHomeQr}
          onScanProfileQr={onScanProfileQr}
          onTrustAliasChange={onTrustAliasChange}
          onTrustProfile={onTrustProfile}
          onTrustQrChange={onTrustQrChange}
          profileReady={profileReady}
          profileQrUri={profileQrUri}
          trustAlias={trustAlias}
          trustedContacts={trustedContacts}
          trustQrUri={trustQrUri}
        />
      ) : null}

      <Pressable
        onPress={onToggleAdvancedJoin}
        style={styles.secondaryButton}
        testID='advanced-join-toggle'
      >
        <Settings color={theme.accentStrong} size={18} />
        <Text style={styles.secondaryButtonText}>Advanced</Text>
      </Pressable>
      {showAdvancedJoin ? (
        <View style={styles.panel}>
          <TaskHeader
            description='Use only when QR joining is unavailable.'
            eyebrow='Advanced'
            title='Manual home key'
          />
          <TextInput
            autoCapitalize='none'
            autoCorrect={false}
            multiline
            onChangeText={onRoomKeyChange}
            placeholder='64-character manual key'
            placeholderTextColor={theme.placeholder}
            style={styles.keyInput}
            testID='manual-home-key-input'
            value={roomKey}
          />
          <Pressable
            disabled={!canJoin}
            onPress={onJoinRoom}
            style={[styles.secondaryButton, !canJoin && styles.disabledButton]}
            testID='manual-home-join-button'
          >
            <ArrowRight color={canJoin ? theme.accentStrong : theme.placeholder} size={18} />
            <Text style={[styles.secondaryButtonText, !canJoin && styles.disabledButtonText]}>
              Join home
            </Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  )
}

function ChatRoom({
  activeTab,
  draft,
  dmDraft,
  dmContactOptions,
  dmMessages,
  dmRecipient,
  homeQrUri,
  myHomeQrUri,
  onAcceptRequest,
  onDraftChange,
  onDmDraftChange,
  onDmRecipientChange,
  onHomeQrChange,
  onIgnoreRequest,
  onJoinHomeQr,
  onLeave,
  onRevokeContact,
  onScanHomeQr,
  onScanProfileQr,
  onSend,
  onSendDm,
  onTabChange,
  onTrustAliasChange,
  onTrustProfile,
  onTrustQrChange,
  onTreeholeComment,
  onTreeholeDraftChange,
  onTreeholeLike,
  onTreeholePost,
  pendingRequests,
  profileId,
  profileReady,
  profileQrUri,
  lastError,
  session,
  treeholeCanInteract,
  treeholeCanPost,
  treeholeDraft,
  treeholePosts,
  treeholeStatus,
  trustAlias,
  trustQrUri
}) {
  const { styles, theme } = useMobileTheme()
  const [showRoomAdvanced, setShowRoomAdvanced] = useState(false)
  const roomShort = useMemo(
    () => `${session.roomKey.slice(0, 8)}...${session.roomKey.slice(-8)}`,
    [session.roomKey]
  )
  const roomSurface = getMobileRoomSurface(activeTab)
  const tabBadges = {
    direct: dmMessages.filter(
      (message) => message.type === 'kepos.message.request.v1' && message.direction === 'in'
    ).length,
    people: pendingRequests.length
  }

  return (
    <View style={styles.chat}>
      <View style={styles.roomBar}>
        <View style={styles.sessionStrip}>
          <View style={styles.sessionBadge}>
            <Text style={styles.sessionBadgeText}>Current space</Text>
          </View>
          <Text style={styles.roomName}>{roomSurface}</Text>
        </View>
        <View style={styles.roomActions}>
          <Pressable
            onPress={() => setShowRoomAdvanced((value) => !value)}
            style={styles.roomAdvancedButton}
          >
            <Settings color={theme.inkSoft} size={15} />
            <Text style={styles.advancedSummary}>Advanced</Text>
          </Pressable>
          <Pressable accessibilityLabel='Leave home' style={styles.iconButton} onPress={onLeave}>
            <LogOut color={theme.accentStrong} size={18} />
          </Pressable>
        </View>
      </View>
      {showRoomAdvanced ? (
        <View style={styles.roomAdvancedPanel}>
          <Text style={styles.roomLabel}>Home key</Text>
          <Text style={styles.roomKey} testID='room-home-address'>
            {roomShort}
          </Text>
          <Text style={styles.roomLabel}>Error detail</Text>
          <Text style={styles.roomKey} testID='room-error-detail'>
            {lastError || 'none'}
          </Text>
        </View>
      ) : null}

      <View style={styles.roomContent}>
        {activeTab === 'chat' ? (
          <ChatPane
            draft={draft}
            messages={session.messages}
            onDraftChange={onDraftChange}
            onSend={onSend}
          />
        ) : activeTab === 'dm' ? (
          <DirectPane
            draft={dmDraft}
            contactOptions={dmContactOptions}
            messages={dmMessages}
            onAcceptRequest={onAcceptRequest}
            onDraftChange={onDmDraftChange}
            onIgnoreRequest={onIgnoreRequest}
            onOpenPeople={() => onTabChange('people')}
            onRecipientChange={onDmRecipientChange}
            onSend={onSendDm}
            recipient={dmRecipient}
          />
        ) : activeTab === 'treehole' ? (
          <TreeholePane
            draft={treeholeDraft}
            onDraftChange={onTreeholeDraftChange}
            onComment={onTreeholeComment}
            onLike={onTreeholeLike}
            onPost={onTreeholePost}
            posts={treeholePosts}
            canInteract={treeholeCanInteract}
            canPost={treeholeCanPost}
            status={treeholeStatus}
          />
        ) : (
          <PeoplePane
            homeQrUri={homeQrUri}
            myHomeQrUri={myHomeQrUri}
            onAcceptRequest={onAcceptRequest}
            onHomeQrChange={onHomeQrChange}
            onIgnoreRequest={onIgnoreRequest}
            onJoinHomeQr={onJoinHomeQr}
            onRevokeContact={onRevokeContact}
            onScanHomeQr={onScanHomeQr}
            onScanProfileQr={onScanProfileQr}
            onTrustAliasChange={onTrustAliasChange}
            onTrustProfile={onTrustProfile}
            onTrustQrChange={onTrustQrChange}
            pendingRequests={pendingRequests}
            profileId={profileId}
            profileReady={profileReady}
            profileQrUri={profileQrUri}
            trustAlias={trustAlias}
            trustedContacts={dmContactOptions}
            trustQrUri={trustQrUri}
          />
        )}
      </View>

      <View style={styles.tabs}>
        <TabButton
          active={activeTab === 'chat'}
          icon={MessageCircle}
          label='Home'
          onPress={() => onTabChange('chat')}
          testID='chat-tab'
        />
        <TabButton
          active={activeTab === 'dm'}
          badgeCount={tabBadges.direct}
          icon={Send}
          label='Direct'
          onPress={() => onTabChange('dm')}
          testID='dm-tab'
        />
        <TabButton
          active={activeTab === 'treehole'}
          icon={Sprout}
          label='Treehole'
          onPress={() => onTabChange('treehole')}
          testID='treehole-tab'
        />
        <TabButton
          active={activeTab === 'people'}
          badgeCount={tabBadges.people}
          icon={Users}
          label='People'
          onPress={() => onTabChange('people')}
          testID='people-tab'
        />
      </View>
    </View>
  )
}

function TaskHeader({ eyebrow, title, description }) {
  const { styles } = useMobileTheme()

  return (
    <View style={styles.taskHeader}>
      <Text style={styles.taskEyebrow}>{eyebrow}</Text>
      <Text style={styles.taskTitle}>{title}</Text>
      {description ? <Text style={styles.taskDescription}>{description}</Text> : null}
    </View>
  )
}

function QuickStartPanel({
  myHomeQrUri,
  nick,
  onCreateRoom,
  onNickChange,
  onScanHomeQr,
  onScanProfileQr,
  profileReady
}) {
  const { styles, theme } = useMobileTheme()
  const [showQuickHomeQr, setShowQuickHomeQr] = useState(false)

  return (
    <View style={styles.quickStartPanel}>
      <TaskHeader
        description={
          profileReady
            ? 'Start a private space for trusted friends. Create, join, or trust someone nearby.'
            : 'Setting up your profile...'
        }
        eyebrow='Start'
        title='Start here'
      />
      <Field label='Name' onChangeText={onNickChange} value={nick} />
      <View style={styles.quickActions}>
        <Pressable
          disabled={!profileReady}
          style={[styles.primaryButton, !profileReady && styles.disabledButton]}
          onPress={onCreateRoom}
          testID='create-home-button'
        >
          <Plus color={theme.surface} size={18} />
          <Text style={styles.primaryButtonText}>Create my home</Text>
        </Pressable>
        <Pressable
          disabled={!profileReady}
          onPress={() => setShowQuickHomeQr((value) => !value)}
          style={[styles.secondaryButton, !profileReady && styles.disabledButton]}
          testID='quick-show-home-qr-button'
        >
          <QrCode color={profileReady ? theme.accentStrong : theme.placeholder} size={18} />
          <Text style={[styles.secondaryButtonText, !profileReady && styles.disabledButtonText]}>
            Invite a friend
          </Text>
        </Pressable>
        {showQuickHomeQr ? <QrCard value={myHomeQrUri} /> : null}
        <Pressable
          disabled={!profileReady}
          onPress={onScanHomeQr}
          style={[styles.secondaryButton, !profileReady && styles.disabledButton]}
          testID='quick-scan-home-qr-button'
        >
          <ArrowRight color={profileReady ? theme.accentStrong : theme.placeholder} size={18} />
          <Text style={[styles.secondaryButtonText, !profileReady && styles.disabledButtonText]}>
            Join a home
          </Text>
        </Pressable>
        <Pressable
          disabled={!profileReady}
          onPress={onScanProfileQr}
          style={[styles.secondaryButton, !profileReady && styles.disabledButton]}
          testID='quick-scan-profile-qr-button'
        >
          <Plus color={profileReady ? theme.accentStrong : theme.placeholder} size={18} />
          <Text style={[styles.secondaryButtonText, !profileReady && styles.disabledButtonText]}>
            Trust a friend
          </Text>
        </Pressable>
      </View>
    </View>
  )
}

function PeoplePane({
  homeQrUri,
  myHomeQrUri,
  onAcceptRequest,
  onHomeQrChange,
  onIgnoreRequest,
  onJoinHomeQr,
  onRevokeContact,
  onScanHomeQr,
  onScanProfileQr,
  onTrustAliasChange,
  onTrustProfile,
  onTrustQrChange,
  pendingRequests,
  profileId,
  profileReady,
  profileQrUri,
  trustAlias,
  trustedContacts,
  trustQrUri
}) {
  const { styles } = useMobileTheme()

  return (
    <ScrollView contentContainerStyle={styles.peoplePane} keyboardShouldPersistTaps='handled'>
      <MessageRequestManager
        onAcceptRequest={onAcceptRequest}
        onIgnoreRequest={onIgnoreRequest}
        pendingRequests={pendingRequests}
        profileId={profileId}
      />
      <PeopleActions
        canJoinHome={false}
        homeQrUri={homeQrUri}
        myHomeQrUri={myHomeQrUri}
        onHomeQrChange={onHomeQrChange}
        onJoinHomeQr={onJoinHomeQr}
        onRevokeContact={onRevokeContact}
        onScanHomeQr={onScanHomeQr}
        onScanProfileQr={onScanProfileQr}
        onTrustAliasChange={onTrustAliasChange}
        onTrustProfile={onTrustProfile}
        onTrustQrChange={onTrustQrChange}
        profileReady={profileReady}
        profileQrUri={profileQrUri}
        trustAlias={trustAlias}
        trustedContacts={trustedContacts}
        trustQrUri={trustQrUri}
      />
    </ScrollView>
  )
}

function MessageRequestManager({ onAcceptRequest, onIgnoreRequest, pendingRequests, profileId }) {
  const { styles } = useMobileTheme()

  return (
    <View style={styles.panel}>
      <TaskHeader
        description='Accept only the people you want to talk with privately.'
        eyebrow='Requests'
        title='Message requests'
      />
      {!pendingRequests?.length ? (
        <PanelEmptyState
          copy='New requests from friends will appear here.'
          icon={MessageCircle}
          title='No message requests'
        />
      ) : null}
      {(pendingRequests || []).map((request) => {
        const canAccept = Boolean(
          profileId && request.requestId && request.senderEncryptionPublicKey
        )

        return (
          <View key={request.profileId} style={styles.requestCard}>
            <View style={styles.requestText}>
              <Text style={styles.requestTitle}>{formatMessageRequestTitle(request)}</Text>
              <Text style={styles.contactProfile}>
                {request.alias || shortenProfileId(request.profileId)}
              </Text>
              <Text style={styles.requestPreview}>{formatRequestPreview(request.text)}</Text>
            </View>
            <View style={styles.requestActions}>
              <Pressable
                onPress={() => onIgnoreRequest(request)}
                style={styles.requestIgnoreButton}
                testID='people-message-request-ignore-button'
              >
                <Text style={styles.requestIgnoreButtonText}>Ignore</Text>
              </Pressable>
              <Pressable
                disabled={!canAccept}
                onPress={() =>
                  onAcceptRequest({
                    createdAt: request.requestedAt,
                    fromProfileId: request.profileId,
                    requestId: request.requestId,
                    senderEncryptionPublicKey: request.senderEncryptionPublicKey,
                    text: request.text,
                    toProfileId: profileId,
                    type: 'kepos.message.request.v1'
                  })
                }
                style={[styles.requestButton, !canAccept && styles.disabledButton]}
                testID='people-message-request-accept-button'
              >
                <Text style={styles.requestButtonText}>Accept</Text>
              </Pressable>
            </View>
          </View>
        )
      })}
    </View>
  )
}

function PanelEmptyState({ copy, icon: Icon, title }) {
  const { styles, theme } = useMobileTheme()

  return (
    <View style={styles.panelEmpty}>
      <Icon color={theme.iconMuted} size={24} />
      <View style={styles.panelEmptyText}>
        <Text style={styles.panelEmptyTitle}>{title}</Text>
        <Text style={styles.panelEmptyCopy}>{copy}</Text>
      </View>
    </View>
  )
}

function PeopleActions({
  canJoinHome,
  homeQrUri,
  myHomeQrUri,
  onHomeQrChange,
  onJoinHomeQr,
  onRevokeContact,
  onScanHomeQr,
  onScanProfileQr,
  onTrustAliasChange,
  onTrustProfile,
  onTrustQrChange,
  profileReady,
  profileQrUri,
  trustAlias,
  trustedContacts,
  trustQrUri
}) {
  const { styles, theme } = useMobileTheme()
  const [showAdvancedShare, setShowAdvancedShare] = useState(false)
  const [showHomeQr, setShowHomeQr] = useState(false)
  const [showProfileQr, setShowProfileQr] = useState(false)
  const canUseHomeJoin = profileReady && canJoinHome

  return (
    <>
      <View style={styles.panel}>
        <TaskHeader
          description='Share your home with trusted friends nearby.'
          eyebrow='Invite'
          title='My Home QR'
        />
        <Pressable
          disabled={!profileReady}
          onPress={() => setShowHomeQr((value) => !value)}
          style={[styles.secondaryButton, !profileReady && styles.disabledButton]}
          testID='show-home-qr-button'
        >
          <QrCode color={profileReady ? theme.accentStrong : theme.placeholder} size={18} />
          <Text style={[styles.secondaryButtonText, !profileReady && styles.disabledButtonText]}>
            Show My Home QR
          </Text>
        </Pressable>
        {showHomeQr ? <QrCard value={myHomeQrUri} /> : null}
        <Pressable
          disabled={!canUseHomeJoin}
          onPress={onScanHomeQr}
          style={[styles.secondaryButton, !canUseHomeJoin && styles.disabledButton]}
          testID='scan-home-qr-button'
        >
          <ArrowRight color={canUseHomeJoin ? theme.accentStrong : theme.placeholder} size={18} />
          <Text style={[styles.secondaryButtonText, !canUseHomeJoin && styles.disabledButtonText]}>
            Scan Home QR
          </Text>
        </Pressable>
        {!canJoinHome ? (
          <Text style={styles.panelCopy}>Leave this home before joining another one.</Text>
        ) : null}
      </View>

      <View style={styles.panel}>
        <TaskHeader
          description='Trust a friend before private messages and home access.'
          eyebrow='Trust'
          title='My Profile QR'
        />
        <Pressable
          disabled={!profileReady}
          onPress={() => setShowProfileQr((value) => !value)}
          style={[styles.secondaryButton, !profileReady && styles.disabledButton]}
          testID='show-profile-qr-button'
        >
          <QrCode color={profileReady ? theme.accentStrong : theme.placeholder} size={18} />
          <Text style={[styles.secondaryButtonText, !profileReady && styles.disabledButtonText]}>
            Show My Profile QR
          </Text>
        </Pressable>
        {showProfileQr ? <QrCard value={profileQrUri} /> : null}
        <Pressable
          disabled={!profileReady}
          onPress={onScanProfileQr}
          style={[styles.secondaryButton, !profileReady && styles.disabledButton]}
          testID='scan-profile-qr-button'
        >
          <Plus color={profileReady ? theme.accentStrong : theme.placeholder} size={18} />
          <Text style={[styles.secondaryButtonText, !profileReady && styles.disabledButtonText]}>
            Scan Profile QR
          </Text>
        </Pressable>
      </View>

      <Pressable
        onPress={() => setShowAdvancedShare((value) => !value)}
        style={styles.secondaryButton}
        testID='advanced-share-toggle'
      >
        <Settings color={theme.accentStrong} size={18} />
        <Text style={styles.secondaryButtonText}>Advanced</Text>
      </Pressable>
      {showAdvancedShare ? (
        <View style={styles.panel}>
          <TaskHeader
            description='Paste or copy raw QR payloads for debug flows.'
            eyebrow='Advanced'
            title='QR details'
          />
          <Text style={styles.panelCopy}>Join a home</Text>
          <TextInput
            autoCapitalize='none'
            autoCorrect={false}
            multiline
            onChangeText={onHomeQrChange}
            placeholder='Paste Home QR'
            placeholderTextColor={theme.placeholder}
            style={styles.keyInput}
            testID='join-home-uri-input'
            value={homeQrUri}
          />
          <Pressable
            disabled={!canUseHomeJoin || !homeQrUri.trim()}
            onPress={onJoinHomeQr}
            style={[
              styles.secondaryButton,
              (!canUseHomeJoin || !homeQrUri.trim()) && styles.disabledButton
            ]}
            testID='join-home-uri-button'
          >
            <ArrowRight
              color={canUseHomeJoin && homeQrUri.trim() ? theme.accentStrong : theme.placeholder}
              size={18}
            />
            <Text
              style={[
                styles.secondaryButtonText,
                (!canUseHomeJoin || !homeQrUri.trim()) && styles.disabledButtonText
              ]}
            >
              Join a home
            </Text>
          </Pressable>
          <Text style={styles.panelCopy}>Friend profile</Text>
          <TextInput
            autoCapitalize='none'
            autoCorrect={false}
            multiline
            onChangeText={onTrustQrChange}
            placeholder='Paste Profile QR'
            placeholderTextColor={theme.placeholder}
            style={styles.keyInput}
            testID='trust-profile-uri-input'
            value={trustQrUri}
          />
          <Field
            label='Friend name'
            onChangeText={onTrustAliasChange}
            testID='trust-profile-alias-input'
            value={trustAlias}
          />
          <Pressable
            disabled={!profileReady || !trustQrUri.trim()}
            onPress={onTrustProfile}
            style={[
              styles.secondaryButton,
              (!profileReady || !trustQrUri.trim()) && styles.disabledButton
            ]}
            testID='trust-profile-button'
          >
            <Plus
              color={profileReady && trustQrUri.trim() ? theme.accentStrong : theme.placeholder}
              size={18}
            />
            <Text
              style={[
                styles.secondaryButtonText,
                (!profileReady || !trustQrUri.trim()) && styles.disabledButtonText
              ]}
            >
              Add trusted friend
            </Text>
          </Pressable>
          <TextInput
            autoCapitalize='none'
            autoCorrect={false}
            editable={false}
            multiline
            placeholder='Home QR details'
            placeholderTextColor={theme.placeholder}
            style={styles.keyInput}
            testID='home-address-uri'
            value={myHomeQrUri}
          />
          <TextInput
            autoCapitalize='none'
            autoCorrect={false}
            editable={false}
            multiline
            placeholder='Profile QR details'
            placeholderTextColor={theme.placeholder}
            style={styles.keyInput}
            testID='home-profile-uri'
            value={profileQrUri}
          />
        </View>
      ) : null}

      <ContactManager contacts={trustedContacts} onRevokeContact={onRevokeContact} />
    </>
  )
}

function DirectPane({
  contactOptions,
  draft,
  messages,
  onAcceptRequest,
  onDraftChange,
  onIgnoreRequest,
  onOpenPeople,
  onRecipientChange,
  onSend,
  recipient
}) {
  const { styles, theme } = useMobileTheme()
  const [showAdvancedDmRecipient, setShowAdvancedDmRecipient] = useState(false)

  return (
    <>
      <PaneLabel eyebrow='durable' title='Direct messages' />
      <FlatList
        contentContainerStyle={styles.messageList}
        data={messages}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<EmptyDirectMessages />}
        renderItem={({ item }) => (
          <DirectBubble
            message={item}
            onAcceptRequest={onAcceptRequest}
            onIgnoreRequest={onIgnoreRequest}
          />
        )}
      />

      <View style={styles.directComposer}>
        {contactOptions.length > 0 ? (
          <ScrollView
            horizontal
            contentContainerStyle={styles.contactScroller}
            showsHorizontalScrollIndicator={false}
          >
            {contactOptions.map((contact) => (
              <Pressable
                key={contact.profileId}
                onPress={() => onRecipientChange(contact.profileId)}
                style={[
                  styles.contactChip,
                  recipient === contact.profileId && styles.activeContactChip
                ]}
              >
                <Text
                  style={[
                    styles.contactChipText,
                    recipient === contact.profileId && styles.activeContactChipText
                  ]}
                >
                  {contact.alias}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.directEmptyContacts}>
            <PanelEmptyState
              copy='Trust a friend first, then come back here to write privately.'
              icon={Users}
              title='No trusted friends yet'
            />
            <Pressable
              onPress={onOpenPeople}
              style={styles.secondaryButton}
              testID='dm-open-people-button'
            >
              <Plus color={theme.accentStrong} size={18} />
              <Text style={styles.secondaryButtonText}>Trust a friend</Text>
            </Pressable>
          </View>
        )}
        <Pressable
          onPress={() => setShowAdvancedDmRecipient((value) => !value)}
          style={styles.directAdvancedToggle}
          testID='advanced-dm-recipient-toggle'
        >
          <Settings color={theme.inkSoft} size={15} />
          <Text style={styles.advancedSummary}>Advanced</Text>
        </Pressable>
        {showAdvancedDmRecipient ? (
          <TextInput
            autoCapitalize='none'
            autoCorrect={false}
            onChangeText={onRecipientChange}
            placeholder='Manual recipient profile id'
            placeholderTextColor={theme.placeholder}
            style={styles.recipientInput}
            testID='dm-recipient-input'
            value={recipient}
          />
        ) : null}
        <View style={styles.composer}>
          <TextInput
            onChangeText={onDraftChange}
            onSubmitEditing={onSend}
            placeholder='Write a direct message'
            placeholderTextColor={theme.placeholder}
            returnKeyType='send'
            style={styles.messageInput}
            testID='dm-message-input'
            value={draft}
          />
          <Pressable
            accessibilityLabel='Send direct message'
            disabled={!draft.trim() || !recipient.trim()}
            onPress={onSend}
            style={[
              styles.sendButton,
              (!draft.trim() || !recipient.trim()) && styles.disabledSendButton
            ]}
            testID='dm-send-button'
          >
            <Send color={theme.surface} size={18} />
          </Pressable>
        </View>
      </View>
    </>
  )
}

function ContactManager({ contacts, onRevokeContact }) {
  const { styles, theme } = useMobileTheme()

  return (
    <View style={styles.panel}>
      <TaskHeader
        description='Manage who can enter your home and send direct messages.'
        eyebrow='Trust'
        title='Trusted friends'
      />
      {!contacts?.length ? (
        <PanelEmptyState
          copy='Trust a friend to unlock home access and direct messages.'
          icon={Users}
          title='No trusted friends yet'
        />
      ) : null}
      {(contacts || []).map((contact) => (
        <View key={contact.profileId} style={styles.contactRow}>
          <View style={styles.contactRowText}>
            <Text style={styles.contactName}>{contact.alias}</Text>
            <Text style={styles.contactProfile}>{shortenProfileId(contact.profileId)}</Text>
            <View style={styles.trustMeta}>
              <Text style={styles.trustStatus}>Trusted</Text>
              <Text style={styles.trustMetaText}>
                From {formatMobileTrustSource(contact.source)}
              </Text>
              <Text style={styles.trustMetaText}>
                Trusted {formatMobileTrustTime(contact.trustedAt)}
              </Text>
            </View>
          </View>
          <Pressable
            accessibilityLabel={`Revoke ${contact.alias}`}
            onPress={() => onRevokeContact(contact.profileId)}
            style={styles.revokeButton}
          >
            <UserMinus color={theme.danger} size={18} />
            <Text style={styles.revokeButtonText}>Revoke</Text>
          </Pressable>
        </View>
      ))}
    </View>
  )
}

function TabButton({ active, badgeCount = 0, icon: Icon, label, onPress, testID }) {
  const { styles, theme } = useMobileTheme()

  return (
    <Pressable
      accessibilityLabel={getTabButtonLabel(label, badgeCount)}
      accessibilityRole='tab'
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.tabButton, active && styles.activeTabButton]}
      testID={testID}
    >
      <Icon color={active ? theme.surface : theme.iconMuted} size={17} style={styles.tabIcon} />
      <Text style={[styles.tabText, active && styles.activeTabText]}>{label}</Text>
      {badgeCount > 0 ? (
        <View style={styles.tabBadge} accessibilityLabel={`${label} pending ${badgeCount}`}>
          <Text style={styles.tabBadgeText}>{badgeCount > 99 ? '99+' : badgeCount}</Text>
        </View>
      ) : null}
    </Pressable>
  )
}

function getTabButtonLabel(label, badgeCount) {
  if (badgeCount > 0) {
    return `${label}, ${badgeCount} pending`
  }

  return label
}

function ChatPane({ draft, messages, onDraftChange, onSend }) {
  const { styles, theme } = useMobileTheme()

  return (
    <>
      <PaneLabel eyebrow='live' title='Live home chat' />
      <FlatList
        contentContainerStyle={styles.messageList}
        data={messages}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<EmptyMessages />}
        renderItem={({ item }) => <MessageBubble message={item} />}
      />

      <View style={styles.composer}>
        <TextInput
          onChangeText={onDraftChange}
          onSubmitEditing={onSend}
          placeholder='Write to the home'
          placeholderTextColor={theme.placeholder}
          returnKeyType='send'
          style={styles.messageInput}
          testID='chat-message-input'
          value={draft}
        />
        <Pressable
          accessibilityLabel='Send home message'
          disabled={!draft.trim()}
          onPress={onSend}
          style={[styles.sendButton, !draft.trim() && styles.disabledSendButton]}
          testID='chat-send-button'
        >
          <Send color={theme.surface} size={18} />
        </Pressable>
      </View>
    </>
  )
}

function TreeholePane({
  canInteract,
  canPost,
  draft,
  onComment,
  onDraftChange,
  onLike,
  onPost,
  posts,
  status
}) {
  const { styles, theme } = useMobileTheme()
  const canSubmitPost = canPost && draft.trim()
  const showOwnerOnlyHint = status === 'ready' && !canPost

  return (
    <>
      <PaneLabel eyebrow='durable' title='Durable treehole' />
      <FlatList
        contentContainerStyle={styles.treeholeList}
        data={posts}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<EmptyTreehole status={status} />}
        renderItem={({ item }) => (
          <TreeholePost
            canInteract={canInteract}
            onComment={onComment}
            onLike={onLike}
            post={item}
          />
        )}
      />

      <View style={styles.treeholeComposer}>
        <View style={styles.treeholeComposerFields}>
          <TextInput
            editable={canPost}
            multiline
            onChangeText={onDraftChange}
            placeholder='Post to the treehole'
            placeholderTextColor={theme.placeholder}
            style={[styles.treeholeInput, !canPost && styles.disabledTreeholeInput]}
            testID='treehole-post-input'
            value={draft}
          />
          {showOwnerOnlyHint ? (
            <Text style={styles.composerHint}>Only the owner can post here.</Text>
          ) : null}
        </View>
        <Pressable
          accessibilityLabel='Post to treehole'
          disabled={!canSubmitPost}
          onPress={onPost}
          style={[styles.sendButton, !canSubmitPost && styles.disabledSendButton]}
          testID='treehole-post-button'
        >
          <Send color={theme.surface} size={18} />
        </Pressable>
      </View>
    </>
  )
}

function EmptyState({ copy, icon: Icon, title }) {
  const { styles, theme } = useMobileTheme()

  return (
    <View style={styles.empty}>
      <Icon color={theme.iconMuted} size={34} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyCopy}>{copy}</Text>
    </View>
  )
}

function EmptyTreehole({ status }) {
  return <EmptyState copy={treeholeStatusText(status)} icon={Sprout} title='No posts yet' />
}

function PaneLabel({ eyebrow, title }) {
  const { styles } = useMobileTheme()

  return (
    <View style={styles.paneLabel}>
      <Text style={styles.paneEyebrow}>{eyebrow}</Text>
      <Text style={styles.paneTitle}>{title}</Text>
    </View>
  )
}

function TreeholePost({ canInteract, onComment, onLike, post }) {
  const { styles, theme } = useMobileTheme()
  const [commentDraft, setCommentDraft] = useState('')
  const canSubmitComment = canInteract && commentDraft.trim()

  function submitComment() {
    if (!canSubmitComment) {
      return
    }

    onComment({ postId: post.id, text: commentDraft })
    setCommentDraft('')
  }

  return (
    <View style={styles.post}>
      <View style={styles.postHeader}>
        <Text style={styles.postAuthor}>{displayPostAuthor(post)}</Text>
        <Text style={styles.postTime}>{formatPostTime(post.createdAt)}</Text>
      </View>
      <Text style={styles.postText}>{post.text}</Text>
      <View style={styles.commentList}>
        {(post.comments || []).map((comment) => (
          <View key={comment.id} style={styles.comment}>
            <Text style={styles.commentAuthor}>{displayPostAuthor(comment)}</Text>
            <Text style={styles.commentText}>{comment.text}</Text>
          </View>
        ))}
      </View>
      <View style={styles.postStats}>
        <View style={styles.postStat}>
          <MessageCircle color={theme.inkSoft} size={14} />
          <Text style={styles.postStatText}>{post.commentCount}</Text>
        </View>
        <View style={styles.postStat}>
          <Heart color={theme.inkSoft} size={14} />
          <Text style={styles.postStatText}>{post.likeCount}</Text>
        </View>
      </View>
      <View style={styles.postActions}>
        <Pressable
          disabled={!canInteract}
          onPress={() => onLike(post.id)}
          style={[styles.smallActionButton, !canInteract && styles.disabledSmallActionButton]}
        >
          <Heart color={theme.accentStrong} size={15} />
          <Text style={styles.smallActionText}>Like</Text>
        </Pressable>
        {!canInteract ? (
          <Text style={styles.composerHint}>Only trusted friends can comment or like here.</Text>
        ) : null}
        <View style={styles.commentComposer}>
          <TextInput
            editable={canInteract}
            onChangeText={setCommentDraft}
            onSubmitEditing={submitComment}
            placeholder='Write a comment'
            placeholderTextColor={theme.placeholder}
            style={[styles.commentInput, !canInteract && styles.disabledTreeholeInput]}
            value={commentDraft}
          />
          <Pressable
            accessibilityLabel='Send treehole comment'
            disabled={!canSubmitComment}
            onPress={submitComment}
            style={[styles.smallSendButton, !canSubmitComment && styles.disabledSendButton]}
          >
            <Send color={theme.surface} size={15} />
          </Pressable>
        </View>
      </View>
    </View>
  )
}

function displayPostAuthor(post) {
  return post.authorDisplayName || post.author || shortenProfileId(post.authorProfileId) || 'anon'
}

function displayDirectPeer(profileId, displayName = '') {
  return displayName?.trim() || `Profile ${shortenProfileId(profileId)}`
}

function shortenProfileId(value) {
  return value ? `${value.slice(0, 8)}...${value.slice(-8)}` : ''
}

function getMobileHomeStatus({ online, session }) {
  if (!session) {
    return 'Offline'
  }

  if (online > 0) {
    return 'Connected'
  }

  return 'Waiting for friends'
}

function getMobileTreeholeStatus(status) {
  if (status === 'ready') {
    return 'Treehole ready'
  }

  if (status === 'starting') {
    return 'Treehole starting'
  }

  if (status === 'waiting' || status === 'waiting-for-bootstrap') {
    return 'Waiting treehole'
  }

  return 'Treehole offline'
}

function getMobileBackendNotice(status) {
  if (
    status === 'joining' ||
    status === 'preparing' ||
    status === 'joining-swarm' ||
    status === 'opening-dm' ||
    status === 'opening-treehole'
  ) {
    return 'Starting home...'
  }

  if (
    status === 'opening-treehole-store' ||
    status === 'opening-treehole-replication' ||
    status === 'opening-treehole-state'
  ) {
    return 'Syncing treehole...'
  }

  if (status === 'joined') {
    return 'Connected.'
  }

  if (status === 'left') {
    return 'Left home.'
  }

  return 'Home status updated.'
}

function getMobileRoomSurface(activeTab) {
  if (activeTab === 'dm') {
    return 'Direct messages'
  }

  if (activeTab === 'treehole') {
    return 'Treehole'
  }

  if (activeTab === 'people') {
    return 'People'
  }

  return 'Home chat'
}

function formatMobileTrustSource(source) {
  if (source === 'profile_qr' || source === 'person_qr') return 'Profile QR'
  if (source === 'home_room') return 'Home'
  if (source === 'message_request') return 'Message request'
  return 'local trust'
}

function formatMobileTrustTime(trustedAt) {
  if (!Number.isFinite(trustedAt)) return 'recently'
  return new Date(trustedAt).toLocaleDateString()
}

function formatRequestPreview(text) {
  return text?.trim() || 'No message yet'
}

function formatMessageRequestTitle(request) {
  const name = request?.alias?.trim() || 'Someone'
  return `${name} wants to start a direct chat.`
}

function EmptyMessages() {
  return (
    <EmptyState
      copy='Send the first line from this phone.'
      icon={MessageCircle}
      title='No messages yet'
    />
  )
}

function EmptyDirectMessages() {
  return (
    <EmptyState
      copy='Choose a trusted friend and send the first message.'
      icon={Send}
      title='No direct messages yet'
    />
  )
}

function DirectBubble({ message, onAcceptRequest, onIgnoreRequest }) {
  const { styles } = useMobileTheme()
  const outgoing = message.direction === 'out'
  const isRequest = message.type === 'kepos.message.request.v1'

  return (
    <View style={[styles.bubble, outgoing ? styles.outBubble : styles.inBubble]}>
      <View style={styles.bubbleMetaRow}>
        <Text style={[styles.bubbleMeta, !outgoing && styles.inBubbleMeta]}>
          {isRequest
            ? outgoing
              ? 'You asked someone to start a direct chat'
              : formatMessageRequestTitle(message)
            : outgoing
              ? `You to ${displayDirectPeer(message.toProfileId)}`
              : `${displayDirectPeer(message.fromProfileId, message.nick)} to you`}
        </Text>
      </View>
      <View
        style={[
          styles.bubbleTextBlock,
          outgoing ? styles.outBubbleTextBlock : styles.inBubbleTextBlock
        ]}
      >
        <Text style={[styles.bubbleText, !outgoing && styles.inBubbleText]}>{message.text}</Text>
      </View>
      {isRequest && !outgoing ? (
        <View style={styles.requestActions}>
          <Pressable
            onPress={() => {
              onIgnoreRequest(message).catch(() => {})
            }}
            style={styles.requestIgnoreButton}
            testID='message-request-ignore-button'
          >
            <Text style={styles.requestIgnoreButtonText}>Ignore</Text>
          </Pressable>
          <Pressable
            style={styles.requestButton}
            onPress={() => {
              onAcceptRequest(message).catch(() => {})
            }}
            testID='message-request-accept-button'
          >
            <Text style={styles.requestButtonText}>Accept</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  )
}

function MessageBubble({ message }) {
  const { styles } = useMobileTheme()
  const outgoing = message.direction === 'out'

  return (
    <View style={[styles.bubble, outgoing ? styles.outBubble : styles.inBubble]}>
      <View style={styles.bubbleMetaRow}>
        <Text style={[styles.bubbleMeta, !outgoing && styles.inBubbleMeta]}>{message.nick}</Text>
      </View>
      <View
        style={[
          styles.bubbleTextBlock,
          outgoing ? styles.outBubbleTextBlock : styles.inBubbleTextBlock
        ]}
      >
        <Text style={[styles.bubbleText, !outgoing && styles.inBubbleText]}>{message.text}</Text>
      </View>
    </View>
  )
}

function Field({ label, onChangeText, testID, value }) {
  const { styles } = useMobileTheme()

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        autoCapitalize='none'
        autoCorrect={false}
        onChangeText={onChangeText}
        style={styles.input}
        testID={testID}
        value={value}
      />
    </View>
  )
}

function createMessageId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

async function getBackendStorageBasePath() {
  const baseUri = getRequiredMobileDocumentDirectory(FileSystem)

  const storageUri = `${baseUri.replace(/\/+$/, '')}/kepos`
  await FileSystem.makeDirectoryAsync(storageUri, { intermediates: true })
  return storageUri
}

async function loadMobileProfile() {
  const baseUri = getRequiredMobileDocumentDirectory(FileSystem)
  const identity = await getOrCreateMobileIdentity({
    baseUri,
    createIdentity: () => createIdentityKeyPairFromSeed(Crypto.getRandomBytes(32)),
    fileSystem: FileSystem
  })
  const homeRoomKey = await getOrCreateMobileHomeRoomKey({
    baseUri,
    createKey: createHomeRoomKey,
    fileSystem: FileSystem
  })

  const profile = getOrCreateLocalProfile({
    createIdentity: () => identity,
    displayName: 'Neil',
    homeRoomKey,
    storage: null
  })
  const contactBook = await loadContactBookFromFileSystem({
    baseUri,
    fileSystem: FileSystem,
    ownerProfileId: profile.id
  })
  const dmThreads = await loadDmThreadsFromFileSystem({
    baseUri,
    fileSystem: FileSystem
  })

  return {
    contactBook,
    dmThreads,
    homeRoomKey: profile.homeRoom.roomKey,
    identity: profile.identity,
    profileId: profile.id,
    treeholePolicy: createTreeholePolicyFromContactBook(contactBook)
  }
}

function createHomeRoomKey() {
  const bytes = Crypto.getRandomBytes(32)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function formatPostTime(value) {
  return new Date(value).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  })
}

function treeholeStatusText(status) {
  if (status === 'waiting' || status === 'waiting-for-bootstrap') {
    return 'Waiting for the home owner to share the treehole.'
  }

  if (status === 'starting') {
    return 'Starting the treehole.'
  }

  return 'Write the first post from this phone.'
}

function readRpcPayload(req) {
  if (!req.data?.byteLength) {
    return {}
  }

  return JSON.parse(b4a.toString(req.data))
}

function createMobileStyles(theme) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: theme.surface,
      paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0
    },
    screen: {
      flex: 1,
      backgroundColor: theme.surface
    },
    header: {
      paddingHorizontal: 22,
      paddingTop: 18,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border
    },
    brandRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 12
    },
    mark: {
      alignItems: 'center',
      backgroundColor: theme.quickPanel,
      borderColor: theme.quickPanelBorder,
      borderRadius: 8,
      borderWidth: 1,
      height: 42,
      justifyContent: 'center',
      width: 42
    },
    kicker: {
      color: theme.inkMuted,
      fontSize: 12,
      letterSpacing: 0,
      textTransform: 'uppercase'
    },
    title: {
      color: theme.ink,
      fontSize: 30,
      fontWeight: '800',
      letterSpacing: 0
    },
    mobileStatusStrip: {
      alignItems: 'center',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 16
    },
    homeStatusPill: {
      alignItems: 'center',
      alignSelf: 'flex-start',
      backgroundColor: theme.quickPanel,
      borderColor: theme.borderStrong,
      borderRadius: 999,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 7,
      paddingHorizontal: 10,
      paddingVertical: 6
    },
    treeholeStatusPill: {
      alignItems: 'center',
      alignSelf: 'flex-start',
      backgroundColor: theme.raised,
      borderColor: theme.border,
      borderRadius: 999,
      borderWidth: 1,
      minHeight: 32,
      paddingHorizontal: 10,
      paddingVertical: 6
    },
    statusDot: {
      backgroundColor: theme.statusDot,
      borderRadius: 4,
      height: 8,
      width: 8
    },
    statusText: {
      color: theme.statusText,
      fontSize: 13,
      fontWeight: '700'
    },
    treeholeStatusText: {
      color: theme.inkSoft,
      fontSize: 12,
      fontWeight: '700'
    },
    notice: {
      color: theme.inkMuted,
      fontSize: 13,
      lineHeight: 18,
      marginTop: 12
    },
    lobby: {
      gap: 14,
      padding: 18
    },
    lobbyScroll: {
      flex: 1
    },
    peoplePane: {
      gap: 14,
      padding: 18
    },
    panel: {
      backgroundColor: theme.panel,
      borderColor: theme.border,
      borderRadius: 8,
      borderWidth: 1,
      padding: 16
    },
    panelTitle: {
      color: theme.ink,
      fontSize: 20,
      fontWeight: '800',
      letterSpacing: 0
    },
    panelCopy: {
      color: theme.inkSoft,
      fontSize: 14,
      lineHeight: 20,
      marginTop: 6
    },
    taskHeader: {
      gap: 4
    },
    taskEyebrow: {
      color: theme.accentStrong,
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 0,
      textTransform: 'uppercase'
    },
    taskTitle: {
      color: theme.ink,
      fontSize: 21,
      fontWeight: '900',
      letterSpacing: 0
    },
    taskDescription: {
      color: theme.inkSoft,
      fontSize: 14,
      lineHeight: 20
    },
    panelEmpty: {
      alignItems: 'flex-start',
      backgroundColor: theme.quickPanel,
      borderColor: theme.border,
      borderRadius: 8,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 10,
      marginTop: 12,
      padding: 12
    },
    panelEmptyText: {
      flex: 1
    },
    panelEmptyTitle: {
      color: theme.ink,
      fontSize: 14,
      fontWeight: '800'
    },
    panelEmptyCopy: {
      color: theme.inkMuted,
      fontSize: 13,
      lineHeight: 18,
      marginTop: 4
    },
    quickStartPanel: {
      backgroundColor: theme.quickPanel,
      borderColor: theme.quickPanelBorder,
      borderRadius: 8,
      borderWidth: 1,
      padding: 16
    },
    quickActions: {
      gap: 10,
      marginTop: 16
    },
    field: {
      marginTop: 16
    },
    label: {
      color: theme.inkSoft,
      fontSize: 12,
      fontWeight: '800',
      marginBottom: 7,
      textTransform: 'uppercase'
    },
    input: {
      backgroundColor: theme.raised,
      borderColor: theme.borderStrong,
      borderRadius: 8,
      borderWidth: 1,
      color: theme.ink,
      fontSize: 17,
      minHeight: 48,
      paddingHorizontal: 13
    },
    keyInput: {
      backgroundColor: theme.raised,
      borderColor: theme.borderStrong,
      borderRadius: 8,
      borderWidth: 1,
      color: theme.ink,
      fontSize: 14,
      lineHeight: 20,
      marginTop: 14,
      minHeight: 96,
      padding: 13
    },
    qrCard: {
      alignItems: 'center',
      alignSelf: 'flex-start',
      backgroundColor: theme.raised,
      borderColor: theme.borderStrong,
      borderRadius: 8,
      borderWidth: 1,
      marginTop: 14,
      padding: 10
    },
    scannerOverlay: {
      backgroundColor: theme.scanner,
      flex: 1
    },
    scannerCamera: {
      flex: 1,
      minHeight: 0
    },
    scannerPermission: {
      alignItems: 'center',
      flex: 1,
      gap: 10,
      justifyContent: 'center',
      padding: 28
    },
    scannerPermissionTitle: {
      color: theme.ink,
      fontSize: 22,
      fontWeight: '900',
      textAlign: 'center'
    },
    scannerPermissionCopy: {
      color: theme.inkMuted,
      fontSize: 15,
      lineHeight: 21,
      maxWidth: 280,
      textAlign: 'center'
    },
    scannerControls: {
      alignItems: 'center',
      bottom: 0,
      left: 0,
      paddingBottom: 28,
      paddingTop: 16,
      position: 'absolute',
      right: 0
    },
    scannerCancel: {
      alignItems: 'center',
      alignSelf: 'center',
      backgroundColor: theme.surface,
      borderRadius: 8,
      minHeight: 46,
      paddingHorizontal: 22,
      justifyContent: 'center'
    },
    scannerCancelText: {
      color: theme.accentStrong,
      fontSize: 15,
      fontWeight: '900'
    },
    primaryButton: {
      alignItems: 'center',
      backgroundColor: theme.accentStrong,
      borderRadius: 8,
      flexDirection: 'row',
      gap: 9,
      justifyContent: 'center',
      marginTop: 16,
      minHeight: 50
    },
    primaryButtonText: {
      color: theme.surface,
      fontSize: 16,
      fontWeight: '800'
    },
    secondaryButton: {
      alignItems: 'center',
      borderColor: theme.accentStrong,
      borderRadius: 8,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 9,
      justifyContent: 'center',
      marginTop: 14,
      minHeight: 50
    },
    secondaryButtonText: {
      color: theme.accentStrong,
      fontSize: 16,
      fontWeight: '800'
    },
    disabledButton: {
      borderColor: theme.disabledBorder
    },
    disabledButtonText: {
      color: theme.placeholder
    },
    chat: {
      flex: 1
    },
    roomContent: {
      flex: 1,
      minHeight: 0
    },
    tabs: {
      borderTopColor: theme.border,
      borderTopWidth: 1,
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 18,
      paddingVertical: 10
    },
    tabButton: {
      alignItems: 'center',
      borderColor: theme.borderStrong,
      borderRadius: 8,
      borderWidth: 1,
      flex: 1,
      gap: 3,
      justifyContent: 'center',
      minHeight: 40,
      position: 'relative'
    },
    activeTabButton: {
      backgroundColor: theme.accentStrong,
      borderColor: theme.accentStrong
    },
    tabText: {
      color: theme.inkSoft,
      fontSize: 14,
      fontWeight: '800'
    },
    tabIcon: {
      marginBottom: 1
    },
    activeTabText: {
      color: theme.surface
    },
    tabBadge: {
      alignItems: 'center',
      backgroundColor: theme.accent,
      borderColor: theme.surface,
      borderRadius: 999,
      borderWidth: 1,
      height: 20,
      justifyContent: 'center',
      minWidth: 20,
      paddingHorizontal: 5,
      position: 'absolute',
      right: 8,
      top: 5
    },
    tabBadgeText: {
      color: theme.surface,
      fontSize: 10,
      fontWeight: '900',
      lineHeight: 12
    },
    roomBar: {
      alignItems: 'center',
      borderBottomColor: theme.border,
      borderBottomWidth: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 18,
      paddingVertical: 13
    },
    sessionStrip: {
      flex: 1,
      gap: 6,
      paddingRight: 12
    },
    sessionBadge: {
      alignSelf: 'flex-start',
      backgroundColor: theme.quickPanel,
      borderColor: theme.quickPanelBorder,
      borderRadius: 7,
      borderWidth: 1,
      paddingHorizontal: 8,
      paddingVertical: 4
    },
    sessionBadgeText: {
      color: theme.inkSoft,
      fontSize: 10,
      fontWeight: '900',
      textTransform: 'uppercase'
    },
    roomActions: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 10
    },
    roomAdvancedButton: {
      alignItems: 'center',
      borderColor: theme.borderStrong,
      borderRadius: 8,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 6,
      height: 42,
      justifyContent: 'center',
      paddingHorizontal: 12
    },
    roomAdvancedPanel: {
      backgroundColor: theme.panel,
      borderBottomColor: theme.border,
      borderBottomWidth: 1,
      paddingHorizontal: 18,
      paddingVertical: 10
    },
    roomLabel: {
      color: theme.inkMuted,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase'
    },
    roomName: {
      color: theme.ink,
      fontSize: 17,
      fontWeight: '800',
      marginTop: 2
    },
    roomKey: {
      color: theme.ink,
      fontSize: 16,
      fontWeight: '800',
      marginTop: 2
    },
    iconButton: {
      alignItems: 'center',
      backgroundColor: theme.quickPanel,
      borderRadius: 8,
      height: 42,
      justifyContent: 'center',
      width: 42
    },
    messageList: {
      flexGrow: 1,
      gap: 10,
      padding: 18
    },
    paneLabel: {
      borderBottomColor: theme.border,
      borderBottomWidth: 1,
      gap: 2,
      paddingHorizontal: 18,
      paddingVertical: 10
    },
    paneEyebrow: {
      color: theme.inkMuted,
      fontSize: 11,
      fontWeight: '900',
      textTransform: 'uppercase'
    },
    paneTitle: {
      color: theme.ink,
      fontSize: 17,
      fontWeight: '800'
    },
    empty: {
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
      minHeight: 280
    },
    emptyTitle: {
      color: theme.ink,
      fontSize: 20,
      fontWeight: '800',
      marginTop: 12
    },
    emptyCopy: {
      color: theme.inkMuted,
      fontSize: 14,
      marginTop: 5
    },
    bubble: {
      borderRadius: 8,
      maxWidth: '82%',
      paddingHorizontal: 13,
      paddingVertical: 10
    },
    outBubble: {
      alignSelf: 'flex-end',
      backgroundColor: theme.accentStrong
    },
    inBubble: {
      alignSelf: 'flex-start',
      backgroundColor: theme.quickPanel
    },
    bubbleMeta: {
      color: theme.accent,
      fontSize: 11,
      fontWeight: '900',
      textTransform: 'uppercase'
    },
    bubbleMetaRow: {
      alignItems: 'center',
      flexDirection: 'row',
      minHeight: 16
    },
    inBubbleMeta: {
      color: theme.inkSoft
    },
    bubbleTextBlock: {
      borderRadius: 7,
      marginTop: 6,
      paddingHorizontal: 1,
      paddingVertical: 1
    },
    inBubbleTextBlock: {
      backgroundColor: theme.quickPanel
    },
    outBubbleTextBlock: {
      backgroundColor: theme.accentStrong
    },
    bubbleText: {
      color: theme.surface,
      fontSize: 16,
      lineHeight: 22
    },
    inBubbleText: {
      color: theme.ink
    },
    requestButton: {
      alignSelf: 'flex-start',
      backgroundColor: theme.accent,
      borderRadius: 7,
      marginTop: 10,
      paddingHorizontal: 12,
      paddingVertical: 7
    },
    requestButtonText: {
      color: theme.surface,
      fontSize: 12,
      fontWeight: '900'
    },
    requestActions: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 8
    },
    requestIgnoreButton: {
      alignSelf: 'flex-start',
      borderColor: theme.borderStrong,
      borderRadius: 7,
      borderWidth: 1,
      marginTop: 10,
      paddingHorizontal: 12,
      paddingVertical: 7
    },
    requestIgnoreButtonText: {
      color: theme.inkSoft,
      fontSize: 12,
      fontWeight: '900'
    },
    composer: {
      alignItems: 'center',
      borderTopColor: theme.border,
      borderTopWidth: 1,
      flexDirection: 'row',
      gap: 10,
      padding: 14
    },
    directComposer: {
      borderTopColor: theme.border,
      borderTopWidth: 1
    },
    directEmptyContacts: {
      backgroundColor: theme.quickPanel,
      borderColor: theme.border,
      borderRadius: 8,
      borderWidth: 1,
      gap: 8,
      marginHorizontal: 14,
      marginTop: 14,
      padding: 12
    },
    directAdvancedToggle: {
      alignItems: 'center',
      alignSelf: 'flex-start',
      flexDirection: 'row',
      gap: 6,
      justifyContent: 'center',
      marginHorizontal: 14,
      marginTop: 12,
      minHeight: 30
    },
    advancedSummary: {
      color: theme.inkSoft,
      fontSize: 12,
      fontWeight: '900',
      textTransform: 'uppercase'
    },
    contactScroller: {
      gap: 8,
      paddingHorizontal: 14,
      paddingTop: 14
    },
    contactChip: {
      backgroundColor: theme.quickPanel,
      borderColor: theme.quickPanelBorder,
      borderRadius: 8,
      borderWidth: 1,
      minHeight: 34,
      paddingHorizontal: 12,
      paddingVertical: 8
    },
    activeContactChip: {
      backgroundColor: theme.accentStrong,
      borderColor: theme.accentStrong
    },
    contactChipText: {
      color: theme.accentStrong,
      fontSize: 12,
      fontWeight: '900'
    },
    activeContactChipText: {
      color: theme.surface
    },
    contactRow: {
      alignItems: 'center',
      borderBottomColor: theme.border,
      borderBottomWidth: 1,
      flexDirection: 'row',
      gap: 10,
      justifyContent: 'space-between',
      paddingVertical: 10
    },
    contactRowText: {
      flex: 1
    },
    contactName: {
      color: theme.ink,
      fontSize: 15,
      fontWeight: '800'
    },
    contactProfile: {
      color: theme.inkMuted,
      fontSize: 12,
      marginTop: 2
    },
    trustMeta: {
      alignItems: 'center',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 7
    },
    trustStatus: {
      backgroundColor: theme.treeComment,
      borderColor: theme.treeCommentBorder,
      borderRadius: 999,
      borderWidth: 1,
      color: theme.accentStrong,
      fontSize: 11,
      fontWeight: '900',
      paddingHorizontal: 7,
      paddingVertical: 2
    },
    trustMetaText: {
      color: theme.inkMuted,
      fontSize: 11,
      fontWeight: '700'
    },
    requestCard: {
      alignItems: 'center',
      borderBottomColor: theme.border,
      borderBottomWidth: 1,
      flexDirection: 'row',
      gap: 10,
      justifyContent: 'space-between',
      paddingVertical: 10
    },
    requestText: {
      flex: 1
    },
    requestTitle: {
      color: theme.ink,
      fontSize: 15,
      fontWeight: '800'
    },
    requestPreview: {
      color: theme.inkSoft,
      fontSize: 13,
      lineHeight: 18,
      marginTop: 5
    },
    revokeButton: {
      alignItems: 'center',
      borderColor: theme.dangerBorder,
      borderRadius: 8,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 6,
      minHeight: 38,
      paddingHorizontal: 10
    },
    revokeButtonText: {
      color: theme.danger,
      fontSize: 13,
      fontWeight: '800'
    },
    recipientInput: {
      backgroundColor: theme.raised,
      borderColor: theme.borderStrong,
      borderRadius: 8,
      borderWidth: 1,
      color: theme.ink,
      fontSize: 13,
      marginHorizontal: 14,
      marginTop: 14,
      minHeight: 42,
      paddingHorizontal: 12
    },
    messageInput: {
      backgroundColor: theme.raised,
      borderColor: theme.borderStrong,
      borderRadius: 8,
      borderWidth: 1,
      color: theme.ink,
      flex: 1,
      fontSize: 16,
      minHeight: 48,
      paddingHorizontal: 13
    },
    sendButton: {
      alignItems: 'center',
      backgroundColor: theme.accent,
      borderRadius: 8,
      height: 48,
      justifyContent: 'center',
      width: 48
    },
    disabledSendButton: {
      backgroundColor: theme.disabled
    },
    treeholeList: {
      flexGrow: 1,
      gap: 12,
      padding: 18
    },
    post: {
      backgroundColor: theme.raised,
      borderColor: theme.border,
      borderRadius: 8,
      borderWidth: 1,
      padding: 14
    },
    postHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between'
    },
    postAuthor: {
      color: theme.accentStrong,
      fontSize: 13,
      fontWeight: '900',
      textTransform: 'uppercase'
    },
    postTime: {
      color: theme.inkMuted,
      fontSize: 12,
      fontWeight: '700'
    },
    postText: {
      color: theme.ink,
      fontSize: 17,
      lineHeight: 24,
      marginTop: 10
    },
    commentList: {
      gap: 8,
      marginTop: 12
    },
    comment: {
      backgroundColor: theme.treeComment,
      borderLeftColor: theme.treeCommentBorder,
      borderLeftWidth: 3,
      borderRadius: 6,
      paddingHorizontal: 10,
      paddingVertical: 8
    },
    commentAuthor: {
      color: theme.inkSoft,
      fontSize: 11,
      fontWeight: '900',
      textTransform: 'uppercase'
    },
    commentText: {
      color: theme.ink,
      fontSize: 14,
      lineHeight: 20,
      marginTop: 3
    },
    postStats: {
      flexDirection: 'row',
      gap: 14,
      marginTop: 12
    },
    postStat: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 5
    },
    postStatText: {
      color: theme.inkSoft,
      fontSize: 13,
      fontWeight: '800'
    },
    postActions: {
      gap: 8,
      marginTop: 12
    },
    smallActionButton: {
      alignItems: 'center',
      alignSelf: 'flex-start',
      borderColor: theme.borderStrong,
      borderRadius: 8,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 6,
      minHeight: 36,
      paddingHorizontal: 10
    },
    disabledSmallActionButton: {
      borderColor: theme.disabledBorder,
      opacity: 0.65
    },
    smallActionText: {
      color: theme.accentStrong,
      fontSize: 13,
      fontWeight: '800'
    },
    commentComposer: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 8
    },
    commentInput: {
      backgroundColor: theme.raised,
      borderColor: theme.borderStrong,
      borderRadius: 8,
      borderWidth: 1,
      color: theme.ink,
      flex: 1,
      fontSize: 14,
      minHeight: 42,
      paddingHorizontal: 11
    },
    smallSendButton: {
      alignItems: 'center',
      backgroundColor: theme.accent,
      borderRadius: 8,
      height: 42,
      justifyContent: 'center',
      width: 42
    },
    treeholeComposer: {
      alignItems: 'flex-end',
      borderTopColor: theme.border,
      borderTopWidth: 1,
      flexDirection: 'row',
      gap: 10,
      padding: 14
    },
    treeholeComposerFields: {
      flex: 1,
      gap: 6
    },
    composerHint: {
      color: theme.inkMuted,
      fontSize: 12,
      lineHeight: 16
    },
    treeholeInput: {
      backgroundColor: theme.raised,
      borderColor: theme.borderStrong,
      borderRadius: 8,
      borderWidth: 1,
      color: theme.ink,
      fontSize: 16,
      lineHeight: 22,
      maxHeight: 118,
      minHeight: 64,
      paddingHorizontal: 13,
      paddingVertical: 10
    },
    disabledTreeholeInput: {
      backgroundColor: theme.field,
      borderColor: theme.disabledBorder,
      color: theme.inkMuted
    }
  })
}
