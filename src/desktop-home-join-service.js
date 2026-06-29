import { createTreeholePolicyFromContactBook } from './contact-book-storage.ts'
import {
  createHomeJoinSession,
  createHomeJoinSessionFromAddress,
  createManualHomeJoinSession
} from './home-session.ts'

export function createDesktopHomeJoinDetails({
  contactBook,
  homeAddress = null,
  mode,
  nick,
  profile,
  roomKey = ''
}) {
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
