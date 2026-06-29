/* global document */

import { useEffect, useState } from 'react'

type ThemeName = 'light' | 'dark'
type UiAction = (...args: unknown[]) => unknown
type ActiveTab = 'chat' | 'dm' | 'treehole' | 'people'

type StatusState = {
  errorDetailLabel: string
  homeStatusLabel: string
  noticeLabel: string
  peerLabel: string
  profileIdLabel: string
  roomKeyLabel: string
  transportDebugLabel: string
  treeholeStatusLabel: string
}
type ControlsState = {
  canCreateHome: boolean
  canLeaveHome: boolean
  canPostTreehole: boolean
  canUseDirectComposer: boolean
  canUseHomeQrJoin: boolean
  canUseHomeChatComposer: boolean
  canUseManualHomeJoin: boolean
  canUseTrustProfile: boolean
}
type ContextFormState = {
  displayName: string
  homeQrUri: string
  roomKey: string
  trustAlias: string
  trustQrUri: string
}
type LargeQrState = {
  isOpen: boolean
  svg: string
  title: string
}
type ShareQrOutputsState = {
  homeSvg: string
  homeUri: string
  profileSvg: string
  profileUri: string
}

type DirectMessageView = { actions?: unknown; [key: string]: unknown }
type DirectContactPickerState = {
  contacts: unknown[]
  empty: {
    actionLabel: string
    copy: string
    title: string
  }
}
type DirectComposerState = {
  text: string
  toProfileId: string
}
type PeopleState = {
  messageRequests: unknown[]
  trustedContacts: unknown[]
}

type ContextFormActions = Record<
  | 'copyHomeQr'
  | 'copyProfileQr'
  | 'createHome'
  | 'joinHomeQr'
  | 'joinManualHome'
  | 'showLargeHomeQr'
  | 'showLargeProfileQr'
  | 'trustProfileQr'
  | 'updateDisplayName',
  UiAction
>
type DirectContactPickerActions = Record<'openPeople' | 'selectContact', UiAction>
type DirectComposerActions = Record<'sendDirectMessage' | 'updateRecipient', UiAction>
type DirectMessageActions = Record<'acceptMessage' | 'ignoreMessage', UiAction>
type HomeComposerActions = Record<'sendHomeMessage', UiAction>
type PeopleActions = Record<
  'acceptMessageRequest' | 'ignoreMessageRequest' | 'revokeContact',
  UiAction
>
type ShellActions = Record<'hideLargeQr' | 'leaveHome' | 'setTab', UiAction>
type TreeholeActions = Record<'commentPost' | 'likePost', UiAction>
type TreeholeComposerActions = Record<'postTreehole', UiAction>

type DesktopUiBridge = {
  setActiveTab: (tab: ActiveTab) => void
  setContextFormActions: (actions: ContextFormActions) => void
  setContextFormDraft: (draft?: Partial<ContextFormState>) => void
  setControls: (controls: ControlsState) => void
  setDirectComposerActions: (actions: DirectComposerActions) => void
  setDirectComposerRecipient: (toProfileId?: string) => void
  setDirectContactPicker: (picker: DirectContactPickerState) => void
  setDirectContactPickerActions: (actions: DirectContactPickerActions) => void
  setDirectMessageActions: (actions: DirectMessageActions) => void
  setDirectMessages: (messages: DirectMessageView[]) => void
  setHomeComposerActions: (actions: HomeComposerActions) => void
  setHomeMessages: (messages: unknown[]) => void
  setLargeQr: (qr: LargeQrState) => void
  setPeople: (people: PeopleState) => void
  setPeopleActions: (actions: PeopleActions) => void
  setShareQrOutputs: (outputs: ShareQrOutputsState) => void
  setShellActions: (actions: ShellActions) => void
  setShellBusy: (isBusy: boolean) => void
  setStatus: (status: StatusState) => void
  setTreeholeActions: (actions: TreeholeActions) => void
  setTreeholeComposerActions: (actions: TreeholeComposerActions) => void
  setTreeholePosts: (posts: unknown[]) => void
}

