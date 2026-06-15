#!/usr/bin/env bun

import Hyperswarm from "hyperswarm";
import readline from "node:readline";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import {
  createRoomKey,
  decodeFrame,
  deriveTopic,
  encodeFrame,
  isRoomKey,
} from "./protocol.js";

function usage() {
  return `Kepos P2P chat prototype

Usage:
  bun start -- create [--nick <name>]
  bun start -- join <room-key> [--nick <name>]
`;
}

export function parseArgs(argv) {
  const [command, maybeRoomKey] = argv;
  const rest = command === "join" ? argv.slice(2) : argv.slice(1);
  const nickIndex = rest.indexOf("--nick");
  const nick =
    nickIndex === -1 ? process.env.USER || "anon" : rest[nickIndex + 1]?.trim();

  if (!command || command === "--help" || command === "-h") {
    return { command: "help" };
  }

  if (command === "create") {
    return { command, roomKey: createRoomKey(), nick };
  }

  if (command === "join" && isRoomKey(maybeRoomKey)) {
    return { command, roomKey: maybeRoomKey, nick };
  }

  return { command: "invalid" };
}

function displayMessage(message) {
  const time = new Date(message.at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  process.stdout.write(`\n[${time}] ${message.nick}: ${message.text}\n> `);
}

function trackPeer(socket, peers, seenMessages) {
  peers.add(socket);
  let buffer = "";

  socket.on("data", (chunk) => {
    buffer += chunk.toString("utf8");
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) {
        continue;
      }

      try {
        const message = decodeFrame(line);
        if (seenMessages.has(message.id)) {
          continue;
        }

        seenMessages.add(message.id);
        displayMessage(message);
      } catch {
        // Ignore malformed peer frames. The prototype has no trust layer yet.
      }
    }
  });

  socket.on("close", () => peers.delete(socket));
  socket.on("error", () => peers.delete(socket));
}

function broadcast(peers, message) {
  const frame = encodeFrame(message);

  for (const peer of peers) {
    if (!peer.destroyed) {
      peer.write(frame);
    }
  }
}

async function runChat({ roomKey, nick, created }) {
  const swarm = new Hyperswarm();
  const peers = new Set();
  const seenMessages = new Set();
  const topic = deriveTopic(roomKey);

  swarm.on("connection", (socket) => {
    trackPeer(socket, peers, seenMessages);
    process.stdout.write(`\npeer connected (${peers.size})\n> `);
  });

  const discovery = swarm.join(topic, { client: true, server: true });
  await discovery.flushed();

  if (created) {
    console.log("Room created.");
    console.log(`Room key: ${roomKey}`);
    console.log(`Invite: bun start -- join ${roomKey} --nick <name>`);
  } else {
    console.log("Joined room.");
  }

  console.log(`Nick: ${nick}`);
  console.log("Type a message and press Enter. /quit or Ctrl+C exits.");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "> ",
  });

  let shuttingDown = false;
  const shutdown = async () => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    rl.close();

    for (const peer of peers) {
      peer.destroy();
    }

    const exitTimer = setTimeout(() => process.exit(0), 500);
    exitTimer.unref();

    await swarm.destroy();
    process.exit(0);
  };

  rl.prompt();
  rl.on("line", async (line) => {
    const text = line.trim();
    if (!text) {
      rl.prompt();
      return;
    }

    if (text === "/quit") {
      await shutdown();
      return;
    }

    const message = {
      type: "chat",
      id: randomUUID(),
      nick,
      text,
      at: Date.now(),
    };

    seenMessages.add(message.id);
    broadcast(peers, message);
    rl.prompt();
  });

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);

  if (args.command === "help") {
    console.log(usage());
    return;
  }

  if (args.command === "invalid") {
    console.error(usage());
    process.exitCode = 1;
    return;
  }

  await runChat({
    roomKey: args.roomKey,
    nick: args.nick || "anon",
    created: args.command === "create",
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
