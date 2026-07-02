/* global document */

import { useEffect, useRef, useState } from 'react'
import {
  createProfileRecentPostsViewModel,
  type ProfileRecentPostCache,
  type ProfileRecentTreeholePost
} from '../src/profile-recent-posts-view-model.ts'
import {
  loadProfileRecentPostCacheFromStorage,
  saveProfileRecentPostCacheToStorage,
  updateProfileRecentPostCache
} from '../src/profile-recent-post-cache-storage.ts'
import { createRequestTargetProfileViewModel as createSharedRequestTargetProfileViewModel } from '../src/request-target-profile-view-model.ts'
import type {
  BlockedContactView,
  MessageRequestView,
  OutgoingRequestView,
  TrustedContactView
} from './people-components.tsx'

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
  avatarUri: string
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
type ProfileRequestTargetState = {
  avatar?: {
    imageUri?: string
    initials: string
    label: string
    tone: string
  }
  canOpenProfile?: boolean
  canSendRequest?: boolean
  copy?: string
  displayName?: string
  relationshipState?: string
  shortProfileId?: string
  statusLabel?: string
  profileId: string
} | null

type DirectMessageView = { actions?: unknown; [key: string]: unknown }
type DirectThreadView = { [key: string]: unknown }
type HomeOwnerState = {
  actionLabel?: string
  canOpenProfile: boolean
  ownerProfileId: string
  subtitle: string
  title: string
}
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
  blockedContacts: BlockedContactView[]
  messageRequests: MessageRequestView[]
  outgoingRequests: OutgoingRequestView[]
  profileDetails: TrustedContactView[]
  trustedContacts: TrustedContactView[]
}

type ContextFormActions = Record<
  | 'copyHomeQr'
  | 'copyProfileQr'
  | 'createHome'
  | 'joinHomeQr'
  | 'joinManualHome'
  | 'showLargeHomeQr'
  | 'showLargeProfileQr'
  | 'prepareProfileRequestTarget'
  | 'updateAvatarMedia'
  | 'updateAvatarUri'
  | 'updateDisplayName',
  UiAction
>
type DirectContactPickerActions = Record<'openPeople' | 'selectContact', UiAction>
type DirectComposerActions = Record<'sendDirectMessage' | 'updateRecipient', UiAction>
type DirectMessageActions = Record<'acceptMessage' | 'ignoreMessage', UiAction>
type HomeComposerActions = Record<'sendHomeMessage', UiAction>
type PeopleActions = Record<
  | 'acceptMessageRequest'
  | 'allowContactRequests'
  | 'closeProfile'
  | 'enterContactHome'
  | 'ignoreMessageRequest'
  | 'messageContact'
  | 'openProfile'
  | 'retryOutgoingFriendRequest'
  | 'revokeContact',
  UiAction
>
type BackendPeopleActions = Omit<PeopleActions, 'closeProfile' | 'openProfile'>
type ShellActions = Record<'hideLargeQr' | 'leaveHome' | 'setTab', UiAction>
type TreeholeActions = Record<'commentPost' | 'likePost', UiAction>
type TreeholeComposerActions = Record<'postTreehole', UiAction>

type DesktopUiBridge = {
  setActiveHomeOwnerProfileId: (profileId: string) => void
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
  setDirectThreads: (threads: DirectThreadView[]) => void
  setHomeComposerActions: (actions: HomeComposerActions) => void
  setHomeMessages: (messages: unknown[]) => void
  setHomeOwner: (owner: HomeOwnerState) => void
  setLargeQr: (qr: LargeQrState) => void
  setPeople: (people: PeopleState) => void
  setPeopleActions: (actions: BackendPeopleActions) => void
  setProfileRequestTarget: (target: ProfileRequestTargetState) => void
  setShareQrOutputs: (outputs: ShareQrOutputsState) => void
  setShellActions: (actions: ShellActions) => void
  setShellBusy: (isBusy: boolean) => void
  setStatus: (status: StatusState) => void
  setTreeholeActions: (actions: TreeholeActions) => void
  setTreeholeComposerActions: (actions: TreeholeComposerActions) => void
  setTreeholePosts: (posts: unknown[]) => void
}

