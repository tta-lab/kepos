import { setDesktopTreehole } from './desktop-state.js'

export function createDesktopBackendSubscriptions({
  backendClient,
  getState,
  onError,
  onRender,
  setDmSession,
  setHomeSession,
  setState
}) {
  const unsubscribers = [
    backendClient.subscribe('homeMessageReceived', (nextSession) => {
      setHomeSession(nextSession)
      onRender()
    }),
    backendClient.subscribe('desktopStateChanged', (nextState) => {
      setState(nextState)
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
    backendClient.subscribe('errorReceived', onError)
  ]

  return () => {
    for (const unsubscribe of unsubscribers) unsubscribe()
  }
}
