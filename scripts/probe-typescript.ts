import { createSigningKeyPair } from '../src/signed-record.ts'
import { createSignedDmMessage, verifySignedDmMessage } from '../src/dm-message.ts'
import { mergeDmMessages } from '../src/dm-message-storage.ts'
import {
  applySignedTreeholeEvents,
  createSignedTreeholePost
} from '../src/treehole-signed-events.ts'

const identity = createSigningKeyPair()
const dmMessage = createSignedDmMessage({
  createdAt: 1100,
  identity,
  messageId: 'probe-message',
  text: 'typescript dm probe',
  threadId: 'probe-thread'
})
const dmMessages = mergeDmMessages([], [dmMessage])
const post = createSignedTreeholePost({
  createdAt: 1000,
  identity,
  postId: 'probe-post',
  text: 'typescript probe',
  treeholeOwnerProfileId: identity.publicKey
})
const state = applySignedTreeholeEvents([post], {
  ownerProfileId: identity.publicKey
})

console.log(
  JSON.stringify({
    dmMessageVerified: verifySignedDmMessage(dmMessage),
    dmMessages: dmMessages.length,
    posts: state.posts.length,
    type: post.type,
    verifiedOwner: state.posts[0]?.authorProfileId === identity.publicKey
  })
)
