/* global BareKit */

import RPC from "bare-rpc";
import b4a from "b4a";
import { createP2PRoom } from "../src/p2p-room.js";
import {
  RPC_ERROR,
  RPC_JOIN,
  RPC_LEAVE,
  RPC_MESSAGE,
  RPC_PEER_COUNT,
  RPC_SEND,
  RPC_STATUS,
} from "../rpc-commands.mjs";

const rpc = new RPC(BareKit.IPC, (req) => {
  handleRequest(req).catch((error) => {
    sendToUI(RPC_ERROR, { message: error.message });
  });
});

let room = null;

async function handleRequest(req) {
  const payload = readPayload(req);

  if (req.command === RPC_JOIN) {
    await joinRoom(payload);
    req.reply?.(b4a.from(JSON.stringify({ ok: true })));
    return;
  }

  if (req.command === RPC_SEND) {
    room?.send(payload);
    req.reply?.(b4a.from(JSON.stringify({ ok: true })));
    return;
  }

  if (req.command === RPC_LEAVE) {
    await room?.leave();
    room = null;
    sendToUI(RPC_STATUS, { status: "left" });
    req.reply?.(b4a.from(JSON.stringify({ ok: true })));
  }
}

async function joinRoom(payload) {
  await room?.leave();

  room = createP2PRoom({
    onMessage: (message) => sendToUI(RPC_MESSAGE, message),
    onPeerCount: (count) => sendToUI(RPC_PEER_COUNT, { count }),
  });

  await room.join({
    roomKey: payload.roomKey,
    nick: payload.nick,
  });

  sendToUI(RPC_STATUS, { status: "joined" });
}

function readPayload(req) {
  if (!req.data?.byteLength) {
    return {};
  }

  return JSON.parse(b4a.toString(req.data));
}

function sendToUI(command, payload) {
  const request = rpc.request(command);
  request.send(JSON.stringify(payload));
}
