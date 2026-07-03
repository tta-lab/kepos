type DesktopDirectTransportMode = 'host' | string

type DesktopDirectTransportEnv = {
  KEPOS_DIRECT_ADVERTISED_HOST?: string
  KEPOS_DIRECT_LISTEN_HOST?: string
}

type DesktopDirectTransportConfig = {
  advertisedHost: string
  listenHost: string
  mode: 'host'
}

export function getDesktopDirectTransportConfig({
  env = getProcessEnv(),
  mode
}: {
  env?: DesktopDirectTransportEnv
  mode?: DesktopDirectTransportMode
} = {}): DesktopDirectTransportConfig | null {
  if (mode !== 'host') return null

  const advertisedHost = env.KEPOS_DIRECT_ADVERTISED_HOST?.trim()
  if (!advertisedHost) return null

  return {
    advertisedHost,
    listenHost: env.KEPOS_DIRECT_LISTEN_HOST?.trim() || '0.0.0.0',
    mode: 'host'
  }
}

function getProcessEnv(): DesktopDirectTransportEnv {
  return (globalThis as { process?: { env?: DesktopDirectTransportEnv } }).process?.env || {}
}
