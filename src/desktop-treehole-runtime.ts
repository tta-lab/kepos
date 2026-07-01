import Hyperswarm from 'hyperswarm'
import { createTreeholeBase } from './treehole-base.ts'
import type { TreeholeBase } from './treehole-base.ts'
import {
  canGrantTreeholeWriter,
  canShareTreeholeBootstrap,
  createTreeholeSessionOptions
} from './treehole-policy.ts'
import type { TreeholeIdentity, TreeholePolicy } from './treehole-policy.ts'
import { createTreeholeStoragePath } from './treehole-storage.ts'
import { createTreeholeStatePublisher } from './treehole-state-publisher.ts'
import { serializeTreeholeState } from './treehole-view.ts'

export function createDesktopTreeholeRuntime({
  createPublisher = createTreeholeStatePublisher as TreeholeStatePublisherFactory,
  createSwarm = () => new (Hyperswarm as unknown as HyperswarmConstructor)(),
  createTreehole = createTreeholeBase,
  homeDir = defaultDesktopTreeholeStorageBase,
  onError = () => {},
  onStateChanged = () => {},
  storageBasePath = null,
  serialize = serializeTreeholeState as (state: unknown) => TreeholeStateSnapshot
}: DesktopTreeholeRuntimeOptions = {}): DesktopTreeholeRuntime {
  let session: DesktopTreeholeSession | null = null
  let homeJoinDetails: DesktopTreeholeJoinDetails | null = null
  let treehole: TreeholeBaseLike | null = null
  let treeholeOpening: Promise<void> | null = null
  let treeholeSwarm: TreeholeSwarm | null = null
  let treeholeStatePublisher: TreeholeStatePublisher | null = null
  const addedWriters = new Set<string>()

  function configure(nextContext: DesktopTreeholeContext | null | undefined): Promise<void> | void {
    session = nextContext?.session || null
    homeJoinDetails = nextContext?.homeJoinDetails || null
    treehole?.updateTreeholePolicy?.(homeJoinDetails?.treeholePolicy)

    if (treehole) {
      return publishSnapshot().catch((error: Error) => {
        onError(new Error(`Treehole state unavailable: ${error.message}`))
      })
    }
  }

  function open({
    bootstrapKey = null,
    initialPosts = [],
    initialStatus = 'ready'
  }: DesktopTreeholeOpenOptions = {}): Promise<void> | undefined {
    if (treehole) return
    if (treeholeOpening) return treeholeOpening
    if (!session) return

    treeholeOpening = openOnce({ bootstrapKey, initialPosts, initialStatus }).finally(() => {
      treeholeOpening = null
    })
    return treeholeOpening
  }

  async function openOnce({
    bootstrapKey,
    initialPosts,
    initialStatus
  }: Required<DesktopTreeholeOpenOptions>): Promise<void> {
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

    const openedTreehole = treehole
    const discovery = treeholeSwarm.join(openedTreehole.base.discoveryKey, {
      client: true,
      server: true
    })
    discovery.flushed().catch((error: Error) => {
      onError(new Error(`Treehole replication unavailable: ${error.message}`))
    })
    startPublisher()
    onStateChanged({ canPost: canPost(), posts: initialPosts, status: initialStatus })
  }

  async function close(): Promise<void> {
    treeholeOpening = null
    await treeholeSwarm?.destroy()
    treeholeSwarm = null
    treeholeStatePublisher?.stop()
    treeholeStatePublisher = null
    await treehole?.close()
    treehole = null
    addedWriters.clear()
  }

  async function post(payload: TreeholeTextPayload): Promise<void> {
    const text = cleanText(payload?.text)
    if (!treehole || !text || !canPost()) return

    await treehole.post({ ...payload, text })
    await publishSnapshot()
  }

  async function comment(payload: TreeholeCommentPayload): Promise<void> {
    const text = cleanText(payload?.text)
    if (!treehole || !text) return

    await treehole.comment({ ...payload, text })
    await publishSnapshot()
  }

  async function like(payload: TreeholeLikePayload): Promise<void> {
    if (!treehole) return

    await treehole.like(payload)
    await publishSnapshot()
  }

  async function publishSnapshot(): Promise<void> {
    if (!treehole) return

    const treeholeState = await treehole.getState()
    const snapshot = serialize(treeholeState)
    onStateChanged({ canPost: canPost(), posts: snapshot.posts, status: 'ready' })
  }

  function createBootstrapControl(remoteProfileId: string): TreeholeBootstrapControl | null {
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

  function createWriterControl(): TreeholeWriterControl | null {
    if (!treehole || !session) return null

    return {
      key: treehole.localWriterKey,
      profileId: session.profileId,
      type: 'treehole.writer'
    }
  }

  async function addWriter(message: Partial<TreeholeWriterControl>): Promise<boolean> {
    if (!treehole || !message.key || addedWriters.has(message.key)) return false

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

  function hasTreehole(): boolean {
    return Boolean(treehole)
  }

  function canPost(): boolean {
    if (!session) return true
    const ownerProfileId = homeJoinDetails?.ownerProfileId
    return !ownerProfileId || ownerProfileId === session.profileId
  }

  function getOwnerProfileId(): string | null | undefined {
    return homeJoinDetails?.ownerProfileId || session?.profileId
  }

  function startPublisher(): void {
    treeholeStatePublisher?.stop()
    treeholeStatePublisher = createPublisher({
      getSnapshot: async () => {
        if (!treehole) return { posts: [] }
        const treeholeState = await treehole.getState()
        return serialize(treeholeState)
      },
      onError: (error) => onError(new Error(`Treehole state unavailable: ${error.message}`)),
      publish: (snapshot) => {
        onStateChanged({ canPost: canPost(), posts: snapshot.posts, status: 'ready' })
      }
    })
  }

  function treeholeStoragePath(roomKey: string, bootstrapKey: string | null): string {
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

function defaultDesktopTreeholeStorageBase(): string {
  const processEnv =
    (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env || {}
  const home = processEnv.HOME || processEnv.USERPROFILE
  if (home) return home
  throw new Error('Desktop treehole storage base path is required')
}

function cleanText(text: unknown): string {
  return typeof text === 'string' ? text.trim() : ''
}

type HyperswarmConstructor = new () => TreeholeSwarm

type TreeholeSwarm = {
  destroy(): unknown | Promise<unknown>
  join(
    topic: unknown,
    options: { client: boolean; server: boolean }
  ): {
    flushed(): Promise<unknown>
  }
  on(event: 'connection', handler: (socket: unknown) => void): unknown
}

type TreeholeStateSnapshot = {
  posts: Array<Record<string, unknown>>
}

type TreeholeStatePublisher = {
  stop(): void
}

type TreeholeStatePublisherFactory = (options: {
  getSnapshot(): Promise<TreeholeStateSnapshot>
  onError(error: Error): void
  publish(snapshot: TreeholeStateSnapshot): void
}) => TreeholeStatePublisher

type TreeholeBaseLike = Pick<
  TreeholeBase,
  | 'addWriter'
  | 'close'
  | 'comment'
  | 'getState'
  | 'key'
  | 'like'
  | 'localWriterKey'
  | 'post'
  | 'replicate'
  | 'updateTreeholePolicy'
> & {
  base: TreeholeBase['base'] & {
    discoveryKey?: unknown
  }
}

type TreeholeBaseFactory = (
  options: ReturnType<typeof createTreeholeSessionOptions>
) => Promise<TreeholeBaseLike> | TreeholeBaseLike

type DesktopTreeholeRuntimeOptions = {
  createPublisher?: TreeholeStatePublisherFactory
  createSwarm?: () => TreeholeSwarm
  createTreehole?: TreeholeBaseFactory
  homeDir?: () => string
  onError?: (error: Error) => void
  onStateChanged?: (snapshot: DesktopTreeholeSnapshot) => void
  serialize?: (state: unknown) => TreeholeStateSnapshot
  storageBasePath?: string | null
}

type DesktopTreeholeSession = {
  nick: string
  profileId: string
  roomKey: string
}

type DesktopTreeholeJoinDetails = {
  identity?: TreeholeIdentity
  ownerProfileId?: string | null
  treeholePolicy?: Partial<TreeholePolicy> | null
}

type DesktopTreeholeContext = {
  homeJoinDetails?: DesktopTreeholeJoinDetails | null
  session?: DesktopTreeholeSession | null
}

type DesktopTreeholeOpenOptions = {
  bootstrapKey?: string | null
  initialPosts?: Array<Record<string, unknown>>
  initialStatus?: string
}

type TreeholeTextPayload = {
  createdAt?: number
  id: string
  text?: string
}

type TreeholeCommentPayload = TreeholeTextPayload & {
  postId: string
}

type TreeholeLikePayload = {
  action?: 'add' | 'remove'
  createdAt?: number
  postId: string
}

type DesktopTreeholeSnapshot = {
  canPost: boolean
  posts: Array<Record<string, unknown>>
  status: string
}

type TreeholeBootstrapControl = {
  key: string
  ownerProfileId: string
  type: 'treehole.bootstrap'
}

type TreeholeWriterControl = {
  key: string
  profileId: string
  type: 'treehole.writer'
}

export type DesktopTreeholeRuntime = {
  addWriter(message: Partial<TreeholeWriterControl>): Promise<boolean>
  canPost(): boolean
  close(): Promise<void>
  comment(payload: TreeholeCommentPayload): Promise<void>
  configure(nextContext?: DesktopTreeholeContext | null): Promise<void> | void
  createBootstrapControl(remoteProfileId: string): TreeholeBootstrapControl | null
  createWriterControl(): TreeholeWriterControl | null
  hasTreehole(): boolean
  like(payload: TreeholeLikePayload): Promise<void>
  open(options?: DesktopTreeholeOpenOptions): Promise<void> | undefined
  post(payload: TreeholeTextPayload): Promise<void>
  publishSnapshot(): Promise<void>
}
