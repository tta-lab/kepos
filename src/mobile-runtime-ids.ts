import { createSecureHexId, createSecureId } from './secure-id.ts'

type RandomBytes = (size: number) => Uint8Array
type RandomUUID = () => string

export function createMobileMessageId({
  randomBytes,
  randomUUID
}: {
  randomBytes: RandomBytes
  randomUUID?: RandomUUID
}): string {
  return createSecureId({
    randomBytes,
    randomUUID
  })
}

export function createMobileHomeRoomKey({ randomBytes }: { randomBytes: RandomBytes }): string {
  return createSecureHexId({
    byteLength: 32,
    randomBytes
  })
}
