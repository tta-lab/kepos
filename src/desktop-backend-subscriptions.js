import { setDesktopTreehole } from './desktop-state.ts'

export function createDesktopBackendSubscriptions({
  backendClient,
  getState,
  onError,
  onRender,
  setContactBook,
  setContextFormDraft = () => {},
  setDirectComposerRecipient = () => {},
  setDmSession,
  setHomeSession,
  setShareQrOutputs = () => {},
  setState
}) {
  const unsubscribers = [
    backendClient.subscribe('homeMessageReceived', (nextSession) => {
      setHomeSession(nextSession)
      onRender()
    }),
    backendClient.subscribe('contactBookChanged', (nextContactBook) => {
      setContactBook(nextContactBook)
      onRender()
    }),
    backendClient.subscribe('contextFormDraftChanged', (draft) => {
      setContextFormDraft(draft)
      onRender()
    }),
    backendClient.subscribe('desktopStateChanged', (nextState) => {
      setState({
        ...nextState,
        activeTab: getState().activeTab || nextState.activeTab
      })
      onRender()
    }),
    backendClient.subscribe('directComposerRecipientChanged', (profileId) => {
      setDirectComposerRecipient(profileId)
      onRender()
    }),
    backendClient.subscribe('dmMessageReceived', (nextSession) => {
      setDmSession(nextSession)
      onRender()
    }),
    backendClient.subscribe('treeholeStateChanged', (snapshot) => {
      setState(setDesktopTreehole(getState(), snapshot))
      onRender()
    }),
    backendClient.subscribe('peerCountChanged', ({ peers }) => {
      setState({ ...getState(), peers })
      onRender()
    }),
    backendClient.subscribe('transportDebugChanged', (transportDebug) => {
      setState({ ...getState(), transportDebug })
      onRender()
    }),
    backendClient.subscribe('shareQrOutputsChanged', (outputs) => {
      setShareQrOutputs(outputs)
      onRender()
    }),
    backendClient.subscribe('errorReceived', onError)
  ]

  return () => {
    for (const unsubscribe of unsubscribers) unsubscribe()
  }
}
