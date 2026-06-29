type TimerId = ReturnType<typeof setInterval>

export function createTreeholeStatePublisher({
  clearIntervalFn = clearInterval,
  getSnapshot,
  intervalMs = 1000,
  onError = () => {},
  publish,
  setIntervalFn = setInterval
}: {
  clearIntervalFn?: (id: TimerId) => void
  getSnapshot: () => Promise<unknown> | unknown
  intervalMs?: number
  onError?: (error: unknown) => void
  publish: (snapshot: unknown) => void
  setIntervalFn?: (callback: () => void, intervalMs: number) => TimerId
}): { stop(): void } {
  let running = false
  let stopped = false

  async function refresh(): Promise<void> {
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
