/* global document */

import { useEffect, useState } from 'react'

const THEME_STORAGE_KEY = 'kepos.desktop.theme'
const DEFAULT_STATUS = {
  errorDetailLabel: 'none',
  homeStatusLabel: 'Offline',
  noticeLabel: 'Create or join a home.',
  peerLabel: '0',
  profileIdLabel: 'not ready',
  roomKeyLabel: 'not joined',
  transportDebugLabel: 'none',
  treeholeStatusLabel: 'Treehole offline'
}
const DEFAULT_CONTROLS = {
  canCreateHome: true,
  canLeaveHome: false,
  canPostTreehole: false,
  canUseDirectComposer: false,
  canUseHomeQrJoin: false,
  canUseHomeChatComposer: false,
  canUseManualHomeJoin: false,
  canUseTrustProfile: false
}
const DEFAULT_CONTEXT_FORM = {
  displayName: 'Desktop',
  homeQrUri: '',
  roomKey: '',
  trustAlias: '',
  trustQrUri: ''
}
const EMPTY_LARGE_QR = { isOpen: false, svg: '', title: '' }
const EMPTY_SHARE_QR_OUTPUTS = {
  homeSvg: '',
  homeUri: '',
  profileSvg: '',
  profileUri: ''
}
const desktopUiBridge = {
  setActiveTab: () => {},
  setContextFormActions: () => {},
  setContextFormDraft: () => {},
  setControls: () => {},
  setDirectComposerActions: () => {},
  setDirectComposerRecipient: () => {},
  setDirectContactPicker: () => {},
  setDirectContactPickerActions: () => {},
  setDirectMessageActions: () => {},
  setDirectMessages: () => {},
  setHomeComposerActions: () => {},
  setHomeMessages: () => {},
  setLargeQr: () => {},
  setPeople: () => {},
  setPeopleActions: () => {},
  setShareQrOutputs: () => {},
  setShellActions: () => {},
  setShellBusy: () => {},
  setStatus: () => {},
  setTreeholeActions: () => {},
  setTreeholeComposerActions: () => {},
  setTreeholePosts: () => {}
}

globalThis.keposDesktopUi = {
  setActiveTab(tab = 'chat') {
    desktopUiBridge.setActiveTab(tab)
  },
  setContextFormActions(actions = {}) {
    desktopUiBridge.setContextFormActions(actions)
  },
  setContextFormDraft(draft = {}) {
    desktopUiBridge.setContextFormDraft(draft)
  },
  setControls(controls = DEFAULT_CONTROLS) {
    desktopUiBridge.setControls(controls)
  },
  setDirectComposerActions(actions = {}) {
    desktopUiBridge.setDirectComposerActions(actions)
  },
  setDirectComposerRecipient(toProfileId = '') {
    desktopUiBridge.setDirectComposerRecipient(toProfileId)
  },
  setDirectContactPicker(
    picker = {
      contacts: [],
      empty: {
        actionLabel: 'Add trusted friend',
        copy: 'Add a trusted friend before starting a direct message.',
        title: 'No trusted friends yet'
      }
    }
  ) {
    desktopUiBridge.setDirectContactPicker(picker)
  },
  setDirectContactPickerActions(actions = {}) {
    desktopUiBridge.setDirectContactPickerActions(actions)
  },
  setDirectMessageActions(actions = {}) {
    desktopUiBridge.setDirectMessageActions(actions)
  },
  setDirectMessages(messages = []) {
    desktopUiBridge.setDirectMessages(messages)
  },
  setHomeComposerActions(actions = {}) {
    desktopUiBridge.setHomeComposerActions(actions)
  },
  setHomeMessages(messages = []) {
    desktopUiBridge.setHomeMessages(messages)
  },
  setLargeQr(qr = EMPTY_LARGE_QR) {
    desktopUiBridge.setLargeQr(qr)
  },
  setPeople(people = { messageRequests: [], trustedContacts: [] }) {
    desktopUiBridge.setPeople(people)
  },
  setPeopleActions(actions = {}) {
    desktopUiBridge.setPeopleActions(actions)
  },
  setShareQrOutputs(outputs = EMPTY_SHARE_QR_OUTPUTS) {
    desktopUiBridge.setShareQrOutputs(outputs)
  },
  setShellActions(actions = {}) {
    desktopUiBridge.setShellActions(actions)
  },
  setShellBusy(isBusy = false) {
    desktopUiBridge.setShellBusy(isBusy)
  },
  setStatus(status = DEFAULT_STATUS) {
    desktopUiBridge.setStatus(status)
  },
  setTreeholeActions(actions = {}) {
    desktopUiBridge.setTreeholeActions(actions)
  },
  setTreeholeComposerActions(actions = {}) {
    desktopUiBridge.setTreeholeComposerActions(actions)
  },
  setTreeholePosts(posts = []) {
    desktopUiBridge.setTreeholePosts(posts)
  }
}

