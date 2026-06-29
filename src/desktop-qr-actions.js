import { createDesktopShareQrOutputs, renderDesktopQrSvg } from './desktop-qr-service.js'

export function createDesktopQrActions({
  copyText,
  createShareQrOutputs = createDesktopShareQrOutputs,
  getProfileContext,
  onChanged = () => {},
  renderQrSvg = renderDesktopQrSvg,
  setLargeQr,
  setNotice,
  setShareQrOutputs
}) {
  let largeQrReturnFocus = null
  let shareQrOutputs = {
    homeSvg: '',
    homeUri: '',
    profileSvg: '',
    profileUri: ''
  }

  async function updateQrOutputs() {
    const { profile } = getProfileContext()
    shareQrOutputs = await createShareQrOutputs({ profile })
    setShareQrOutputs(shareQrOutputs)
  }

  function getShareQrOutputs() {
    return shareQrOutputs
  }

  function setShareQrOutputsSnapshot(outputs) {
    shareQrOutputs = outputs
    setShareQrOutputs(shareQrOutputs)
  }

  async function showLargeQr({ returnFocus, title, uri }) {
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

  async function copyQrValue({ notice, value }) {
    if (!value.trim()) return

    await copyText(value)
    setNotice(notice)
    onChanged()
  }

  function hideLargeQr() {
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
