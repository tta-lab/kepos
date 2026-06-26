export function createTreeholeStatePublisher({
  clearIntervalFn = clearInterval,
  getSnapshot,
  intervalMs = 1000,
  onError = () => {},
  publish,
  setIntervalFn = setInterval
}) {
  let running = false
  let stopped = false

  async function refresh() {
    if (stopped || running) {
      return
    }

    running = true
    try {
      const snapshot = await getSnapshot()
      if (!stopped) {
        publish(snapshot)
      }
    } catch (error) {
      if (!stopped) {
        onError(error)
      }
    } finally {
      running = false
    }
  }

  const intervalId = setIntervalFn(refresh, intervalMs)
  refresh()

  return {
    stop() {
      stopped = true
      clearIntervalFn(intervalId)
    }
  }
}
