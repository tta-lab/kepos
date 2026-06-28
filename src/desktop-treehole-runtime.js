import Hyperswarm from 'hyperswarm'
import { createTreeholeBase } from './treehole-base.js'
import {
  canGrantTreeholeWriter,
  canShareTreeholeBootstrap,
  createTreeholeSessionOptions
} from './treehole-policy.ts'
import { createTreeholeStoragePath } from './treehole-storage.js'
import { createTreeholeStatePublisher } from './treehole-state-publisher.js'
import { serializeTreeholeState } from './treehole-view.js'

export function createDesktopTreeholeRuntime({
  createPublisher = createTreeholeStatePublisher,
  createSwarm = () => new Hyperswarm(),
  createTreehole = createTreeholeBase,
  homeDir = defaultDesktopTreeholeStorageBase,
  onError = () => {},
  onStateChanged = () => {},
  storageBasePath = null,
  serialize = serializeTreeholeState
} = {}) {
  let session = null
  let homeJoinDetails = null
  let treehole = null
  let treeholeSwarm = null
  let treeholeStatePublisher = null
  const addedWriters = new Set()

  function configure(nextContext) {
    session = nextContext?.session || null
    homeJoinDetails = nextContext?.homeJoinDetails || null
  }

  async function open({ bootstrapKey = null, initialPosts = [], initialStatus = 'ready' } = {}) {
    if (treehole) return
    if (!session) return

    treehole = await createTreehole(
      createTreeholeSessionOptions({
        bootstrapKey,
        identity: homeJoinDetails?.identity,
        nick: session.nick,
        ownerProfileId: getOwnerProfileId(),
        profileId: session.profileId,
        storage: treeholeStoragePath(session.roomKey, bootstrapKey),
        treeholePolicy: homeJoinDetails?.treeholePolicy
      })
    )

    treeholeSwarm = createSwarm()
    treeholeSwarm.on('connection', (socket) => {
      treehole?.replicate(socket)
    })

    const discovery = treeholeSwarm.join(treehole.base.discoveryKey, {
      client: true,
      server: true
    })
    discovery.flushed().catch((error) => {
      onError(new Error(`Treehole replication unavailable: ${error.message}`))
    })
    startPublisher()
    onStateChanged({ canPost: canPost(), posts: initialPosts, status: initialStatus })
  }

  async function close() {
    await treeholeSwarm?.destroy()
    treeholeSwarm = null
    treeholeStatePublisher?.stop()
    treeholeStatePublisher = null
    await treehole?.close()
    treehole = null
    addedWriters.clear()
  }

  async function post(payload) {
    if (!treehole || !payload?.text?.trim() || !canPost()) return

    await treehole.post(payload)
    await publishSnapshot()
  }

  async function comment(payload) {
    if (!treehole || !payload?.text?.trim()) return

    await treehole.comment(payload)
    await publishSnapshot()
  }

  async function like(payload) {
    if (!treehole) return

    await treehole.like(payload)
    await publishSnapshot()
  }

  async function publishSnapshot() {
    if (!treehole) return

    const treeholeState = await treehole.getState()
    const snapshot = serialize(treeholeState)
    onStateChanged({ canPost: canPost(), posts: snapshot.posts, status: 'ready' })
  }

  function createBootstrapControl(remoteProfileId) {
    if (!treehole || !session || homeJoinDetails?.ownerProfileId !== session.profileId) {
      return null
    }

    if (
      !canShareTreeholeBootstrap({
        localProfileId: session.profileId,
        ownerProfileId: session.profileId,
        policy: homeJoinDetails?.treeholePolicy,
        remoteProfileId
      })
    ) {
      return null
    }

    return {
      key: treehole.key,
      ownerProfileId: session.profileId,
      type: 'treehole.bootstrap'
    }
  }

  function createWriterControl() {
    if (!treehole || !session) return null

    return {
      key: treehole.localWriterKey,
      profileId: session.profileId,
      type: 'treehole.writer'
    }
  }

  async function addWriter(message) {
    if (!treehole || addedWriters.has(message.key)) return false

    if (
      !canGrantTreeholeWriter({
        ownerProfileId: getOwnerProfileId(),
        policy: homeJoinDetails?.treeholePolicy,
        writerProfileId: message.profileId
      })
    ) {
      return false
    }

    addedWriters.add(message.key)
    await treehole.addWriter(message.key, { profileId: message.profileId })
    await publishSnapshot()
    return true
  }

  function hasTreehole() {
    return Boolean(treehole)
  }

  function canPost() {
    if (!session) return true
    const ownerProfileId = homeJoinDetails?.ownerProfileId
    return !ownerProfileId || ownerProfileId === session.profileId
  }

  function getOwnerProfileId() {
    return homeJoinDetails?.ownerProfileId || session?.profileId
  }

  function startPublisher() {
    treeholeStatePublisher?.stop()
    treeholeStatePublisher = createPublisher({
      getSnapshot: async () => {
        const treeholeState = await treehole.getState()
        return serialize(treeholeState)
      },
      onError: (error) => onError(new Error(`Treehole state unavailable: ${error.message}`)),
      publish: (snapshot) => {
        onStateChanged({ canPost: canPost(), posts: snapshot.posts, status: 'ready' })
      }
    })
  }

  function treeholeStoragePath(roomKey, bootstrapKey) {
    return createTreeholeStoragePath({
      basePath: storageBasePath || homeDir(),
      bootstrapKey,
      roomKey
    })
  }

  return {
    addWriter,
    canPost,
    close,
    configure,
    createBootstrapControl,
    createWriterControl,
    hasTreehole,
    like,
    open,
    post,
    comment,
    publishSnapshot
  }
}

function defaultDesktopTreeholeStorageBase() {
  const env = globalThis.process?.env || {}
  const home = env.HOME || env.USERPROFILE
  if (home) return home
  throw new Error('Desktop treehole storage base path is required')
}
