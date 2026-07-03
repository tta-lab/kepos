declare module 'node:crypto' {
  export function createHash(algorithm: string): {
    update(data: Uint8Array): { digest(encoding: 'hex'): string }
  }
}

declare module 'node:fs/promises' {
  export function mkdir(filePath: string, options?: { recursive?: boolean }): Promise<unknown>
  export function readFile(filePath: string): Promise<Uint8Array>
  export function writeFile(filePath: string, data: Uint8Array): Promise<unknown>
}

declare module 'node:fs' {
  const fs: {
    existsSync(filePath: string): boolean
    mkdirSync(filePath: string, options: { recursive: boolean }): unknown
    readFileSync(filePath: string, encoding: 'utf8'): string
    writeFileSync(filePath: string, value: string): unknown
  }

  export default fs
}

declare module 'node:path' {
  export function dirname(filePath: string): string
  export function join(...segments: string[]): string
}

declare module 'node:stream' {
  export class Duplex {
    constructor(options?: {
      final?: (this: Duplex, callback: () => void) => void
      read?: (this: Duplex) => void
      write?: (this: Duplex, chunk: Uint8Array, encoding: string, callback: () => void) => void
    })
    destroy(): unknown
    off(event: 'data', handler: (chunk: { toString(): string }) => void): unknown
    on(event: 'data', handler: (chunk: { toString(): string }) => void): unknown
    push(chunk: Uint8Array | null): boolean
    write(value: string): unknown
  }
}

declare module 'bare-fs' {
  const fs: {
    existsSync(filePath: string): boolean
    mkdirSync(filePath: string, options: { recursive: boolean }): unknown
    readFileSync(filePath: string, encoding: 'utf8'): string
    writeFileSync(filePath: string, value: string): unknown
  }

  export default fs
}

declare module 'bare-path' {
  const path: {
    join(...segments: string[]): string
  }

  export default path
}

declare module 'bare-encoding' {
  const BareEncoding: {
    TextDecoder: unknown
    TextEncoder: unknown
  }

  export default BareEncoding
}
