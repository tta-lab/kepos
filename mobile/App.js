import React, { useMemo, useState } from "react";
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
  LogOut,
  MessageCircle,
  Plus,
  Send,
  Sprout,
} from "lucide-react-native";
import {
  appendLocalMessage,
  createChatSession,
} from "../src/chat-session.js";

const ROOM_KEY_PATTERN = /^[0-9a-f]{64}$/;

export default function App() {
  const [nick, setNick] = useState("Neil");
  const [roomKey, setRoomKey] = useState("");
  const [draft, setDraft] = useState("");
  const [session, setSession] = useState(null);
  const [notice, setNotice] = useState("UI preview. P2P worklet not connected yet.");

  const canJoin = ROOM_KEY_PATTERN.test(roomKey.trim());

  function createRoom() {
    const key = createMobileRoomKey();
    setRoomKey(key);
    setSession(createChatSession({ roomKey: key, nick }));
    setNotice("Room created on this phone. P2P backend is the next wiring step.");
  }

  function joinRoom() {
    if (!canJoin) {
      setNotice("Room key must be 64 lowercase hex characters.");
      return;
    }

    setSession(createChatSession({ roomKey: roomKey.trim(), nick }));
    setNotice("Joined local room view. The UI is ready for the Bare RPC backend.");
  }

  function leaveRoom() {
    setSession(null);
    setDraft("");
    setNotice("Left room.");
  }

  function sendMessage() {
    if (!session || !draft.trim()) {
      return;
    }

    setSession(
      appendLocalMessage(session, draft, {
        id: createMessageId(),
        at: Date.now(),
      }),
    );
    setDraft("");
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.screen}
      >
        <Header notice={notice} online={session ? 1 : 0} title={session ? "Room" : "Kepos"} />
        {session ? (
          <ChatRoom
            draft={draft}
            onDraftChange={setDraft}
            onLeave={leaveRoom}
            onSend={sendMessage}
            session={session}
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

function ChatRoom({ draft, onDraftChange, onLeave, onSend, session }) {
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

      <FlatList
        contentContainerStyle={styles.messageList}
        data={session.messages}
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
});
