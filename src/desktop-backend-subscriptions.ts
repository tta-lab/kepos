import { setDesktopTreehole } from './desktop-state.ts'
import type { DesktopState } from './desktop-state.ts'

type BackendClient = {
  subscribe(event: string, handler: (payload?: unknown) => void): () => void
}

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
}: {
  backendClient: BackendClient
  getState: () => DesktopState
  onError: (error?: unknown) => void
  onRender: () => void
  setContactBook: (book: unknown) => void
  setContextFormDraft?: (draft: unknown) => void
  setDirectComposerRecipient?: (profileId: unknown) => void
  setDmSession: (session: unknown) => void
  setHomeSession: (session: unknown) => void
  setShareQrOutputs?: (outputs: unknown) => void
  setState: (state: DesktopState) => void
}): () => void {
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
      const stateSnapshot = nextState as DesktopState
      setState({
        ...stateSnapshot,
        activeTab: getState().activeTab || stateSnapshot.activeTab
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
      setState(setDesktopTreehole(getState(), snapshot as Parameters<typeof setDesktopTreehole>[1]))
      onRender()
    }),
    backendClient.subscribe('peerCountChanged', (payload) => {
      const { peers } = (payload || {}) as { peers?: unknown }
      setState({ ...getState(), peers: Number(peers) || 0 })
      onRender()
    }),
    backendClient.subscribe('transportDebugChanged', (transportDebug) => {
      setState({
        ...getState(),
        transportDebug: transportDebug as DesktopState['transportDebug']
      })
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
