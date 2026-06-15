import { describe, expect, test } from "bun:test";
import { parseArgs } from "../src/cli.js";

describe("CLI args", () => {
  test("create accepts --nick without a room key placeholder", () => {
    const args = parseArgs(["create", "--nick", "Neil"]);

    expect(args.command).toBe("create");
    expect(args.nick).toBe("Neil");
    expect(args.roomKey).toMatch(/^[0-9a-f]{64}$/);
  });

  test("join accepts a room key and nick", () => {
    const roomKey = "a".repeat(64);
    const args = parseArgs(["join", roomKey, "--nick", "Ada"]);

    expect(args).toEqual({
      command: "join",
      roomKey,
      nick: "Ada",
    });
  });
});
