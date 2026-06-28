export function getDesktopDirectTransportConfig({ env = process.env, mode } = {}) {
  if (mode !== 'host') return null

  const advertisedHost = env.KEPOS_DIRECT_ADVERTISED_HOST?.trim()
  if (!advertisedHost) return null

  return {
    advertisedHost,
    listenHost: env.KEPOS_DIRECT_LISTEN_HOST?.trim() || '0.0.0.0',
    mode: 'host'
  }
}
