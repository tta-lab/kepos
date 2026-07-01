import QRCode from 'qrcode/lib/browser.js'
import { createTreeholePolicyFromContactBook } from './contact-book-storage.ts'
import type { ContactBook } from './contact-book.ts'
import type { HomeRoom } from './home-room.ts'
import type { LocalProfile } from './profile.ts'
import type { SigningIdentity } from './signed-record.ts'
import {
  createSignedHomeAddressPayload,
  createSignedTrustInvitePayload,
  encodeQrUri
} from './signed-qr-payload.ts'
import { applySignedQrUriToContactBook } from './signed-qr-scan.ts'

type DesktopQrSvgOptions = {
  errorCorrectionLevel?: string
  margin?: number
  type?: string
  width?: number
}

type DesktopHomeQrResult = Extract<
  ReturnType<typeof applySignedQrUriToContactBook>,
  { kind: 'home' }
>

type DesktopProfileTrustQrResult = {
  book: ContactBook
  profileId: string
  treeholePolicy: ReturnType<typeof createTreeholePolicyFromContactBook>
}

export type DesktopShareQrOutputs = {
  homeSvg: string
  homeUri: string
  profileSvg: string
  profileUri: string
}

export type DesktopShareProfile = Pick<
  LocalProfile,
  'avatarMedia' | 'avatarUri' | 'displayName' | 'identity'
> & {
  homeRoom: Pick<HomeRoom, 'address' | 'policy' | 'roomKey'>
}

const SHARE_QR_OPTIONS: DesktopQrSvgOptions = {
  errorCorrectionLevel: 'M',
  margin: 1,
  type: 'svg',
  width: 172
}

export function applyDesktopHomeQr({
  book,
  localProfileId,
  uri
}: {
  book: ContactBook
  localProfileId?: string
  uri: string
}): DesktopHomeQrResult {
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
}: {
  alias?: string
  book: ContactBook
  localIdentity?: SigningIdentity | null
  localProfileId?: string
  now?: number
  uri: string
}): DesktopProfileTrustQrResult {
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

export async function createDesktopShareQrOutputs({
  profile
}: {
  profile: DesktopShareProfile
}): Promise<DesktopShareQrOutputs> {
  const homeDescriptor = createSignedHomeAddressPayload({
    address: profile.homeRoom.address,
    identity: profile.identity,
    policy: profile.homeRoom.policy,
    roomKey: profile.homeRoom.roomKey
  })
  const profileUri = encodeQrUri(
    createSignedTrustInvitePayload({
      avatarMedia: profile.avatarMedia,
      avatarUri: profile.avatarUri,
      displayName: profile.displayName,
      homeDescriptor,
      identity: profile.identity
    })
  )
  const homeUri = encodeQrUri(homeDescriptor)

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

export function renderDesktopQrSvg(
  value: string,
  options: DesktopQrSvgOptions = {}
): Promise<string> {
  return QRCode.toString(value, {
    ...SHARE_QR_OPTIONS,
    ...options
  })
}
