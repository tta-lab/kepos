/* global document */

import Hyperswarm from 'hyperswarm'
import os from 'node:os'
import path from 'node:path'
import { appendLocalMessage, appendRemoteMessage, createChatSession } from '../src/chat-session.js'
import { createP2PRoom } from '../src/p2p-room.js'
import { createRoomKey } from '../src/protocol.js'
import { createTreeholeBase } from '../src/treehole-base.js'
import {
  createDesktopState,
  setDesktopRoom,
  setDesktopTab,
  setDesktopTreehole
} from '../src/desktop-state.js'

const els = {
  chatForm: document.querySelector('#chatForm'),
  chatInput: document.querySelector('#chatInput'),
  chatPane: document.querySelector('#chatPane'),
  chatTab: document.querySelector('#chatTab'),
  createButton: document.querySelector('#createButton'),
  joinButton: document.querySelector('#joinButton'),
  leaveButton: document.querySelector('#leaveButton'),
  lobbyForm: document.querySelector('#lobbyForm'),
  messageList: document.querySelector('#messageList'),
  nickInput: document.querySelector('#nickInput'),
  noticeLabel: document.querySelector('#noticeLabel'),
  peerLabel: document.querySelector('#peerLabel'),
  roomKeyInput: document.querySelector('#roomKeyInput'),
  roomKeyLabel: document.querySelector('#roomKeyLabel'),
  treeholeForm: document.querySelector('#treeholeForm'),
  treeholeInput: document.querySelector('#treeholeInput'),
  treeholeList: document.querySelector('#treeholeList'),
  treeholePane: document.querySelector('#treeholePane'),
  treeholeStatusLabel: document.querySelector('#treeholeStatusLabel'),
  treeholeTab: document.querySelector('#treeholeTab')
}

let state = createDesktopState()
let session = null
let room = null
let treehole = null
let treeholeSwarm = null
const addedWriters = new Set()

els.createButton.addEventListener('click', () => {
  const roomKey = createRoomKey()
  els.roomKeyInput.value = roomKey
  joinRoom({ createTreehole: true, mode: 'host', roomKey }).catch(showError)
})

els.lobbyForm.addEventListener('submit', (event) => {
  event.preventDefault()
  joinRoom({
    createTreehole: false,
    mode: 'peer',
    roomKey: els.roomKeyInput.value.trim()
  }).catch(showError)
})

els.leaveButton.addEventListener('click', () => leaveRoom().catch(showError))
els.chatTab.addEventListener('click', () => setTab('chat'))
els.treeholeTab.addEventListener('click', () => setTab('treehole'))

els.chatForm.addEventListener('submit', (event) => {
  event.preventDefault()
  sendChat()
})

els.treeholeForm.addEventListener('submit', (event) => {
  event.preventDefault()
  postTreehole().catch(showError)
})

render()

async function joinRoom({ createTreehole, mode, roomKey }) {
  await leaveRoom()

  const nick = els.nickInput.value.trim() || 'Desktop'
  session = createChatSession({ nick, roomKey })
  state = setDesktopRoom(state, { mode, nick, peers: 0, roomKey })
  state = { ...state, notice: 'Joining P2P room...' }
  render()

  room = createP2PRoom({
    onControl: (message) => handleControl(message).catch(showError),
    onMessage: (message) => {
      session = appendRemoteMessage(session, message)
      render()
    },
    onPeer: () => announceTreehole(),
    onPeerCount: (peers) => {
      state = { ...state, peers }
      render()
    }
  })

  await room.join({ nick, roomKey })

  if (createTreehole) {
    await openTreehole()
    announceTreehole()
  } else {
    state = setDesktopTreehole(state, {
      status: 'waiting-for-bootstrap',
      posts: []
    })
  }

  state = { ...state, notice: 'Room joined.' }
  render()
}

async function leaveRoom() {
  await room?.leave()
  room = null

  await treeholeSwarm?.destroy()
  treeholeSwarm = null
  await treehole?.close()
  treehole = null

  addedWriters.clear()
  session = null
  state = createDesktopState()
  render()
}

function sendChat() {
  const text = els.chatInput.value.trim()
  if (!room || !session || !text) return

  const message = {
    at: Date.now(),
    id: createId(),
    text
  }

  session = appendLocalMessage(session, text, message)
  room.send(message)
  els.chatInput.value = ''
  render()
}

