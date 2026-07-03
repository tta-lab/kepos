import {
  createDesktopFileProfileContext,
  createDesktopProfileContext
} from '../src/desktop-profile-context.ts'
import type { DesktopProfileContext } from '../src/desktop-profile-context-core.ts'
import { createDesktopShareQrOutputs, renderDesktopQrSvg } from '../src/desktop-qr-service.ts'
import { getDesktopStorageBasePath } from '../src/desktop-storage-base.ts'

type DesktopProfileOptions = {
  avatarMedia?: DesktopProfileContext['profile']['avatarMedia'] | null
  avatarUri?: string | null
  displayName?: string
}

export function createProfileContext({
  avatarMedia = null,
  avatarUri = null,
  displayName = 'Desktop'
}: DesktopProfileOptions = {}): DesktopProfileContext {
  const storageBasePath = getDesktopStorageBasePath()
  if (storageBasePath) {
    return createDesktopFileProfileContext({ avatarMedia, avatarUri, displayName, storageBasePath })
  }

  return createDesktopProfileContext({ avatarMedia, avatarUri, displayName })
}

export function createShareQrOutputs({ profile }: { profile: DesktopProfileContext['profile'] }) {
  return createDesktopShareQrOutputs({ profile })
}

export function getStorageBasePath() {
  return getDesktopStorageBasePath()
}

export function renderQrSvg(uri: string, options: Record<string, unknown> = {}) {
  return renderDesktopQrSvg(uri, options)
}
