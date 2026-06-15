import { describe, expect, test } from "bun:test";
import {
  appendLocalMessage,
  appendRemoteMessage,
  createChatSession,
} from "../src/chat-session.js";

describe("chat session state", () => {
  test("createChatSession starts a room session with no messages", () => {
    const session = createChatSession({
      roomKey: "a".repeat(64),
      nick: "Neil",
    });

    expect(session.roomKey).toBe("a".repeat(64));
    expect(session.nick).toBe("Neil");
    expect(session.messages).toEqual([]);
    expect(session.seenMessageIds).toEqual(new Set());
  });

  test("appendLocalMessage adds an outgoing chat message", () => {
    const session = createChatSession({
      roomKey: "a".repeat(64),
      nick: "Neil",
    });

    const next = appendLocalMessage(session, "hello", {
      id: "local-1",
      at: 1_797_331_200_000,
    });

    expect(next.messages).toEqual([
      {
        type: "chat",
        id: "local-1",
        nick: "Neil",
        text: "hello",
        at: 1_797_331_200_000,
        direction: "out",
      },
    ]);
    expect(next.seenMessageIds.has("local-1")).toBe(true);
  });

  test("appendRemoteMessage ignores duplicate messages", () => {
    const session = createChatSession({
      roomKey: "a".repeat(64),
      nick: "Neil",
    });
    const remote = {
      type: "chat",
      id: "remote-1",
      nick: "Ada",
      text: "hi",
      at: 1_797_331_200_000,
    };

    const once = appendRemoteMessage(session, remote);
    const twice = appendRemoteMessage(once, remote);

    expect(twice.messages).toHaveLength(1);
    expect(twice.messages[0].direction).toBe("in");
  });
});
