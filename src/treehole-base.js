import Autobase from "autobase";
import Corestore from "corestore";
import b4a from "b4a";
import {
  applyTreeholeEvents,
  createCommentEvent,
  createLikeEvent,
  createPostEvent,
} from "./treehole-state.js";

export async function createTreeholeBase({
  storage,
  bootstrapKey = null,
  nick = "anon",
} = {}) {
  const store = new Corestore(storage || randomAccessMemory());
  await store.ready();

  const base = new Autobase(
    store,
    bootstrapKey ? b4a.from(bootstrapKey, "hex") : null,
    {
      open,
      apply,
      valueEncoding: "json",
    },
  );
  await base.ready();

  async function post({ id, text, createdAt = Date.now() }) {
    await base.append(
      createPostEvent({
        id,
        author: nick,
        text,
        createdAt,
      }),
    );
    await base.update();
  }

  async function comment({ id, postId, text, createdAt = Date.now() }) {
    await base.append(
      createCommentEvent({
        id,
        postId,
        author: nick,
        text,
        createdAt,
      }),
    );
    await base.update();
  }

  async function like({ postId, createdAt = Date.now() }) {
    await base.append(
      createLikeEvent({
        postId,
        author: nick,
        createdAt,
      }),
    );
    await base.update();
  }

  async function addWriter(key) {
    await base.append({
      type: "treehole.writer.add",
      key,
    });
    await base.update();
  }

  async function getEvents() {
    await base.update();

    const events = [];
    for (let index = 0; index < base.view.length; index += 1) {
      const event = await base.view.get(index);
      if (event) {
        events.push(event);
      }
    }

    return events;
  }

  async function getState() {
    return applyTreeholeEvents(await getEvents());
  }

  async function close() {
    await base.close();
    await store.close();
  }

  return {
    addWriter,
    base,
    close,
    comment,
    getEvents,
    getState,
    key: b4a.toString(base.key, "hex"),
    like,
    localWriterKey: b4a.toString(base.local.key, "hex"),
    post,
    replicate: (...args) => base.replicate(...args),
  };
}

function open(store) {
  return store.get({ name: "treehole-events", valueEncoding: "json" });
}

async function apply(nodes, view, host) {
  for (const node of nodes) {
    const event = node.value;

    if (!event) {
      continue;
    }

    if (event.type === "treehole.writer.add") {
      await host.addWriter(b4a.from(event.key, "hex"), { indexer: true });
      continue;
    }

    await view.append(event);
  }
}

function randomAccessMemory() {
  throw new Error("Treehole storage path is required");
}
