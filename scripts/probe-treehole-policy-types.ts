import type { TreeholePolicy, TreeholeSessionOptions } from '../src/treehole-policy.ts'
import {
  canGrantTreeholeWriter,
  createSignedTreeholePolicy,
  createTreeholeSessionOptions
} from '../src/treehole-policy.ts'

const ownerProfileId = 'a'.repeat(64)
const trustedProfileId = 'b'.repeat(64)
const policy: TreeholePolicy = {
  ownerProfileId,
  revokedProfileIds: [],
  trustedProfileIds: [trustedProfileId]
}

const options: TreeholeSessionOptions = createTreeholeSessionOptions({
  identity: {
    publicKey: ownerProfileId,
    secretKey: 'c'.repeat(128)
  },
  ownerProfileId,
  treeholePolicy: policy
})
const signedPolicy = createSignedTreeholePolicy({ ownerProfileId, treeholePolicy: policy })

if (
  options.mode !== 'signed' ||
  signedPolicy.trustedProfileIds[0] !== trustedProfileId ||
  !canGrantTreeholeWriter({ ownerProfileId, policy, writerProfileId: trustedProfileId })
) {
  throw new Error('Treehole policy type probe failed')
}
