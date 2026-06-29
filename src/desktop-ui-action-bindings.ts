import type { DesktopQrActions } from './desktop-qr-actions.ts'

type DispatchCommand = (command: string, payload?: unknown) => unknown | Promise<unknown>
type ErrorHandler = (error: unknown) => void
type FormPayload = Record<string, any>

type DesktopUiActionRegistrar = {
  setContextFormActions(actions: Record<string, (payload: any) => unknown>): void
  setDirectComposerActions(actions: Record<string, (payload: any) => unknown>): void
  setDirectContactPickerActions(actions: Record<string, (payload: any) => unknown>): void
  setDirectMessageActions(actions: Record<string, (payload: any) => unknown>): void
  setHomeComposerActions(actions: Record<string, (payload: any) => unknown>): void
  setPeopleActions(actions: Record<string, (payload: any) => unknown>): void
  setShellActions(actions: Record<string, (payload: any) => unknown>): void
  setTreeholeActions(actions: Record<string, (payload: any) => unknown>): void
  setTreeholeComposerActions(actions: Record<string, (payload: any) => unknown>): void
}

export function createDesktopUiActionBindings({
  dispatchCommand,
  onError,
  qrActions,
  selectDirectContact,
  setTab,
  ui,
  updateDirectComposerRecipient,
  updateDisplayName
}: {
  dispatchCommand: DispatchCommand
  onError: ErrorHandler
  qrActions: Pick<
    DesktopQrActions,
    'copyQrValue' | 'getShareQrOutputs' | 'hideLargeQr' | 'showLargeQr'
  >
  selectDirectContact: (profileId?: string) => unknown
  setTab: (tab?: string) => unknown
  ui?: DesktopUiActionRegistrar | null
  updateDirectComposerRecipient: (profileId?: string) => unknown
  updateDisplayName: (displayName?: string) => unknown
}): void {
  ui?.setContextFormActions({
    copyHomeQr: () =>
      qrActions
        .copyQrValue({ notice: 'Invite copied.', value: qrActions.getShareQrOutputs().homeUri })
        .catch(onError),
    copyProfileQr: () =>
      qrActions
        .copyQrValue({
          notice: 'Profile QR copied.',
          value: qrActions.getShareQrOutputs().profileUri
        })
        .catch(onError),
    createHome: ({ displayName } = {}) =>
      dispatchCommand('joinHome', { createTreehole: true, displayName, mode: 'host' }),
    joinHomeQr: ({ displayName, uri }) => dispatchCommand('joinHomeUri', { displayName, uri }),
    joinManualHome: ({ displayName, roomKey }) =>
      dispatchCommand('joinHome', { createTreehole: false, displayName, mode: 'peer', roomKey }),
    showLargeHomeQr: ({ returnFocus }) =>
      qrActions
        .showLargeQr({
          returnFocus,
          title: 'Home invite',
          uri: qrActions.getShareQrOutputs().homeUri
        })
        .catch(onError),
    showLargeProfileQr: ({ returnFocus }) =>
      qrActions
        .showLargeQr({
          returnFocus,
          title: 'Profile QR',
          uri: qrActions.getShareQrOutputs().profileUri
        })
        .catch(onError),
    trustProfileQr: ({ alias, displayName, uri }) =>
      dispatchCommand('trustProfileUri', { alias, displayName, uri }),
    updateDisplayName: ({ displayName }) => {
      updateDisplayName(displayName)
      return dispatchCommand('updateDisplayName', { displayName })
    }
  })

  ui?.setDirectContactPickerActions({
    openPeople: () => setTab('people'),
    selectContact: (profileId) => selectDirectContact(profileId)
  })

  ui?.setDirectComposerActions({
    sendDirectMessage: ({ text, toProfileId }) =>
      dispatchCommand('sendDmMessage', { text, toProfileId }),
    updateRecipient: ({ toProfileId }) => updateDirectComposerRecipient(toProfileId)
  })

  ui?.setDirectMessageActions({
    acceptMessage: (message) => dispatchCommand('acceptMessageRequest', { message }),
    ignoreMessage: (message) => dispatchCommand('ignoreMessageRequest', { message })
  })

  ui?.setHomeComposerActions({
    sendHomeMessage: ({ text }) => dispatchCommand('sendHomeMessage', { text })
  })

  ui?.setPeopleActions({
    acceptMessageRequest: (message) => dispatchCommand('acceptMessageRequest', { message }),
    ignoreMessageRequest: (profileId) => dispatchCommand('ignoreMessageRequest', { profileId }),
    revokeContact: (profileId) => dispatchCommand('revokeContact', { profileId })
  })

  ui?.setShellActions({
    hideLargeQr: () => qrActions.hideLargeQr(),
    leaveHome: () => dispatchCommand('leaveHome'),
    setTab: (tab) => setTab(tab)
  })

  ui?.setTreeholeActions({
    commentPost: ({ postId, text }) => dispatchCommand('commentTreehole', { postId, text }),
    likePost: (postId) => dispatchCommand('likeTreehole', { postId })
  })

  ui?.setTreeholeComposerActions({
    postTreehole: ({ text }) => dispatchCommand('postTreehole', { text })
  })
}
