import { describe, expect, test } from "bun:test";
import {
  createRoomKey,
  decodeFrame,
  deriveTopic,
  encodeFrame,
  isRoomKey,
} from "../src/protocol.js";

describe("room keys", () => {
  test("createRoomKey returns a 32-byte hex secret", () => {
    const key = createRoomKey();

    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(isRoomKey(key)).toBe(true);
  });

  test("isRoomKey rejects malformed room keys", () => {
    expect(isRoomKey("")).toBe(false);
    expect(isRoomKey("abc")).toBe(false);
    expect(isRoomKey("g".repeat(64))).toBe(false);
    expect(isRoomKey("0".repeat(63))).toBe(false);
  });
});

describe("topic derivation", () => {
  test("deriveTopic returns a stable 32-byte topic for the same room", () => {
    const key = "a".repeat(64);

    expect(deriveTopic(key)).toEqual(deriveTopic(key));
    expect(deriveTopic(key)).toBeInstanceOf(Uint8Array);
    expect(deriveTopic(key).byteLength).toBe(32);
  });

  test("deriveTopic rejects invalid room keys", () => {
    expect(() => deriveTopic("bad-key")).toThrow("Invalid room key");
  });
});

describe("wire frames", () => {
  test("encodeFrame writes newline-delimited JSON and decodeFrame reads it back", () => {
    const message = {
      type: "chat",
      id: "msg-1",
      nick: "Neil",
      text: "hello room",
      at: 1_797_331_200_000,
    };

    const frame = encodeFrame(message);

    expect(frame.endsWith("\n")).toBe(true);
    expect(decodeFrame(frame.trimEnd())).toEqual(message);
  });

  test("decodeFrame rejects non-chat frames", () => {
    expect(() => decodeFrame('{"type":"join"}')).toThrow("Unsupported frame");
  });
});
