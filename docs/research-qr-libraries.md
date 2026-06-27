# Research: V1 QR Libraries

## Question

Which maintained open source QR generation/scanning libraries should Kepos use for profile, home, and message-request QR flows on React Native Android and desktop?

## Recommendation

Use `react-native-qrcode-svg` for React Native QR generation, `expo-camera` for Android QR scanning, and `qrcode` for desktop QR generation/rendering.

- Verified: Kepos already uses Expo SDK 56, React Native 0.85, and `react-native-svg` 15.15.4 in the root app, so `react-native-qrcode-svg` fits the current mobile stack without adding another SVG layer.
- Verified: `react-native-qrcode-svg` is MIT licensed, was updated on npm in 2025, depends on `qrcode`, and declares peer support for React Native `>=0.63.4` and `react-native-svg >=14.0.0`.
- Verified: `expo-camera` is MIT licensed, is the current Expo camera package, supports Android device builds, and exposes `CameraView` barcode scanning with `barcodeTypes: ["qr"]`.
- Verified: `qrcode` is MIT licensed, was updated on npm in 2025, supports Node/browser use, and can render PNG, SVG, data URL, canvas, and terminal output.
- Interpretation: This path keeps V1 small. Generation is pure JS/SVG. Scanning uses the camera module from Kepos's existing Expo platform instead of adding a second native camera stack.

Do not use `react-native-camera`; it is old and not worth introducing. Keep `react-native-vision-camera` as a later fallback only if `expo-camera` cannot meet scan quality or UX needs on real Android devices.

## Candidate Matrix

| Candidate                    | Role                              | License              | Maintenance                                 | Expo/RN Android fit                                                                               | Native module cost                                                                                   | V1 verdict                                                                  |
| ---------------------------- | --------------------------------- | -------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `react-native-qrcode-svg`    | Mobile generation                 | MIT                  | Verified: npm `6.3.21`, modified 2025-12-04 | Verified: React Native peer `>=0.63.4`; `react-native-svg >=14.0.0`; README shows Android/iOS use | Low: uses existing `react-native-svg`; no camera                                                     | Adopt                                                                       |
| `react-qr-code`              | Mobile/web generation             | MIT                  | Verified: npm `2.2.0`, modified 2026-06-09  | Verified: README says React Native works with `react-native-svg`                                  | Low                                                                                                  | Pass for V1 mobile; useful if sharing a React component across web/RN later |
| `expo-camera`                | Mobile camera scan                | MIT                  | Verified: npm `56.0.8`, modified 2026-06-25 | Verified: Expo docs list Android device support and barcode scanning                              | Medium: Expo native module, but standard for this app                                                | Adopt                                                                       |
| `react-native-vision-camera` | Mobile camera scan                | MIT                  | Verified: npm `5.0.11`, modified 2026-06-04 | Verified: RN camera library with barcode/QR scanning docs                                         | High: extra native stack and peer modules (`react-native-nitro-image`, `react-native-nitro-modules`) | Fallback                                                                    |
| `qrcode`                     | Desktop generation                | MIT                  | Verified: npm `1.5.4`, modified 2025-11-13  | Not RN-specific; works in Node/browser                                                            | Low: pure JS generation; PNG dependency via `pngjs`                                                  | Adopt                                                                       |
| `@zxing/browser`             | Desktop/browser scanning or tests | MIT                  | Verified: npm `0.2.0`, modified 2026-04-27  | Browser-focused, not RN                                                                           | Medium for desktop camera UX                                                                         | Optional later; useful for desktop scan-from-image/webcam if needed         |
| `jsQR`                       | Decode generated images in tests  | Apache-2.0           | Verified: npm `1.4.0`, modified 2025-11-13  | Pure JS image decoder, not a camera UI                                                            | Low for tests                                                                                        | Optional dev/test helper                                                    |
| `qr-scanner`                 | Desktop/browser scanning          | MIT                  | Verified: npm `1.4.2`, modified 2022-11-23  | Browser-focused                                                                                   | Medium                                                                                               | Pass; older maintenance signal than ZXing                                   |
| `react-native-camera`        | Mobile camera scan                | Mixed MIT/Apache/BSD | Verified: npm last modified 2023-11-07      | Older RN camera module                                                                            | High                                                                                                 | Pass                                                                        |

## Mobile Path

Generation:

