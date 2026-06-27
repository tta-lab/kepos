import QRCode from 'qrcode'
import { createTreeholePolicyFromContactBook } from './contact-book-storage.js'
import {
  createSignedHomeAddressPayload,
  createSignedTrustInvitePayload,
  encodeQrUri
} from './signed-qr-payload.ts'
import { applySignedQrUriToContactBook } from './signed-qr-scan.js'

const SHARE_QR_OPTIONS = {
  errorCorrectionLevel: 'M',
  margin: 1,
  type: 'svg',
  width: 172
}

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

export async function createDesktopShareQrOutputs({ profile }) {
  const profileUri = encodeQrUri(
    createSignedTrustInvitePayload({
      displayName: profile.displayName,
      identity: profile.identity
    })
  )
  const homeUri = encodeQrUri(
    createSignedHomeAddressPayload({
      address: profile.homeRoom.address,
      identity: profile.identity,
      policy: profile.homeRoom.policy,
      roomKey: profile.homeRoom.roomKey
    })
  )

  const [profileSvg, homeSvg] = await Promise.all([
    renderDesktopQrSvg(profileUri),
    renderDesktopQrSvg(homeUri)
  ])

  return {
    homeSvg,
    homeUri,
    profileSvg,
    profileUri
  }
}

export function renderDesktopQrSvg(value, options = {}) {
  return QRCode.toString(value, {
    ...SHARE_QR_OPTIONS,
    ...options
  })
}
