import {
  applySignedQrUriToContactBook,
  readSignedProfileQrRequestTarget
} from './signed-qr-scan.ts'
import type { ContactBook } from './contact-book.ts'
import type { SigningIdentity } from './signed-record.ts'

type SignedQrContactBookResult = ReturnType<typeof applySignedQrUriToContactBook>
type MobileProfileQrScanResult = Extract<SignedQrContactBookResult, { kind: 'trust' }>
type MobileHomeQrScanResult = Extract<SignedQrContactBookResult, { kind: 'home' }>
type MobileProfileRequestTarget = ReturnType<typeof readSignedProfileQrRequestTarget>

export function readMobileProfileRequestTarget({
  now,
  uri
}: {
  now?: number
  uri: string
}): MobileProfileRequestTarget {
  return readSignedProfileQrRequestTarget({ now, uri })
}

export function applyMobileDebugProfileTrustScan({
  alias,
  book,
  localIdentity,
  source = 'profile_qr',
  uri
}: {
  alias?: string
  book: ContactBook
  localIdentity?: SigningIdentity | null
  source?: string
  uri: string
}): MobileProfileQrScanResult {
  const result = applySignedQrUriToContactBook({
    alias,
    book,
    localIdentity,
    source,
    uri
  })

  if (result.kind !== 'trust') {
    throw new Error('Profile QR is required.')
  }

  return result
}

export function applyMobileHomeQrScan({
  book,
  localProfileId,
  uri
}: {
  book: ContactBook
  localProfileId?: string
  uri: string
}): MobileHomeQrScanResult {
  const result = applySignedQrUriToContactBook({
    book,
    localProfileId,
    uri
  })

  if (result.kind !== 'home') {
    throw new Error('Debug Home QR is required.')
  }

  return result
}
