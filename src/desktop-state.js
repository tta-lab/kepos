const TABS = new Set(['chat', 'dm', 'treehole'])

export function createDesktopState() {
  return {
    activeTab: 'chat',
    messages: [],
    mode: null,
    nick: 'Desktop',
    notice: 'Create or join a room.',
    peers: 0,
    roomKey: '',
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
    treeholePosts: treehole.posts || [],
    treeholeStatus: treehole.status || state.treeholeStatus
  }
}
