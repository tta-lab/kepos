import { createDesktopDirectContactPickerViewModel } from './desktop-direct-contact-picker-view-model.ts'
import { createDesktopDirectMessageListViewModel } from './desktop-direct-view-model.ts'
import { createDesktopHomeChatViewModel } from './desktop-home-chat-view-model.ts'
import { createDesktopPeopleViewModel } from './desktop-people-view-model.ts'
import { createDesktopStatusViewModel } from './desktop-status-view-model.ts'
import { createDesktopTreeholeViewModel } from './desktop-treehole-view-model.ts'
import { createDmThreadListView } from './dm-thread-list.ts'
import { createHomeOwnerViewModel } from './home-owner-view-model.ts'
import type { ContactBook } from './contact-book.ts'
import type { DesktopState } from './desktop-state.ts'

type MessageSession = {
  messages?: unknown[]
}

type StatusSession = NonNullable<Parameters<typeof createDesktopStatusViewModel>[0]>['session']
type HomeMessages = NonNullable<Parameters<typeof createDesktopHomeChatViewModel>[0]>['messages']
type DirectMessages = NonNullable<
  Parameters<typeof createDesktopDirectMessageListViewModel>[0]
>['messages']
type TreeholePosts = NonNullable<Parameters<typeof createDesktopTreeholeViewModel>[0]>['posts']
type TreeholeFormatTime = NonNullable<
  NonNullable<Parameters<typeof createDesktopTreeholeViewModel>[0]>['formatTime']
>

type DesktopRenderUi = {
  setActiveHomeOwnerProfileId(profileId: string): void
  setActiveTab(tab: DesktopState['activeTab']): void
  setControls(controls: Record<string, boolean>): void
  setDirectContactPicker(viewModel: unknown): void
  setDirectMessages(messages: unknown): void
  setDirectThreads(threads: unknown): void
  setHomeMessages(messages: unknown): void
  setHomeOwner(viewModel: unknown): void
  setPeople(viewModel: unknown): void
  setShellBusy(busy: boolean): void
  setStatus(viewModel: unknown): void
  setTreeholePosts(posts: unknown): void
}

export type DesktopRenderPresenter = {
  render(snapshot: {
    contactBook: ContactBook | null
    directComposerRecipientProfileId?: string
    dmSession?: MessageSession | null
    dmThreads?: unknown[]
    pendingCommand?: string | null
    session?: MessageSession | null
    state: DesktopState
  }): void
}

export function createDesktopRenderPresenter({
  formatTime = (value) =>
    new Date(value ?? Date.now()).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    }),
  shortenProfileId = (value) => `${value.slice(0, 8)}...${value.slice(-8)}`,
  ui
}: {
  formatTime?: TreeholeFormatTime
  shortenProfileId?: (value: string) => string
  ui?: DesktopRenderUi | null
}): DesktopRenderPresenter {
  function render({
    contactBook,
    directComposerRecipientProfileId = '',
    dmSession = null,
    dmThreads = [],
    pendingCommand = null,
    session = null,
    state
  }: {
    contactBook: ContactBook | null
    directComposerRecipientProfileId?: string
    dmSession?: MessageSession | null
    dmThreads?: unknown[]
    pendingCommand?: string | null
    session?: MessageSession | null
    state: DesktopState
  }): void {
    const inRoom = state.view === 'room'
    const isActionPending = Boolean(pendingCommand)

    ui?.setShellBusy(isActionPending)
    ui?.setActiveHomeOwnerProfileId(state.activeHomeOwnerProfileId || '')
    ui?.setStatus(
      createDesktopStatusViewModel({
        session: session as StatusSession,
        shortenProfileId,
        state
      })
    )
    ui?.setControls({
      canCreateHome: !inRoom && !isActionPending,
      canLeaveHome: inRoom && !isActionPending,
      canPostTreehole: Boolean(state.treeholeCanPost),
      canUseDirectComposer: inRoom,
      canUseHomeChatComposer: inRoom,
      canUseHomeQrJoin: !isActionPending && !inRoom,
      canUseManualHomeJoin: !isActionPending && !inRoom,
      canUseTrustProfile: !isActionPending
    })
    ui?.setActiveTab(state.activeTab)
    ui?.setHomeMessages(
      createDesktopHomeChatViewModel({
        messages: (session?.messages || []) as HomeMessages
      })
    )
    ui?.setHomeOwner(
      createHomeOwnerViewModel({
        contacts: contactBook ? Array.from(contactBook.contactsByProfileId.values()) : [],
        localProfileId: (session as StatusSession | null)?.profileId || '',
        ownerProfileId: state.activeHomeOwnerProfileId || '',
        shortenProfileId
      })
    )
    ui?.setDirectMessages(
      createDesktopDirectMessageListViewModel({
        contactBook,
        messages: (dmSession?.messages || []) as DirectMessages,
        shortenProfileId
      })
    )
    ui?.setDirectThreads(
      createDmThreadListView({
        contactBook,
        formatTime,
        messages: (dmSession?.messages || []) as DirectMessages,
        shortenProfileId,
        threads: dmThreads
      })
    )
    ui?.setDirectContactPicker(
      createDesktopDirectContactPickerViewModel({
        contactBook,
        selectedProfileId: directComposerRecipientProfileId
      })
    )
    ui?.setPeople(
      createDesktopPeopleViewModel({
        contactBook,
        shortenProfileId
      })
    )
    ui?.setTreeholePosts(
      createDesktopTreeholeViewModel({
        formatTime,
        posts: state.treeholePosts as TreeholePosts,
        shortenProfileId
      })
    )
  }

  return {
    render
  }
}