- Adopt `react-native-qrcode-svg`.
- Implementation status: done for signed profile and home URI display in the Android lobby.
- Render the full URI envelope string, for example `kepos://profile?v=1&payload=<encoded-json>`.
- Set an explicit quiet zone and use error correction `M` or `Q` for screen-to-camera scans.
- Keep QR payloads small. Interpretation: signed URI JSON should fit, but profile/home/message-request payload size should be tracked in tests because QR density directly affects scan reliability.

Scanning:

- Adopt `expo-camera` with `CameraView`.
- Implementation status: done for Android profile/home QR scan routing through signed QR validation.
- Configure `barcodeScannerSettings={{ barcodeTypes: ["qr"] }}`.
- Handle `onBarcodeScanned` by reading `result.data`, then route through the existing URI/payload decoder and validation layer.
- Use permission hooks from `expo-camera`; fail closed when permission is denied.
- If scan quality is poor after real Android testing, evaluate `react-native-vision-camera` next. Its QR/barcode stack is more powerful, but its extra native peer modules are not justified for V1 until `expo-camera` fails.

Fallback if camera scanning is too heavy for V1:

- Ship QR display and paste/manual URI import first.
- Keep manual raw key entry as debug/support only, matching the existing QR design doc.
- Add "scan from image" later through `Camera.scanFromURLAsync` on mobile or a pure decoder path for stored screenshots.

## Desktop Path

Desktop generation:

- Adopt `qrcode` in the Electron desktop app.
- Implementation status: done for signed profile and home URI SVG QR rendering.
- Render SVG into the current plain DOM UI using `QRCode.toString(value, { type: "svg" })`, or render a PNG/Data URL with `QRCode.toDataURL(value)` if image download/copy is needed.
- Use the same URI envelope string as mobile.

Desktop scanning:

- Defer desktop camera scan for V1.
- If desktop scan becomes needed, prefer `@zxing/browser` for Electron/webcam and image-element decoding. Its README documents `BrowserQRCodeReader`, webcam decoding, image URL decoding, and image element decoding.

Do not use `react-qr-code` for current desktop unless the desktop app moves to React. Verified: the app is currently Electron with plain DOM code.

## Test Strategy

- Unit test URI envelope creation and parsing for profile, home, and message-request QR strings.
- Unit test payload validation: known type, required keys, key encoding, size limit, timestamp/expiry, and signature checks when signing lands.
- Add generation smoke tests that call `qrcode` on representative V1 payloads and assert generation succeeds at the chosen error correction level.
- Add a no-camera decode test with a static generated PNG/SVG fixture and either `jsQR` or `@zxing/browser` in a DOM-capable test harness. Done for generated signed profile/home PNGs with `jsQR` in `test/qr-rendering.test.js`.
- Mock `expo-camera` scan callbacks in React Native tests: feed `onBarcodeScanned({ type: "qr", data: uri })` and verify routing/state changes. Do not require Android camera hardware in CI.
- Add one manual Android device test before release: mobile displays profile/home/message-request QR, another mobile scans each QR, invalid QR fails closed, repeated scan is debounced, permission denied state is clear.

## Sources

- `package.json` in this repo: verified Expo SDK 56, React Native 0.85, and `react-native-svg` 15.15.4.
- `desktop/package.json`, `desktop/app.jsx`, and `desktop/controller.js` in this repo: verified Electron desktop app with React renderer shell and desktop runtime controller.
- Expo Camera docs: https://docs.expo.dev/versions/latest/sdk/camera/ and https://docs.expo.dev/versions/latest/sdk/camera.md
- Expo Camera npm metadata: https://www.npmjs.com/package/expo-camera
- `react-native-qrcode-svg` npm metadata and README: https://www.npmjs.com/package/react-native-qrcode-svg
- `qrcode` README and npm metadata: https://github.com/soldair/node-qrcode and https://www.npmjs.com/package/qrcode
- `react-qr-code` npm metadata and README: https://www.npmjs.com/package/react-qr-code
- VisionCamera docs and npm metadata: https://visioncamera.margelo.com/docs/barcode-scanner and https://www.npmjs.com/package/react-native-vision-camera
- ZXing browser README and npm metadata: https://www.npmjs.com/package/@zxing/browser
- `jsQR` npm metadata: https://www.npmjs.com/package/jsqr
- `qr-scanner` npm metadata: https://www.npmjs.com/package/qr-scanner
- `react-native-camera` npm metadata: https://www.npmjs.com/package/react-native-camera
