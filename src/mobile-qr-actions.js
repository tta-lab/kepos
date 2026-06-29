import { applySignedQrUriToContactBook } from './signed-qr-scan.ts'

export function applyMobileProfileQrScan({
  alias,
  book,
  localIdentity,
  source = 'profile_qr',
  uri
}) {
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

export function applyMobileHomeQrScan({ book, localProfileId, uri }) {
  const result = applySignedQrUriToContactBook({
    book,
    localProfileId,
    uri
  })

  if (result.kind !== 'home') {
    throw new Error('Home QR is required.')
  }

  return result
}
