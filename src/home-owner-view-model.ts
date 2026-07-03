type HomeOwnerContact = {
  alias?: string | null
  displayNameSnapshot?: string | null
  profileId?: string | null
}

export type HomeOwnerViewModel = {
  actionLabel?: string
  canOpenProfile: boolean
  ownerProfileId: string
  subtitle: string
  title: string
}

export function createHomeOwnerViewModel({
  contacts = [],
  localProfileId = '',
  ownerProfileId = '',
  shortenProfileId = (value) => `${value.slice(0, 8)}...${value.slice(-8)}`
}: {
  contacts?: readonly HomeOwnerContact[]
  localProfileId?: string | null
  ownerProfileId?: string | null
  shortenProfileId?: (value: string) => string
}): HomeOwnerViewModel {
  const owner = ownerProfileId?.trim() || ''
  const local = localProfileId?.trim() || ''

  if (!owner) {
    return {
      canOpenProfile: false,
      ownerProfileId: '',
      subtitle: 'Live chat and presence',
      title: 'Home'
    }
  }

  if (owner === local) {
    return {
      canOpenProfile: false,
      ownerProfileId: owner,
      subtitle: 'Live chat and presence',
      title: 'My home'
    }
  }

  const contact = contacts.find((entry) => entry?.profileId === owner)
  const displayName = contact?.alias?.trim() || contact?.displayNameSnapshot?.trim() || ''

  if (displayName) {
    return {
      actionLabel: 'Open profile',
      canOpenProfile: true,
      ownerProfileId: owner,
      subtitle: `${displayName} is hosting`,
      title: `${displayName}'s home`
    }
  }

  const shortOwner = shortenProfileId(owner)
  return {
    canOpenProfile: false,
    ownerProfileId: owner,
    subtitle: `Owner ${shortOwner}`,
    title: `Profile ${shortOwner} home`
  }
}
