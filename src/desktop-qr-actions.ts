import { createDesktopShareQrOutputs, renderDesktopQrSvg } from './desktop-qr-service.js'
import type { DesktopProfileContext } from './desktop-profile-context-core.ts'

export type DesktopShareQrOutputs = {
  homeSvg: string
  homeUri: string
  profileSvg: string
  profileUri: string
}

type FocusTarget = {
  focus(): void
}

type LargeQrState = {
  isOpen: boolean
  svg: string
  title: string
}

export type DesktopQrActions = {
  copyQrValue(payload: { notice: string; value: string }): Promise<void>
  getShareQrOutputs(): DesktopShareQrOutputs
  hideLargeQr(): void
  setShareQrOutputs(outputs: DesktopShareQrOutputs): void
  showLargeQr(payload: {
    returnFocus?: FocusTarget | null
    title: string
    uri?: string
  }): Promise<void>
  updateQrOutputs(): Promise<void>
}

export function createDesktopQrActions({
  copyText,
  createShareQrOutputs = createDesktopShareQrOutputs,
  getProfileContext,
  onChanged = () => {},
  renderQrSvg = renderDesktopQrSvg,
  setLargeQr,
  setNotice,
  setShareQrOutputs
}: {
  copyText: (value: string) => unknown | Promise<unknown>
  createShareQrOutputs?: (options: {
    profile: DesktopProfileContext['profile']
  }) => DesktopShareQrOutputs | Promise<DesktopShareQrOutputs>
  getProfileContext: () => Pick<DesktopProfileContext, 'profile'>
  onChanged?: () => void
  renderQrSvg?: (value: string, options?: Record<string, unknown>) => string | Promise<string>
  setLargeQr: (qr: LargeQrState) => void
  setNotice: (notice: string) => void
  setShareQrOutputs: (outputs: DesktopShareQrOutputs) => void
}): DesktopQrActions {
  let largeQrReturnFocus: FocusTarget | null = null
  let shareQrOutputs: DesktopShareQrOutputs = {
    homeSvg: '',
    homeUri: '',
    profileSvg: '',
    profileUri: ''
  }

  async function updateQrOutputs(): Promise<void> {
    const { profile } = getProfileContext()
    shareQrOutputs = await createShareQrOutputs({ profile })
    setShareQrOutputs(shareQrOutputs)
  }

  function getShareQrOutputs(): DesktopShareQrOutputs {
    return shareQrOutputs
  }

  function setShareQrOutputsSnapshot(outputs: DesktopShareQrOutputs): void {
    shareQrOutputs = outputs
    setShareQrOutputs(shareQrOutputs)
  }

  async function showLargeQr({
    returnFocus = null,
    title,
    uri
  }: {
    returnFocus?: FocusTarget | null
    title: string
    uri?: string
  }): Promise<void> {
    if (!uri) return

    largeQrReturnFocus = returnFocus
    const svg = await renderQrSvg(uri, {
      margin: 4,
      width: 640
    })
    setLargeQr({
      isOpen: true,
      svg,
      title
    })
  }

  async function copyQrValue({ notice, value }: { notice: string; value: string }): Promise<void> {
    if (!value.trim()) return

    await copyText(value)
    setNotice(notice)
    onChanged()
  }

  function hideLargeQr(): void {
    setLargeQr({ isOpen: false, svg: '', title: '' })
    largeQrReturnFocus?.focus()
    largeQrReturnFocus = null
  }

  return {
    copyQrValue,
    getShareQrOutputs,
    hideLargeQr,
    setShareQrOutputs: setShareQrOutputsSnapshot,
    showLargeQr,
    updateQrOutputs
  }
}
