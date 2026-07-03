# V1 Release Proof Next Plan

This was the active next plan after `23-v1-social-delivery-release-plan.md`.
Use `25-v1-profile-route-implementation-next-plan.md` for new V1 work.

Use this document for the final V1 execution pass. Use `23` as the product
rule baseline and `../v1.21-cross-device-smoke.md` as the proof recipe.

## Target

Ship V1 as a ready private IM product:

```text
Profile QR -> friend request -> mutual trust -> durable Chat / Profile context / explicit Home
```

Home must stay out of the normal friend request path. It is a live room entered
after trust, not the way friendship, accept, or Chat bootstrap works.

## Done Means

V1 is ready only when all of this is true:

- Profile QR is the only normal add-friend QR.
- Debug Home QR is clearly advanced/debug and never presented as a normal
  social invite.
- Friend request delivery, accept, and DM bootstrap use the profile P2P route.
- Request receipt and accept can be observed while Home peer count stays zero.
- Contacts and Chat both lead to the same trusted profile detail.
- Chat messages survive restart.
- local Treehole posts survive restart.
- Recent posts are profile context, not a hidden Home-entry action.
- Enter Home is an explicit post-trust action.
- revoke blocks future access.
- the final proof packet at `tmp/final-v1-proof.md` passes
  `npm run v1:proof:check -- --file tmp/final-v1-proof.md`.

Automated tests are necessary but not sufficient. V1 is not ready from
`npm run v1:gate` alone.

## Work Order

### 1. Keep Product Surfaces Honest

Run focused source and UI checks before any manual smoke:

```sh
npm run v1:gate
```

Fix any normal UI copy that still implies:

- Home QR is an add-friend route
- Home membership is authorization
- direct host:port is a production setup path
- a friend request implies Home entry

Debug controls may exist, but they must say Debug Home QR or diagnostics.

### 2. Prove Profile Delivery Without Home

The final proof must show:

- Android scans desktop Profile QR.
- Android sends a friend request.
- Desktop receives it without entering Android Home.
- Desktop accepts without entering Android Home.
- Android observes accepted trust without entering desktop Home.
- Home peer count is recorded at request receipt and accept/invite return.

Passing with Home peers already connected is useful transport evidence, but it
does not prove the product architecture. The required release evidence is the
profile route working without Home membership.

### 3. Prove The IM Product Loop

The user-visible loop to prove is:

- both clients show each other in Contacts
- both clients show each other in Chat
- Contacts and Chat open the same trusted profile detail
- Message is the primary action after trust
- private Chat messages survive restart
- local Treehole posts survive restart
- friend Recent posts appear as profile context when available
- Enter Home works only through an explicit profile action
- revoke blocks future access

This is the minimum lovable V1. It should feel like a small private messenger
built on P2P, not like a room-key demo.

### 4. Record The Final Packet

Generate the packet before the manual run:

```sh
npm run v1:proof:packet -- --output tmp/final-v1-proof.md
```

Fill it while running the normal desktop plus physical Android path in
`../v1.21-cross-device-smoke.md`.

After the run:

```sh
npm run v1:proof:check -- --file tmp/final-v1-proof.md
```

If the checker fails, do not call V1 ready. The failure should become a code
fix, a better automated test, a doc update, or an explicit limitation.

## Non-Goals

- Do not start V2 media rooms before this proof is complete.
- Do not promote Debug Home QR into a normal invite path.
- Do not add a direct host:port production fallback.
- Do not make Home membership an authorization signal.
- Do not hide failed delivery behind optimistic copy.

## Current Status

Low-cost source proof exists for most product rules. The missing piece is the
recorded normal cross-device product proof:

```text
desktop Profile QR -> Android request -> desktop accept -> durable Chat -> restart -> explicit Home -> revoke
```

That proof is the next meaningful milestone.
