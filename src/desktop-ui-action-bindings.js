export function createDesktopUiActionBindings({
  dispatchCommand,
  onError,
  qrActions,
  selectDirectContact,
  setTab,
  ui,
  updateDirectComposerRecipient,
  updateDisplayName
}) {
  ui?.setContextFormActions({
    copyHomeQr: () =>
      qrActions
        .copyQrValue({ notice: 'Home QR copied.', value: qrActions.getShareQrOutputs().homeUri })
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
          title: 'Home QR',
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
    updateDisplayName: ({ displayName }) => updateDisplayName(displayName)
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
