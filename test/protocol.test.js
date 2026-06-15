import assert from "node:assert/strict";
import { describe, test } from "node:test";
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

    assert.match(key, /^[0-9a-f]{64}$/);
    assert.equal(isRoomKey(key), true);
  });

  test("isRoomKey rejects malformed room keys", () => {
    assert.equal(isRoomKey(""), false);
    assert.equal(isRoomKey("abc"), false);
    assert.equal(isRoomKey("g".repeat(64)), false);
    assert.equal(isRoomKey("0".repeat(63)), false);
  });
});

describe("topic derivation", () => {
  test("deriveTopic returns a stable 32-byte topic for the same room", () => {
    const key = "a".repeat(64);

    assert.deepEqual(deriveTopic(key), deriveTopic(key));
    assert.equal(deriveTopic(key) instanceof Uint8Array, true);
    assert.equal(deriveTopic(key).byteLength, 32);
  });

  test("deriveTopic rejects invalid room keys", () => {
    assert.throws(() => deriveTopic("bad-key"), /Invalid room key/);
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

    assert.equal(frame.endsWith("\n"), true);
    assert.deepEqual(decodeFrame(frame.trimEnd()), message);
  });

  test("decodeFrame rejects non-chat frames", () => {
    assert.throws(() => decodeFrame('{"type":"join"}'), /Unsupported frame/);
  });
});
