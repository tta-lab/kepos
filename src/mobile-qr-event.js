export function getScannedQrData(event) {
  const data = event?.data ?? event?.nativeEvent?.data
  const cleanData = typeof data === 'string' ? data.trim() : ''

  return cleanData || null
}
