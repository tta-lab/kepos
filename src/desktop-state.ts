const TABS = new Set(['chat', 'dm', 'treehole', 'people'])

export type DesktopTab = 'chat' | 'dm' | 'treehole' | 'people'
export type DesktopView = 'lobby' | 'room'

export type DesktopTransportDebug = Record<string, unknown>

export type DesktopState = {
  activeTab: DesktopTab
  activeHomeOwnerProfileId: string
  lastError: string
  messages: unknown[]
  mode: string | null
  nick: string
  notice: string
  peers: number
  roomKey: string
  transportDebug: DesktopTransportDebug | null
  treeholeCanPost: boolean
  treeholePosts: unknown[]
  treeholeStatus: string
  view: DesktopView
}

export function createDesktopState(): DesktopState {
  return {
    activeTab: 'chat',
    activeHomeOwnerProfileId: '',
    messages: [],
    lastError: '',
    mode: null,
    nick: 'Desktop',
    notice: 'Show My QR or add a friend.',
    peers: 0,
    roomKey: '',
    transportDebug: null,
    treeholeCanPost: true,
    treeholePosts: [],
    treeholeStatus: 'idle',
    view: 'lobby'
  }
}

export function setDesktopRoom(
  state: DesktopState,
  room: {
    mode?: string | null
    nick?: string
    ownerProfileId?: string | null
    peers?: number
    roomKey?: string
  }
): DesktopState {
  return {
    ...state,
    activeHomeOwnerProfileId: room.ownerProfileId || '',
    mode: room.mode ?? state.mode,
    nick: room.nick?.trim() || 'Desktop',
    peers: room.peers || 0,
    roomKey: room.roomKey || state.roomKey,
    view: 'room'
  }
}

export function setDesktopTab(state: DesktopState, tab: string): DesktopState {
  if (!TABS.has(tab)) {
    throw new Error('Unknown tab')
  }

  return {
    ...state,
    activeTab: tab as DesktopTab
  }
}

export function setDesktopTreehole(
  state: DesktopState,
  treehole: {
    canPost?: boolean
    posts?: unknown[]
    status?: string
  }
): DesktopState {
  return {
    ...state,
    treeholeCanPost:
      typeof treehole.canPost === 'boolean' ? treehole.canPost : state.treeholeCanPost,
    treeholePosts: treehole.posts || [],
    treeholeStatus: treehole.status || state.treeholeStatus
  }
}

export function getDesktopHomeStatus(state: DesktopState): string {
  if (state.view !== 'room') {
    return 'Offline'
  }

  return state.peers > 0 ? 'Connected' : 'Waiting for friends'
}

export function getDesktopTreeholeStatus(state: DesktopState): string {
  if (state.treeholeStatus === 'ready') {
    return 'Treehole ready'
  }

  if (
    state.treeholeStatus === 'starting' ||
    state.treeholeStatus === 'waiting' ||
    state.treeholeStatus === 'waiting-for-bootstrap'
  ) {
    return 'Syncing posts'
  }

  if (state.treeholeStatus === 'error') {
    return 'Treehole error'
  }

  return 'Treehole offline'
}
