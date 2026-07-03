export type DirectRoomEndpoint = {
  host: string
  port: number
}

export function parseDirectRoomEndpoint(value = ''): DirectRoomEndpoint | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  const match = /^([^:]+):(\d+)$/.exec(trimmed)
  if (!match) throw new Error('Direct room endpoint must be a valid host:port')

  const port = Number(match[2])
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Direct room endpoint must be a valid host:port')
  }

  return {
    host: match[1],
    port
  }
}
