import b4a from 'b4a'
import compact from 'compact-encoding'
import crypto from 'hypercore-crypto'

const HEX_32 = /^[0-9a-f]{64}$/
const HEX_64 = /^[0-9a-f]{128}$/

export type SigningIdentity = {
  publicKey: string
  secretKey: string
}

export type SignedRecord<TPayload> = {
  createdAt: number
  payload: TPayload
  signature: string
  signerProfileId: string
  type: string
  version: number
}

export type UnsignedSignedRecord<TPayload> = Omit<SignedRecord<TPayload>, 'signature'>

export type PayloadEncoding<TPayload> = {
  preencode(state: unknown, payload: TPayload): void
  encode(state: unknown, payload: TPayload): void
  decode(state: unknown): TPayload
}

export function createSigningKeyPair(): SigningIdentity {
  const keyPair = crypto.keyPair()

  return {
    publicKey: b4a.toString(keyPair.publicKey, 'hex'),
    secretKey: b4a.toString(keyPair.secretKey, 'hex')
  }
}

export function createSignedRecord<TPayload>({
  createdAt = Date.now(),
  identity,
  payload,
  payloadEncoding,
  type,
  version
}: {
  createdAt?: number
  identity: SigningIdentity
  payload: TPayload
  payloadEncoding: PayloadEncoding<TPayload>
  type: string
  version: number
}): SignedRecord<TPayload> {
  const signerProfileId = cleanPublicKey(identity?.publicKey, 'Signer public key is required')
  const secretKey = cleanSecretKey(identity?.secretKey)
  const unsignedRecord = {
    createdAt,
    payload,
    signerProfileId,
    type: cleanString(type, 'Signed record type is required'),
    version: cleanVersion(version)
  }
  const bytes = encodeSignedBytes({ payloadEncoding, record: unsignedRecord })
  const signature = crypto.sign(bytes, b4a.from(secretKey, 'hex'))

  return {
    ...unsignedRecord,
    signature: b4a.toString(signature, 'hex')
  }
}

export function verifySignedRecord<TPayload>({
  payloadEncoding,
  record
}: {
  payloadEncoding: PayloadEncoding<TPayload>
  record: SignedRecord<TPayload>
}): boolean {
  try {
    const signature = cleanSignature(record?.signature)
    const publicKey = cleanPublicKey(record?.signerProfileId, 'Signer public key is required')
    const bytes = encodeSignedBytes({
      payloadEncoding,
      record: {
        createdAt: record.createdAt,
        payload: record.payload,
        signerProfileId: record.signerProfileId,
        type: record.type,
        version: record.version
      }
    })

    return crypto.verify(bytes, b4a.from(signature, 'hex'), b4a.from(publicKey, 'hex'))
  } catch {
    return false
  }
}

export function encodeSignedBytes<TPayload>({
  payloadEncoding,
  record
}: {
  payloadEncoding: PayloadEncoding<TPayload>
  record: UnsignedSignedRecord<TPayload>
}): Uint8Array {
  if (!payloadEncoding) {
    throw new Error('Payload encoding is required')
  }

  return compact.encode(createSignedBytesEncoding(payloadEncoding), {
    createdAt: cleanTimestamp(record?.createdAt),
    payload: record?.payload,
    signerProfileId: cleanPublicKey(record?.signerProfileId, 'Signer public key is required'),
    type: cleanString(record?.type, 'Signed record type is required'),
    version: cleanVersion(record?.version)
  })
}

function createSignedBytesEncoding<TPayload>(payloadEncoding: PayloadEncoding<TPayload>) {
  return {
    preencode(state: unknown, record: UnsignedSignedRecord<TPayload>) {
      compact.string.preencode(state, record.type)
      compact.uint.preencode(state, record.version)
      compact.string.preencode(state, record.signerProfileId)
      compact.uint.preencode(state, record.createdAt)
      payloadEncoding.preencode(state, record.payload)
    },
    encode(state: unknown, record: UnsignedSignedRecord<TPayload>) {
      compact.string.encode(state, record.type)
      compact.uint.encode(state, record.version)
      compact.string.encode(state, record.signerProfileId)
      compact.uint.encode(state, record.createdAt)
      payloadEncoding.encode(state, record.payload)
    },
    decode(state: unknown): UnsignedSignedRecord<TPayload> {
      return {
        type: compact.string.decode(state),
        version: compact.uint.decode(state),
        signerProfileId: compact.string.decode(state),
        createdAt: compact.uint.decode(state),
        payload: payloadEncoding.decode(state)
      }
    }
  }
}

function cleanPublicKey(value: string | undefined, message: string): string {
  const key = cleanString(value, message)

  if (!HEX_32.test(key)) {
    throw new Error('Invalid public key')
  }

  return key
}

function cleanSecretKey(value: string | undefined): string {
  const key = cleanString(value, 'Signer secret key is required')

  if (!HEX_64.test(key)) {
    throw new Error('Invalid secret key')
  }

  return key
}

function cleanSignature(value: string | undefined): string {
  const signature = cleanString(value, 'Signature is required')

  if (!HEX_64.test(signature)) {
    throw new Error('Invalid signature')
  }

  return signature
}

function cleanString(value: string | undefined, message: string): string {
  const cleaned = value?.trim()

  if (!cleaned) {
    throw new Error(message)
  }

  return cleaned
}

function cleanTimestamp(value: number | undefined): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new Error('Invalid timestamp')
  }

  return value as number
}

function cleanVersion(value: number | undefined): number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) {
    throw new Error('Invalid signed record version')
  }

  return value as number
}
