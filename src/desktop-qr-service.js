import { createTreeholePolicyFromContactBook } from './contact-book-storage.js'
import { applySignedQrUriToContactBook } from './signed-qr-scan.js'

export function applyDesktopHomeQr({ book, localProfileId, uri }) {
  const result = applySignedQrUriToContactBook({
    book,
    localProfileId,
    uri
  })

  if (result.kind !== 'home') {
    throw new Error('Home QR is required')
  }

  if (!result.canEnter) {
    throw new Error('This trusted-only home is not trusted locally')
  }

  return result
}

export function applyDesktopProfileTrustQr({
  alias,
  book,
  localIdentity,
  localProfileId,
  now,
  uri
}) {
  const result = applySignedQrUriToContactBook({
    alias,
    book,
    localIdentity,
    localProfileId,
    now,
    source: 'profile_qr',
    uri
  })

  if (result.kind !== 'trust') {
    throw new Error('Profile QR is required')
  }

  return {
    book: result.book,
    profileId: result.profileId,
    treeholePolicy: createTreeholePolicyFromContactBook(result.book)
  }
}
