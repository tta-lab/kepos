export type ProfileSelectionValue = {
  profileId: string
}

export type ProfileSelectionGroup<TKind extends string, TValue extends ProfileSelectionValue> = {
  kind: TKind
  values?: readonly TValue[]
}

export type ProfileSelectionSource<TKind extends string, TValue extends ProfileSelectionValue> = {
  kind: TKind
  value: TValue
}

export function selectProfileSelectionSource<
  TKind extends string,
  TValue extends ProfileSelectionValue
>({
  groups,
  selectedProfileId
}: {
  groups: readonly ProfileSelectionGroup<TKind, TValue>[]
  selectedProfileId?: string | null
}): ProfileSelectionSource<TKind, TValue> | null {
  const cleanProfileId = selectedProfileId?.trim()
  if (!cleanProfileId) return null

  for (const group of groups) {
    const value = group.values?.find((candidate) => candidate.profileId === cleanProfileId)
    if (value) return { kind: group.kind, value }
  }

  return null
}
