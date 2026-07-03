import { createTreeholePolicyFromContactBook } from './contact-book-storage.ts'
import type { ContactBook } from './contact-book.ts'
import {
  createHomeJoinSession,
  createHomeJoinSessionFromAddress,
  createManualHomeJoinSession
} from './home-session.ts'
import type { HomeJoinSession } from './home-session.ts'
import type { HomePolicy } from './home-room.ts'
import type { LocalProfile } from './profile.ts'

type DesktopHomeAddress = {
  address: string
  ownerProfileId: string
  policy?: HomePolicy
  roomKey: string
}

type DesktopHomeJoinDetails = {
  homeJoinDetails: HomeJoinSession & {
    treeholePolicy: ReturnType<typeof createTreeholePolicyFromContactBook>
  }
  mode?: string
  session: HomeJoinSession['session']
}

export function createDesktopHomeJoinDetails({
  contactBook,
  homeAddress = null,
  mode,
  nick,
  profile,
  roomKey = ''
}: {
  contactBook: ContactBook
  homeAddress?: DesktopHomeAddress | null
  mode?: string
  nick?: string
  profile: LocalProfile
  roomKey?: string
}): DesktopHomeJoinDetails {
  const treeholePolicy = createTreeholePolicyFromContactBook(contactBook)
  const homeJoin = homeAddress
    ? createHomeJoinSessionFromAddress({
        address: homeAddress.address,
        identity: profile.identity,
        nick,
        ownerProfileId: homeAddress.ownerProfileId,
        policy: homeAddress.policy,
        profileId: profile.id,
        roomKey: homeAddress.roomKey
      })
    : roomKey
      ? createManualHomeJoinSession({
          identity: profile.identity,
          nick,
          profileId: profile.id,
          roomKey
        })
      : createHomeJoinSession({ nick, profile })

  return {
    homeJoinDetails: { ...homeJoin, treeholePolicy },
    mode,
    session: homeJoin.session
  }
}
