import React, { useMemo, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  ArrowRight,
  Heart,
  LogOut,
  MessageCircle,
  Plus,
  Send,
  Sprout,
} from "lucide-react-native";
import {
  appendLocalMessage,
  appendRemoteMessage,
  createChatSession,
} from "../src/chat-session.js";
import { Worklet } from "react-native-bare-kit";
import RPC from "bare-rpc";
import b4a from "b4a";
import bundle from "./app.bundle.mjs";
import {
  RPC_ERROR,
  RPC_JOIN,
  RPC_LEAVE,
  RPC_MESSAGE,
  RPC_PEER_COUNT,
  RPC_SEND,
  RPC_STATUS,
  RPC_TREEHOLE_POST,
  RPC_TREEHOLE_STATE,
  RPC_TREEHOLE_STATUS,
} from "../rpc-commands.mjs";

const ROOM_KEY_PATTERN = /^[0-9a-f]{64}$/;

export default function App() {
  const [nick, setNick] = useState("Neil");
  const [roomKey, setRoomKey] = useState("");
  const [draft, setDraft] = useState("");
  const [treeholeDraft, setTreeholeDraft] = useState("");
  const [treeholePosts, setTreeholePosts] = useState([]);
  const [treeholeStatus, setTreeholeStatus] = useState("idle");
  const [activeTab, setActiveTab] = useState("chat");
  const [session, setSession] = useState(null);
  const [notice, setNotice] = useState("Start or join a room to bring up the P2P backend.");
  const [peerCount, setPeerCount] = useState(0);
  const [rpc, setRpc] = useState(null);
  const workletRef = useRef(null);

  const canJoin = ROOM_KEY_PATTERN.test(roomKey.trim());

  function createRoom() {
    const key = createMobileRoomKey();
    setRoomKey(key);
    setSession(createChatSession({ roomKey: key, nick }));
    setPeerCount(0);
    setTreeholePosts([]);
    setTreeholeStatus("starting");
    startBackend({ roomKey: key, nick, createTreehole: true });
  }

  function joinRoom() {
    if (!canJoin) {
      setNotice("Room key must be 64 lowercase hex characters.");
      return;
    }

    setSession(createChatSession({ roomKey: roomKey.trim(), nick }));
    setPeerCount(0);
    setTreeholePosts([]);
    setTreeholeStatus("waiting");
    startBackend({ roomKey: roomKey.trim(), nick, createTreehole: false });
  }

  function leaveRoom() {
    rpc?.request(RPC_LEAVE).send(JSON.stringify({}));
    setSession(null);
    setDraft("");
    setTreeholeDraft("");
    setTreeholePosts([]);
    setTreeholeStatus("idle");
    setActiveTab("chat");
    setPeerCount(0);
    setRpc(null);
    workletRef.current = null;
    setNotice("Left room.");
  }

  function sendMessage() {
    if (!session || !draft.trim()) {
      return;
    }

    const message = {
        id: createMessageId(),
        text: draft,
        at: Date.now(),
      };

    setSession(appendLocalMessage(session, message.text, message));
    rpc?.request(RPC_SEND).send(JSON.stringify(message));
    setDraft("");
  }

  function sendTreeholePost() {
    if (!session || !treeholeDraft.trim()) {
      return;
    }

    rpc?.request(RPC_TREEHOLE_POST).send(
      JSON.stringify({
        id: createMessageId(),
        text: treeholeDraft,
        createdAt: Date.now(),
      }),
    );
    setTreeholeDraft("");
  }

  function startBackend(nextSession) {
    try {
      const worklet = new Worklet();
      worklet.start("/app.bundle", bundle, []);
      workletRef.current = worklet;

      const nextRpc = new RPC(worklet.IPC, (req) => {
        const payload = readRpcPayload(req);

        if (req.command === RPC_MESSAGE) {
          setSession((current) =>
            current ? appendRemoteMessage(current, payload) : current,
          );
          return;
        }

        if (req.command === RPC_PEER_COUNT) {
          setPeerCount(payload.count || 0);
          return;
        }

        if (req.command === RPC_STATUS) {
          setNotice(`P2P backend ${payload.status}.`);
          return;
        }

        if (req.command === RPC_TREEHOLE_STATUS) {
          setTreeholeStatus(payload.status || "idle");
          return;
        }

        if (req.command === RPC_TREEHOLE_STATE) {
          setTreeholePosts(payload.posts || []);
          return;
        }

        if (req.command === RPC_ERROR) {
          setNotice(payload.message || "P2P backend error.");
        }
      });

      nextRpc.request(RPC_JOIN).send(JSON.stringify(nextSession));
      setRpc(nextRpc);
      setNotice("Starting P2P backend...");
    } catch (error) {
      setNotice(`P2P backend unavailable: ${error.message}`);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.screen}
      >
        <Header notice={notice} online={peerCount} title={session ? "Room" : "Kepos"} />
        {session ? (
          <ChatRoom
            draft={draft}
            activeTab={activeTab}
            onDraftChange={setDraft}
            onLeave={leaveRoom}
            onSend={sendMessage}
            onTabChange={setActiveTab}
            onTreeholeDraftChange={setTreeholeDraft}
            onTreeholePost={sendTreeholePost}
            session={session}
            treeholeDraft={treeholeDraft}
            treeholePosts={treeholePosts}
            treeholeStatus={treeholeStatus}
          />
        ) : (
          <Lobby
            canJoin={canJoin}
            nick={nick}
            onCreateRoom={createRoom}
            onJoinRoom={joinRoom}
            onNickChange={setNick}
            onRoomKeyChange={setRoomKey}
            roomKey={roomKey}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Header({ title, notice, online }) {
  return (
    <View style={styles.header}>
      <View style={styles.brandRow}>
        <View style={styles.mark}>
          <Sprout color="#143d2b" size={22} strokeWidth={2.4} />
        </View>
        <View>
          <Text style={styles.kicker}>private garden</Text>
          <Text style={styles.title}>{title}</Text>
        </View>
      </View>
      <View style={styles.statusPill}>
        <View style={styles.statusDot} />
        <Text style={styles.statusText}>{online} peer</Text>
      </View>
      <Text style={styles.notice}>{notice}</Text>
    </View>
  );
}

function Lobby({
  canJoin,
  nick,
  onCreateRoom,
  onJoinRoom,
  onNickChange,
  onRoomKeyChange,
  roomKey,
}) {
  return (
    <View style={styles.lobby}>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Start a room</Text>
        <Text style={styles.panelCopy}>
          Create a shared key, then invite another device into the same room.
        </Text>
        <Field label="Nick" onChangeText={onNickChange} value={nick} />
        <Pressable style={styles.primaryButton} onPress={onCreateRoom}>
          <Plus color="#fffaf0" size={18} />
          <Text style={styles.primaryButtonText}>Create Room</Text>
        </Pressable>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Join by key</Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          multiline
          onChangeText={onRoomKeyChange}
          placeholder="64-character room key"
          placeholderTextColor="#8b9188"
          style={styles.keyInput}
          value={roomKey}
        />
        <Pressable
          disabled={!canJoin}
          onPress={onJoinRoom}
          style={[styles.secondaryButton, !canJoin && styles.disabledButton]}
        >
          <ArrowRight color={canJoin ? "#143d2b" : "#8b9188"} size={18} />
          <Text
            style={[
              styles.secondaryButtonText,
              !canJoin && styles.disabledButtonText,
            ]}
          >
            Join Room
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function ChatRoom({
  activeTab,
  draft,
  onDraftChange,
  onLeave,
  onSend,
  onTabChange,
  onTreeholeDraftChange,
  onTreeholePost,
  session,
  treeholeDraft,
  treeholePosts,
  treeholeStatus,
}) {
  const roomShort = useMemo(
    () => `${session.roomKey.slice(0, 8)}...${session.roomKey.slice(-8)}`,
    [session.roomKey],
  );

  return (
    <View style={styles.chat}>
      <View style={styles.roomBar}>
        <View>
          <Text style={styles.roomLabel}>room key</Text>
          <Text style={styles.roomKey}>{roomShort}</Text>
        </View>
        <Pressable style={styles.iconButton} onPress={onLeave}>
          <LogOut color="#143d2b" size={18} />
        </Pressable>
      </View>

      <View style={styles.tabs}>
        <TabButton active={activeTab === "chat"} label="Chat" onPress={() => onTabChange("chat")} />
        <TabButton
          active={activeTab === "treehole"}
          label="Treehole"
          onPress={() => onTabChange("treehole")}
        />
      </View>

      {activeTab === "chat" ? (
        <ChatPane
          draft={draft}
          messages={session.messages}
          onDraftChange={onDraftChange}
          onSend={onSend}
        />
      ) : (
        <TreeholePane
          draft={treeholeDraft}
          onDraftChange={onTreeholeDraftChange}
          onPost={onTreeholePost}
          posts={treeholePosts}
          status={treeholeStatus}
        />
      )}
    </View>
  );
}

function TabButton({ active, label, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.tabButton, active && styles.activeTabButton]}
    >
      <Text style={[styles.tabText, active && styles.activeTabText]}>{label}</Text>
    </Pressable>
  );
}

function ChatPane({ draft, messages, onDraftChange, onSend }) {
  return (
    <>
      <FlatList
        contentContainerStyle={styles.messageList}
        data={messages}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<EmptyMessages />}
        renderItem={({ item }) => <MessageBubble message={item} />}
      />

      <View style={styles.composer}>
        <TextInput
          onChangeText={onDraftChange}
          onSubmitEditing={onSend}
          placeholder="Write to the room"
          placeholderTextColor="#8b9188"
          returnKeyType="send"
          style={styles.messageInput}
          value={draft}
        />
        <Pressable style={styles.sendButton} onPress={onSend}>
          <Send color="#fffaf0" size={18} />
        </Pressable>
      </View>
    </>
  );
}

function TreeholePane({ draft, onDraftChange, onPost, posts, status }) {
  return (
    <>
      <FlatList
        contentContainerStyle={styles.treeholeList}
        data={posts}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<EmptyTreehole status={status} />}
        renderItem={({ item }) => <TreeholePost post={item} />}
      />

      <View style={styles.treeholeComposer}>
        <TextInput
          multiline
          onChangeText={onDraftChange}
          placeholder="Post to the treehole"
          placeholderTextColor="#8b9188"
          style={styles.treeholeInput}
          value={draft}
        />
        <Pressable
          disabled={!draft.trim() || status !== "ready"}
          onPress={onPost}
          style={[
            styles.sendButton,
            (!draft.trim() || status !== "ready") && styles.disabledSendButton,
          ]}
        >
          <Send color="#fffaf0" size={18} />
        </Pressable>
      </View>
    </>
  );
}

function EmptyTreehole({ status }) {
  return (
    <View style={styles.empty}>
      <MessageCircle color="#56715f" size={34} />
      <Text style={styles.emptyTitle}>No treeholes yet</Text>
      <Text style={styles.emptyCopy}>{treeholeStatusText(status)}</Text>
    </View>
  );
}

function TreeholePost({ post }) {
  return (
    <View style={styles.post}>
      <View style={styles.postHeader}>
        <Text style={styles.postAuthor}>{post.author}</Text>
        <Text style={styles.postTime}>{formatPostTime(post.createdAt)}</Text>
      </View>
      <Text style={styles.postText}>{post.text}</Text>
      <View style={styles.postStats}>
        <View style={styles.postStat}>
          <MessageCircle color="#5a6b54" size={14} />
          <Text style={styles.postStatText}>{post.commentCount}</Text>
        </View>
        <View style={styles.postStat}>
          <Heart color="#5a6b54" size={14} />
          <Text style={styles.postStatText}>{post.likeCount}</Text>
        </View>
      </View>
    </View>
  );
}

function EmptyMessages() {
  return (
    <View style={styles.empty}>
      <MessageCircle color="#56715f" size={34} />
      <Text style={styles.emptyTitle}>No messages yet</Text>
      <Text style={styles.emptyCopy}>Send the first line from this phone.</Text>
    </View>
  );
}

function MessageBubble({ message }) {
  const outgoing = message.direction === "out";

  return (
    <View style={[styles.bubble, outgoing ? styles.outBubble : styles.inBubble]}>
      <Text style={[styles.bubbleMeta, !outgoing && styles.inBubbleMeta]}>{message.nick}</Text>
      <Text style={[styles.bubbleText, !outgoing && styles.inBubbleText]}>{message.text}</Text>
    </View>
  );
}

function Field({ label, onChangeText, value }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={onChangeText}
        style={styles.input}
        value={value}
      />
    </View>
  );
}

function createMobileRoomKey() {
  const bytes = new Uint8Array(32);

  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function createMessageId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatPostTime(value) {
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function treeholeStatusText(status) {
  if (status === "waiting" || status === "waiting-for-bootstrap") {
    return "Waiting for a room peer to share the treehole log.";
  }

  if (status === "starting") {
    return "Starting the treehole log.";
  }

  return "Write the first post from this phone.";
}

function readRpcPayload(req) {
  if (!req.data?.byteLength) {
    return {};
  }

  return JSON.parse(b4a.toString(req.data));
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#fffaf0",
  },
  screen: {
    flex: 1,
    backgroundColor: "#fffaf0",
  },
  header: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#d9dfcf",
  },
  brandRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  mark: {
    alignItems: "center",
    backgroundColor: "#dfe9ce",
    borderColor: "#b9caa6",
    borderRadius: 8,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  kicker: {
    color: "#6f766b",
    fontSize: 12,
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  title: {
    color: "#162119",
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: 0,
  },
  statusPill: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderColor: "#c9d3bf",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    marginTop: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusDot: {
    backgroundColor: "#2f8f61",
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  statusText: {
    color: "#324137",
    fontSize: 13,
    fontWeight: "700",
  },
  notice: {
    color: "#6f766b",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 12,
  },
  lobby: {
    flex: 1,
    gap: 14,
    padding: 18,
  },
  panel: {
    backgroundColor: "#f6f1e4",
    borderColor: "#d9dfcf",
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
  },
  panelTitle: {
    color: "#162119",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 0,
  },
  panelCopy: {
    color: "#596255",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  field: {
    marginTop: 16,
  },
  label: {
    color: "#4b554c",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 7,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: "#fffdf7",
    borderColor: "#cfd8c6",
    borderRadius: 8,
    borderWidth: 1,
    color: "#162119",
    fontSize: 17,
    minHeight: 48,
    paddingHorizontal: 13,
  },
  keyInput: {
    backgroundColor: "#fffdf7",
    borderColor: "#cfd8c6",
    borderRadius: 8,
    borderWidth: 1,
    color: "#162119",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 14,
    minHeight: 96,
    padding: 13,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#143d2b",
    borderRadius: 8,
    flexDirection: "row",
    gap: 9,
    justifyContent: "center",
    marginTop: 16,
    minHeight: 50,
  },
  primaryButtonText: {
    color: "#fffaf0",
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryButton: {
    alignItems: "center",
    borderColor: "#143d2b",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 9,
    justifyContent: "center",
    marginTop: 14,
    minHeight: 50,
  },
  secondaryButtonText: {
    color: "#143d2b",
    fontSize: 16,
    fontWeight: "800",
  },
  disabledButton: {
    borderColor: "#c6cdc1",
  },
  disabledButtonText: {
    color: "#8b9188",
  },
  chat: {
    flex: 1,
  },
  tabs: {
    borderBottomColor: "#d9dfcf",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  tabButton: {
    alignItems: "center",
    borderColor: "#c9d3bf",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 40,
  },
  activeTabButton: {
    backgroundColor: "#143d2b",
    borderColor: "#143d2b",
  },
  tabText: {
    color: "#4b554c",
    fontSize: 14,
    fontWeight: "800",
  },
  activeTabText: {
    color: "#fffaf0",
  },
  roomBar: {
    alignItems: "center",
    borderBottomColor: "#d9dfcf",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  roomLabel: {
    color: "#6f766b",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  roomKey: {
    color: "#162119",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 2,
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: "#dfe9ce",
    borderRadius: 8,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  messageList: {
    flexGrow: 1,
    gap: 10,
    padding: 18,
  },
  empty: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    minHeight: 280,
  },
  emptyTitle: {
    color: "#162119",
    fontSize: 20,
    fontWeight: "800",
    marginTop: 12,
  },
  emptyCopy: {
    color: "#6f766b",
    fontSize: 14,
    marginTop: 5,
  },
  bubble: {
    borderRadius: 8,
    maxWidth: "82%",
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  outBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#143d2b",
  },
  inBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#dfe9ce",
  },
  bubbleMeta: {
    color: "#d9714b",
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  inBubbleMeta: {
    color: "#5a6b54",
  },
  bubbleText: {
    color: "#fffaf0",
    fontSize: 16,
    lineHeight: 22,
  },
  inBubbleText: {
    color: "#162119",
  },
  composer: {
    alignItems: "center",
    borderTopColor: "#d9dfcf",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 14,
  },
  messageInput: {
    backgroundColor: "#fffdf7",
    borderColor: "#cfd8c6",
    borderRadius: 8,
    borderWidth: 1,
    color: "#162119",
    flex: 1,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 13,
  },
  sendButton: {
    alignItems: "center",
    backgroundColor: "#d9714b",
    borderRadius: 8,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  disabledSendButton: {
    backgroundColor: "#b7bdae",
  },
  treeholeList: {
    flexGrow: 1,
    gap: 12,
    padding: 18,
  },
  post: {
    backgroundColor: "#fffdf7",
    borderColor: "#d9dfcf",
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
  },
  postHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  postAuthor: {
    color: "#143d2b",
    fontSize: 13,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  postTime: {
    color: "#6f766b",
    fontSize: 12,
    fontWeight: "700",
  },
  postText: {
    color: "#162119",
    fontSize: 17,
    lineHeight: 24,
    marginTop: 10,
  },
  postStats: {
    flexDirection: "row",
    gap: 14,
    marginTop: 12,
  },
  postStat: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
  },
  postStatText: {
    color: "#5a6b54",
    fontSize: 13,
    fontWeight: "800",
  },
  treeholeComposer: {
    alignItems: "flex-end",
    borderTopColor: "#d9dfcf",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 14,
  },
  treeholeInput: {
    backgroundColor: "#fffdf7",
    borderColor: "#cfd8c6",
    borderRadius: 8,
    borderWidth: 1,
    color: "#162119",
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    maxHeight: 118,
    minHeight: 64,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
});