export function useDesktopAppModel() {
  const [activeTab, setActiveTab] = useState('chat')
  const [contextForm, setContextForm] = useState(DEFAULT_CONTEXT_FORM)
  const [contextFormActions, setContextFormActions] = useState({
    copyHomeQr: () => {},
    copyProfileQr: () => {},
    createHome: () => {},
    joinHomeQr: () => {},
    joinManualHome: () => {},
    showLargeHomeQr: () => {},
    showLargeProfileQr: () => {},
    trustProfileQr: () => {},
    updateDisplayName: () => {}
  })
  const [controls, setControls] = useState(DEFAULT_CONTROLS)
  const [directContactPicker, setDirectContactPicker] = useState({
    contacts: [],
    empty: {
      actionLabel: 'Add trusted friend',
      copy: 'Add a trusted friend before starting a direct message.',
      title: 'No trusted friends yet'
    }
  })
  const [directContactPickerActions, setDirectContactPickerActions] = useState({
    openPeople: () => {},
    selectContact: () => {}
  })
  const [directComposer, setDirectComposer] = useState({
    text: '',
    toProfileId: ''
  })
  const [directComposerActions, setDirectComposerActions] = useState({
    sendDirectMessage: () => {},
    updateRecipient: () => {}
  })
  const [directMessageActions, setDirectMessageActions] = useState({
    acceptMessage: () => {},
    ignoreMessage: () => {}
  })
  const [directMessages, setDirectMessages] = useState([])
  const [homeComposerActions, setHomeComposerActions] = useState({
    sendHomeMessage: () => {}
  })
  const [homeMessages, setHomeMessages] = useState([])
  const [largeQr, setLargeQr] = useState(EMPTY_LARGE_QR)
  const [people, setPeople] = useState({ messageRequests: [], trustedContacts: [] })
  const [peopleActions, setPeopleActions] = useState({
    acceptMessageRequest: () => {},
    ignoreMessageRequest: () => {},
    revokeContact: () => {}
  })
  const [shareQrOutputs, setShareQrOutputs] = useState(EMPTY_SHARE_QR_OUTPUTS)
  const [isShellBusy, setShellBusy] = useState(false)
  const [shellActions, setShellActions] = useState({
    hideLargeQr: () => {},
    leaveHome: () => {},
    setTab: () => {}
  })
  const [treeholeActions, setTreeholeActions] = useState({
    commentPost: () => {},
    likePost: () => {}
  })
  const [treeholeComposerActions, setTreeholeComposerActions] = useState({
    postTreehole: () => {}
  })
  const [treeholePosts, setTreeholePosts] = useState([])
  const [status, setStatus] = useState(DEFAULT_STATUS)
  const [theme, setTheme] = useState(getInitialTheme)

  desktopUiBridge.setActiveTab = setActiveTab
  desktopUiBridge.setContextFormActions = setContextFormActions
  desktopUiBridge.setContextFormDraft = (draft = {}) => {
    setContextForm((current) => ({ ...current, ...draft }))
  }
  desktopUiBridge.setControls = setControls
  desktopUiBridge.setDirectComposerActions = setDirectComposerActions
  desktopUiBridge.setDirectComposerRecipient = (toProfileId = '') => {
    setDirectComposer((current) => ({ ...current, toProfileId }))
  }
  desktopUiBridge.setDirectContactPicker = setDirectContactPicker
  desktopUiBridge.setDirectContactPickerActions = setDirectContactPickerActions
  desktopUiBridge.setDirectMessageActions = setDirectMessageActions
  desktopUiBridge.setDirectMessages = setDirectMessages
  desktopUiBridge.setHomeComposerActions = setHomeComposerActions
  desktopUiBridge.setHomeMessages = setHomeMessages
  desktopUiBridge.setLargeQr = setLargeQr
  desktopUiBridge.setPeople = setPeople
  desktopUiBridge.setPeopleActions = setPeopleActions
  desktopUiBridge.setShareQrOutputs = setShareQrOutputs
  desktopUiBridge.setShellActions = setShellActions
  desktopUiBridge.setShellBusy = setShellBusy
  desktopUiBridge.setStatus = setStatus
  desktopUiBridge.setTreeholeActions = setTreeholeActions
  desktopUiBridge.setTreeholeComposerActions = setTreeholeComposerActions
  desktopUiBridge.setTreeholePosts = setTreeholePosts

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      globalThis.localStorage?.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      // Theme persistence is optional; the UI still works without storage.
    }
  }, [theme])

  useEffect(() => {
    document.body.setAttribute('aria-busy', String(isShellBusy))
  }, [isShellBusy])

  return {
    activeTab,
    contextForm,
    contextFormActions,
    controls,
    directComposer,
    directComposerActions,
    directContactPicker,
    directContactPickerActions,
    directMessageActions,
    directMessages,
    homeComposerActions,
    homeMessages,
    largeQr,
    people,
    peopleActions,
    setContextForm,
    setDirectComposer,
    setTheme,
    shareQrOutputs,
    shellActions,
    status,
    theme,
    treeholeActions,
    treeholeComposerActions,
    treeholePosts
  }
}

function getInitialTheme() {
  try {
    const savedTheme = globalThis.localStorage?.getItem(THEME_STORAGE_KEY)
    if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme
  } catch {
    // Ignore unavailable storage and fall through to system preference.
  }

  return globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}
