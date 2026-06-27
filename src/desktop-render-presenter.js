import { createDesktopDirectContactPickerViewModel } from './desktop-direct-contact-picker-view-model.js'
import { createDesktopDirectMessageListViewModel } from './desktop-direct-view-model.js'
import { createDesktopHomeChatViewModel } from './desktop-home-chat-view-model.js'
import { createDesktopPeopleViewModel } from './desktop-people-view-model.js'
import { createDesktopStatusViewModel } from './desktop-status-view-model.js'
import { createDesktopTreeholeViewModel } from './desktop-treehole-view-model.js'

export function createDesktopRenderPresenter({
  formatTime = (value) =>
    new Date(value).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    }),
  shortenProfileId = (value) => `${value.slice(0, 8)}...${value.slice(-8)}`,
  ui
}) {
  function render({
    contactBook,
    directComposerRecipientProfileId = '',
    dmSession = null,
    pendingCommand = null,
    session = null,
    state
  }) {
    const inRoom = state.view === 'room'
    const isActionPending = Boolean(pendingCommand)

    ui?.setShellBusy(isActionPending)
    ui?.setStatus(
      createDesktopStatusViewModel({
        session,
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
        messages: session?.messages || []
      })
    )
    ui?.setDirectMessages(
      createDesktopDirectMessageListViewModel({
        messages: dmSession?.messages || [],
        shortenProfileId
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
        posts: state.treeholePosts,
        shortenProfileId
      })
    )
  }

  return {
    render
  }
}
