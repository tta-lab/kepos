import { runCompatibilityProbes } from '../src/compatibility-probes.ts'

const result = runCompatibilityProbes()

console.log(
  JSON.stringify(
    {
      encoding: {
        bytes: result.encoding.encodedHex.length / 2,
        type: result.encoding.roundTrip.type
      },
      sealedBox: {
        ciphertextBytes: result.sealedBox.ciphertextBytes
      },
      signing: {
        publicKey: result.signing.publicKey,
        verified: result.signing.verified
      },
      transport: {
        dmTopicBytes: result.transport.dmTopicBytes
      }
    },
    null,
    2
  )
)