type DesktopUiApi = {
  setActiveHomeOwnerProfileId(profileId?: string): void
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
  setDirectThreads(threads?: DirectThreadView[]): void
  setHomeComposerActions(actions?: HomeComposerActions): void
  setHomeMessages(messages?: unknown[]): void
  setHomeOwner(owner?: HomeOwnerState): void
  setLargeQr(qr?: LargeQrState): void
  setPeople(people?: PeopleState): void
  setPeopleActions(actions?: BackendPeopleActions): void
  setProfileRequestTarget(target?: ProfileRequestTargetState): void
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
  noticeLabel: 'Show My QR or add a friend.',
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
  avatarUri: '',
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
const DEFAULT_HOME_OWNER = {
  canOpenProfile: false,
  ownerProfileId: '',
  subtitle: 'Live chat and presence',
  title: 'Home'
}
const DEFAULT_CONTEXT_FORM_ACTIONS: ContextFormActions = {
  copyHomeQr: () => {},
  copyProfileQr: () => {},
  createHome: () => {},
  joinHomeQr: () => {},
  joinManualHome: () => {},
  showLargeHomeQr: () => {},
  showLargeProfileQr: () => {},
  prepareProfileRequestTarget: () => {},
  updateAvatarMedia: () => {},
  updateAvatarUri: () => {},
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
const DEFAULT_BACKEND_PEOPLE_ACTIONS: BackendPeopleActions = {
  acceptMessageRequest: () => {},
  allowContactRequests: () => {},
  enterContactHome: () => {},
  ignoreMessageRequest: () => {},
  messageContact: () => {},
  retryOutgoingFriendRequest: () => {},
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
  setActiveHomeOwnerProfileId: NOOP_SET_STATE,
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
  setDirectThreads: NOOP_SET_STATE,
  setHomeComposerActions: NOOP_SET_STATE,
  setHomeMessages: NOOP_SET_STATE,
  setHomeOwner: NOOP_SET_STATE,
  setLargeQr: NOOP_SET_STATE,
  setPeople: NOOP_SET_STATE,
  setPeopleActions: NOOP_SET_STATE,
  setProfileRequestTarget: NOOP_SET_STATE,
  setShareQrOutputs: NOOP_SET_STATE,
  setShellActions: NOOP_SET_STATE,
  setShellBusy: NOOP_SET_STATE,
  setStatus: NOOP_SET_STATE,
  setTreeholeActions: NOOP_SET_STATE,
  setTreeholeComposerActions: NOOP_SET_STATE,
  setTreeholePosts: NOOP_SET_STATE
}

;(globalThis as DesktopGlobal).keposDesktopUi = {
  setActiveHomeOwnerProfileId(profileId = '') {
    desktopUiBridge.setActiveHomeOwnerProfileId(profileId)
  },
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
        actionLabel: 'Open Contacts',
        copy: 'Open Contacts to scan a profile or accept a friend request.',
        title: 'No message threads yet'
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
  setDirectThreads(threads = []) {
    desktopUiBridge.setDirectThreads(threads)
  },
  setHomeComposerActions(actions = DEFAULT_HOME_COMPOSER_ACTIONS) {
    desktopUiBridge.setHomeComposerActions(actions)
  },
  setHomeMessages(messages = []) {
    desktopUiBridge.setHomeMessages(messages)
  },
  setHomeOwner(owner = DEFAULT_HOME_OWNER) {
    desktopUiBridge.setHomeOwner(owner)
  },
  setLargeQr(qr = EMPTY_LARGE_QR) {
    desktopUiBridge.setLargeQr(qr)
  },
  setPeople(
    people = {
      blockedContacts: [],
      messageRequests: [],
      outgoingRequests: [],
      profileDetails: [],
      trustedContacts: []
    }
  ) {
    desktopUiBridge.setPeople(people)
  },
  setPeopleActions(actions = DEFAULT_BACKEND_PEOPLE_ACTIONS) {
    desktopUiBridge.setPeopleActions(actions)
  },
  setProfileRequestTarget(target = null) {
    desktopUiBridge.setProfileRequestTarget(target)
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
  const [activeHomeOwnerProfileId, setActiveHomeOwnerProfileId] = useState('')
  const activeHomeOwnerProfileIdRef = useRef('')
  const [activeTab, setActiveTab] = useState<ActiveTab>('people')
  const [contextForm, setContextForm] = useState(DEFAULT_CONTEXT_FORM)
  const [contextFormActions, setContextFormActions] = useState<ContextFormActions>(
    DEFAULT_CONTEXT_FORM_ACTIONS
  )
  const [controls, setControls] = useState(DEFAULT_CONTROLS)
  const [directContactPicker, setDirectContactPicker] = useState<DirectContactPickerState>({
    contacts: [],
    empty: {
      actionLabel: 'Open Contacts',
      copy: 'Open Contacts to scan a profile or accept a friend request.',
      title: 'No message threads yet'
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
  const [directThreads, setDirectThreads] = useState<DirectThreadView[]>([])
  const [homeComposerActions, setHomeComposerActions] = useState<HomeComposerActions>(
    DEFAULT_HOME_COMPOSER_ACTIONS
  )
  const [homeMessages, setHomeMessages] = useState<unknown[]>([])
  const [homeOwner, setHomeOwner] = useState<HomeOwnerState>(DEFAULT_HOME_OWNER)
  const [largeQr, setLargeQr] = useState(EMPTY_LARGE_QR)
  const [people, setPeople] = useState<PeopleState>({
    blockedContacts: [],
    messageRequests: [],
    outgoingRequests: [],
    profileDetails: [],
    trustedContacts: []
  })
  const [backendPeopleActions, setPeopleActions] = useState<BackendPeopleActions>(
    DEFAULT_BACKEND_PEOPLE_ACTIONS
  )
  const [selectedProfileId, setSelectedProfileId] = useState('')
  const [profileRequestTarget, setProfileRequestTarget] = useState<ProfileRequestTargetState>(null)
  const [shareQrOutputs, setShareQrOutputs] = useState(EMPTY_SHARE_QR_OUTPUTS)
  const [isShellBusy, setShellBusy] = useState(false)
  const [shellActions, setShellActions] = useState<ShellActions>(DEFAULT_SHELL_ACTIONS)
  const [treeholeActions, setTreeholeActions] = useState<TreeholeActions>(DEFAULT_TREEHOLE_ACTIONS)
  const [treeholeComposerActions, setTreeholeComposerActions] = useState<TreeholeComposerActions>(
    DEFAULT_TREEHOLE_COMPOSER_ACTIONS
  )
  const [profileRecentPostCache, setProfileRecentPostCache] = useState<ProfileRecentPostCache>(
    loadInitialProfileRecentPostCache
  )
  const [treeholePosts, setTreeholePosts] = useState<unknown[]>([])
  const [status, setStatus] = useState(DEFAULT_STATUS)
  const [theme, setTheme] = useState(getInitialTheme)

  desktopUiBridge.setActiveHomeOwnerProfileId = (profileId) => {
    const nextProfileId = profileId || ''
    activeHomeOwnerProfileIdRef.current = nextProfileId
    setActiveHomeOwnerProfileId(nextProfileId)
  }
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
  desktopUiBridge.setDirectThreads = (threads) => setDirectThreads(threads)
  desktopUiBridge.setHomeComposerActions = (actions) => setHomeComposerActions(actions)
  desktopUiBridge.setHomeMessages = (messages) => setHomeMessages(messages)
  desktopUiBridge.setHomeOwner = (owner) => setHomeOwner(owner)
  desktopUiBridge.setLargeQr = (qr) => setLargeQr(qr)
  desktopUiBridge.setPeople = (nextPeople) => setPeople(nextPeople)
  desktopUiBridge.setPeopleActions = (actions) =>
    setPeopleActions({ ...DEFAULT_BACKEND_PEOPLE_ACTIONS, ...actions })
  desktopUiBridge.setProfileRequestTarget = (target) => setProfileRequestTarget(target)
  desktopUiBridge.setShareQrOutputs = (outputs) => setShareQrOutputs(outputs)
  desktopUiBridge.setShellActions = (actions) => setShellActions(actions)
  desktopUiBridge.setShellBusy = (isBusy) => setShellBusy(isBusy)
  desktopUiBridge.setStatus = (nextStatus) => setStatus(nextStatus)
  desktopUiBridge.setTreeholeActions = (actions) => setTreeholeActions(actions)
  desktopUiBridge.setTreeholeComposerActions = (actions) => setTreeholeComposerActions(actions)
  desktopUiBridge.setTreeholePosts = (posts) => {
    setTreeholePosts(posts)
    const ownerProfileId = activeHomeOwnerProfileIdRef.current
    if (ownerProfileId && posts.length > 0) {
      setProfileRecentPostCache((current) => {
        const nextCache = updateProfileRecentPostCache(current, {
          ownerProfileId,
          posts: posts as ProfileRecentTreeholePost[]
        })
        saveProfileRecentPostCache(nextCache)
        return nextCache
      })
    }
  }

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

  const peopleActions: PeopleActions = {
    ...backendPeopleActions,
    closeProfile: () => setSelectedProfileId(''),
    openProfile: (profileId) => {
      setSelectedProfileId(String(profileId || ''))
      setActiveTab('people')
    }
  }
  const trustedContactsWithRecent = people.trustedContacts.map((profile) =>
    withProfileRecentPosts({
      activeHomeOwnerProfileId,
      profileRecentPostCache,
      profile,
      treeholePosts
    })
  )
  const peopleWithRecent = {
    ...people,
    profileDetails: (people.profileDetails || people.trustedContacts).map((profile) =>
      withProfileRecentPosts({
        activeHomeOwnerProfileId,
        profileRecentPostCache,
        profile,
        treeholePosts
      })
    ),
    trustedContacts: trustedContactsWithRecent
  }
  const selectedProfileDetail = peopleWithRecent.profileDetails.find(
    (contact) => contact.profileId === selectedProfileId
  )
  const selectedProfile =
    selectedProfileDetail ||
    (profileRequestTarget?.profileId === selectedProfileId
      ? createRequestTargetProfileViewModel({
          selectedProfileId,
          requestTarget: profileRequestTarget
        })
      : null)

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
    directThreads,
    homeComposerActions,
    homeMessages,
    homeOwner,
    largeQr,
    people: peopleWithRecent,
    peopleActions,
    profileRequestTarget,
    selectedProfile,
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

function withProfileRecentPosts({
  activeHomeOwnerProfileId,
  profileRecentPostCache,
  profile,
  treeholePosts
}: {
  activeHomeOwnerProfileId: string
  profileRecentPostCache: ProfileRecentPostCache
  profile: TrustedContactView
  treeholePosts: unknown[]
}): TrustedContactView {
  return {
    ...profile,
    ...createProfileRecentPostsViewModel({
      activeHomeOwnerProfileId,
      cachedPostsByProfileId: profileRecentPostCache,
      formatTime: formatRecentPostTime,
      posts: treeholePosts as ProfileRecentTreeholePost[],
      selectedProfileId: profile.profileId
    })
  }
}

function formatRecentPostTime(value: number | string | undefined): string {
  return new Date(value ?? Date.now()).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  })
}

function createRequestTargetProfileViewModel({
  selectedProfileId,
  requestTarget
}: {
  selectedProfileId: string
  requestTarget: ProfileRequestTargetState
}): TrustedContactView | null {
  const profile = createSharedRequestTargetProfileViewModel({
    requestTarget,
    selectedProfileId,
    shortenProfileId
  })
  if (!profile) return null

  return {
    alias: profile.displayName,
    avatar: profile.avatar,
    canRemove: profile.canRemove,
    homeActionEnabled: profile.enterHomeEnabled,
    homeActionLabel: profile.enterHomeLabel,
    messageActionEnabled: profile.messageEnabled,
    messageActionLabel: profile.messageLabel,
    profileId: profile.profileId,
    recentCopy: profile.recentCopy,
    recentTitle: profile.recentTitle,
    relationshipState: profile.relationshipState,
    shortProfileId: profile.shortProfileId,
    sourceLabel: profile.sourceLabel,
    statusLabel: profile.statusLabel,
    trustedAtLabel: profile.trustedAtLabel
  }
}

function shortenProfileId(value: string): string {
  return `${value.slice(0, 8)}...${value.slice(-8)}`
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

function loadInitialProfileRecentPostCache(): ProfileRecentPostCache {
  try {
    return loadProfileRecentPostCacheFromStorage({
      storage: globalThis.localStorage
    })
  } catch {
    return {}
  }
}

function saveProfileRecentPostCache(cache: ProfileRecentPostCache): void {
  try {
    saveProfileRecentPostCacheToStorage({
      cache,
      storage: globalThis.localStorage
    })
  } catch {
    // Recent posts cache is an optional profile convenience.
  }
}
