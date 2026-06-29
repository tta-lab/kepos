export type MobileQrScanEvent = {
  data?: unknown
  nativeEvent?: {
    data?: unknown
  }
}

export function getScannedQrData(event?: MobileQrScanEvent | null): string | null {
  const data = event?.data ?? event?.nativeEvent?.data
  const cleanData = typeof data === 'string' ? data.trim() : ''

  return cleanData || null
}
