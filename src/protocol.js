import { createHash, randomBytes } from "node:crypto";

const ROOM_KEY_PATTERN = /^[0-9a-f]{64}$/;
const TOPIC_PREFIX = "kepos-room:v1:";

export function createRoomKey() {
  return randomBytes(32).toString("hex");
}

export function isRoomKey(value) {
  return typeof value === "string" && ROOM_KEY_PATTERN.test(value);
}

export function deriveTopic(roomKey) {
  if (!isRoomKey(roomKey)) {
    throw new Error("Invalid room key");
  }

  return createHash("sha256").update(`${TOPIC_PREFIX}${roomKey}`).digest();
}

export function encodeFrame(message) {
  return `${JSON.stringify(message)}\n`;
}

export function decodeFrame(line) {
  const frame = JSON.parse(line);

  if (frame?.type !== "chat") {
    throw new Error("Unsupported frame");
  }

  return frame;
}
