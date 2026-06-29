export type DmThreadListItem = {
  threadId?: string
  [key: string]: unknown
}

export function upsertDmThread<TThread extends DmThreadListItem>(
  threads: TThread[] = [],
  thread: TThread | null | undefined
): TThread[] {
  if (!thread?.threadId) {
    return threads
  }

  return [...threads.filter((existing) => existing.threadId !== thread.threadId), thread]
}
