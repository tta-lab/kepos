const TABS = new Set(['chat', 'dm', 'treehole', 'people'])

export function createDesktopState() {
  return {
    activeTab: 'chat',
    messages: [],
    mode: null,
    nick: 'Desktop',
    notice: 'Create or join a room.',
    peers: 0,
    roomKey: '',
    treeholeCanPost: true,
    treeholePosts: [],
    treeholeStatus: 'idle',
    view: 'lobby'
  }
}

export function setDesktopRoom(state, room) {
  return {
    ...state,
    mode: room.mode,
    nick: room.nick?.trim() || 'Desktop',
    peers: room.peers || 0,
    roomKey: room.roomKey,
    view: 'room'
  }
}

export function setDesktopTab(state, tab) {
  if (!TABS.has(tab)) {
    throw new Error('Unknown tab')
  }

  return {
    ...state,
    activeTab: tab
  }
}

export function setDesktopTreehole(state, treehole) {
  return {
    ...state,
    treeholeCanPost:
      typeof treehole.canPost === 'boolean' ? treehole.canPost : state.treeholeCanPost,
    treeholePosts: treehole.posts || [],
    treeholeStatus: treehole.status || state.treeholeStatus
  }
}

export function getDesktopHomeStatus(state) {
  if (state.view !== 'room') {
    return 'Offline'
  }

  return state.peers > 0 ? 'Connected' : 'Waiting for friends'
}

export function getDesktopTreeholeStatus(state) {
  if (state.treeholeStatus === 'ready') {
    return 'Treehole ready'
  }

  if (
    state.treeholeStatus === 'starting' ||
    state.treeholeStatus === 'waiting' ||
    state.treeholeStatus === 'waiting-for-bootstrap'
  ) {
    return 'Syncing treehole'
  }

  if (state.treeholeStatus === 'error') {
    return 'Treehole error'
  }

  return 'Treehole offline'
}