type DesktopUiApi = {
  setActiveTab(tab?: ActiveTab): void
  setContextFormActions(actions?: ContextFormActions): void
  setContextFormDraft(draft?: Partial<ContextFormState>): void
  setControls(controls?: ControlsState): void
  setDirectComposerActions(actions?: DirectComposerActions): void
  setDirectComposerRecipient(toProfileId?: string): void
  setDirectContactPicker(picker?: DirectContactPickerState): void
  setDirectContactPickerActions(actions?: DirectContactPickerActions): void
  setDirectMessageActions(actions?: DirectMessageActions): void
  setDirectMessages(messages?: DirectMessageView[]): void
  setHomeComposerActions(actions?: HomeComposerActions): void
  setHomeMessages(messages?: unknown[]): void
  setLargeQr(qr?: LargeQrState): void
  setPeople(people?: PeopleState): void
  setPeopleActions(actions?: PeopleActions): void
  setShareQrOutputs(outputs?: ShareQrOutputsState): void
  setShellActions(actions?: ShellActions): void
  setShellBusy(isBusy?: boolean): void
  setStatus(status?: StatusState): void
  setTreeholeActions(actions?: TreeholeActions): void
  setTreeholeComposerActions(actions?: TreeholeComposerActions): void
  setTreeholePosts(posts?: unknown[]): void
}
type DesktopGlobal = typeof globalThis & { keposDesktopUi: DesktopUiApi }

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
const DEFAULT_CONTEXT_FORM_ACTIONS: ContextFormActions = {
  copyHomeQr: () => {},
  copyProfileQr: () => {},
  createHome: () => {},
  joinHomeQr: () => {},
  joinManualHome: () => {},
  showLargeHomeQr: () => {},
  showLargeProfileQr: () => {},
  trustProfileQr: () => {},
  updateDisplayName: () => {}
}
const DEFAULT_DIRECT_COMPOSER_ACTIONS: DirectComposerActions = {
  sendDirectMessage: () => {},
  updateRecipient: () => {}
}
const DEFAULT_DIRECT_CONTACT_PICKER_ACTIONS: DirectContactPickerActions = {
  openPeople: () => {},
  selectContact: () => {}
}
const DEFAULT_DIRECT_MESSAGE_ACTIONS: DirectMessageActions = {
  acceptMessage: () => {},
  ignoreMessage: () => {}
}
const DEFAULT_HOME_COMPOSER_ACTIONS: HomeComposerActions = {
  sendHomeMessage: () => {}
}
const DEFAULT_PEOPLE_ACTIONS: PeopleActions = {
  acceptMessageRequest: () => {},
  ignoreMessageRequest: () => {},
  revokeContact: () => {}
}
const DEFAULT_SHELL_ACTIONS: ShellActions = {
  hideLargeQr: () => {},
  leaveHome: () => {},
  setTab: () => {}
}
const DEFAULT_TREEHOLE_ACTIONS: TreeholeActions = {
  commentPost: () => {},
  likePost: () => {}
}
const DEFAULT_TREEHOLE_COMPOSER_ACTIONS: TreeholeComposerActions = {
  postTreehole: () => {}
}
const NOOP_SET_STATE = () => {}
const desktopUiBridge: DesktopUiBridge = {
  setActiveTab: NOOP_SET_STATE,
  setContextFormActions: NOOP_SET_STATE,
  setContextFormDraft: () => {},
  setControls: NOOP_SET_STATE,
  setDirectComposerActions: NOOP_SET_STATE,
  setDirectComposerRecipient: () => {},
  setDirectContactPicker: NOOP_SET_STATE,
  setDirectContactPickerActions: NOOP_SET_STATE,
  setDirectMessageActions: NOOP_SET_STATE,
  setDirectMessages: NOOP_SET_STATE,
  setHomeComposerActions: NOOP_SET_STATE,
  setHomeMessages: NOOP_SET_STATE,
  setLargeQr: NOOP_SET_STATE,
  setPeople: NOOP_SET_STATE,
  setPeopleActions: NOOP_SET_STATE,
  setShareQrOutputs: NOOP_SET_STATE,
  setShellActions: NOOP_SET_STATE,
  setShellBusy: NOOP_SET_STATE,
  setStatus: NOOP_SET_STATE,
  setTreeholeActions: NOOP_SET_STATE,
  setTreeholeComposerActions: NOOP_SET_STATE,
  setTreeholePosts: NOOP_SET_STATE
}

