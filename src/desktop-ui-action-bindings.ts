import type { DesktopQrActions, FocusTarget } from './desktop-qr-actions.ts'

type DispatchCommand = (command: string, payload?: unknown) => unknown | Promise<unknown>
type ErrorHandler = (error: unknown) => void
type ActionHandler<TPayload = unknown> = (payload: TPayload) => unknown
type EmptyPayload = Record<string, never>
type FormPayload = Record<string, unknown>
type AvatarMediaPayload = {
  bytesBase64?: string
  mimeType?: string
}
type AvatarUriPayload = {
  avatarUri?: string
}
type DisplayNamePayload = {
  displayName?: string
}
type HomeQrPayload = {
  displayName?: string
  uri?: string
}
type ManualHomePayload = {
  displayName?: string
  roomKey?: string
}
type ProfileRequestTargetPayload = {
  alias?: string
  displayName?: string
  uri?: string
}
type ReturnFocusPayload = {
  returnFocus?: FocusTarget | null
}
type TextPayload = {
  text?: string
}
type DirectMessagePayload = TextPayload & {
  toProfileId?: string
}
type DirectRecipientPayload = {
  toProfileId?: string
}
type TreeholeCommentPayload = TextPayload & {
  postId?: string
}
type ContextFormActions = {
  copyHomeQr: ActionHandler<EmptyPayload>
  copyProfileQr: ActionHandler<EmptyPayload>
  createHome: ActionHandler<DisplayNamePayload>
  joinHomeQr: ActionHandler<HomeQrPayload>
  joinManualHome: ActionHandler<ManualHomePayload>
  prepareProfileRequestTarget: ActionHandler<ProfileRequestTargetPayload>
  showLargeHomeQr: ActionHandler<ReturnFocusPayload>
  showLargeProfileQr: ActionHandler<ReturnFocusPayload>
  updateAvatarMedia: ActionHandler<AvatarMediaPayload>
  updateAvatarUri: ActionHandler<AvatarUriPayload>
  updateDisplayName: ActionHandler<DisplayNamePayload>
}
type DirectComposerActions = {
  sendDirectMessage: ActionHandler<DirectMessagePayload>
  updateRecipient: ActionHandler<DirectRecipientPayload>
}
type DirectContactPickerActions = {
  openPeople: ActionHandler<EmptyPayload>
  selectContact: ActionHandler<string | undefined>
}
type DirectMessageActions = {
  acceptMessage: ActionHandler
  ignoreMessage: ActionHandler
}
type HomeComposerActions = {
  sendHomeMessage: ActionHandler<TextPayload>
}
type PeopleActions = {
  acceptMessageRequest: ActionHandler
  allowContactRequests: ActionHandler<string | undefined>
  enterContactHome: ActionHandler<string | undefined>
  ignoreMessageRequest: ActionHandler<string | undefined>
  messageContact: ActionHandler<string | undefined>
  retryOutgoingFriendRequest: ActionHandler<string | undefined>
  revokeContact: ActionHandler<string | undefined>
}
type ShellActions = {
  hideLargeQr: ActionHandler<EmptyPayload>
  leaveHome: ActionHandler<EmptyPayload>
  setTab: ActionHandler<string | undefined>
}
type TreeholeActions = {
  commentPost: ActionHandler<TreeholeCommentPayload>
  likePost: ActionHandler<string | undefined>
}
type TreeholeComposerActions = {
  postTreehole: ActionHandler<TextPayload>
}

type DesktopUiActionRegistrar = {
  setContextFormActions(actions: ContextFormActions): void
  setDirectComposerActions(actions: DirectComposerActions): void
  setDirectContactPickerActions(actions: DirectContactPickerActions): void
  setDirectMessageActions(actions: DirectMessageActions): void
  setHomeComposerActions(actions: HomeComposerActions): void
  setPeopleActions(actions: PeopleActions): void
  setShellActions(actions: ShellActions): void
  setTreeholeActions(actions: TreeholeActions): void
  setTreeholeComposerActions(actions: TreeholeComposerActions): void
}

export function createDesktopUiActionBindings({
  createReadAt = () => Date.now(),
  dispatchCommand,
  onError,
  qrActions,
  selectDirectContact,
  setTab,
  ui,
  updateDirectComposerRecipient,
  updateAvatarMedia,
  updateAvatarUri,
  updateDisplayName
}: {
  createReadAt?: () => number
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
  updateAvatarMedia: (avatar: FormPayload | AvatarMediaPayload) => unknown
  updateAvatarUri: (avatarUri?: string) => unknown
  updateDisplayName: (displayName?: string) => unknown
}): void {
  ui?.setContextFormActions({
    copyHomeQr: () =>
      qrActions
        .copyQrValue({
          notice: 'Debug Home QR copied.',
          value: qrActions.getShareQrOutputs().homeUri
        })
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
          title: 'Debug Home QR',
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
    prepareProfileRequestTarget: ({ alias, displayName, uri }) => {
      const result = dispatchCommand('prepareProfileRequestTarget', { alias, displayName, uri })
      setTab('dm')
      return result
    },
    updateAvatarMedia: (avatar) => {
      updateAvatarMedia(avatar)
      return dispatchCommand('updateAvatarMedia', avatar)
    },
    updateAvatarUri: ({ avatarUri }) => {
      updateAvatarUri(avatarUri)
      return dispatchCommand('updateAvatarUri', { avatarUri })
    },
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
    updateRecipient: ({ toProfileId }) => {
      updateDirectComposerRecipient(toProfileId)
      const profileId = typeof toProfileId === 'string' ? toProfileId.trim() : ''
      if (!profileId) return
      return Promise.resolve(
        dispatchCommand('markDmThreadRead', { profileId, readAt: createReadAt() })
      ).catch(onError)
    }
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
    allowContactRequests: (profileId) => dispatchCommand('allowContactRequests', { profileId }),
    ignoreMessageRequest: (profileId) => dispatchCommand('ignoreMessageRequest', { profileId }),
    messageContact: (profileId) => {
      selectDirectContact(profileId)
      return setTab('dm')
    },
    enterContactHome: (profileId) => dispatchCommand('enterContactHome', { profileId }),
    retryOutgoingFriendRequest: (profileId) =>
      dispatchCommand('retryOutgoingFriendRequest', { profileId }),
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
