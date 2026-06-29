import {
  createDesktopFileProfileContext,
  createDesktopProfileContext
} from '../src/desktop-profile-context.js'
import { createDesktopShareQrOutputs, renderDesktopQrSvg } from '../src/desktop-qr-service.js'
import { getDesktopStorageBasePath } from '../src/desktop-storage-base.ts'

export function createProfileContext({ displayName = 'Desktop' } = {}) {
  const storageBasePath = getDesktopStorageBasePath()
  if (storageBasePath) return createDesktopFileProfileContext({ displayName, storageBasePath })

  return createDesktopProfileContext({ displayName })
}

export function createShareQrOutputs({ profile }) {
  return createDesktopShareQrOutputs({ profile })
}

export function getStorageBasePath() {
  return getDesktopStorageBasePath()
}

export function renderQrSvg(uri, options) {
  return renderDesktopQrSvg(uri, options)
}
