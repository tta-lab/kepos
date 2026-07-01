import b4a from 'b4a'

type RpcRequestLike = {
  data?: Uint8Array | null
}

export function readRpcPayload(req: RpcRequestLike): unknown {
  if (!req.data?.byteLength) {
    return {}
  }

  return JSON.parse(b4a.toString(req.data))
}