;(globalThis as DesktopGlobal).keposDesktopUi = {
  setActiveTab(tab = 'chat') {
    desktopUiBridge.setActiveTab(tab)
  },
  setContextFormActions(actions = DEFAULT_CONTEXT_FORM_ACTIONS) {
    desktopUiBridge.setContextFormActions(actions)
  },
  setContextFormDraft(draft = {}) {
    desktopUiBridge.setContextFormDraft(draft)
  },
  setControls(controls = DEFAULT_CONTROLS) {
    desktopUiBridge.setControls(controls)
  },
  setDirectComposerActions(actions = DEFAULT_DIRECT_COMPOSER_ACTIONS) {
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
  setDirectContactPickerActions(actions = DEFAULT_DIRECT_CONTACT_PICKER_ACTIONS) {
    desktopUiBridge.setDirectContactPickerActions(actions)
  },
  setDirectMessageActions(actions = DEFAULT_DIRECT_MESSAGE_ACTIONS) {
    desktopUiBridge.setDirectMessageActions(actions)
  },
  setDirectMessages(messages = []) {
    desktopUiBridge.setDirectMessages(messages)
  },
  setHomeComposerActions(actions = DEFAULT_HOME_COMPOSER_ACTIONS) {
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
  setPeopleActions(actions = DEFAULT_PEOPLE_ACTIONS) {
    desktopUiBridge.setPeopleActions(actions)
  },
  setShareQrOutputs(outputs = EMPTY_SHARE_QR_OUTPUTS) {
    desktopUiBridge.setShareQrOutputs(outputs)
  },
  setShellActions(actions = DEFAULT_SHELL_ACTIONS) {
    desktopUiBridge.setShellActions(actions)
  },
  setShellBusy(isBusy = false) {
    desktopUiBridge.setShellBusy(isBusy)
  },
  setStatus(status = DEFAULT_STATUS) {
    desktopUiBridge.setStatus(status)
  },
  setTreeholeActions(actions = DEFAULT_TREEHOLE_ACTIONS) {
    desktopUiBridge.setTreeholeActions(actions)
  },
  setTreeholeComposerActions(actions = DEFAULT_TREEHOLE_COMPOSER_ACTIONS) {
    desktopUiBridge.setTreeholeComposerActions(actions)
  },
  setTreeholePosts(posts = []) {
    desktopUiBridge.setTreeholePosts(posts)
  }
}

export function useDesktopAppModel() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('chat')
  const [contextForm, setContextForm] = useState(DEFAULT_CONTEXT_FORM)
  const [contextFormActions, setContextFormActions] = useState<ContextFormActions>(
    DEFAULT_CONTEXT_FORM_ACTIONS
  )
  const [controls, setControls] = useState(DEFAULT_CONTROLS)
  const [directContactPicker, setDirectContactPicker] = useState<DirectContactPickerState>({
    contacts: [],
    empty: {
      actionLabel: 'Add trusted friend',
      copy: 'Add a trusted friend before starting a direct message.',
      title: 'No trusted friends yet'
    }
  })
  const [directContactPickerActions, setDirectContactPickerActions] =
    useState<DirectContactPickerActions>(DEFAULT_DIRECT_CONTACT_PICKER_ACTIONS)
  const [directComposer, setDirectComposer] = useState<DirectComposerState>({
    text: '',
    toProfileId: ''
  })
  const [directComposerActions, setDirectComposerActions] = useState<DirectComposerActions>(
    DEFAULT_DIRECT_COMPOSER_ACTIONS
  )
  const [directMessageActions, setDirectMessageActions] = useState<DirectMessageActions>(
    DEFAULT_DIRECT_MESSAGE_ACTIONS
  )
  const [directMessages, setDirectMessages] = useState<DirectMessageView[]>([])
  const [homeComposerActions, setHomeComposerActions] = useState<HomeComposerActions>(
    DEFAULT_HOME_COMPOSER_ACTIONS
  )
  const [homeMessages, setHomeMessages] = useState<unknown[]>([])
  const [largeQr, setLargeQr] = useState(EMPTY_LARGE_QR)
  const [people, setPeople] = useState<PeopleState>({ messageRequests: [], trustedContacts: [] })
  const [peopleActions, setPeopleActions] = useState<PeopleActions>(DEFAULT_PEOPLE_ACTIONS)
  const [shareQrOutputs, setShareQrOutputs] = useState(EMPTY_SHARE_QR_OUTPUTS)
  const [isShellBusy, setShellBusy] = useState(false)
  const [shellActions, setShellActions] = useState<ShellActions>(DEFAULT_SHELL_ACTIONS)
  const [treeholeActions, setTreeholeActions] = useState<TreeholeActions>(DEFAULT_TREEHOLE_ACTIONS)
  const [treeholeComposerActions, setTreeholeComposerActions] = useState<TreeholeComposerActions>(
    DEFAULT_TREEHOLE_COMPOSER_ACTIONS
  )
  const [treeholePosts, setTreeholePosts] = useState<unknown[]>([])
  const [status, setStatus] = useState(DEFAULT_STATUS)
  const [theme, setTheme] = useState(getInitialTheme)

  desktopUiBridge.setActiveTab = (tab) => setActiveTab(tab)
  desktopUiBridge.setContextFormActions = (actions) => setContextFormActions(actions)
  desktopUiBridge.setContextFormDraft = (draft = {}) => {
    setContextForm((current) => ({ ...current, ...draft }))
  }
  desktopUiBridge.setControls = (controls) => setControls(controls)
  desktopUiBridge.setDirectComposerActions = (actions) => setDirectComposerActions(actions)
  desktopUiBridge.setDirectComposerRecipient = (toProfileId = '') => {
    setDirectComposer((current) => ({ ...current, toProfileId }))
  }
  desktopUiBridge.setDirectContactPicker = (picker) => setDirectContactPicker(picker)
  desktopUiBridge.setDirectContactPickerActions = (actions) =>
    setDirectContactPickerActions(actions)
  desktopUiBridge.setDirectMessageActions = (actions) => setDirectMessageActions(actions)
  desktopUiBridge.setDirectMessages = (messages) => setDirectMessages(messages)
  desktopUiBridge.setHomeComposerActions = (actions) => setHomeComposerActions(actions)
  desktopUiBridge.setHomeMessages = (messages) => setHomeMessages(messages)
  desktopUiBridge.setLargeQr = (qr) => setLargeQr(qr)
  desktopUiBridge.setPeople = (nextPeople) => setPeople(nextPeople)
  desktopUiBridge.setPeopleActions = (actions) => setPeopleActions(actions)
  desktopUiBridge.setShareQrOutputs = (outputs) => setShareQrOutputs(outputs)
  desktopUiBridge.setShellActions = (actions) => setShellActions(actions)
  desktopUiBridge.setShellBusy = (isBusy) => setShellBusy(isBusy)
  desktopUiBridge.setStatus = (nextStatus) => setStatus(nextStatus)
  desktopUiBridge.setTreeholeActions = (actions) => setTreeholeActions(actions)
  desktopUiBridge.setTreeholeComposerActions = (actions) => setTreeholeComposerActions(actions)
  desktopUiBridge.setTreeholePosts = (posts) => setTreeholePosts(posts)

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

function getInitialTheme(): ThemeName {
  try {
    const savedTheme = globalThis.localStorage?.getItem(THEME_STORAGE_KEY)
    if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme
  } catch {
    // Ignore unavailable storage and fall through to system preference.
  }

  return globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}