async function postTreehole() {
  const text = els.treeholeInput.value.trim()
  if (!treehole || !text) return

  await treehole.post({
    createdAt: Date.now(),
    id: createId(),
    text
  })
  els.treeholeInput.value = ''
  announceTreehole()
  await renderTreeholeState()
}

async function handleControl(message) {
  if (message.type === 'treehole.bootstrap') {
    await openTreehole(message.key)
    announceTreehole()
    return
  }

  if (message.type === 'treehole.writer') {
    if (!treehole || addedWriters.has(message.key)) return

    addedWriters.add(message.key)
    await treehole.addWriter(message.key)
    announceTreehole()
    await renderTreeholeState()
  }
}

async function openTreehole(bootstrapKey = null) {
  if (treehole) return

  treehole = await createTreeholeBase({
    bootstrapKey,
    nick: session.nick,
    storage: treeholeStoragePath(session.roomKey, bootstrapKey)
  })

  treeholeSwarm = new Hyperswarm()
  treeholeSwarm.on('connection', (socket) => {
    treehole?.replicate(socket)
  })

  const discovery = treeholeSwarm.join(treehole.base.discoveryKey, {
    client: true,
    server: true
  })
  await discovery.flushed()
  await renderTreeholeState()
}

function announceTreehole() {
  if (!room || !treehole) return

  room.broadcastControl({
    key: treehole.key,
    type: 'treehole.bootstrap'
  })
  room.broadcastControl({
    key: treehole.localWriterKey,
    type: 'treehole.writer'
  })
}

async function renderTreeholeState() {
  if (!treehole) return

  const treeholeState = await treehole.getState()
  state = setDesktopTreehole(state, {
    posts: treeholeState.posts,
    status: 'ready'
  })
  render()
}

function setTab(tab) {
  state = setDesktopTab(state, tab)
  render()
}

function render() {
  const inRoom = state.view === 'room'
  els.leaveButton.disabled = !inRoom
  els.joinButton.disabled = inRoom
  els.createButton.disabled = inRoom
  els.roomKeyLabel.textContent = inRoom ? shorten(state.roomKey) : 'not joined'
  els.peerLabel.textContent = String(state.peers)
  els.noticeLabel.textContent = state.notice
  els.treeholeStatusLabel.textContent = `treehole ${state.treeholeStatus}`

  els.chatPane.classList.toggle('hidden', state.activeTab !== 'chat')
  els.treeholePane.classList.toggle('hidden', state.activeTab !== 'treehole')
  els.chatTab.classList.toggle('active', state.activeTab === 'chat')
  els.treeholeTab.classList.toggle('active', state.activeTab === 'treehole')

  renderMessages()
  renderPosts()
}

function renderMessages() {
  const messages = session?.messages || []
  els.messageList.replaceChildren(
    ...messages.map((message) => {
      const item = document.createElement('li')
      item.className = `item ${message.direction === 'out' ? 'outgoing' : 'incoming'}`
      item.innerHTML = `
        <p class="meta">${escapeHtml(message.nick)}</p>
        <p>${escapeHtml(message.text)}</p>
      `
      return item
    })
  )
}

function renderPosts() {
  els.treeholeList.replaceChildren(
    ...state.treeholePosts.map((post) => {
      const item = document.createElement('li')
      item.className = 'item post'
      item.innerHTML = `
        <div class="postHead">
          <p class="meta">${escapeHtml(post.author)}</p>
          <p class="time">${formatTime(post.createdAt)}</p>
        </div>
        <p>${escapeHtml(post.text)}</p>
        <p class="stats">${post.commentCount || 0} comments · ${post.likeCount || 0} likes</p>
      `
      return item
    })
  )
}

function showError(error) {
  state = { ...state, notice: error.message }
  render()
}

function treeholeStoragePath(roomKey, bootstrapKey) {
  const suffix = bootstrapKey ? bootstrapKey.slice(0, 16) : 'host'
  return path.join(os.homedir(), `.kepos-treehole-${roomKey.slice(0, 16)}-${suffix}`)
}

function createId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function shorten(value) {
  return `${value.slice(0, 8)}...${value.slice(-8)}`
}

function formatTime(value) {
  return new Date(value).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  })
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

globalThis.Pear?.updates?.(() => globalThis.Pear.reload())
globalThis.Pear?.teardown?.(() => leaveRoom())
