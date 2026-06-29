import b4a from 'b4a'
import compact from 'compact-encoding'
import crypto from 'hypercore-crypto'
import sodium from 'sodium-universal'
import { deriveDmTopic } from './dm-replication.js'

const PROBE_TEXT = 'kepos sealed box probe'

type CompactState = any

type SignedProbeRecord = {
  message: string
  signerProfileId: string
  type: string
  version: number
}

const signedProbeEncoding = {
  preencode(state: CompactState, record: SignedProbeRecord) {
    compact.string.preencode(state, record.type)
    compact.uint.preencode(state, record.version)
    compact.string.preencode(state, record.signerProfileId)
    compact.string.preencode(state, record.message)
  },
  encode(state: CompactState, record: SignedProbeRecord) {
    compact.string.encode(state, record.type)
    compact.uint.encode(state, record.version)
    compact.string.encode(state, record.signerProfileId)
    compact.string.encode(state, record.message)
  },
  decode(state: CompactState): SignedProbeRecord {
    return {
      type: compact.string.decode(state),
      version: compact.uint.decode(state),
      signerProfileId: compact.string.decode(state),
      message: compact.string.decode(state)
    }
  }
}

export function runCompatibilityProbes() {
  const keyPair = crypto.keyPair()
  const signerProfileId = b4a.toString(keyPair.publicKey, 'hex')
  const record = {
    type: 'kepos.probe.v1',
    version: 1,
    signerProfileId,
    message: 'signed compatibility probe'
  }
  const encoded = compact.encode(signedProbeEncoding, record)
  const signature = crypto.sign(encoded, keyPair.secretKey)

  return {
    encoding: {
      encodedHex: b4a.toString(encoded, 'hex'),
      roundTrip: compact.decode(signedProbeEncoding, encoded)
    },
    sealedBox: runSealedBoxProbe(),
    signing: {
      publicKey: signerProfileId,
      signature: b4a.toString(signature, 'hex'),
      verified: crypto.verify(encoded, signature, keyPair.publicKey)
    },
    transport: {
      dmTopicBytes: deriveDmTopic('c'.repeat(64)).byteLength
    }
  }
}

function runSealedBoxProbe() {
  const publicKey = b4a.alloc(sodium.crypto_box_PUBLICKEYBYTES)
  const secretKey = b4a.alloc(sodium.crypto_box_SECRETKEYBYTES)
  sodium.crypto_box_keypair(publicKey, secretKey)

  const message = b4a.from(PROBE_TEXT)
  const sealed = b4a.alloc(message.byteLength + sodium.crypto_box_SEALBYTES)
  sodium.crypto_box_seal(sealed, message, publicKey)

  const opened = b4a.alloc(message.byteLength)
  const ok = sodium.crypto_box_seal_open(opened, sealed, publicKey, secretKey)

  if (!ok) {
    throw new Error('Sealed box probe failed')
  }

  return {
    ciphertextBytes: sealed.byteLength,
    decrypted: b4a.toString(opened)
  }
}
