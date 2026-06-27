import { createDesktopDmRuntime } from './desktop-dm-runtime.js'
import { createDesktopHomeRuntime } from './desktop-home-runtime.js'
import { createDesktopTreeholeRuntime } from './desktop-treehole-runtime.js'

export function createDesktopBackendRuntime({
  createDmRuntime = createDesktopDmRuntime,
  createHomeRuntime = createDesktopHomeRuntime,
  createTreeholeRuntime = createDesktopTreeholeRuntime,
  emit = () => {},
  onDmSessionChanged = () => {},
  onHomeControl = () => {},
  onHomeSessionChanged = () => {},
  onVerifiedHello = () => {},
  storageBasePath = null
} = {}) {
  const dm = createDmRuntime({
    onSessionChanged: (session) => {
      emit('dmMessageReceived', session)
      onDmSessionChanged(session)
    }
  })
  const home = createHomeRuntime({
    onControl: onHomeControl,
    onError: (error) => emit('errorReceived', error),
    onPeerCount: (peers) => emit('peerCountChanged', { peers }),
    onSessionChanged: (session) => {
      emit('homeMessageReceived', session)
      onHomeSessionChanged(session)
    },
    onVerifiedHello
  })
  const treehole = createTreeholeRuntime({
    onError: (error) => emit('errorReceived', error),
    onStateChanged: (snapshot) => emit('treeholeStateChanged', snapshot),
    storageBasePath
  })

  function configure(context) {
    home.configure(context)
    treehole.configure(context)
  }

  async function closeAll() {
    return await Promise.all([dm.closeAll(), home.leave(), treehole.close()])
  }

  return {
    closeAll,
    configure,
    dm,
    home,
    treehole
  }
}
