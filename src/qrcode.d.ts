declare module 'qrcode/lib/browser.js' {
  const QRCode: {
    toString(value: string, options?: Record<string, unknown>): Promise<string>
  }

  export default QRCode
}
