# Target Flows

## Flow 1: Add Friend By Profile QR

This is the primary V1 path.

1. B opens "My QR".
2. A scans B's Profile QR.
3. A sees B as a request target in Chat or Contacts.
4. A writes a short message and taps "Send request".
5. Kepos delivers a signed friend request to B.
6. B sees "A sent a friend request".
7. B taps "Accept".
8. Kepos creates mutual trust and a durable DM thread.
9. A and B both see each other in Contacts.

Product rule:

- A did not "join B's Home" as the product action.
- If the implementation temporarily enters B's Home to deliver the request, the UI should hide that unless there is an error.

## Flow 2: Enter Friend's Home

This is a separate action after trust.

1. A opens Contacts.
2. A taps B.
3. A sees B's profile.
4. A taps "Enter Home".
5. Kepos joins B's Home using B's signed Home descriptor.
6. A can use live Home chat and sync B's Treehole state.

Product rule:

- Entering Home is intentional.
- It should not happen automatically just because A and B are friends.

## Flow 3: Private DM

1. A opens Chat.
2. A sees a contact list with last message preview.
3. A taps B.
4. A sends durable pairwise messages.

Product rule:

- DM belongs to the person/contact layer.
- It should not require the user to be inside B's Home.

V1 may still use Home fallback for some body delivery while the dedicated DM replication path matures, but the UI should keep DM as person-first.

## Flow 4: View Profile And Treehole

1. A opens Contacts.
2. A taps B.
3. A sees B's profile card and cached recent posts.
4. A can enter B's Home to refresh posts.

Product rule:

- Profile is the stable place.
- Home is the live transport/session.
- Treehole is B's durable personal feed.

## Flow 5: Invite Friend To Activity

This is the V2/V3 pattern for watch/listen/game/local-service sessions.

1. A and B are already friends.
2. A starts an activity.
3. A taps "Invite B".
4. Kepos sends an activity invite.
5. B accepts.
6. Both clients join the activity session.

Product rule:

- This invite is not for trust.
- This invite only starts an activity session between already trusted profiles.

## Error Handling Rules

### Request Delivery

The app should not show a request as sent merely because local state changed.

Minimum target:

- local pending state can be optimistic
- delivery path must retry or resend when a peer appears
- failures should say "Could not deliver this request yet"

Better target:

- sender sees "Request pending"
- receiver acknowledgement changes sender state to "Request delivered"
- accept changes state to "Friend"

### Home Entry

If Home entry fails:

- keep friendship state unchanged
- show that the Home is offline or unavailable
- do not imply the friend relation failed

### Trust Revoke

If A removes B:

- B is no longer authorized for A's future Home/Treehole access
- already replicated local data is not deleted in V1
- DM history can remain local unless user chooses deletion later
