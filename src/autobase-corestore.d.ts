declare module 'autobase' {
  const Autobase: unknown

  export default Autobase
}

declare module 'corestore' {
  const Corestore: unknown

  export default Corestore
}

declare module 'hyperswarm' {
  class Hyperswarm {
    destroy(): unknown | Promise<unknown>
    join(
      topic: Uint8Array,
      options: { client: boolean; server: boolean }
    ): {
      flushed(): unknown | Promise<unknown>
    }
    on(event: 'connection', handler: (socket: unknown) => void): unknown
  }

  export default Hyperswarm
}
