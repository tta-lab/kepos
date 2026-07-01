declare module 'compact-encoding' {
  type Encoding<T = unknown> = {
    preencode(state: unknown, value: T): void
    encode(state: unknown, value: T): void
    decode(state: unknown): T
  }

  const compact: {
    bool: Encoding<boolean>
    string: Encoding<string>
    uint: Encoding<number>
    decode<T>(encoding: Encoding<T>, buffer: Uint8Array): T
    encode<T>(encoding: Encoding<T>, value: T): Buffer
  }

  export default compact
}

declare module 'b4a' {
  const b4a: {
    alloc(size: number): Uint8Array
    from(value: string): Uint8Array
    from(value: string, encoding: 'base64' | 'hex'): Uint8Array
    equals(left: Uint8Array, right: Uint8Array): boolean
    toString(value: Uint8Array): string
    toString(value: Uint8Array, encoding: 'base64' | 'hex'): string
  }

  export default b4a
}

declare module 'hypercore-crypto' {
  const crypto: {
    keyPair(): {
      publicKey: Uint8Array
      secretKey: Uint8Array
    }
    randomBytes(size: number): Uint8Array
    hash(message: Uint8Array): Uint8Array
    sign(message: Uint8Array, secretKey: Uint8Array): Uint8Array
    verify(message: Uint8Array, signature: Uint8Array, publicKey: Uint8Array): boolean
  }

  export default crypto
}

declare module 'sodium-universal' {
  const sodium: {
    crypto_box_PUBLICKEYBYTES: number
    crypto_box_SEALBYTES: number
    crypto_box_SECRETKEYBYTES: number
    crypto_box_keypair(publicKey: Uint8Array, secretKey: Uint8Array): void
    crypto_box_seal(sealed: Uint8Array, message: Uint8Array, publicKey: Uint8Array): void
    crypto_box_seal_open(
      opened: Uint8Array,
      sealed: Uint8Array,
      publicKey: Uint8Array,
      secretKey: Uint8Array
    ): boolean
  }

  export default sodium
}
