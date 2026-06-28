export function upsertDmThread(threads = [], thread) {
  if (!thread?.threadId) {
    return threads
  }

  return [...threads.filter((existing) => existing.threadId !== thread.threadId), thread]
}
