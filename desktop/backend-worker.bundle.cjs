"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/desktop-command-vocabulary.ts
function isDesktopCommand(value) {
  return COMMAND_SET.has(value);
}
function isDesktopEvent(value) {
  return EVENT_SET.has(value);
}
var DESKTOP_COMMANDS, DESKTOP_EVENTS, COMMAND_SET, EVENT_SET;
var init_desktop_command_vocabulary = __esm({
  "src/desktop-command-vocabulary.ts"() {
    "use strict";
    DESKTOP_COMMANDS = [
      "acceptMessageRequest",
      "commentTreehole",
      "ignoreMessageRequest",
      "joinHome",
      "joinHomeUri",
      "leaveHome",
      "likeTreehole",
      "postTreehole",
      "revokeContact",
      "sendDmMessage",
      "sendHomeMessage",
      "sendMessageRequest",
      "trustProfileUri",
      "updateDisplayName"
    ];
    DESKTOP_EVENTS = [
      "contactBookChanged",
      "contextFormDraftChanged",
      "desktopStateChanged",
      "directComposerRecipientChanged",
      "dmMessageReceived",
      "dmThreadChanged",
      "errorReceived",
      "homeMessageReceived",
      "peerCountChanged",
      "shareQrOutputsChanged",
      "statusChanged",
      "transportDebugChanged",
      "treeholeStateChanged"
    ];
    COMMAND_SET = new Set(DESKTOP_COMMANDS);
    EVENT_SET = new Set(DESKTOP_EVENTS);
  }
});

// src/desktop-file-storage-core.js
function createKeyValueFileStorage({ basePath, fileSystem, joinPath } = {}) {
  if (!basePath) throw new Error("Desktop storage base path is required");
  if (!fileSystem) throw new Error("Desktop storage file system is required");
  if (!joinPath) throw new Error("Desktop storage path joiner is required");
  const storagePath = joinPath(basePath, STORAGE_FILE);
  const values = readValues({ fileSystem, storagePath });
  function refresh() {
    values.clear();
    for (const [key, value] of readValues({ fileSystem, storagePath })) {
      values.set(key, value);
    }
  }
  function persist() {
    fileSystem.mkdirSync(basePath, { recursive: true });
    fileSystem.writeFileSync(storagePath, JSON.stringify(Object.fromEntries(values)));
  }
  return {
    clear() {
      values.clear();
      persist();
    },
    getItem(key) {
      refresh();
      return values.has(key) ? values.get(key) : null;
    },
    removeItem(key) {
      refresh();
      values.delete(key);
      persist();
    },
    setItem(key, value) {
      refresh();
      values.set(String(key), String(value));
      persist();
    }
  };
}
function readValues({ fileSystem, storagePath }) {
  if (!fileSystem.existsSync(storagePath)) return /* @__PURE__ */ new Map();
  const parsed = JSON.parse(fileSystem.readFileSync(storagePath, "utf8"));
  return new Map(Object.entries(parsed));
}
var STORAGE_FILE;
var init_desktop_file_storage_core = __esm({
  "src/desktop-file-storage-core.js"() {
    "use strict";
    STORAGE_FILE = "desktop-storage.json";
  }
});

// src/desktop-bare-file-storage.js
function createDesktopBareFileStorage({ basePath, fileSystem = import_bare_fs.default } = {}) {
  return createKeyValueFileStorage({
    basePath,
    fileSystem,
    joinPath: import_bare_path.default.join
  });
}
var import_bare_fs, import_bare_path;
var init_desktop_bare_file_storage = __esm({
  "src/desktop-bare-file-storage.js"() {
    "use strict";
    import_bare_fs = __toESM(require("bare-fs"), 1);
    import_bare_path = __toESM(require("bare-path"), 1);
    init_desktop_file_storage_core();
  }
});

// src/contact-book.ts
function createContactBook({ ownerProfileId }) {
  return {
    ownerProfileId: cleanRequiredString(ownerProfileId, "Owner profile id is required"),
    contactsByProfileId: /* @__PURE__ */ new Map(),
    pendingRequestsByProfileId: /* @__PURE__ */ new Map()
  };
}
function serializeContactBook(book) {
  return {
    version: CONTACT_BOOK_VERSION,
    ownerProfileId: cleanRequiredString(book?.ownerProfileId, "Owner profile id is required"),
    contacts: Array.from(book?.contactsByProfileId?.values() || []).map((contact) => ({
      ...contact,
      aliases: [...contact.aliases || []]
    })),
    pendingRequests: Array.from(book?.pendingRequestsByProfileId?.values() || []).map(
      (request) => ({
        ...request
      })
    )
  };
}
function deserializeContactBook(stored) {
  const value = typeof stored === "string" ? JSON.parse(stored) : stored;
  if (value?.version !== CONTACT_BOOK_VERSION) {
    throw new Error("Unsupported contact book version");
  }
  return {
    ownerProfileId: cleanRequiredString(value.ownerProfileId, "Owner profile id is required"),
    contactsByProfileId: new Map(
      (value.contacts || []).map((contact) => [
        cleanRequiredString(contact.profileId, "Contact profile id is required"),
        {
          ...contact,
          aliases: [...contact.aliases || []]
        }
      ])
    ),
    pendingRequestsByProfileId: new Map(
      (value.pendingRequests || []).map((request) => [
        cleanRequiredString(request.profileId, "Contact profile id is required"),
        { ...request }
      ])
    )
  };
}
function createTreeholePolicyFromContactBook(book) {
  const trustedProfileIds = [];
  const revokedProfileIds = [];
  for (const contact of book?.contactsByProfileId?.values() || []) {
    if (contact.revokedAt !== void 0 && contact.revokedAt !== null) {
      revokedProfileIds.push(contact.profileId);
      continue;
    }
    if (contact.trustedAt !== void 0 && contact.trustedAt !== null) {
      trustedProfileIds.push(contact.profileId);
    }
  }
  return {
    ownerProfileId: cleanRequiredString(book?.ownerProfileId, "Owner profile id is required"),
    revokedProfileIds,
    trustedProfileIds
  };
}
function upsertContact(book, contact) {
  const cleanContact = cleanContactPatch(contact);
  const nextBook = cloneContactBook(book);
  const existing = nextBook.contactsByProfileId.get(cleanContact.profileId);
  const alias = cleanContact.alias || cleanContact.displayNameSnapshot;
  const aliases = mergeAliases(existing?.aliases, alias);
  const nextContact = dropEmpty({
    ...existing,
    ...cleanContact,
    aliases,
    alias
  });
  if (cleanContact.trustedAt !== void 0) {
    delete nextContact.revokedAt;
  }
  nextBook.contactsByProfileId.set(cleanContact.profileId, nextContact);
  return nextBook;
}
function trustContact(book, {
  profileId,
  alias,
  displayNameSnapshot,
  homeAddress,
  homePolicy,
  trustedAt,
  proof,
  source
}) {
  return upsertContact(book, {
    profileId,
    alias,
    displayNameSnapshot,
    homeAddress,
    homePolicy,
    trustedAt,
    trustScope: TRUST_SCOPE_HOME,
    proof,
    source
  });
}
function revokeContact(book, { profileId, revokedAt }) {
  return upsertContact(book, {
    profileId,
    alias: getContact(book, profileId)?.alias,
    displayNameSnapshot: getContact(book, profileId)?.displayNameSnapshot,
    revokedAt
  });
}
function getContact(book, profileId) {
  return book?.contactsByProfileId?.get(
    cleanRequiredString(profileId, "Contact profile id is required")
  ) || null;
}
function isContactTrusted(book, profileId, at) {
  const contact = getContact(book, profileId);
  if (contact?.trustedAt === void 0 || contact.trustedAt === null) {
    return false;
  }
  if (at !== void 0 && contact.trustedAt > at) {
    return false;
  }
  if (contact.revokedAt === void 0 || contact.revokedAt === null) {
    return true;
  }
  return at !== void 0 && contact.revokedAt > at;
}
function canAcceptDmInviteFromContactBook(book, invite) {
  const fromProfileId = cleanRequiredString(invite?.fromProfileId, "Invite sender is required");
  if (invite?.toProfileId && cleanRequiredString(invite.toProfileId, "Invite recipient is required") !== book.ownerProfileId) {
    return false;
  }
  if (isContactRevoked(book, fromProfileId)) {
    return false;
  }
  return isContactTrusted(book, fromProfileId) || Boolean(invite?.requestId?.trim());
}
function recordMessageRequest(book, {
  profileId,
  alias,
  displayNameSnapshot,
  requestedAt,
  requestId,
  senderEncryptionPublicKey,
  source,
  text
}) {
  const cleanProfileId4 = cleanRequiredString(profileId, "Contact profile id is required");
  if (isContactRevoked(book, cleanProfileId4)) {
    throw new Error("Revoked contact cannot create message request");
  }
  if (book?.pendingRequestsByProfileId?.has(cleanProfileId4)) {
    return book;
  }
  const nextBook = upsertContact(book, {
    profileId: cleanProfileId4,
    alias,
    displayNameSnapshot,
    source
  });
  const pendingRequestsByProfileId = new Map(nextBook.pendingRequestsByProfileId);
  pendingRequestsByProfileId.set(
    cleanProfileId4,
    dropEmpty({
      profileId: cleanProfileId4,
      alias: cleanOptionalString(alias),
      displayNameSnapshot: cleanOptionalString(displayNameSnapshot),
      requestedAt,
      requestId,
      senderEncryptionPublicKey: cleanOptionalString(senderEncryptionPublicKey),
      source: cleanOptionalString(source),
      text: cleanOptionalString(text)
    })
  );
  return {
    ...nextBook,
    pendingRequestsByProfileId
  };
}
function acceptMessageRequest(book, { profileId, alias, acceptedAt }) {
  const cleanProfileId4 = cleanRequiredString(profileId, "Contact profile id is required");
  if (isContactRevoked(book, cleanProfileId4)) {
    throw new Error("Revoked contact cannot be accepted");
  }
  const request = book?.pendingRequestsByProfileId?.get(cleanProfileId4);
  const trusted = trustContact(book, {
    profileId: cleanProfileId4,
    alias,
    displayNameSnapshot: request?.displayNameSnapshot,
    trustedAt: acceptedAt,
    source: request?.source
  });
  const pendingRequestsByProfileId = new Map(trusted.pendingRequestsByProfileId);
  pendingRequestsByProfileId.delete(cleanProfileId4);
  return {
    ...trusted,
    pendingRequestsByProfileId
  };
}
function ignoreMessageRequest(book, { profileId }) {
  const cleanProfileId4 = cleanRequiredString(profileId, "Contact profile id is required");
  const nextBook = cloneContactBook(book);
  nextBook.pendingRequestsByProfileId.delete(cleanProfileId4);
  return nextBook;
}
function isContactRevoked(book, profileId) {
  const contact = getContact(book, profileId);
  return contact?.revokedAt !== void 0 && contact.revokedAt !== null;
}
function cloneContactBook(book) {
  return {
    ownerProfileId: cleanRequiredString(book.ownerProfileId, "Owner profile id is required"),
    contactsByProfileId: new Map(
      Array.from(book.contactsByProfileId || []).map(([profileId, contact]) => [
        profileId,
        {
          ...contact,
          aliases: [...contact.aliases || []]
        }
      ])
    ),
    pendingRequestsByProfileId: new Map(
      Array.from(book.pendingRequestsByProfileId || []).map(([profileId, request]) => [
        profileId,
        { ...request }
      ])
    )
  };
}
function cleanContactPatch(contact = {}) {
  const profileId = cleanRequiredString(contact.profileId, "Contact profile id is required");
  const alias = cleanOptionalString(contact.alias);
  const displayNameSnapshot = cleanOptionalString(contact.displayNameSnapshot);
  if (!alias && !displayNameSnapshot) {
    throw new Error("Contact alias or display name is required");
  }
  return dropEmpty({
    profileId,
    alias,
    displayNameSnapshot,
    homeAddress: cleanOptionalString(contact.homeAddress),
    homePolicy: cleanOptionalString(contact.homePolicy),
    trustedAt: contact.trustedAt,
    trustScope: contact.trustScope,
    revokedAt: contact.revokedAt,
    source: cleanOptionalString(contact.source),
    proof: contact.proof
  });
}
function mergeAliases(existingAliases = [], alias) {
  if (!alias || existingAliases.includes(alias)) {
    return [...existingAliases];
  }
  return [...existingAliases, alias];
}
function dropEmpty(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== void 0 && entry !== null)
  );
}
function cleanRequiredString(value, message) {
  const cleaned = value?.trim();
  if (!cleaned) {
    throw new Error(message);
  }
  return cleaned;
}
function cleanOptionalString(value) {
  return value?.trim() || void 0;
}
var TRUST_SCOPE_HOME, CONTACT_BOOK_VERSION;
var init_contact_book = __esm({
  "src/contact-book.ts"() {
    "use strict";
    TRUST_SCOPE_HOME = "home";
    CONTACT_BOOK_VERSION = 1;
  }
});

// src/contact-book-storage.ts
function loadContactBookFromStorage({
  ownerProfileId,
  storage
}) {
  const stored = storage?.getItem?.(CONTACT_BOOK_KEY);
  if (!stored) {
    return createContactBook({ ownerProfileId });
  }
  return deserializeContactBook(stored);
}
function saveContactBookToStorage({
  book,
  storage
}) {
  storage?.setItem?.(CONTACT_BOOK_KEY, JSON.stringify(serializeContactBook(book)));
}
var CONTACT_BOOK_KEY;
var init_contact_book_storage = __esm({
  "src/contact-book-storage.ts"() {
    "use strict";
    init_contact_book();
    init_contact_book();
    CONTACT_BOOK_KEY = "kepos.contactBook.v1";
  }
});

// src/signed-record.ts
function createSignedRecord({
  createdAt = Date.now(),
  identity,
  payload,
  payloadEncoding,
  type,
  version
}) {
  const signerProfileId = cleanPublicKey(identity?.publicKey, "Signer public key is required");
  const secretKey = cleanSecretKey(identity?.secretKey);
  const unsignedRecord = {
    createdAt,
    payload,
    signerProfileId,
    type: cleanString(type, "Signed record type is required"),
    version: cleanVersion(version)
  };
  const bytes = encodeSignedBytes({ payloadEncoding, record: unsignedRecord });
  const signature = import_hypercore_crypto.default.sign(bytes, import_b4a.default.from(secretKey, "hex"));
  return {
    ...unsignedRecord,
    signature: import_b4a.default.toString(signature, "hex")
  };
}
function verifySignedRecord({
  payloadEncoding,
  record
}) {
  try {
    const signature = cleanSignature(record?.signature);
    const publicKey = cleanPublicKey(record?.signerProfileId, "Signer public key is required");
    const bytes = encodeSignedBytes({
      payloadEncoding,
      record: {
        createdAt: record.createdAt,
        payload: record.payload,
        signerProfileId: record.signerProfileId,
        type: record.type,
        version: record.version
      }
    });
    return import_hypercore_crypto.default.verify(bytes, import_b4a.default.from(signature, "hex"), import_b4a.default.from(publicKey, "hex"));
  } catch {
    return false;
  }
}
function encodeSignedBytes({
  payloadEncoding,
  record
}) {
  if (!payloadEncoding) {
    throw new Error("Payload encoding is required");
  }
  return import_compact_encoding.default.encode(createSignedBytesEncoding(payloadEncoding), {
    createdAt: cleanTimestamp(record?.createdAt),
    payload: record?.payload,
    signerProfileId: cleanPublicKey(record?.signerProfileId, "Signer public key is required"),
    type: cleanString(record?.type, "Signed record type is required"),
    version: cleanVersion(record?.version)
  });
}
function createSignedBytesEncoding(payloadEncoding) {
  return {
    preencode(state, record) {
      import_compact_encoding.default.string.preencode(state, record.type);
      import_compact_encoding.default.uint.preencode(state, record.version);
      import_compact_encoding.default.string.preencode(state, record.signerProfileId);
      import_compact_encoding.default.uint.preencode(state, record.createdAt);
      payloadEncoding.preencode(state, record.payload);
    },
    encode(state, record) {
      import_compact_encoding.default.string.encode(state, record.type);
      import_compact_encoding.default.uint.encode(state, record.version);
      import_compact_encoding.default.string.encode(state, record.signerProfileId);
      import_compact_encoding.default.uint.encode(state, record.createdAt);
      payloadEncoding.encode(state, record.payload);
    },
    decode(state) {
      return {
        type: import_compact_encoding.default.string.decode(state),
        version: import_compact_encoding.default.uint.decode(state),
        signerProfileId: import_compact_encoding.default.string.decode(state),
        createdAt: import_compact_encoding.default.uint.decode(state),
        payload: payloadEncoding.decode(state)
      };
    }
  };
}
function cleanPublicKey(value, message) {
  const key = cleanString(value, message);
  if (!HEX_32.test(key)) {
    throw new Error("Invalid public key");
  }
  return key;
}
function cleanSecretKey(value) {
  const key = cleanString(value, "Signer secret key is required");
  if (!HEX_64.test(key)) {
    throw new Error("Invalid secret key");
  }
  return key;
}
function cleanSignature(value) {
  const signature = cleanString(value, "Signature is required");
  if (!HEX_64.test(signature)) {
    throw new Error("Invalid signature");
  }
  return signature;
}
function cleanString(value, message) {
  const cleaned = value?.trim();
  if (!cleaned) {
    throw new Error(message);
  }
  return cleaned;
}
function cleanTimestamp(value) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error("Invalid timestamp");
  }
  return value;
}
function cleanVersion(value) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error("Invalid signed record version");
  }
  return value;
}
var import_b4a, import_compact_encoding, import_hypercore_crypto, HEX_32, HEX_64;
var init_signed_record = __esm({
  "src/signed-record.ts"() {
    "use strict";
    import_b4a = __toESM(require("b4a"), 1);
    import_compact_encoding = __toESM(require("compact-encoding"), 1);
    import_hypercore_crypto = __toESM(require("hypercore-crypto"), 1);
    HEX_32 = /^[0-9a-f]{64}$/;
    HEX_64 = /^[0-9a-f]{128}$/;
  }
});

// src/dm-invite.ts
function createDmEncryptionKeyPair() {
  const publicKey = import_b4a2.default.alloc(import_sodium_universal.default.crypto_box_PUBLICKEYBYTES);
  const secretKey = import_b4a2.default.alloc(import_sodium_universal.default.crypto_box_SECRETKEYBYTES);
  import_sodium_universal.default.crypto_box_keypair(publicKey, secretKey);
  return {
    publicKey: import_b4a2.default.toString(publicKey, "hex"),
    secretKey: import_b4a2.default.toString(secretKey, "hex")
  };
}
function createDmInvite({
  channelDiscoveryKey,
  channelPublicKey,
  createdAt = Date.now(),
  fromIdentity,
  inviteId,
  payload,
  recipientEncryptionPublicKey,
  requestId,
  toProfileId
}) {
  const sealedPayload = sealPayload(payload, recipientEncryptionPublicKey);
  const cleanPayload = cleanDmInvitePayload({
    channelDiscoveryKey,
    channelPublicKey,
    fromProfileId: fromIdentity?.publicKey,
    inviteId,
    recipientEncryptionPublicKey,
    requestId,
    sealedPayload,
    toProfileId
  });
  const signed = createSignedRecord({
    createdAt,
    identity: fromIdentity,
    payload: cleanPayload,
    payloadEncoding: dmInvitePayloadEncoding,
    type: DM_INVITE_TYPE,
    version: DM_INVITE_VERSION
  });
  return {
    type: DM_INVITE_TYPE,
    ...cleanPayload,
    createdAt,
    proof: {
      createdAt: signed.createdAt,
      signature: signed.signature,
      signerProfileId: signed.signerProfileId,
      type: signed.type,
      version: signed.version
    }
  };
}
function verifyDmInvite(invite) {
  try {
    const value = asRecord(invite);
    const payload = cleanDmInvitePayload(value);
    const proof = asRecord(value.proof);
    if (value.type !== DM_INVITE_TYPE || proof.type !== DM_INVITE_TYPE || proof.version !== DM_INVITE_VERSION || proof.createdAt !== value.createdAt || proof.signerProfileId !== payload.fromProfileId) {
      return false;
    }
    return verifySignedRecord({
      payloadEncoding: dmInvitePayloadEncoding,
      record: {
        createdAt: proof.createdAt,
        payload,
        signature: proof.signature,
        signerProfileId: proof.signerProfileId,
        type: proof.type,
        version: proof.version
      }
    });
  } catch {
    return false;
  }
}
function openDmInvite({
  invite,
  recipientEncryptionKeyPair
}) {
  if (!verifyDmInvite(invite)) {
    throw new Error("Invalid DM invite");
  }
  const publicKey = cleanHex32(
    recipientEncryptionKeyPair?.publicKey,
    "Recipient encryption public key is required"
  );
  const secretKey = cleanHex32(
    recipientEncryptionKeyPair?.secretKey,
    "Recipient encryption secret key is required"
  );
  if (publicKey !== invite.recipientEncryptionPublicKey) {
    throw new Error("Unable to open DM invite");
  }
  const sealed = import_b4a2.default.from(cleanHex(invite.sealedPayload, "Sealed payload is required"), "hex");
  if (sealed.byteLength <= import_sodium_universal.default.crypto_box_SEALBYTES) {
    throw new Error("Unable to open DM invite");
  }
  const opened = import_b4a2.default.alloc(sealed.byteLength - import_sodium_universal.default.crypto_box_SEALBYTES);
  const ok = import_sodium_universal.default.crypto_box_seal_open(
    opened,
    sealed,
    import_b4a2.default.from(publicKey, "hex"),
    import_b4a2.default.from(secretKey, "hex")
  );
  if (!ok) {
    throw new Error("Unable to open DM invite");
  }
  return JSON.parse(import_b4a2.default.toString(opened));
}
function sealPayload(payload, recipientEncryptionPublicKey) {
  const publicKey = import_b4a2.default.from(
    cleanHex32(recipientEncryptionPublicKey, "Recipient encryption public key is required"),
    "hex"
  );
  const message = import_b4a2.default.from(JSON.stringify(payload || {}));
  const sealed = import_b4a2.default.alloc(message.byteLength + import_sodium_universal.default.crypto_box_SEALBYTES);
  import_sodium_universal.default.crypto_box_seal(sealed, message, publicKey);
  return import_b4a2.default.toString(sealed, "hex");
}
function cleanDmInvitePayload(payload = {}) {
  return {
    inviteId: cleanString2(payload.inviteId, "Invite id is required"),
    fromProfileId: cleanHex32(payload.fromProfileId, "Sender profile id is required"),
    toProfileId: cleanHex32(payload.toProfileId, "Recipient profile id is required"),
    recipientEncryptionPublicKey: cleanHex32(
      payload.recipientEncryptionPublicKey,
      "Recipient encryption public key is required"
    ),
    channelPublicKey: cleanHex32(payload.channelPublicKey, "Channel public key is required"),
    channelDiscoveryKey: cleanHex32(
      payload.channelDiscoveryKey,
      "Channel discovery key is required"
    ),
    requestId: cleanOptionalString2(payload.requestId),
    sealedPayload: cleanHex(payload.sealedPayload, "Sealed payload is required")
  };
}
function asRecord(value) {
  if (!value || typeof value !== "object") {
    throw new Error("Expected object");
  }
  return value;
}
function cleanHex32(value, message) {
  const hex = cleanHex(value, message);
  if (!HEX_322.test(hex)) {
    throw new Error(message);
  }
  return hex;
}
function cleanHex(value, message) {
  const cleaned = cleanString2(value, message).toLowerCase();
  if (!HEX.test(cleaned) || cleaned.length % 2 !== 0) {
    throw new Error(message);
  }
  return cleaned;
}
function cleanString2(value, message) {
  const cleaned = typeof value === "string" ? value.trim() : "";
  if (!cleaned) {
    throw new Error(message);
  }
  return cleaned;
}
function cleanOptionalString2(value) {
  return typeof value === "string" ? value.trim() || void 0 : void 0;
}
var import_b4a2, import_compact_encoding2, import_sodium_universal, DM_INVITE_TYPE, DM_INVITE_VERSION, HEX_322, HEX, dmInvitePayloadEncoding;
var init_dm_invite = __esm({
  "src/dm-invite.ts"() {
    "use strict";
    import_b4a2 = __toESM(require("b4a"), 1);
    import_compact_encoding2 = __toESM(require("compact-encoding"), 1);
    import_sodium_universal = __toESM(require("sodium-universal"), 1);
    init_signed_record();
    DM_INVITE_TYPE = "kepos.dm.invite.v1";
    DM_INVITE_VERSION = 1;
    HEX_322 = /^[0-9a-f]{64}$/;
    HEX = /^[0-9a-f]+$/;
    dmInvitePayloadEncoding = {
      preencode(state, payload) {
        import_compact_encoding2.default.string.preencode(state, payload.inviteId);
        import_compact_encoding2.default.string.preencode(state, payload.fromProfileId);
        import_compact_encoding2.default.string.preencode(state, payload.toProfileId);
        import_compact_encoding2.default.string.preencode(state, payload.recipientEncryptionPublicKey);
        import_compact_encoding2.default.string.preencode(state, payload.channelPublicKey);
        import_compact_encoding2.default.string.preencode(state, payload.channelDiscoveryKey);
        import_compact_encoding2.default.string.preencode(state, payload.requestId || "");
        import_compact_encoding2.default.string.preencode(state, payload.sealedPayload);
      },
      encode(state, payload) {
        import_compact_encoding2.default.string.encode(state, payload.inviteId);
        import_compact_encoding2.default.string.encode(state, payload.fromProfileId);
        import_compact_encoding2.default.string.encode(state, payload.toProfileId);
        import_compact_encoding2.default.string.encode(state, payload.recipientEncryptionPublicKey);
        import_compact_encoding2.default.string.encode(state, payload.channelPublicKey);
        import_compact_encoding2.default.string.encode(state, payload.channelDiscoveryKey);
        import_compact_encoding2.default.string.encode(state, payload.requestId || "");
        import_compact_encoding2.default.string.encode(state, payload.sealedPayload);
      },
      decode(state) {
        return {
          inviteId: import_compact_encoding2.default.string.decode(state),
          fromProfileId: import_compact_encoding2.default.string.decode(state),
          toProfileId: import_compact_encoding2.default.string.decode(state),
          recipientEncryptionPublicKey: import_compact_encoding2.default.string.decode(state),
          channelPublicKey: import_compact_encoding2.default.string.decode(state),
          channelDiscoveryKey: import_compact_encoding2.default.string.decode(state),
          requestId: import_compact_encoding2.default.string.decode(state) || void 0,
          sealedPayload: import_compact_encoding2.default.string.decode(state)
        };
      }
    };
  }
});

// src/home-room.ts
function createHomeRoom({
  ownerProfileId,
  address = null,
  roomKey = address || createRoomKey(),
  policy = "trusted_only"
}) {
  const cleanOwnerProfileId = cleanRequiredString2(
    ownerProfileId,
    "Home owner profile id is required"
  );
  const cleanRoomKey = cleanRequiredString2(roomKey, "Home room key is required");
  if (!isRoomKey(cleanRoomKey)) {
    throw new Error("Invalid home room key");
  }
  const cleanAddress = cleanRequiredString2(address || cleanRoomKey, "Home address is required");
  if (!isHomePolicy(policy)) {
    throw new Error("Invalid home policy");
  }
  return {
    ownerProfileId: cleanOwnerProfileId,
    address: cleanAddress,
    roomKey: cleanRoomKey,
    policy
  };
}
function isHomePolicy(policy) {
  return typeof policy === "string" && HOME_POLICIES.has(policy);
}
function createRoomKey() {
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
function isRoomKey(value) {
  return typeof value === "string" && ROOM_KEY_PATTERN.test(value);
}
function cleanRequiredString2(value, message) {
  const cleaned = typeof value === "string" ? value.trim() : "";
  if (!cleaned) {
    throw new Error(message);
  }
  return cleaned;
}
var HOME_POLICIES, ROOM_KEY_PATTERN;
var init_home_room = __esm({
  "src/home-room.ts"() {
    "use strict";
    HOME_POLICIES = /* @__PURE__ */ new Set(["trusted_only", "public"]);
    ROOM_KEY_PATTERN = /^[0-9a-f]{64}$/;
  }
});

// src/identity.js
function createIdentityKeyPair() {
  const keyPair = import_hypercore_crypto2.default.keyPair();
  return serializeKeyPair(keyPair);
}
function serializeKeyPair(keyPair) {
  return {
    publicKey: import_b4a3.default.toString(keyPair.publicKey, "hex"),
    secretKey: import_b4a3.default.toString(keyPair.secretKey, "hex")
  };
}
function isIdentityKeyPair(identity) {
  return isIdentityKey(identity?.publicKey) && isIdentitySecretKey(identity?.secretKey);
}
function isIdentityKey(value) {
  return typeof value === "string" && PUBLIC_KEY_PATTERN.test(value);
}
function isIdentitySecretKey(value) {
  return typeof value === "string" && SECRET_KEY_PATTERN.test(value);
}
var import_b4a3, import_hypercore_crypto2, PUBLIC_KEY_PATTERN, SECRET_KEY_PATTERN;
var init_identity = __esm({
  "src/identity.js"() {
    "use strict";
    import_b4a3 = __toESM(require("b4a"), 1);
    import_hypercore_crypto2 = __toESM(require("hypercore-crypto"), 1);
    PUBLIC_KEY_PATTERN = /^[0-9a-f]{64}$/;
    SECRET_KEY_PATTERN = /^[0-9a-f]{128}$/;
  }
});

// src/profile.js
function createProfile({
  dmEncryptionKeyPair = null,
  displayName = "Kepos",
  homeRoomKey = null,
  identity = null
} = {}) {
  const profileIdentity = identity || createIdentityKeyPair();
  const profileId = cleanRequiredString3(profileIdentity.publicKey, "Profile id is required");
  return {
    id: profileId,
    displayName: displayName?.trim() || "Kepos",
    dmEncryptionKeyPair,
    identity: profileIdentity,
    homeRoom: createHomeRoom({
      ownerProfileId: profileId,
      roomKey: homeRoomKey || void 0
    })
  };
}
function cleanRequiredString3(value, message) {
  const cleaned = value?.trim();
  if (!cleaned) {
    throw new Error(message);
  }
  return cleaned;
}
var init_profile = __esm({
  "src/profile.js"() {
    "use strict";
    init_home_room();
    init_identity();
  }
});

// src/local-profile.js
function getOrCreateLocalProfile({
  createDmEncryptionKeyPair: createDmEncryptionKeyPair2 = null,
  createIdentity = createIdentityKeyPair,
  displayName = "Kepos",
  homeRoomKey = null,
  storage = getDefaultStorage()
} = {}) {
  const existingId = storage?.getItem?.(PROFILE_ID_KEY)?.trim();
  const storedIdentity = readLocalIdentity(storage);
  const identity = getLocalIdentity({
    createIdentity,
    storedPublicKey: storedIdentity?.publicKey || null,
    storedSecretKey: storedIdentity?.secretKey || null
  });
  const storedHome = readLocalHome(storage);
  const storedHomeRoomKey = storedHome?.roomKey || null;
  if (storedHomeRoomKey && !HEX_32_PATTERN.test(storedHomeRoomKey)) {
    throw new Error("Corrupt local home room key");
  }
  const existingHomeRoomKey = storedHomeRoomKey || homeRoomKey;
  const storedDmEncryptionPublicKey = storage?.getItem?.(DM_ENCRYPTION_PUBLIC_KEY)?.trim() || null;
  const storedDmEncryptionSecretKey = storage?.getItem?.(DM_ENCRYPTION_SECRET_KEY)?.trim() || null;
  const dmEncryptionKeyPair = getLocalDmEncryptionKeyPair({
    createDmEncryptionKeyPair: createDmEncryptionKeyPair2,
    storedPublicKey: storedDmEncryptionPublicKey,
    storedSecretKey: storedDmEncryptionSecretKey
  });
  const profile = createProfile({
    dmEncryptionKeyPair,
    homeRoomKey: existingHomeRoomKey,
    identity,
    displayName
  });
  if (!existingId || existingId !== profile.id) {
    storage?.setItem?.(PROFILE_ID_KEY, profile.id);
  }
  if (!storedIdentity?.publicKey) {
    storage?.setItem?.(IDENTITY_PUBLIC_KEY, profile.identity.publicKey);
  }
  if (!storedIdentity?.secretKey) {
    storage?.setItem?.(IDENTITY_SECRET_KEY, profile.identity.secretKey);
  }
  writeLocalIdentity(storage, profile.identity);
  if (!storedHomeRoomKey) {
    storage?.setItem?.(HOME_ROOM_KEY, profile.homeRoom.roomKey);
  }
  writeLocalHome(storage, {
    ownerProfileId: profile.id,
    roomKey: profile.homeRoom.roomKey
  });
  if (profile.dmEncryptionKeyPair && !storedDmEncryptionPublicKey) {
    storage?.setItem?.(DM_ENCRYPTION_PUBLIC_KEY, profile.dmEncryptionKeyPair.publicKey);
  }
  if (profile.dmEncryptionKeyPair && !storedDmEncryptionSecretKey) {
    storage?.setItem?.(DM_ENCRYPTION_SECRET_KEY, profile.dmEncryptionKeyPair.secretKey);
  }
  return profile;
}
function readLocalIdentity(storage) {
  const document = readLocalDocument(storage, V1_IDENTITY_KEY, "kepos.identity");
  if (document) {
    return document.data;
  }
  return {
    publicKey: storage?.getItem?.(IDENTITY_PUBLIC_KEY)?.trim() || null,
    secretKey: storage?.getItem?.(IDENTITY_SECRET_KEY)?.trim() || null
  };
}
function readLocalHome(storage) {
  const document = readLocalDocument(storage, V1_HOME_KEY, "kepos.home");
  if (document) {
    return document.data;
  }
  return {
    ownerProfileId: storage?.getItem?.(PROFILE_ID_KEY)?.trim() || null,
    roomKey: storage?.getItem?.(HOME_ROOM_KEY)?.trim() || null
  };
}
function readLocalDocument(storage, key, type) {
  const raw = storage?.getItem?.(key);
  if (!raw) {
    return null;
  }
  try {
    const document = JSON.parse(raw);
    if (document?.type !== type || document?.schemaVersion !== 1 || !document?.data) {
      throw new Error(`Unsupported ${type} storage document`);
    }
    return document;
  } catch (error) {
    throw new Error(`Corrupt local ${type} storage: ${error.message}`);
  }
}
function writeLocalIdentity(storage, identity) {
  storage?.setItem?.(
    V1_IDENTITY_KEY,
    JSON.stringify({
      data: {
        publicKey: identity.publicKey,
        secretKey: identity.secretKey
      },
      schemaVersion: 1,
      type: "kepos.identity"
    })
  );
}
function writeLocalHome(storage, home) {
  storage?.setItem?.(
    V1_HOME_KEY,
    JSON.stringify({
      data: {
        ownerProfileId: home.ownerProfileId,
        roomKey: home.roomKey
      },
      schemaVersion: 1,
      type: "kepos.home"
    })
  );
}
function getLocalIdentity({ createIdentity, storedPublicKey, storedSecretKey }) {
  if (!storedPublicKey && !storedSecretKey) {
    const identity2 = createIdentity();
    if (!isIdentityKeyPair(identity2)) {
      throw new Error("Invalid local identity");
    }
    return identity2;
  }
  const identity = {
    publicKey: storedPublicKey,
    secretKey: storedSecretKey
  };
  if (!isIdentityKeyPair(identity)) {
    throw new Error("Corrupt local identity");
  }
  return identity;
}
function getLocalDmEncryptionKeyPair({
  createDmEncryptionKeyPair: createDmEncryptionKeyPair2,
  storedPublicKey,
  storedSecretKey
}) {
  if (!storedPublicKey && !storedSecretKey) {
    const keyPair2 = createDmEncryptionKeyPair2?.() || null;
    if (keyPair2 && !isDmEncryptionKeyPair(keyPair2)) {
      throw new Error("Invalid local DM encryption key pair");
    }
    return keyPair2;
  }
  const keyPair = {
    publicKey: storedPublicKey,
    secretKey: storedSecretKey
  };
  if (!isDmEncryptionKeyPair(keyPair)) {
    throw new Error("Corrupt local DM encryption key pair");
  }
  return keyPair;
}
function isDmEncryptionKeyPair(keyPair) {
  return isIdentityKey(keyPair?.publicKey) && isIdentityKey(keyPair?.secretKey);
}
function getDefaultStorage() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}
var PROFILE_ID_KEY, IDENTITY_PUBLIC_KEY, IDENTITY_SECRET_KEY, HOME_ROOM_KEY, V1_IDENTITY_KEY, V1_HOME_KEY, DM_ENCRYPTION_PUBLIC_KEY, DM_ENCRYPTION_SECRET_KEY, HEX_32_PATTERN;
var init_local_profile = __esm({
  "src/local-profile.js"() {
    "use strict";
    init_profile();
    init_identity();
    PROFILE_ID_KEY = "kepos.profile.id";
    IDENTITY_PUBLIC_KEY = "kepos.identity.publicKey";
    IDENTITY_SECRET_KEY = "kepos.identity.secretKey";
    HOME_ROOM_KEY = "kepos.home.roomKey";
    V1_IDENTITY_KEY = "kepos.v1.identity";
    V1_HOME_KEY = "kepos.v1.home";
    DM_ENCRYPTION_PUBLIC_KEY = "kepos.dmEncryption.publicKey";
    DM_ENCRYPTION_SECRET_KEY = "kepos.dmEncryption.secretKey";
    HEX_32_PATTERN = /^[0-9a-f]{64}$/;
  }
});

// src/desktop-local-adapters.js
function getDesktopLocalProfile({
  displayName = "Desktop",
  storage = globalThis.localStorage
} = {}) {
  return getOrCreateLocalProfile({
    createDmEncryptionKeyPair,
    displayName,
    storage
  });
}
function loadDesktopContactBook({ ownerProfileId, storage = globalThis.localStorage }) {
  return loadContactBookFromStorage({
    ownerProfileId,
    storage
  });
}
function saveDesktopContactBook({ book, storage = globalThis.localStorage }) {
  return saveContactBookToStorage({
    book,
    storage
  });
}
var init_desktop_local_adapters = __esm({
  "src/desktop-local-adapters.js"() {
    "use strict";
    init_contact_book_storage();
    init_dm_invite();
    init_local_profile();
  }
});

// src/desktop-profile-context-core.js
function createDesktopProfileContext({
  displayName = "Desktop",
  getProfile = getDesktopLocalProfile,
  loadContactBook = loadDesktopContactBook,
  saveContactBook = saveDesktopContactBook,
  storage = globalThis.localStorage
} = {}) {
  const profile = getProfile({ displayName, storage });
  const contactBook = loadContactBook({
    ownerProfileId: profile.id,
    storage
  });
  return {
    contactBook,
    profile,
    saveContactBook(book) {
      return saveContactBook({ book, storage });
    },
    storage
  };
}
function createDesktopProfileContextFromStorage({
  createFileStorage,
  displayName = "Desktop",
  storageBasePath,
  storageOptions = {}
} = {}) {
  return createDesktopProfileContext({
    displayName,
    storage: createFileStorage({
      basePath: storageBasePath,
      ...storageOptions
    })
  });
}
var init_desktop_profile_context_core = __esm({
  "src/desktop-profile-context-core.js"() {
    "use strict";
    init_desktop_local_adapters();
  }
});

// src/desktop-bare-profile-context.js
var desktop_bare_profile_context_exports = {};
__export(desktop_bare_profile_context_exports, {
  createDesktopBareProfileContext: () => createDesktopBareProfileContext
});
function createDesktopBareProfileContext(options = {}) {
  return createDesktopProfileContextFromStorage({
    ...options,
    createFileStorage: createDesktopBareFileStorage
  });
}
var init_desktop_bare_profile_context = __esm({
  "src/desktop-bare-profile-context.js"() {
    "use strict";
    init_desktop_bare_file_storage();
    init_desktop_profile_context_core();
  }
});

// src/desktop-backend-actions.js
function createDesktopBackendActions({
  displayNameActions,
  messageActions,
  messageRequestActions,
  roomActions,
  trustActions
}) {
  const actions = {
    acceptMessageRequest: messageRequestActions?.acceptMessageRequest,
    commentTreehole: messageActions?.commentTreehole,
    ignoreMessageRequest: messageRequestActions?.ignoreMessageRequest,
    joinHome: roomActions?.joinHome,
    joinHomeUri: roomActions?.joinHomeUri,
    leaveHome: roomActions?.leaveHome,
    likeTreehole: messageActions?.likeTreehole,
    postTreehole: messageActions?.postTreehole,
    revokeContact: trustActions?.revokeContact,
    sendDmMessage: messageActions?.sendDmMessage,
    sendHomeMessage: messageActions?.sendHomeMessage,
    sendMessageRequest: messageActions?.sendDmMessage,
    trustProfileUri: trustActions?.trustProfileUri,
    updateDisplayName: displayNameActions?.updateDisplayName
  };
  for (const command of DESKTOP_COMMANDS) {
    if (typeof actions[command] !== "function") {
      throw new Error(`Missing desktop backend action: ${command}`);
    }
  }
  return actions;
}
var init_desktop_backend_actions = __esm({
  "src/desktop-backend-actions.js"() {
    "use strict";
    init_desktop_command_vocabulary();
  }
});

// src/message-request.ts
function createMessageRequest({
  createdAt = Date.now(),
  fromIdentity,
  requestId,
  senderEncryptionPublicKey,
  text,
  toProfileId
}) {
  const payload = cleanMessageRequestPayload({
    fromProfileId: fromIdentity?.publicKey,
    requestId,
    senderEncryptionPublicKey,
    text,
    toProfileId
  });
  const signed = createSignedRecord({
    createdAt,
    identity: fromIdentity,
    payload,
    payloadEncoding: messageRequestPayloadEncoding,
    type: MESSAGE_REQUEST_TYPE,
    version: MESSAGE_REQUEST_VERSION
  });
  return {
    type: MESSAGE_REQUEST_TYPE,
    ...payload,
    createdAt,
    proof: {
      createdAt: signed.createdAt,
      signature: signed.signature,
      signerProfileId: signed.signerProfileId,
      type: signed.type,
      version: signed.version
    }
  };
}
function verifyMessageRequest(request) {
  try {
    const value = asRecord2(request);
    const payload = cleanMessageRequestPayload(value);
    const proof = asRecord2(value.proof);
    if (value.type !== MESSAGE_REQUEST_TYPE || proof.type !== MESSAGE_REQUEST_TYPE || proof.version !== MESSAGE_REQUEST_VERSION || proof.createdAt !== value.createdAt || proof.signerProfileId !== payload.fromProfileId) {
      return false;
    }
    return verifySignedRecord({
      payloadEncoding: messageRequestPayloadEncoding,
      record: {
        createdAt: proof.createdAt,
        payload,
        signature: proof.signature,
        signerProfileId: proof.signerProfileId,
        type: proof.type,
        version: proof.version
      }
    });
  } catch {
    return false;
  }
}
function applyMessageRequestToContactBook(book, {
  alias,
  request,
  source
}) {
  if (!verifyMessageRequest(request) || request.toProfileId !== book?.ownerProfileId) {
    throw new Error("Invalid message request");
  }
  return recordMessageRequest(book, {
    alias,
    displayNameSnapshot: void 0,
    profileId: request.fromProfileId,
    requestedAt: request.createdAt,
    requestId: request.requestId,
    senderEncryptionPublicKey: request.senderEncryptionPublicKey,
    source,
    text: request.text
  });
}
function cleanMessageRequestPayload(payload = {}) {
  return {
    requestId: cleanString3(payload.requestId, "Request id is required"),
    fromProfileId: cleanKey(payload.fromProfileId, "Sender profile id is required"),
    toProfileId: cleanKey(payload.toProfileId, "Recipient profile id is required"),
    senderEncryptionPublicKey: cleanKey(
      payload.senderEncryptionPublicKey,
      "Sender encryption public key is required"
    ),
    text: cleanString3(payload.text, "Request text is required")
  };
}
function asRecord2(value) {
  if (!value || typeof value !== "object") {
    throw new Error("Expected object");
  }
  return value;
}
function cleanKey(value, message) {
  const key = cleanString3(value, message);
  if (!KEY_PATTERN.test(key)) {
    throw new Error("Invalid profile id");
  }
  return key;
}
function cleanString3(value, message) {
  const cleaned = typeof value === "string" ? value.trim() : "";
  if (!cleaned) {
    throw new Error(message);
  }
  return cleaned;
}
var import_compact_encoding3, MESSAGE_REQUEST_TYPE, MESSAGE_REQUEST_VERSION, KEY_PATTERN, messageRequestPayloadEncoding;
var init_message_request = __esm({
  "src/message-request.ts"() {
    "use strict";
    import_compact_encoding3 = __toESM(require("compact-encoding"), 1);
    init_contact_book();
    init_signed_record();
    MESSAGE_REQUEST_TYPE = "kepos.message.request.v1";
    MESSAGE_REQUEST_VERSION = 1;
    KEY_PATTERN = /^[0-9a-f]{64}$/;
    messageRequestPayloadEncoding = {
      preencode(state, payload) {
        import_compact_encoding3.default.string.preencode(state, payload.requestId);
        import_compact_encoding3.default.string.preencode(state, payload.fromProfileId);
        import_compact_encoding3.default.string.preencode(state, payload.toProfileId);
        import_compact_encoding3.default.string.preencode(state, payload.senderEncryptionPublicKey);
        import_compact_encoding3.default.string.preencode(state, payload.text);
      },
      encode(state, payload) {
        import_compact_encoding3.default.string.encode(state, payload.requestId);
        import_compact_encoding3.default.string.encode(state, payload.fromProfileId);
        import_compact_encoding3.default.string.encode(state, payload.toProfileId);
        import_compact_encoding3.default.string.encode(state, payload.senderEncryptionPublicKey);
        import_compact_encoding3.default.string.encode(state, payload.text);
      },
      decode(state) {
        return {
          requestId: import_compact_encoding3.default.string.decode(state),
          fromProfileId: import_compact_encoding3.default.string.decode(state),
          toProfileId: import_compact_encoding3.default.string.decode(state),
          senderEncryptionPublicKey: import_compact_encoding3.default.string.decode(state),
          text: import_compact_encoding3.default.string.decode(state)
        };
      }
    };
  }
});

// src/desktop-control-service.js
async function createDesktopControlMessageResult({
  acceptInviteAsRecipient,
  acceptedAt = Date.now(),
  contactBook,
  currentDmSession,
  fallbackAlias = "",
  message,
  peer,
  recipientEncryptionKeyPair
}) {
  if (message?.type === "treehole.bootstrap") {
    return {
      bootstrapKey: message.key,
      kind: "treehole_bootstrap",
      ownerProfileId: message.ownerProfileId || "",
      sendWriterPeer: peer || null
    };
  }
  if (message?.type === "treehole.writer") {
    return {
      kind: "treehole_writer",
      writer: message
    };
  }
  if (!currentDmSession) return null;
  if (message?.type === "kepos.message.request.v1") {
    if (message.toProfileId !== currentDmSession.localProfileId) return null;
    return {
      appendIncomingRequest: message,
      book: applyMessageRequestToContactBook(contactBook, {
        alias: fallbackAlias,
        request: message,
        source: "home_room"
      }),
      kind: "message_request"
    };
  }
  if (message?.type === "kepos.dm.invite.v1") {
    if (message.toProfileId !== currentDmSession.localProfileId) return null;
    await acceptInviteAsRecipient({
      acceptedAt,
      contactBook,
      invite: message,
      recipientEncryptionKeyPair
    });
    return {
      kind: "dm_invite"
    };
  }
  return null;
}
function createDesktopTreeholeControlSendResult({
  createBootstrapControl,
  createWriterControl,
  isHomeJoined,
  peer,
  remoteProfileId = "",
  type
}) {
  if (!isHomeJoined || !peer) return null;
  const payload = type === "bootstrap" ? createBootstrapControl?.(remoteProfileId) : type === "writer" ? createWriterControl?.() : null;
  if (!payload) return null;
  return {
    payload,
    peer
  };
}
var init_desktop_control_service = __esm({
  "src/desktop-control-service.js"() {
    "use strict";
    init_message_request();
  }
});

// src/desktop-control-actions.js
function createDesktopControlActions({
  configureTreeholeRuntime,
  createControlMessageResult = createDesktopControlMessageResult,
  createTreeholeControlSendResult = createDesktopTreeholeControlSendResult,
  getDmRuntime,
  getHomeJoinDetails,
  getHomeRuntime,
  getProfileContext,
  getTreeholeRuntime,
  onChanged = () => {
  },
  openTreehole,
  setHomeJoinDetails,
  setNotice,
  shortenProfileId
}) {
  async function handleControl(message, peer) {
    if (message.type === "kepos.message.request.v1") {
      const context = getProfileContext();
      const dmRuntime = getDmRuntime();
      const result = await createControlMessageResult({
        contactBook: context.contactBook,
        currentDmSession: dmRuntime.getSession(),
        fallbackAlias: shortenProfileId(message.fromProfileId),
        message
      });
      if (!result) return;
      context.saveContactBook(result.book);
      dmRuntime.appendIncomingRequest(result.appendIncomingRequest);
      setNotice("Message request received.");
      onChanged();
      return;
    }
    if (message.type === "kepos.dm.invite.v1") {
      const { contactBook, profile } = getProfileContext();
      const result = await createControlMessageResult({
        acceptInviteAsRecipient: (payload) => getDmRuntime().acceptInviteAsRecipient(payload),
        contactBook,
        currentDmSession: getDmRuntime().getSession(),
        message,
        recipientEncryptionKeyPair: profile.dmEncryptionKeyPair
      });
      if (!result) return;
      setNotice("Direct message ready.");
      onChanged();
      return;
    }
    if (message.type === "kepos.dm.body.v1") {
      if (getDmRuntime().receiveMessage?.(message.message)) {
        onChanged();
      }
      return;
    }
    if (message.type === "treehole.bootstrap") {
      const result = await createControlMessageResult({ message, peer });
      if (!result) return;
      if (result.ownerProfileId && getHomeJoinDetails()) {
        setHomeJoinDetails({
          ...getHomeJoinDetails(),
          ownerProfileId: result.ownerProfileId
        });
        configureTreeholeRuntime();
      }
      await openTreehole(result.bootstrapKey);
      sendTreeholeWriter(result.sendWriterPeer);
      return;
    }
    if (message.type === "treehole.writer") {
      const result = await createControlMessageResult({ message, peer });
      if (!result) return;
      await getTreeholeRuntime().addWriter(result.writer);
    }
  }
  function sendTreeholeBootstrap(peer, remoteProfileId) {
    const treeholeRuntime = getTreeholeRuntime();
    const result = createTreeholeControlSendResult({
      createBootstrapControl: (profileId) => treeholeRuntime.createBootstrapControl(profileId),
      isHomeJoined: getHomeRuntime().isJoined(),
      peer,
      remoteProfileId,
      type: "bootstrap"
    });
    if (!result) return;
    getHomeRuntime().sendControl(result.peer, result.payload);
  }
  function sendTreeholeWriter(peer) {
    const treeholeRuntime = getTreeholeRuntime();
    const result = createTreeholeControlSendResult({
      createWriterControl: () => treeholeRuntime.createWriterControl(),
      isHomeJoined: getHomeRuntime().isJoined(),
      peer,
      type: "writer"
    });
    if (!result) return;
    getHomeRuntime().sendControl(result.peer, result.payload);
  }
  return {
    handleControl,
    sendTreeholeBootstrap,
    sendTreeholeWriter
  };
}
var init_desktop_control_actions = __esm({
  "src/desktop-control-actions.js"() {
    "use strict";
    init_desktop_control_service();
  }
});

// src/desktop-direct-transport-config.js
function getDesktopDirectTransportConfig({
  env = globalThis.process?.env || {},
  mode
} = {}) {
  if (mode !== "host") return null;
  const advertisedHost = env.KEPOS_DIRECT_ADVERTISED_HOST?.trim();
  if (!advertisedHost) return null;
  return {
    advertisedHost,
    listenHost: env.KEPOS_DIRECT_LISTEN_HOST?.trim() || "0.0.0.0",
    mode: "host"
  };
}
var init_desktop_direct_transport_config = __esm({
  "src/desktop-direct-transport-config.js"() {
    "use strict";
  }
});

// src/desktop-backend-bridge.ts
function createDesktopBackendBridge({
  dispatch
}) {
  const handlers = /* @__PURE__ */ new Map();
  return {
    commands: DESKTOP_COMMANDS,
    events: DESKTOP_EVENTS,
    async dispatch(command, payload) {
      if (!isDesktopCommand(command)) {
        throw new Error(`Unknown desktop command: ${command}`);
      }
      return await dispatch(command, payload);
    },
    emit(event, payload) {
      if (!isDesktopEvent(event)) {
        throw new Error(`Unknown desktop event: ${event}`);
      }
      for (const handler of handlers.get(event) || []) {
        handler(payload);
      }
    },
    subscribe(event, handler) {
      if (!isDesktopEvent(event)) {
        throw new Error(`Unknown desktop event: ${event}`);
      }
      const eventHandlers = handlers.get(event) || /* @__PURE__ */ new Set();
      eventHandlers.add(handler);
      handlers.set(event, eventHandlers);
      return () => {
        eventHandlers.delete(handler);
        if (eventHandlers.size === 0) {
          handlers.delete(event);
        }
      };
    }
  };
}
var init_desktop_backend_bridge = __esm({
  "src/desktop-backend-bridge.ts"() {
    "use strict";
    init_desktop_command_vocabulary();
  }
});

// src/dm-session.ts
function createDirectMessageSession({
  localProfileId,
  nick
}) {
  return {
    localProfileId: cleanRequiredString4(localProfileId, "Local profile id is required"),
    nick: nick?.trim() || "anon",
    messages: [],
    seenMessageIds: /* @__PURE__ */ new Set()
  };
}
function restoreDirectMessageSession({
  localProfileId,
  messages = [],
  nick
}) {
  let session = createDirectMessageSession({ localProfileId, nick });
  for (const message of messages) {
    session = appendDirectMessage(session, normalizeStoredDirectMessage(message));
  }
  return session;
}
function appendLocalSignedDirectMessage(session, message, { remoteProfileId }) {
  if (message?.fromProfileId !== session.localProfileId) {
    return session;
  }
  return appendDirectMessage(
    session,
    normalizeSignedDirectMessage(message, "out", {
      toProfileId: cleanRequiredString4(remoteProfileId, "Remote profile id is required")
    })
  );
}
function appendRemoteSignedDirectMessage(session, message) {
  if (message?.fromProfileId === session.localProfileId) {
    return session;
  }
  return appendDirectMessage(
    session,
    normalizeSignedDirectMessage(message, "in", {
      toProfileId: session.localProfileId
    })
  );
}
function appendLocalMessageRequest(session, request) {
  return appendDirectMessage(session, normalizeMessageRequest(request, "out"));
}
function appendRemoteMessageRequest(session, request) {
  if (request?.toProfileId !== session.localProfileId) {
    return session;
  }
  return appendDirectMessage(session, normalizeMessageRequest(request, "in"));
}
function dismissDirectMessage(session, { id }) {
  const cleanId = cleanRequiredString4(id, "Direct message id is required");
  return {
    ...session,
    messages: session.messages.filter((message) => message.id !== cleanId)
  };
}
function appendDirectMessage(session, message) {
  if (!message.id || !message.text || session.seenMessageIds.has(message.id)) {
    return session;
  }
  const seenMessageIds = new Set(session.seenMessageIds);
  seenMessageIds.add(message.id);
  return {
    ...session,
    seenMessageIds,
    messages: [...session.messages, message]
  };
}
function normalizeMessageRequest(request, direction) {
  const id = cleanRequiredString4(request?.requestId, "Request id is required");
  const createdAt = cleanOptionalNumber(request.createdAt) || Date.now();
  return {
    ...request,
    id,
    at: createdAt,
    direction,
    text: cleanText(request.text),
    type: "kepos.message.request.v1"
  };
}
function normalizeSignedDirectMessage(message, direction, { toProfileId }) {
  const id = cleanRequiredString4(message?.messageId, "Message id is required");
  const createdAt = cleanOptionalNumber(message.createdAt) || Date.now();
  return {
    ...message,
    at: createdAt,
    direction,
    id,
    text: cleanText(message.text),
    toProfileId,
    type: "kepos.dm.message.v1"
  };
}
function normalizeStoredDirectMessage(message) {
  const id = cleanRequiredString4(
    message?.id || message?.requestId || message?.messageId,
    "Direct message id is required"
  );
  const at = cleanOptionalNumber(message?.at) || cleanOptionalNumber(message?.createdAt) || Date.now();
  return {
    ...message,
    id,
    at,
    direction: cleanDirection(message?.direction),
    text: cleanText(message?.text),
    type: cleanRequiredString4(message?.type, "Direct message type is required")
  };
}
function cleanDirection(direction) {
  if (direction === "in" || direction === "out") return direction;
  throw new Error("Direct message direction is required");
}
function cleanRequiredString4(value, message) {
  const cleaned = typeof value === "string" ? value.trim() : "";
  if (!cleaned) {
    throw new Error(message);
  }
  return cleaned;
}
function cleanText(text) {
  return typeof text === "string" ? text.trim() : "";
}
function cleanOptionalNumber(value) {
  return Number.isFinite(value) ? value : null;
}
var init_dm_session = __esm({
  "src/dm-session.ts"() {
    "use strict";
  }
});

// src/dm-thread.ts
function createDmThread({
  channelDiscoveryKey,
  channelPublicKey,
  createdAt = Date.now(),
  localProfileId,
  remoteProfileId,
  requestId,
  threadId
}) {
  const cleanLocalProfileId = cleanProfileId(localProfileId);
  const cleanRemoteProfileId = cleanProfileId(remoteProfileId);
  if (cleanLocalProfileId === cleanRemoteProfileId) {
    throw new Error("Remote profile must differ");
  }
  return dropEmpty2({
    threadId: cleanString4(threadId, "Thread id is required"),
    localProfileId: cleanLocalProfileId,
    remoteProfileId: cleanRemoteProfileId,
    channelPublicKey: cleanChannelKey(channelPublicKey),
    channelDiscoveryKey: cleanChannelKey(channelDiscoveryKey),
    requestId: cleanOptionalString3(requestId),
    createdAt: cleanTimestamp2(createdAt, "Created timestamp is required"),
    state: "pending"
  });
}
function acceptDmThread(thread, { acceptedAt }) {
  const cleanThread = cleanDmThread(thread);
  if (cleanThread.revokedAt !== void 0) {
    return {
      ...cleanThread,
      state: "revoked"
    };
  }
  return {
    ...cleanThread,
    acceptedAt: cleanTimestamp2(acceptedAt, "Accepted timestamp is required"),
    state: "accepted"
  };
}
function revokeDmThread(thread, { revokedAt }) {
  return {
    ...cleanDmThread(thread),
    revokedAt: cleanTimestamp2(revokedAt, "Revoked timestamp is required"),
    state: "revoked"
  };
}
function isDmThreadActive(thread) {
  try {
    const cleanThread = cleanDmThread(thread);
    return cleanThread.state === "accepted" && cleanThread.revokedAt === void 0;
  } catch {
    return false;
  }
}
function serializeDmThread(thread) {
  return {
    version: DM_THREAD_VERSION,
    thread: cleanDmThread(thread)
  };
}
function deserializeDmThread(stored) {
  const value = typeof stored === "string" ? JSON.parse(stored) : stored;
  if (value?.version !== DM_THREAD_VERSION) {
    throw new Error("Unsupported DM thread version");
  }
  return cleanDmThread(value.thread);
}
function cleanDmThread(thread = {}) {
  const value = asRecord3(thread);
  const state = cleanState(value.state);
  const localProfileId = cleanProfileId(value.localProfileId);
  const remoteProfileId = cleanProfileId(value.remoteProfileId);
  if (localProfileId === remoteProfileId) {
    throw new Error("Remote profile must differ");
  }
  const cleanThread = dropEmpty2({
    threadId: cleanString4(value.threadId, "Thread id is required"),
    localProfileId,
    remoteProfileId,
    channelPublicKey: cleanChannelKey(value.channelPublicKey),
    channelDiscoveryKey: cleanChannelKey(value.channelDiscoveryKey),
    requestId: cleanOptionalString3(value.requestId),
    createdAt: cleanTimestamp2(value.createdAt, "Created timestamp is required"),
    acceptedAt: value.acceptedAt === void 0 ? void 0 : cleanTimestamp2(value.acceptedAt, "Accepted timestamp is required"),
    revokedAt: value.revokedAt === void 0 ? void 0 : cleanTimestamp2(value.revokedAt, "Revoked timestamp is required"),
    state
  });
  if (state === "accepted" && cleanThread.acceptedAt === void 0) {
    throw new Error("Accepted timestamp is required");
  }
  if (state === "revoked" && cleanThread.revokedAt === void 0) {
    throw new Error("Revoked timestamp is required");
  }
  return cleanThread;
}
function asRecord3(value) {
  if (!value || typeof value !== "object") {
    throw new Error("Expected object");
  }
  return value;
}
function cleanState(value) {
  const state = cleanString4(value, "Thread state is required");
  if (!["pending", "accepted", "revoked"].includes(state)) {
    throw new Error("Invalid thread state");
  }
  return state;
}
function cleanProfileId(value) {
  const profileId = cleanHex322(value, "Invalid profile id");
  if (!profileId) {
    throw new Error("Invalid profile id");
  }
  return profileId;
}
function cleanChannelKey(value) {
  const key = cleanHex322(value, "Invalid channel key");
  if (!key) {
    throw new Error("Invalid channel key");
  }
  return key;
}
function cleanHex322(value, message) {
  const hex = cleanString4(value, message).toLowerCase();
  return HEX_323.test(hex) ? hex : null;
}
function cleanTimestamp2(value, message) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(message);
  }
  return value;
}
function cleanString4(value, message) {
  const cleaned = typeof value === "string" ? value.trim() : "";
  if (!cleaned) {
    throw new Error(message);
  }
  return cleaned;
}
function cleanOptionalString3(value) {
  return typeof value === "string" ? value.trim() || void 0 : void 0;
}
function dropEmpty2(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== void 0 && entry !== null)
  );
}
var DM_THREAD_VERSION, HEX_323;
var init_dm_thread = __esm({
  "src/dm-thread.ts"() {
    "use strict";
    DM_THREAD_VERSION = 1;
    HEX_323 = /^[0-9a-f]{64}$/;
  }
});

// src/dm-invite-acceptance.js
function acceptDmInviteAsRecipient({
  acceptedAt = Date.now(),
  canAcceptInvite,
  contactBook,
  invite,
  localProfileId,
  recipientEncryptionKeyPair
}) {
  if (contactBook && !canAcceptDmInviteFromContactBook(contactBook, invite)) {
    throw new Error("DM invite is not authorized");
  }
  if (canAcceptInvite && !canAcceptInvite(invite)) {
    throw new Error("DM invite is not authorized");
  }
  const payload = openDmInvite({ invite, recipientEncryptionKeyPair });
  if (payload.channelDiscoveryKey !== invite.channelDiscoveryKey || payload.channelPublicKey !== invite.channelPublicKey) {
    throw new Error("DM invite payload mismatch");
  }
  return acceptDmThread(
    createDmThread({
      channelDiscoveryKey: payload.channelDiscoveryKey,
      channelPublicKey: payload.channelPublicKey,
      createdAt: invite.createdAt,
      localProfileId,
      remoteProfileId: invite.fromProfileId,
      requestId: invite.requestId,
      threadId: payload.threadId
    }),
    { acceptedAt }
  );
}
var init_dm_invite_acceptance = __esm({
  "src/dm-invite-acceptance.js"() {
    "use strict";
    init_dm_invite();
    init_dm_thread();
    init_contact_book();
  }
});

// src/dm-message.ts
function createSignedDmMessage({
  createdAt = Date.now(),
  identity,
  messageId,
  text,
  threadId
}) {
  const payload = {
    fromProfileId: cleanProfileId2(identity.publicKey),
    messageId: cleanRequiredString5(messageId, "Message id is required"),
    text: cleanRequiredString5(text, "Message text is required"),
    threadId: cleanRequiredString5(threadId, "Thread id is required")
  };
  const proof = createSignedRecord({
    createdAt,
    identity,
    payload,
    payloadEncoding: dmMessagePayloadEncoding,
    type: DM_MESSAGE_TYPE,
    version: RECORD_VERSION
  });
  return {
    ...payload,
    createdAt,
    proof: {
      createdAt: proof.createdAt,
      signature: proof.signature,
      signerProfileId: proof.signerProfileId,
      type: proof.type,
      version: proof.version
    },
    type: DM_MESSAGE_TYPE
  };
}
function verifySignedDmMessage(message) {
  try {
    if (message?.type !== DM_MESSAGE_TYPE) {
      return false;
    }
    const payload = {
      fromProfileId: cleanProfileId2(message.fromProfileId),
      messageId: cleanRequiredString5(message.messageId, "Message id is required"),
      text: cleanRequiredString5(message.text, "Message text is required"),
      threadId: cleanRequiredString5(message.threadId, "Thread id is required")
    };
    if (message.proof.signerProfileId !== payload.fromProfileId) {
      return false;
    }
    return verifySignedRecord({
      payloadEncoding: dmMessagePayloadEncoding,
      record: {
        createdAt: message.proof.createdAt,
        payload,
        signature: message.proof.signature,
        signerProfileId: message.proof.signerProfileId,
        type: message.proof.type,
        version: message.proof.version
      }
    });
  } catch {
    return false;
  }
}
function cleanProfileId2(value) {
  const profileId = cleanRequiredString5(value, "Profile id is required").toLowerCase();
  if (!KEY_PATTERN2.test(profileId)) {
    throw new Error("Invalid profile id");
  }
  return profileId;
}
function cleanRequiredString5(value, message) {
  const cleaned = value?.trim();
  if (!cleaned) {
    throw new Error(message);
  }
  return cleaned;
}
var import_compact_encoding4, DM_MESSAGE_TYPE, RECORD_VERSION, KEY_PATTERN2, dmMessagePayloadEncoding;
var init_dm_message = __esm({
  "src/dm-message.ts"() {
    "use strict";
    import_compact_encoding4 = __toESM(require("compact-encoding"), 1);
    init_signed_record();
    DM_MESSAGE_TYPE = "kepos.dm.message.v1";
    RECORD_VERSION = 1;
    KEY_PATTERN2 = /^[0-9a-f]{64}$/;
    dmMessagePayloadEncoding = {
      preencode(state, payload) {
        import_compact_encoding4.default.string.preencode(state, payload.threadId);
        import_compact_encoding4.default.string.preencode(state, payload.messageId);
        import_compact_encoding4.default.string.preencode(state, payload.fromProfileId);
        import_compact_encoding4.default.string.preencode(state, payload.text);
      },
      encode(state, payload) {
        import_compact_encoding4.default.string.encode(state, payload.threadId);
        import_compact_encoding4.default.string.encode(state, payload.messageId);
        import_compact_encoding4.default.string.encode(state, payload.fromProfileId);
        import_compact_encoding4.default.string.encode(state, payload.text);
      },
      decode(state) {
        return {
          threadId: import_compact_encoding4.default.string.decode(state),
          messageId: import_compact_encoding4.default.string.decode(state),
          fromProfileId: import_compact_encoding4.default.string.decode(state),
          text: import_compact_encoding4.default.string.decode(state)
        };
      }
    };
  }
});

// src/dm-message-storage.ts
function loadDmMessagesFromStorage({
  ownerProfileId,
  storage,
  threadId
}) {
  const stored = storage?.getItem?.(dmMessagesKey(ownerProfileId, threadId));
  if (!stored) {
    return [];
  }
  return deserializeDmMessageCollection(stored, threadId);
}
function saveDmMessagesToStorage({
  messages,
  ownerProfileId,
  storage,
  threadId
}) {
  storage?.setItem?.(
    dmMessagesKey(ownerProfileId, threadId),
    JSON.stringify(serializeDmMessageCollection(messages, threadId))
  );
}
function mergeDmMessages(existing, incoming) {
  const messagesById = /* @__PURE__ */ new Map();
  for (const message of [...existing, ...incoming]) {
    assertValidMessage(message, message.threadId);
    messagesById.set(message.messageId, message);
  }
  return [...messagesById.values()].sort((left, right) => {
    if (left.createdAt !== right.createdAt) {
      return left.createdAt - right.createdAt;
    }
    return left.messageId.localeCompare(right.messageId);
  });
}
function serializeDmMessageCollection(messages, threadId) {
  return {
    messages: mergeDmMessages([], messages).map((message) => assertValidMessage(message, threadId)),
    version: DM_MESSAGES_COLLECTION_VERSION
  };
}
function deserializeDmMessageCollection(stored, threadId) {
  const value = typeof stored === "string" ? JSON.parse(stored) : stored;
  if (value?.version !== DM_MESSAGES_COLLECTION_VERSION) {
    throw new Error("Unsupported DM message collection version");
  }
  if (!Array.isArray(value.messages)) {
    throw new Error("DM message collection is required");
  }
  return mergeDmMessages([], value.messages).map((message) => assertValidMessage(message, threadId));
}
function assertValidMessage(message, threadId) {
  if (message.threadId !== cleanRequiredString6(threadId, "Thread id is required")) {
    throw new Error("DM message thread mismatch");
  }
  if (!verifySignedDmMessage(message)) {
    throw new Error("Invalid DM message");
  }
  return message;
}
function dmMessagesKey(ownerProfileId, threadId) {
  return `${DM_MESSAGES_KEY_PREFIX}.${cleanRequiredString6(
    ownerProfileId,
    "Owner profile id is required"
  )}.${cleanRequiredString6(threadId, "Thread id is required")}`;
}
function cleanRequiredString6(value, message) {
  const cleaned = value?.trim();
  if (!cleaned) {
    throw new Error(message);
  }
  return cleaned;
}
var DM_MESSAGES_COLLECTION_VERSION, DM_MESSAGES_KEY_PREFIX;
var init_dm_message_storage = __esm({
  "src/dm-message-storage.ts"() {
    "use strict";
    init_dm_message();
    DM_MESSAGES_COLLECTION_VERSION = 1;
    DM_MESSAGES_KEY_PREFIX = "kepos.dmMessages.v1";
  }
});

// src/dm-session-storage.ts
function loadDmSessionMessagesFromStorage({
  ownerProfileId,
  storage
}) {
  const stored = storage?.getItem?.(dmSessionMessagesKey(ownerProfileId));
  if (!stored) return [];
  return deserializeDmSessionMessages(stored);
}
function saveDmSessionMessagesToStorage({
  messages,
  ownerProfileId,
  storage
}) {
  storage?.setItem?.(
    dmSessionMessagesKey(ownerProfileId),
    JSON.stringify(serializeDmSessionMessages(messages))
  );
}
function serializeDmSessionMessages(messages = []) {
  return {
    messages: messages.filter(isPersistableSessionMessage).map(serializeSessionMessage),
    version: DM_SESSION_MESSAGES_VERSION
  };
}
function deserializeDmSessionMessages(stored) {
  const value = typeof stored === "string" ? JSON.parse(stored) : stored;
  if (value?.version !== DM_SESSION_MESSAGES_VERSION) {
    throw new Error("Unsupported DM session messages version");
  }
  if (!Array.isArray(value.messages)) {
    throw new Error("DM session messages collection is required");
  }
  return value.messages.map(serializeSessionMessage);
}
function serializeSessionMessage(message) {
  return {
    at: cleanNumber(message?.at || message?.createdAt, "Direct message time is required"),
    createdAt: cleanNumber(message?.createdAt || message?.at, "Message request time is required"),
    direction: cleanDirection2(message?.direction),
    fromProfileId: cleanRequiredString7(message?.fromProfileId, "Request sender is required"),
    id: cleanRequiredString7(message?.id || message?.requestId, "Request id is required"),
    proof: message?.proof,
    requestId: cleanRequiredString7(message?.requestId || message?.id, "Request id is required"),
    senderEncryptionPublicKey: message?.senderEncryptionPublicKey,
    text: cleanText2(message?.text),
    toProfileId: cleanRequiredString7(message?.toProfileId, "Request recipient is required"),
    type: MESSAGE_REQUEST_TYPE2
  };
}
function isPersistableSessionMessage(message) {
  return message?.type === MESSAGE_REQUEST_TYPE2;
}
function dmSessionMessagesKey(ownerProfileId) {
  return `${DM_SESSION_MESSAGES_KEY_PREFIX}.${cleanRequiredString7(
    ownerProfileId,
    "Owner profile id is required"
  )}`;
}
function cleanDirection2(direction) {
  if (direction === "in" || direction === "out") return direction;
  throw new Error("Direct message direction is required");
}
function cleanNumber(value, message) {
  if (Number.isFinite(value)) return value;
  throw new Error(message);
}
function cleanRequiredString7(value, message) {
  const cleaned = typeof value === "string" ? value.trim() : "";
  if (!cleaned) throw new Error(message);
  return cleaned;
}
function cleanText2(text) {
  return typeof text === "string" ? text.trim() : "";
}
var DM_SESSION_MESSAGES_KEY_PREFIX, DM_SESSION_MESSAGES_VERSION, MESSAGE_REQUEST_TYPE2;
var init_dm_session_storage = __esm({
  "src/dm-session-storage.ts"() {
    "use strict";
    DM_SESSION_MESSAGES_KEY_PREFIX = "kepos.dmSessionMessages.v1";
    DM_SESSION_MESSAGES_VERSION = 1;
    MESSAGE_REQUEST_TYPE2 = "kepos.message.request.v1";
  }
});

// src/dm-replication.js
function deriveDmTopic(channelDiscoveryKey) {
  return import_hypercore_crypto3.default.hash(
    import_b4a4.default.from(`${DM_TOPIC_PREFIX}${cleanHex323(channelDiscoveryKey, "Invalid channel key")}`)
  );
}
function createDmReplicationChannel(options = {}) {
  const createSwarm = options.createSwarm || (() => new import_hyperswarm.default());
  const identity = options.identity;
  const localProfileId = cleanHex323(options.localProfileId, "Local profile id is required");
  const onMessage = options.onMessage || (() => {
  });
  const onPeerCount = options.onPeerCount || (() => {
  });
  const peers = /* @__PURE__ */ new Set();
  const seenMessageIds = /* @__PURE__ */ new Set();
  let swarm = null;
  let thread = null;
  function addPeer(socket) {
    peers.add(socket);
    onPeerCount(peers.size);
    let buffer = "";
    socket.on("data", (chunk) => {
      buffer += import_b4a4.default.toString(chunk);
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (!line.trim()) {
          continue;
        }
        try {
          const message = JSON.parse(line);
          if (!shouldAcceptMessage(message)) {
            continue;
          }
          seenMessageIds.add(message.messageId);
          onMessage(message);
        } catch {
        }
      }
    });
    socket.on("close", () => {
      peers.delete(socket);
      onPeerCount(peers.size);
    });
    socket.on("error", () => {
      peers.delete(socket);
      onPeerCount(peers.size);
    });
  }
  async function joinThread(nextThread) {
    if (!isDmThreadActive(nextThread)) {
      throw new Error("Accepted DM thread is required");
    }
    if (nextThread.localProfileId !== localProfileId) {
      throw new Error("DM thread does not belong to local profile");
    }
    thread = nextThread;
    swarm = createSwarm();
    swarm.on("connection", addPeer);
    const discovery = swarm.join(deriveDmTopic(thread.channelDiscoveryKey), {
      client: true,
      server: true
    });
    await discovery.flushed();
  }
  function sendMessage({ createdAt, messageId, text, threadId }) {
    if (!thread || thread.threadId !== threadId) {
      throw new Error("DM thread is not joined");
    }
    if (identity?.publicKey !== localProfileId) {
      throw new Error("DM identity does not match local profile");
    }
    const message = createSignedDmMessage({
      createdAt,
      identity,
      messageId,
      text,
      threadId
    });
    broadcastFrame(message);
    seenMessageIds.add(message.messageId);
    return message;
  }
  function broadcastMessages(messages) {
    for (const message of messages) {
      if (!thread || message?.threadId !== thread.threadId || message.fromProfileId !== localProfileId || !verifySignedDmMessage(message)) {
        continue;
      }
      broadcastFrame(message);
      seenMessageIds.add(message.messageId);
    }
  }
  function broadcastFrame(message) {
    const frame = `${JSON.stringify(message)}
`;
    for (const peer of peers) {
      if (!peer.destroyed) {
        peer.write(frame);
      }
    }
  }
  function shouldAcceptMessage(message) {
    if (!thread || message?.threadId !== thread.threadId) {
      return false;
    }
    if (message.fromProfileId !== thread.remoteProfileId || message.fromProfileId === localProfileId || seenMessageIds.has(message.messageId)) {
      return false;
    }
    return verifySignedDmMessage(message);
  }
  async function leave() {
    for (const peer of peers) {
      peer.destroy?.();
    }
    peers.clear();
    onPeerCount(0);
    thread = null;
    if (swarm) {
      await swarm.destroy();
      swarm = null;
    }
  }
  return {
    addPeer,
    broadcastMessages,
    joinThread,
    leave,
    sendMessage
  };
}
function cleanHex323(value, message) {
  const hex = value?.trim()?.toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(hex)) {
    throw new Error(message);
  }
  return hex;
}
var import_hyperswarm, import_b4a4, import_hypercore_crypto3, DM_TOPIC_PREFIX;
var init_dm_replication = __esm({
  "src/dm-replication.js"() {
    "use strict";
    import_hyperswarm = __toESM(require("hyperswarm"), 1);
    import_b4a4 = __toESM(require("b4a"), 1);
    import_hypercore_crypto3 = __toESM(require("hypercore-crypto"), 1);
    init_dm_message();
    init_dm_thread();
    DM_TOPIC_PREFIX = "kepos-dm:v1:";
  }
});

// src/dm-thread-runtime.js
function createDmThreadRuntime({
  createChannel = createDmReplicationChannel,
  identity,
  loadMessages = () => [],
  localProfileId,
  onMessage = () => {
  },
  saveMessages = () => {
  }
}) {
  const threads = /* @__PURE__ */ new Map();
  async function openThread(thread) {
    if (!isDmThreadActive(thread)) {
      throw new Error("Accepted DM thread is required");
    }
    if (thread.localProfileId !== localProfileId) {
      throw new Error("DM thread does not belong to local profile");
    }
    await closeThread(thread.threadId);
    const record = {
      channel: null,
      messages: mergeDmMessages([], await loadMessages(thread)),
      thread
    };
    const channel = createChannel({
      identity,
      localProfileId,
      onMessage: (message) => handleIncomingMessage(thread.threadId, message)
    });
    record.channel = channel;
    threads.set(thread.threadId, record);
    await channel.joinThread(thread);
    for (const message of record.messages) {
      onMessage(thread, message, message.fromProfileId === localProfileId ? "out" : "in");
    }
    channel.broadcastMessages(record.messages);
  }
  function sendMessage({ createdAt, messageId, text, threadId }) {
    const record = threads.get(threadId);
    if (!record) {
      throw new Error("DM thread is not open");
    }
    const message = record.channel.sendMessage({
      createdAt,
      messageId,
      text,
      threadId
    });
    persistMessage(record, message);
    onMessage(record.thread, message, "out");
    return message;
  }
  function receiveMessage(message) {
    const record = threads.get(message?.threadId);
    if (!record || !shouldAcceptRemoteMessage(record, message) || hasMessage(record, message.messageId)) {
      return false;
    }
    persistMessage(record, message);
    onMessage(record.thread, message, "in");
    return true;
  }
  async function closeThread(threadId) {
    const record = threads.get(threadId);
    if (!record) {
      return;
    }
    threads.delete(threadId);
    await record.channel.leave();
  }
  async function closeAll() {
    await Promise.all([...threads.keys()].map((threadId) => closeThread(threadId)));
  }
  function handleIncomingMessage(threadId, message) {
    const record = threads.get(threadId);
    if (!record || hasMessage(record, message?.messageId)) {
      return;
    }
    persistMessage(record, message);
    onMessage(record.thread, message, "in");
  }
  function shouldAcceptRemoteMessage(record, message) {
    return message?.threadId === record.thread.threadId && message.fromProfileId === record.thread.remoteProfileId && message.fromProfileId !== localProfileId && verifySignedDmMessage(message);
  }
  function hasMessage(record, messageId) {
    return Boolean(messageId && record.messages.some((message) => message.messageId === messageId));
  }
  function persistMessage(record, message) {
    record.messages = mergeDmMessages(record.messages, [message]);
    void Promise.resolve(saveMessages(record.thread, record.messages));
  }
  return {
    closeAll,
    closeThread,
    openThread,
    receiveMessage,
    sendMessage
  };
}
var init_dm_thread_runtime = __esm({
  "src/dm-thread-runtime.js"() {
    "use strict";
    init_dm_message_storage();
    init_dm_message();
    init_dm_replication();
    init_dm_thread();
  }
});

// src/dm-thread-storage.ts
function loadDmThreadsFromStorage({
  ownerProfileId,
  storage
}) {
  void ownerProfileId;
  const stored = storage?.getItem?.(DM_THREADS_KEY);
  if (!stored) {
    return [];
  }
  return deserializeDmThreadCollection(stored);
}
function saveDmThreadsToStorage({
  ownerProfileId,
  storage,
  threads
}) {
  void ownerProfileId;
  storage?.setItem?.(DM_THREADS_KEY, JSON.stringify(serializeDmThreadCollection(threads)));
}
function serializeDmThreadCollection(threads) {
  return {
    version: DM_THREADS_COLLECTION_VERSION,
    threads: threads.map((thread) => serializeDmThread(thread))
  };
}
function deserializeDmThreadCollection(stored) {
  const value = typeof stored === "string" ? JSON.parse(stored) : stored;
  if (value?.version !== DM_THREADS_COLLECTION_VERSION) {
    throw new Error("Unsupported DM thread collection version");
  }
  if (!Array.isArray(value.threads)) {
    throw new Error("DM thread collection is required");
  }
  return value.threads.map((thread) => deserializeDmThread(thread));
}
var DM_THREADS_COLLECTION_VERSION, DM_THREADS_KEY;
var init_dm_thread_storage = __esm({
  "src/dm-thread-storage.ts"() {
    "use strict";
    init_dm_thread();
    DM_THREADS_COLLECTION_VERSION = 1;
    DM_THREADS_KEY = "kepos.dmThreads.v1";
  }
});

// src/message-request-acceptance.js
function acceptMessageRequestWithInvite({
  acceptedAt = Date.now(),
  acceptorIdentity,
  book,
  remoteProfileId,
  threadId
}) {
  const request = book?.pendingRequestsByProfileId?.get(remoteProfileId);
  if (!request) {
    throw new Error("Pending message request is required");
  }
  const channelPublicKey = createKey();
  const channelDiscoveryKey = createKey();
  const pendingThread = createDmThread({
    channelDiscoveryKey,
    channelPublicKey,
    createdAt: acceptedAt,
    localProfileId: acceptorIdentity?.publicKey,
    remoteProfileId,
    requestId: request.requestId,
    threadId
  });
  const thread = acceptDmThread(pendingThread, { acceptedAt });
  const invite = createDmInvite({
    channelDiscoveryKey,
    channelPublicKey,
    createdAt: acceptedAt,
    fromIdentity: acceptorIdentity,
    inviteId: `${threadId}:invite`,
    payload: {
      channelDiscoveryKey,
      channelPublicKey,
      threadId
    },
    recipientEncryptionPublicKey: request.senderEncryptionPublicKey,
    requestId: request.requestId,
    toProfileId: remoteProfileId
  });
  const nextBook = acceptMessageRequest(book, {
    acceptedAt,
    alias: request.alias || request.displayNameSnapshot || remoteProfileId.slice(0, 12),
    profileId: remoteProfileId
  });
  return {
    book: nextBook,
    invite,
    thread
  };
}
function createKey() {
  return import_b4a5.default.toString(import_hypercore_crypto4.default.randomBytes(32), "hex");
}
var import_b4a5, import_hypercore_crypto4;
var init_message_request_acceptance = __esm({
  "src/message-request-acceptance.js"() {
    "use strict";
    import_b4a5 = __toESM(require("b4a"), 1);
    import_hypercore_crypto4 = __toESM(require("hypercore-crypto"), 1);
    init_contact_book();
    init_dm_invite();
    init_dm_thread();
  }
});

// src/desktop-dm-runtime.js
function createDesktopDmRuntime({
  acceptInvite = acceptDmInviteAsRecipient,
  acceptRequestWithInvite = acceptMessageRequestWithInvite,
  createRequest = createMessageRequest,
  createThreadRuntime = createDmThreadRuntime,
  loadMessages = loadDmMessagesFromStorage,
  loadSessionMessages = loadDmSessionMessagesFromStorage,
  loadThreads = loadDmThreadsFromStorage,
  onSessionChanged = () => {
  },
  saveMessages = saveDmMessagesToStorage,
  saveSessionMessages = saveDmSessionMessagesToStorage,
  saveThreads = saveDmThreadsToStorage
} = {}) {
  let dmSession = null;
  let dmRuntime = null;
  let localProfile = null;
  let nick = "Desktop";
  let startVersion = 0;
  let storage = null;
  async function start({ nick: nextNick, profile, storage: nextStorage }) {
    const version = startVersion + 1;
    startVersion = version;
    const previousRuntime = dmRuntime;
    await previousRuntime?.closeAll();
    if (version !== startVersion) return dmSession;
    localProfile = profile;
    nick = nextNick?.trim() || "Desktop";
    storage = nextStorage;
    dmSession = restoreDirectMessageSession({
      localProfileId: profile.id,
      messages: loadSessionMessages({
        ownerProfileId: profile.id,
        storage
      }),
      nick
    });
    dmRuntime = createThreadRuntime({
      identity: profile.identity,
      loadMessages: (thread) => loadMessages({
        ownerProfileId: profile.id,
        storage,
        threadId: thread.threadId
      }),
      localProfileId: profile.id,
      onMessage: (thread, message, direction) => {
        dmSession = direction === "out" ? appendLocalSignedDirectMessage(dmSession, message, {
          remoteProfileId: thread.remoteProfileId
        }) : appendRemoteSignedDirectMessage(dmSession, message);
        saveCurrentSessionMessages();
        onSessionChanged(dmSession);
      },
      saveMessages: (thread, messages) => saveMessages({
        messages,
        ownerProfileId: profile.id,
        storage,
        threadId: thread.threadId
      })
    });
    await openLocalThreads();
    if (version !== startVersion) return dmSession;
    return dmSession;
  }
  async function closeAll() {
    startVersion += 1;
    const currentRuntime = dmRuntime;
    dmRuntime = null;
    dmSession = null;
    localProfile = null;
    storage = null;
    await currentRuntime?.closeAll();
  }
  function getSession() {
    return dmSession;
  }
  function sendMessageOrRequest({
    broadcastControl = () => {
    },
    createdAt,
    messageId,
    requestId,
    text,
    toProfileId
  }) {
    if (!dmSession || !localProfile || !toProfileId || !text?.trim()) return null;
    const thread = findThread(toProfileId);
    if (thread && dmRuntime) {
      const message = dmRuntime.sendMessage({
        createdAt,
        messageId,
        text,
        threadId: thread.threadId
      });
      return { kind: "message", message, thread };
    }
    const request = createRequest({
      createdAt,
      fromIdentity: localProfile.identity,
      requestId,
      senderEncryptionPublicKey: localProfile.dmEncryptionKeyPair.publicKey,
      text,
      toProfileId
    });
    dmSession = appendLocalMessageRequest(dmSession, request);
    saveCurrentSessionMessages();
    onSessionChanged(dmSession);
    broadcastControl(request);
    return { kind: "request", request };
  }
  function appendIncomingRequest(message) {
    if (!dmSession || message.toProfileId !== dmSession.localProfileId) return false;
    dmSession = appendRemoteMessageRequest(dmSession, message);
    saveCurrentSessionMessages();
    onSessionChanged(dmSession);
    return true;
  }
  async function acceptInviteAsRecipient({
    acceptedAt,
    contactBook,
    invite,
    recipientEncryptionKeyPair
  }) {
    if (!localProfile) return null;
    const thread = acceptInvite({
      acceptedAt,
      contactBook,
      invite,
      localProfileId: localProfile.id,
      recipientEncryptionKeyPair
    });
    saveThread(thread);
    await openThread(thread);
    return thread;
  }
  async function acceptMessageRequest2({ acceptedAt, book, remoteProfileId, threadId }) {
    if (!localProfile) return null;
    const result = acceptRequestWithInvite({
      acceptedAt,
      acceptorIdentity: localProfile.identity,
      book,
      remoteProfileId,
      threadId
    });
    saveThread(result.thread);
    await openThread(result.thread);
    return result;
  }
  function dismissMessage({ id }) {
    if (!dmSession || !id) return dmSession;
    dmSession = dismissDirectMessage(dmSession, { id });
    saveCurrentSessionMessages();
    onSessionChanged(dmSession);
    return dmSession;
  }
  function receiveMessage(message) {
    return dmRuntime?.receiveMessage(message) || false;
  }
  function findThread(remoteProfileId) {
    return loadLocalThreads().find(
      (thread) => thread.remoteProfileId === remoteProfileId && thread.state === "accepted" && thread.revokedAt === void 0
    );
  }
  function replaceThreads(threads) {
    if (!localProfile) return;
    saveThreads({
      ownerProfileId: localProfile.id,
      storage,
      threads
    });
  }
  async function closeThreads(threadIds) {
    await Promise.all(threadIds.map((threadId) => dmRuntime?.closeThread(threadId)));
  }
  async function openLocalThreads() {
    await Promise.all(loadLocalThreads().map((thread) => openThread(thread)));
  }
  async function openThread(thread) {
    if (thread.state !== "accepted" || thread.revokedAt !== void 0) return;
    await dmRuntime?.openThread(thread);
  }
  function saveThread(thread) {
    const threads = loadLocalThreads();
    const nextThreads = [
      ...threads.filter((existing) => existing.threadId !== thread.threadId),
      thread
    ];
    replaceThreads(nextThreads);
  }
  function loadLocalThreads() {
    if (!localProfile) return [];
    return loadThreads({
      ownerProfileId: localProfile.id,
      storage
    });
  }
  function saveCurrentSessionMessages() {
    if (!localProfile || !dmSession) return;
    saveSessionMessages({
      messages: dmSession.messages,
      ownerProfileId: localProfile.id,
      storage
    });
  }
  return {
    acceptInviteAsRecipient,
    acceptMessageRequest: acceptMessageRequest2,
    appendIncomingRequest,
    closeAll,
    closeThreads,
    dismissMessage,
    findThread,
    getSession,
    loadThreads: loadLocalThreads,
    openLocalThreads,
    receiveMessage,
    replaceThreads,
    saveThread,
    sendMessageOrRequest,
    start
  };
}
var init_desktop_dm_runtime = __esm({
  "src/desktop-dm-runtime.js"() {
    "use strict";
    init_dm_session();
    init_dm_invite_acceptance();
    init_dm_message_storage();
    init_dm_session_storage();
    init_dm_thread_runtime();
    init_dm_thread_storage();
    init_message_request();
    init_message_request_acceptance();
  }
});

// src/chat-session.ts
function createChatSession({
  roomKey,
  nick,
  profileId = null
}) {
  if (!isRoomKey2(roomKey)) {
    throw new Error("Invalid room key");
  }
  return {
    roomKey,
    profileId: profileId?.trim() || null,
    nick: nick?.trim() || "anon",
    messages: [],
    seenMessageIds: /* @__PURE__ */ new Set()
  };
}
function isRoomKey2(value) {
  return typeof value === "string" && ROOM_KEY_PATTERN2.test(value);
}
function appendLocalMessage(session, text, options = {}) {
  const message = {
    type: "chat",
    id: options.id || crypto.randomUUID(),
    nick: session.nick,
    text: text.trim(),
    at: options.at || Date.now(),
    direction: "out"
  };
  return appendMessage(session, message);
}
function appendRemoteMessage(session, message) {
  return appendMessage(session, {
    ...message,
    direction: "in"
  });
}
function appendMessage(session, message) {
  if (!message.text || session.seenMessageIds.has(message.id)) {
    return session;
  }
  const seenMessageIds = new Set(session.seenMessageIds);
  seenMessageIds.add(message.id);
  return {
    ...session,
    seenMessageIds,
    messages: [...session.messages, message]
  };
}
var ROOM_KEY_PATTERN2;
var init_chat_session = __esm({
  "src/chat-session.ts"() {
    "use strict";
    ROOM_KEY_PATTERN2 = /^[0-9a-f]{64}$/;
  }
});

// src/home-presence.ts
function createHomeHello({
  createdAt = Date.now(),
  homeAddress,
  identity
}) {
  const payload = {
    homeAddress: cleanKey2(homeAddress, "Home address is required"),
    profileId: cleanKey2(identity?.publicKey, "Profile id is required")
  };
  const signed = createSignedRecord({
    createdAt,
    identity,
    payload,
    payloadEncoding: homeHelloPayloadEncoding,
    type: HOME_HELLO_TYPE,
    version: HOME_HELLO_VERSION
  });
  return {
    type: HOME_HELLO_TYPE,
    ...payload,
    createdAt: signed.createdAt,
    proof: {
      createdAt: signed.createdAt,
      signature: signed.signature,
      signerProfileId: signed.signerProfileId,
      type: signed.type,
      version: signed.version
    }
  };
}
function verifyHomeHello(hello) {
  try {
    const payload = {
      homeAddress: cleanKey2(hello.homeAddress, "Home address is required"),
      profileId: cleanKey2(hello.profileId, "Profile id is required")
    };
    if (hello.type !== HOME_HELLO_TYPE || hello.proof?.type !== HOME_HELLO_TYPE || hello.proof?.version !== HOME_HELLO_VERSION || hello.proof?.createdAt !== hello.createdAt || hello.proof?.signerProfileId !== payload.profileId) {
      return false;
    }
    return verifySignedRecord({
      payloadEncoding: homeHelloPayloadEncoding,
      record: {
        createdAt: hello.proof.createdAt,
        payload,
        signature: hello.proof.signature,
        signerProfileId: hello.proof.signerProfileId,
        type: hello.proof.type,
        version: hello.proof.version
      }
    });
  } catch {
    return false;
  }
}
function cleanKey2(value, message) {
  const cleaned = value?.trim();
  if (!cleaned) {
    throw new Error(message);
  }
  if (!KEY_PATTERN3.test(cleaned)) {
    throw new Error("Invalid home presence key");
  }
  return cleaned;
}
var import_compact_encoding5, HOME_HELLO_TYPE, HOME_HELLO_VERSION, KEY_PATTERN3, homeHelloPayloadEncoding;
var init_home_presence = __esm({
  "src/home-presence.ts"() {
    "use strict";
    import_compact_encoding5 = __toESM(require("compact-encoding"), 1);
    init_signed_record();
    HOME_HELLO_TYPE = "kepos.home.hello.v1";
    HOME_HELLO_VERSION = 1;
    KEY_PATTERN3 = /^[0-9a-f]{64}$/;
    homeHelloPayloadEncoding = {
      preencode(state, payload) {
        import_compact_encoding5.default.string.preencode(state, payload.profileId);
        import_compact_encoding5.default.string.preencode(state, payload.homeAddress);
      },
      encode(state, payload) {
        import_compact_encoding5.default.string.encode(state, payload.profileId);
        import_compact_encoding5.default.string.encode(state, payload.homeAddress);
      },
      decode(state) {
        return {
          profileId: import_compact_encoding5.default.string.decode(state),
          homeAddress: import_compact_encoding5.default.string.decode(state)
        };
      }
    };
  }
});

// src/protocol.ts
function isRoomKey3(value) {
  return typeof value === "string" && ROOM_KEY_PATTERN3.test(value);
}
function deriveTopic(roomKey) {
  if (!isRoomKey3(roomKey)) {
    throw new Error("Invalid room key");
  }
  return import_hypercore_crypto5.default.hash(import_b4a6.default.from(`${TOPIC_PREFIX}${roomKey}`));
}
function encodeFrame(message) {
  return `${JSON.stringify(message)}
`;
}
function decodeFrame(line) {
  const frame = JSON.parse(line);
  if (!isProtocolFrame(frame)) {
    throw new Error("Unsupported frame");
  }
  return frame;
}
function isProtocolFrame(value) {
  return typeof value === "object" && value !== null && typeof value.type === "string" && SUPPORTED_FRAME_TYPE_SET.has(value.type);
}
var import_hypercore_crypto5, import_b4a6, ROOM_KEY_PATTERN3, TOPIC_PREFIX, SUPPORTED_FRAME_TYPES, SUPPORTED_FRAME_TYPE_SET;
var init_protocol = __esm({
  "src/protocol.ts"() {
    "use strict";
    import_hypercore_crypto5 = __toESM(require("hypercore-crypto"), 1);
    import_b4a6 = __toESM(require("b4a"), 1);
    ROOM_KEY_PATTERN3 = /^[0-9a-f]{64}$/;
    TOPIC_PREFIX = "kepos-room:v1:";
    SUPPORTED_FRAME_TYPES = [
      "chat",
      "kepos.dm.body.v1",
      "kepos.dm.invite.v1",
      "kepos.home.hello.request.v1",
      "kepos.home.hello.v1",
      "kepos.message.request.v1",
      "treehole.bootstrap",
      "treehole.state.v1",
      "treehole.writer"
    ];
    SUPPORTED_FRAME_TYPE_SET = new Set(SUPPORTED_FRAME_TYPES);
  }
});

// src/p2p-room.js
function createP2PRoom(options = {}) {
  const createSwarm = options.createSwarm || (() => new import_hyperswarm2.default());
  const createDirectTransport = options.createDirectTransport || null;
  const awaitDiscoveryFlush = options.awaitDiscoveryFlush ?? true;
  const onDiscoveryError = options.onDiscoveryError || (() => {
  });
  const onMessage = options.onMessage || (() => {
  });
  const onControl = options.onControl || (() => {
  });
  const onDebugState = options.onDebugState || (() => {
  });
  const onPeer = options.onPeer || (() => {
  });
  const onPeerCount = options.onPeerCount || (() => {
  });
  const peers = /* @__PURE__ */ new Set();
  const seenMessages = /* @__PURE__ */ new Set();
  let currentTopic = null;
  let directEndpoint = null;
  let directReady = false;
  let directTransport = null;
  let frameDecodeErrors = 0;
  let frameReads = 0;
  let frameWrites = 0;
  let byteReads = 0;
  let byteWrites = 0;
  let lastReadType = null;
  let lastWriteType = null;
  const readTypes = /* @__PURE__ */ new Map();
  const writeTypes = /* @__PURE__ */ new Map();
  let lastPeerInfo = null;
  let swarm = null;
  let nick = "anon";
  function emitDebugState(stage) {
    onDebugState(getDebugState(stage));
  }
  function getDebugState(stage = "snapshot") {
    const discovery = getDiscovery();
    return {
      activeQuery: Boolean(discovery?._activeQuery),
      connections: getCollectionSize(swarm?.connections),
      connecting: Number(swarm?.connecting || 0),
      ...directEndpoint ? { directEndpoint } : {},
      directReady,
      discovered: getCollectionSize(discovery?._discovered),
      destroyed: Boolean(swarm?.destroyed),
      dhtFirewalled: Boolean(swarm?.dht?.firewalled),
      dhtNodes: getCollectionSize(swarm?.dht?.nodes),
      dhtOnline: Boolean(swarm?.dht?.online),
      byteReads,
      byteWrites,
      frameDecodeErrors,
      frameReads,
      frameWrites,
      ...lastReadType ? { lastReadType } : {},
      ...lastWriteType ? { lastWriteType } : {},
      readTypes: Object.fromEntries(readTypes),
      writeTypes: Object.fromEntries(writeTypes),
      isClient: Boolean(discovery?.isClient),
      isServer: Boolean(discovery?.isServer),
      knownPeers: getCollectionSize(swarm?.peers),
      lastPeerClient: Boolean(lastPeerInfo?.client),
      lastPeerSelf: Boolean(
        lastPeerInfo?.publicKey && swarm?.keyPair?.publicKey && import_b4a7.default.equals(lastPeerInfo.publicKey, swarm.keyPair.publicKey)
      ),
      lastPeerTopics: getCollectionSize(lastPeerInfo?.topics),
      listening: Boolean(swarm?.listening),
      localPeers: peers.size,
      refreshes: Number(discovery?._refreshes || 0),
      stage,
      topics: getCollectionSize(
        typeof swarm?.topics === "function" ? swarm.topics() : swarm?.topics
      )
    };
  }
  function getDiscovery() {
    if (!swarm || !currentTopic || typeof swarm.status !== "function") return null;
    try {
      return swarm.status(currentTopic);
    } catch {
      return null;
    }
  }
  function addPeer(socket, peerInfo = null) {
    lastPeerInfo = peerInfo;
    peers.add(socket);
    onPeerCount(peers.size);
    emitDebugState("peer-open");
    onPeer(socket);
    let buffer = "";
    socket.on("data", (chunk) => {
      byteReads += chunk?.byteLength || chunk?.length || 0;
      buffer += import_b4a7.default.toString(chunk);
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (!line.trim()) {
          continue;
        }
        try {
          const message = decodeFrame(line);
          frameReads += 1;
          lastReadType = message.type;
          incrementType(readTypes, message.type);
          if (message.type === "chat") {
            if (shouldSkipMessage(message)) {
              continue;
            }
            seenMessages.add(message.id);
            onMessage(message);
            continue;
          }
          onControl(message, socket);
        } catch {
          frameDecodeErrors += 1;
        }
      }
      emitDebugState("peer-data");
    });
    socket.on("close", () => {
      lastPeerInfo = peerInfo;
      peers.delete(socket);
      onPeerCount(peers.size);
      emitDebugState("peer-close");
    });
    socket.on("error", () => {
      lastPeerInfo = peerInfo;
      peers.delete(socket);
      onPeerCount(peers.size);
      emitDebugState("peer-error");
    });
  }
  async function join({ roomKey, nick: nextNick }) {
    nick = nextNick?.trim() || "anon";
    swarm = createSwarm();
    swarm.on("connection", addPeer);
    emitDebugState("created");
    currentTopic = deriveTopic(roomKey);
    const discovery = swarm.join(currentTopic, {
      client: true,
      server: true
    });
    emitDebugState("joined-topic");
    if (createDirectTransport) {
      directTransport = createDirectTransport({
        addPeer,
        roomKey
      });
      directTransport?.ready?.then?.((endpoint) => {
        directEndpoint = endpoint || null;
        directReady = Boolean(endpoint);
        emitDebugState("direct-ready");
      });
      emitDebugState("direct-started");
    }
    if (awaitDiscoveryFlush) {
      await discovery.flushed();
      emitDebugState("flushed");
      return;
    }
    discovery.flushed().then(() => emitDebugState("flushed")).catch(onDiscoveryError);
  }
  function send({ id, text, at }) {
    broadcastFrame({
      type: "chat",
      id,
      nick,
      text,
      at
    });
    seenMessages.add(id);
  }
  function broadcastControl(message) {
    broadcastFrame(message);
  }
  function sendControl(peer, message) {
    if (!peers.has(peer) || peer.destroyed) {
      return;
    }
    writeFrame(peer, message);
    emitDebugState("peer-write");
  }
  function broadcastFrame(message) {
    for (const peer of peers) {
      if (!peer.destroyed) {
        writeFrame(peer, message);
      }
    }
    emitDebugState("peer-write");
  }
  function writeFrame(peer, message) {
    const frame = import_b4a7.default.from(encodeFrame(message));
    peer.write(frame);
    frameWrites += 1;
    byteWrites += frame.byteLength || frame.length || 0;
    lastWriteType = message.type;
    incrementType(writeTypes, message.type);
  }
  function shouldSkipMessage(message) {
    return !message.id || seenMessages.has(message.id);
  }
  async function leave() {
    for (const peer of peers) {
      peer.destroy?.();
    }
    peers.clear();
    onPeerCount(0);
    await directTransport?.close?.();
    directEndpoint = null;
    directReady = false;
    directTransport = null;
    if (swarm) {
      await swarm.destroy();
      swarm = null;
    }
    currentTopic = null;
    emitDebugState("left");
  }
  return {
    addPeer,
    broadcastControl,
    getDebugState,
    join,
    leave,
    send,
    sendControl
  };
}
function getCollectionSize(value) {
  if (!value) return 0;
  if (typeof value.size === "number") return value.size;
  if (typeof value.length === "number") return value.length;
  if (typeof value[Symbol.iterator] === "function") return Array.from(value).length;
  if (typeof value === "object") return Object.keys(value).length;
  return 0;
}
function incrementType(counts, type) {
  counts.set(type, (counts.get(type) || 0) + 1);
}
var import_hyperswarm2, import_b4a7;
var init_p2p_room = __esm({
  "src/p2p-room.js"() {
    "use strict";
    import_hyperswarm2 = __toESM(require("hyperswarm"), 1);
    import_b4a7 = __toESM(require("b4a"), 1);
    init_protocol();
  }
});

// src/desktop-home-runtime.js
function createDesktopHomeRuntime({
  createDirectTransport = null,
  createHomeHello: createHello = createHomeHello,
  createRoom = createP2PRoom,
  onControl = () => {
  },
  onDebugState = () => {
  },
  onError = () => {
  },
  onPeerCount = () => {
  },
  onSessionChanged = () => {
  },
  onVerifiedHello = () => {
  },
  verifyHomeHello: verifyHello = verifyHomeHello
} = {}) {
  let homeJoinDetails = null;
  let directEndpoint = null;
  let room = null;
  let session = null;
  async function join({ homeJoinDetails: nextHomeJoinDetails }) {
    await leave();
    homeJoinDetails = nextHomeJoinDetails;
    session = nextHomeJoinDetails?.session || null;
    if (!homeJoinDetails || !session) return;
    room = createRoom({
      createDirectTransport: homeJoinDetails.directTransport ? ({ addPeer, roomKey }) => createDirectTransport?.({
        addPeer,
        ...homeJoinDetails.directTransport,
        onEndpoint: (endpoint) => {
          directEndpoint = endpoint;
          emitDebugState({ stage: "direct-endpoint" });
        },
        roomKey
      }) : void 0,
      onControl: (message, peer) => handleControl(message, peer),
      onDebugState: emitDebugState,
      onDiscoveryError: (error) => {
        onError(new Error(`Home discovery unavailable: ${error.message}`));
      },
      onMessage: (message) => {
        session = appendRemoteMessage(session, message);
        onSessionChanged(session);
      },
      onPeer: (peer) => {
        sendHomeHello(peer);
        requestHomeHello(peer);
      },
      onPeerCount
    });
    await room.join({ nick: session.nick, roomKey: session.roomKey });
  }
  async function leave() {
    await room?.leave();
    room = null;
    homeJoinDetails = null;
    directEndpoint = null;
    session = null;
  }
  function emitDebugState(debug) {
    onDebugState({
      ...debug,
      ...directEndpoint ? { directEndpoint } : {}
    });
  }
  function configure(nextContext) {
    homeJoinDetails = nextContext?.homeJoinDetails || homeJoinDetails;
    session = nextContext?.session || session;
  }
  function sendMessage(message) {
    if (!room || !session || !message?.text?.trim()) return null;
    session = appendLocalMessage(session, message.text, message);
    room.send(message);
    onSessionChanged(session);
    return session;
  }
  function sendControl(peer, message) {
    if (!room || !peer || !message) return false;
    room.sendControl(peer, message);
    return true;
  }
  function broadcastControl(message) {
    if (!room || !message) return false;
    room.broadcastControl(message);
    return true;
  }
  function requestHomeHello(peer = null) {
    const request = { type: "kepos.home.hello.request.v1" };
    if (peer) return sendControl(peer, request);
    return broadcastControl(request);
  }
  function sendHomeHello(peer = null) {
    if (!homeJoinDetails?.identity || !homeJoinDetails?.address) return false;
    const hello = createHello({
      homeAddress: homeJoinDetails.address,
      identity: homeJoinDetails.identity
    });
    if (peer) return sendControl(peer, hello);
    return broadcastControl(hello);
  }
  function handleControl(message, peer) {
    if (message.type === "kepos.home.hello.request.v1") {
      sendHomeHello(peer);
      return;
    }
    if (message.type === "kepos.home.hello.v1") {
      if (!verifyHello(message) || message.homeAddress !== homeJoinDetails?.address) return;
      onVerifiedHello(message, peer);
      return;
    }
    onControl(message, peer);
  }
  function isJoined() {
    return Boolean(room);
  }
  function getSession() {
    return session;
  }
  return {
    broadcastControl,
    configure,
    getSession,
    isJoined,
    join,
    leave,
    requestHomeHello,
    sendControl,
    sendHomeHello,
    sendMessage
  };
}
var init_desktop_home_runtime = __esm({
  "src/desktop-home-runtime.js"() {
    "use strict";
    init_chat_session();
    init_home_presence();
    init_p2p_room();
  }
});

// src/treehole-state.ts
function createPostEvent({
  id,
  author,
  authorProfileId,
  text,
  createdAt
}) {
  const event = {
    type: POST_CREATE,
    id,
    author: cleanAuthor(author),
    text: cleanText3(text),
    createdAt
  };
  const cleanAuthorProfileId = cleanProfileId3(authorProfileId);
  if (cleanAuthorProfileId) {
    event.authorProfileId = cleanAuthorProfileId;
  }
  return event;
}
function createCommentEvent({
  id,
  postId,
  author,
  text,
  createdAt
}) {
  return {
    type: COMMENT_CREATE,
    id,
    postId,
    author: cleanAuthor(author),
    text: cleanText3(text),
    createdAt
  };
}
function createLikeEvent({
  postId,
  author,
  createdAt
}) {
  return {
    type: LIKE_ADD,
    postId,
    author: cleanAuthor(author),
    createdAt
  };
}
function applyTreeholeEvents(events) {
  const postsById = /* @__PURE__ */ new Map();
  const commentsByPost = /* @__PURE__ */ new Map();
  const likesByPost = /* @__PURE__ */ new Map();
  for (const event of events) {
    if (event.type === POST_CREATE) {
      if (!event.id || !event.text || postsById.has(event.id)) {
        continue;
      }
      const post = {
        id: event.id,
        author: event.author,
        text: event.text,
        createdAt: event.createdAt,
        commentCount: 0,
        likeCount: 0
      };
      const cleanAuthorProfileId = cleanProfileId3(event.authorProfileId);
      if (cleanAuthorProfileId) {
        post.authorProfileId = cleanAuthorProfileId;
      }
      postsById.set(event.id, post);
      continue;
    }
    if (event.type === COMMENT_CREATE) {
      if (!postsById.has(event.postId) || !event.id || !event.text) {
        continue;
      }
      const comments = commentsByPost.get(event.postId) || [];
      if (comments.some((comment) => comment.id === event.id)) {
        continue;
      }
      commentsByPost.set(event.postId, [
        ...comments,
        {
          id: event.id,
          postId: event.postId,
          author: event.author,
          text: event.text,
          createdAt: event.createdAt
        }
      ]);
      continue;
    }
    if (event.type === LIKE_ADD && postsById.has(event.postId)) {
      const likes = likesByPost.get(event.postId) || /* @__PURE__ */ new Set();
      likes.add(event.author);
      likesByPost.set(event.postId, likes);
    }
  }
  const posts = Array.from(postsById.values()).map((post) => ({
    ...post,
    commentCount: commentsByPost.get(post.id)?.length || 0,
    likeCount: likesByPost.get(post.id)?.size || 0
  })).sort((left, right) => right.createdAt - left.createdAt);
  return {
    posts,
    commentsByPost,
    likesByPost
  };
}
function cleanAuthor(author) {
  return typeof author === "string" && author.trim() ? author.trim() : "anon";
}
function cleanText3(text) {
  return typeof text === "string" ? text.trim() : "";
}
function cleanProfileId3(profileId) {
  return typeof profileId === "string" && profileId.trim() ? profileId.trim() : null;
}
var POST_CREATE, COMMENT_CREATE, LIKE_ADD;
var init_treehole_state = __esm({
  "src/treehole-state.ts"() {
    "use strict";
    POST_CREATE = "treehole.post.create";
    COMMENT_CREATE = "treehole.comment.create";
    LIKE_ADD = "treehole.like.add";
  }
});

// src/treehole-signed-events.ts
function createSignedTreeholePost({
  authorDisplayName = "",
  createdAt = Date.now(),
  identity,
  postId,
  text,
  treeholeOwnerProfileId
}) {
  return signTreeholeEvent({
    createdAt,
    identity,
    payload: {
      authorDisplayName: cleanOptionalString4(authorDisplayName),
      authorProfileId: cleanKey3(identity.publicKey, "Author profile id is required"),
      postId: cleanRequiredString8(postId, "Post id is required"),
      text: cleanRequiredString8(text, "Post text is required"),
      treeholeOwnerProfileId: cleanKey3(
        treeholeOwnerProfileId,
        "Treehole owner profile id is required"
      )
    },
    payloadEncoding: postCreateEncoding,
    type: POST_CREATE2
  });
}
function createSignedTreeholePostTombstone({
  createdAt = Date.now(),
  identity,
  postId,
  treeholeOwnerProfileId
}) {
  return signTreeholeEvent({
    createdAt,
    identity,
    payload: {
      actorProfileId: cleanKey3(identity.publicKey, "Actor profile id is required"),
      postId: cleanRequiredString8(postId, "Post id is required"),
      treeholeOwnerProfileId: cleanKey3(
        treeholeOwnerProfileId,
        "Treehole owner profile id is required"
      )
    },
    payloadEncoding: postTombstoneEncoding,
    type: POST_TOMBSTONE
  });
}
function createSignedTreeholeComment({
  authorDisplayName = "",
  commentId,
  createdAt = Date.now(),
  identity,
  postId,
  text,
  treeholeOwnerProfileId
}) {
  return signTreeholeEvent({
    createdAt,
    identity,
    payload: {
      authorDisplayName: cleanOptionalString4(authorDisplayName),
      authorProfileId: cleanKey3(identity.publicKey, "Author profile id is required"),
      commentId: cleanRequiredString8(commentId, "Comment id is required"),
      postId: cleanRequiredString8(postId, "Post id is required"),
      text: cleanRequiredString8(text, "Comment text is required"),
      treeholeOwnerProfileId: cleanKey3(
        treeholeOwnerProfileId,
        "Treehole owner profile id is required"
      )
    },
    payloadEncoding: commentCreateEncoding,
    type: COMMENT_CREATE2
  });
}
function createSignedTreeholeCommentTombstone({
  commentId,
  createdAt = Date.now(),
  identity,
  postId,
  treeholeOwnerProfileId
}) {
  return signTreeholeEvent({
    createdAt,
    identity,
    payload: {
      actorProfileId: cleanKey3(identity.publicKey, "Actor profile id is required"),
      commentId: cleanRequiredString8(commentId, "Comment id is required"),
      postId: cleanRequiredString8(postId, "Post id is required"),
      treeholeOwnerProfileId: cleanKey3(
        treeholeOwnerProfileId,
        "Treehole owner profile id is required"
      )
    },
    payloadEncoding: commentTombstoneEncoding,
    type: COMMENT_TOMBSTONE
  });
}
function createSignedTreeholeLike({
  action = "add",
  createdAt = Date.now(),
  identity,
  postId,
  treeholeOwnerProfileId
}) {
  return signTreeholeEvent({
    createdAt,
    identity,
    payload: {
      actorProfileId: cleanKey3(identity.publicKey, "Actor profile id is required"),
      postId: cleanRequiredString8(postId, "Post id is required"),
      treeholeOwnerProfileId: cleanKey3(
        treeholeOwnerProfileId,
        "Treehole owner profile id is required"
      )
    },
    payloadEncoding: likeEncoding,
    type: action === "remove" ? LIKE_REMOVE : LIKE_ADD2
  });
}
function createSignedTreeholeWriterGrant({
  createdAt = Date.now(),
  identity,
  treeholeOwnerProfileId,
  writerKey,
  writerProfileId
}) {
  return signTreeholeEvent({
    createdAt,
    identity,
    payload: {
      treeholeOwnerProfileId: cleanKey3(
        treeholeOwnerProfileId,
        "Treehole owner profile id is required"
      ),
      writerKey: cleanKey3(writerKey, "Writer key is required"),
      writerProfileId: cleanKey3(writerProfileId, "Writer profile id is required")
    },
    payloadEncoding: writerGrantEncoding,
    type: WRITER_GRANT
  });
}
function verifySignedTreeholeEvent(event) {
  try {
    const payload = payloadFromEvent(event);
    return verifySignedRecord({
      payloadEncoding: encodingForType(event.type),
      record: {
        createdAt: event.proof.createdAt,
        payload,
        signature: event.proof.signature,
        signerProfileId: event.proof.signerProfileId,
        type: event.proof.type,
        version: event.proof.version
      }
    });
  } catch {
    return false;
  }
}
function applySignedTreeholeEvents(events, policy) {
  const ownerProfileId = cleanKey3(policy.ownerProfileId, "Treehole owner profile id is required");
  const trusted = new Set(policy.trustedProfileIds || []);
  const revoked = new Set(policy.revokedProfileIds || []);
  const postsById = /* @__PURE__ */ new Map();
  const tombstonedPosts = /* @__PURE__ */ new Set();
  const commentsByPost = /* @__PURE__ */ new Map();
  const commentsById = /* @__PURE__ */ new Map();
  const tombstonedComments = /* @__PURE__ */ new Set();
  const likesByPost = /* @__PURE__ */ new Map();
  for (const event of events) {
    if (!verifySignedTreeholeEvent(event) || event.treeholeOwnerProfileId !== ownerProfileId) {
      continue;
    }
    if (event.type === POST_CREATE2) {
      if (event.authorProfileId !== ownerProfileId || !event.postId || postsById.has(event.postId)) {
        continue;
      }
      postsById.set(event.postId, {
        ...dropEmpty3({
          authorDisplayName: cleanOptionalString4(event.authorDisplayName),
          authorProfileId: event.authorProfileId,
          text: event.text
        }),
        createdAt: event.createdAt,
        id: event.postId
      });
      continue;
    }
    if (event.type === POST_TOMBSTONE) {
      if (event.actorProfileId === ownerProfileId && event.postId && postsById.has(event.postId)) {
        tombstonedPosts.add(event.postId);
      }
      continue;
    }
    if (event.type === COMMENT_CREATE2) {
      if (!event.authorProfileId || !event.commentId || !event.postId || !postsById.has(event.postId) || tombstonedPosts.has(event.postId) || commentsById.has(event.commentId) || !canTrustedWrite({ ownerProfileId, profileId: event.authorProfileId, revoked, trusted })) {
        continue;
      }
      const comment = dropEmpty3({
        authorDisplayName: cleanOptionalString4(event.authorDisplayName),
        authorProfileId: event.authorProfileId,
        createdAt: event.createdAt,
        id: event.commentId,
        postId: event.postId,
        text: event.text
      });
      commentsById.set(event.commentId, comment);
      commentsByPost.set(event.postId, [...commentsByPost.get(event.postId) || [], comment]);
      continue;
    }
    if (event.type === COMMENT_TOMBSTONE) {
      const comment = event.commentId ? commentsById.get(event.commentId) : null;
      if (comment && event.actorProfileId && (event.actorProfileId === comment.authorProfileId || event.actorProfileId === ownerProfileId)) {
        tombstonedComments.add(event.commentId);
      }
      continue;
    }
    if (event.type === LIKE_ADD2 || event.type === LIKE_REMOVE) {
      if (!event.actorProfileId || !event.postId || !postsById.has(event.postId) || tombstonedPosts.has(event.postId) || !canTrustedWrite({ ownerProfileId, profileId: event.actorProfileId, revoked, trusted })) {
        continue;
      }
      const likes = likesByPost.get(event.postId) || /* @__PURE__ */ new Set();
      if (event.type === LIKE_ADD2) {
        likes.add(event.actorProfileId);
      } else {
        likes.delete(event.actorProfileId);
      }
      likesByPost.set(event.postId, likes);
    }
  }
  const visibleCommentsByPost = /* @__PURE__ */ new Map();
  for (const [postId, comments] of commentsByPost) {
    if (tombstonedPosts.has(postId)) {
      continue;
    }
    visibleCommentsByPost.set(
      postId,
      comments.filter((comment) => !tombstonedComments.has(comment.id))
    );
  }
  const visibleLikesByPost = /* @__PURE__ */ new Map();
  for (const [postId, likes] of likesByPost) {
    if (!tombstonedPosts.has(postId)) {
      visibleLikesByPost.set(postId, likes);
    }
  }
  const posts = Array.from(postsById.values()).filter((post) => !tombstonedPosts.has(post.id)).map((post) => ({
    ...post,
    commentCount: visibleCommentsByPost.get(post.id)?.length || 0,
    likeCount: visibleLikesByPost.get(post.id)?.size || 0
  }));
  posts.sort((left, right) => right.createdAt - left.createdAt);
  return {
    commentsByPost: visibleCommentsByPost,
    likesByPost: visibleLikesByPost,
    posts
  };
}
function signTreeholeEvent({
  createdAt,
  identity,
  payload,
  payloadEncoding,
  type
}) {
  const signed = createSignedRecord({
    createdAt,
    identity,
    payload,
    payloadEncoding,
    type,
    version: RECORD_VERSION2
  });
  return {
    type,
    ...payload,
    createdAt,
    proof: {
      createdAt: signed.createdAt,
      signature: signed.signature,
      signerProfileId: signed.signerProfileId,
      type: signed.type,
      version: signed.version
    }
  };
}
function payloadFromEvent(event) {
  if (event.proof?.type !== event.type || event.proof?.version !== RECORD_VERSION2 || event.proof?.createdAt !== event.createdAt) {
    throw new Error("Invalid treehole event proof");
  }
  const payload = cleanPayloadForType(event);
  const signerField = payload.authorProfileId || payload.actorProfileId || payload.treeholeOwnerProfileId;
  if (event.proof.signerProfileId !== signerField) {
    throw new Error("Invalid treehole event signer");
  }
  return payload;
}
function cleanPayloadForType(event) {
  if (event.type === POST_CREATE2) {
    return {
      authorDisplayName: cleanOptionalString4(event.authorDisplayName),
      authorProfileId: cleanKey3(event.authorProfileId, "Author profile id is required"),
      postId: cleanRequiredString8(event.postId, "Post id is required"),
      text: cleanRequiredString8(event.text, "Post text is required"),
      treeholeOwnerProfileId: cleanKey3(
        event.treeholeOwnerProfileId,
        "Treehole owner profile id is required"
      )
    };
  }
  if (event.type === POST_TOMBSTONE) {
    return {
      actorProfileId: cleanKey3(event.actorProfileId, "Actor profile id is required"),
      postId: cleanRequiredString8(event.postId, "Post id is required"),
      treeholeOwnerProfileId: cleanKey3(
        event.treeholeOwnerProfileId,
        "Treehole owner profile id is required"
      )
    };
  }
  if (event.type === COMMENT_CREATE2) {
    return {
      authorDisplayName: cleanOptionalString4(event.authorDisplayName),
      authorProfileId: cleanKey3(event.authorProfileId, "Author profile id is required"),
      commentId: cleanRequiredString8(event.commentId, "Comment id is required"),
      postId: cleanRequiredString8(event.postId, "Post id is required"),
      text: cleanRequiredString8(event.text, "Comment text is required"),
      treeholeOwnerProfileId: cleanKey3(
        event.treeholeOwnerProfileId,
        "Treehole owner profile id is required"
      )
    };
  }
  if (event.type === COMMENT_TOMBSTONE) {
    return {
      actorProfileId: cleanKey3(event.actorProfileId, "Actor profile id is required"),
      commentId: cleanRequiredString8(event.commentId, "Comment id is required"),
      postId: cleanRequiredString8(event.postId, "Post id is required"),
      treeholeOwnerProfileId: cleanKey3(
        event.treeholeOwnerProfileId,
        "Treehole owner profile id is required"
      )
    };
  }
  if (event.type === LIKE_ADD2 || event.type === LIKE_REMOVE) {
    return {
      actorProfileId: cleanKey3(event.actorProfileId, "Actor profile id is required"),
      postId: cleanRequiredString8(event.postId, "Post id is required"),
      treeholeOwnerProfileId: cleanKey3(
        event.treeholeOwnerProfileId,
        "Treehole owner profile id is required"
      )
    };
  }
  if (event.type === WRITER_GRANT) {
    return {
      treeholeOwnerProfileId: cleanKey3(
        event.treeholeOwnerProfileId,
        "Treehole owner profile id is required"
      ),
      writerKey: cleanKey3(event.writerKey, "Writer key is required"),
      writerProfileId: cleanKey3(event.writerProfileId, "Writer profile id is required")
    };
  }
  throw new Error("Unsupported treehole event");
}
function encodingForType(type) {
  if (type === POST_CREATE2) return postCreateEncoding;
  if (type === POST_TOMBSTONE) return postTombstoneEncoding;
  if (type === COMMENT_CREATE2) return commentCreateEncoding;
  if (type === COMMENT_TOMBSTONE) return commentTombstoneEncoding;
  if (type === LIKE_ADD2 || type === LIKE_REMOVE) return likeEncoding;
  if (type === WRITER_GRANT) return writerGrantEncoding;
  throw new Error("Unsupported treehole event");
}
function createPayloadEncoding(fields) {
  return {
    preencode(state, payload) {
      for (const field of fields) {
        import_compact_encoding6.default.string.preencode(state, payload[field] || "");
      }
    },
    encode(state, payload) {
      for (const field of fields) {
        import_compact_encoding6.default.string.encode(state, payload[field] || "");
      }
    },
    decode(state) {
      const payload = {};
      for (const field of fields) {
        payload[field] = import_compact_encoding6.default.string.decode(state);
      }
      return payload;
    }
  };
}
function canTrustedWrite({
  ownerProfileId,
  profileId,
  revoked,
  trusted
}) {
  if (profileId === ownerProfileId) {
    return !revoked.has(profileId);
  }
  return trusted.has(profileId) && !revoked.has(profileId);
}
function dropEmpty3(value) {
  return Object.fromEntries(
    Object.entries(value).filter(
      ([, entry]) => entry !== void 0 && entry !== null && entry !== ""
    )
  );
}
function cleanKey3(value, message) {
  const cleaned = cleanRequiredString8(value, message);
  if (!KEY_PATTERN4.test(cleaned)) {
    throw new Error("Invalid profile id");
  }
  return cleaned;
}
function cleanRequiredString8(value, message) {
  const cleaned = value?.trim();
  if (!cleaned) {
    throw new Error(message);
  }
  return cleaned;
}
function cleanOptionalString4(value) {
  return value?.trim() || "";
}
var import_compact_encoding6, POST_CREATE2, POST_TOMBSTONE, COMMENT_CREATE2, COMMENT_TOMBSTONE, LIKE_ADD2, LIKE_REMOVE, WRITER_GRANT, RECORD_VERSION2, KEY_PATTERN4, postCreateEncoding, postTombstoneEncoding, commentCreateEncoding, commentTombstoneEncoding, likeEncoding, writerGrantEncoding;
var init_treehole_signed_events = __esm({
  "src/treehole-signed-events.ts"() {
    "use strict";
    import_compact_encoding6 = __toESM(require("compact-encoding"), 1);
    init_signed_record();
    POST_CREATE2 = "treehole.post.create";
    POST_TOMBSTONE = "treehole.post.delete";
    COMMENT_CREATE2 = "treehole.comment.create";
    COMMENT_TOMBSTONE = "treehole.comment.delete";
    LIKE_ADD2 = "treehole.like.add";
    LIKE_REMOVE = "treehole.like.remove";
    WRITER_GRANT = "treehole.writer.grant.v1";
    RECORD_VERSION2 = 1;
    KEY_PATTERN4 = /^[0-9a-f]{64}$/;
    postCreateEncoding = createPayloadEncoding([
      "treeholeOwnerProfileId",
      "postId",
      "authorProfileId",
      "authorDisplayName",
      "text"
    ]);
    postTombstoneEncoding = createPayloadEncoding([
      "treeholeOwnerProfileId",
      "postId",
      "actorProfileId"
    ]);
    commentCreateEncoding = createPayloadEncoding([
      "treeholeOwnerProfileId",
      "postId",
      "commentId",
      "authorProfileId",
      "authorDisplayName",
      "text"
    ]);
    commentTombstoneEncoding = createPayloadEncoding([
      "treeholeOwnerProfileId",
      "postId",
      "commentId",
      "actorProfileId"
    ]);
    likeEncoding = createPayloadEncoding(["treeholeOwnerProfileId", "postId", "actorProfileId"]);
    writerGrantEncoding = createPayloadEncoding([
      "treeholeOwnerProfileId",
      "writerProfileId",
      "writerKey"
    ]);
  }
});

// src/treehole-policy.ts
function createTreeholeSessionOptions({
  bootstrapKey = null,
  identity = null,
  nick = "anon",
  ownerProfileId = null,
  profileId = null,
  storage,
  treeholePolicy = null
} = {}) {
  const baseOptions = {
    bootstrapKey,
    mode: "prototype",
    nick,
    profileId,
    storage
  };
  if (!isTreeholeIdentity(identity) || !isTreeholeProfileKey(ownerProfileId)) {
    return baseOptions;
  }
  return {
    ...baseOptions,
    identity,
    mode: "signed",
    treeholeOwnerProfileId: ownerProfileId,
    treeholePolicy: createSignedTreeholePolicy({ ownerProfileId, treeholePolicy })
  };
}
function createSignedTreeholePolicy({
  ownerProfileId,
  treeholePolicy
}) {
  return {
    ownerProfileId,
    revokedProfileIds: treeholePolicy?.revokedProfileIds || [],
    trustedProfileIds: treeholePolicy?.trustedProfileIds || []
  };
}
function canGrantTreeholeWriter({
  ownerProfileId,
  policy,
  writerProfileId
}) {
  if (!isTreeholeProfileKey(ownerProfileId) || !isTreeholeProfileKey(writerProfileId)) {
    return false;
  }
  if (writerProfileId === ownerProfileId) {
    return !new Set(policy?.revokedProfileIds || []).has(writerProfileId);
  }
  const revoked = new Set(policy?.revokedProfileIds || []);
  if (revoked.has(writerProfileId)) {
    return false;
  }
  return new Set(policy?.trustedProfileIds || []).has(writerProfileId);
}
function canShareTreeholeBootstrap({
  localProfileId,
  ownerProfileId,
  policy,
  remoteProfileId
}) {
  if (!isTreeholeProfileKey(localProfileId) || localProfileId !== ownerProfileId) {
    return false;
  }
  return canGrantTreeholeWriter({
    ownerProfileId,
    policy,
    writerProfileId: remoteProfileId
  });
}
function isTreeholeIdentity(identity) {
  if (!identity || typeof identity !== "object") {
    return false;
  }
  const value = identity;
  return isTreeholeProfileKey(value.publicKey) && typeof value.secretKey === "string" && SECRET_PATTERN.test(value.secretKey);
}
function isTreeholeProfileKey(value) {
  return typeof value === "string" && KEY_PATTERN5.test(value);
}
var KEY_PATTERN5, SECRET_PATTERN;
var init_treehole_policy = __esm({
  "src/treehole-policy.ts"() {
    "use strict";
    KEY_PATTERN5 = /^[0-9a-f]{64}$/;
    SECRET_PATTERN = /^[0-9a-f]{128}$/;
  }
});

// src/treehole-base.js
async function createTreeholeBase({
  identity = null,
  mode = "prototype",
  storage,
  bootstrapKey = null,
  nick = "anon",
  profileId = null,
  treeholeOwnerProfileId = null,
  treeholePolicy = null
} = {}) {
  const signedMode = mode === "signed";
  if (mode !== "prototype" && !signedMode) {
    throw new Error("Unsupported treehole mode");
  }
  if (signedMode && !identity) {
    throw new Error("Signed treehole mode requires an identity");
  }
  const ownerProfileId = treeholeOwnerProfileId || profileId || identity?.publicKey || null;
  const signedPolicy = signedMode ? createSignedTreeholePolicy({ ownerProfileId, treeholePolicy }) : null;
  const store = new import_corestore.default(storage || randomAccessMemory());
  await store.ready();
  const base = new import_autobase.default(store, bootstrapKey ? import_b4a8.default.from(bootstrapKey, "hex") : null, {
    open,
    apply: (nodes, view, host) => apply(nodes, view, host, { ownerProfileId, signedMode }),
    valueEncoding: "json"
  });
  await base.ready();
  async function post({ id, text, createdAt = Date.now() }) {
    if (signedMode) {
      await base.append(
        createSignedTreeholePost({
          authorDisplayName: nick,
          createdAt,
          identity,
          postId: id,
          text,
          treeholeOwnerProfileId: ownerProfileId
        })
      );
      await base.update();
      return;
    }
    await base.append(
      createPostEvent({
        id,
        author: nick,
        authorProfileId: profileId,
        text,
        createdAt
      })
    );
    await base.update();
  }
  async function comment({ id, postId, text, createdAt = Date.now() }) {
    if (signedMode) {
      await base.append(
        createSignedTreeholeComment({
          authorDisplayName: nick,
          commentId: id,
          createdAt,
          identity,
          postId,
          text,
          treeholeOwnerProfileId: ownerProfileId
        })
      );
      await base.update();
      return;
    }
    await base.append(
      createCommentEvent({
        id,
        postId,
        author: nick,
        text,
        createdAt
      })
    );
    await base.update();
  }
  async function like({ postId, createdAt = Date.now(), action = "add" }) {
    if (signedMode) {
      await base.append(
        createSignedTreeholeLike({
          action,
          createdAt,
          identity,
          postId,
          treeholeOwnerProfileId: ownerProfileId
        })
      );
      await base.update();
      return;
    }
    await base.append(
      createLikeEvent({
        postId,
        author: nick,
        createdAt
      })
    );
    await base.update();
  }
  async function deletePost({ postId, createdAt = Date.now() }) {
    assertSignedMode("deletePost");
    await base.append(
      createSignedTreeholePostTombstone({
        createdAt,
        identity,
        postId,
        treeholeOwnerProfileId: ownerProfileId
      })
    );
    await base.update();
  }
  async function deleteComment({ commentId, postId, createdAt = Date.now() }) {
    assertSignedMode("deleteComment");
    await base.append(
      createSignedTreeholeCommentTombstone({
        commentId,
        createdAt,
        identity,
        postId,
        treeholeOwnerProfileId: ownerProfileId
      })
    );
    await base.update();
  }
  async function addWriter(key, { createdAt = Date.now(), profileId: writerProfileId = null } = {}) {
    if (signedMode) {
      if (!writerProfileId) {
        throw new Error("Signed treehole writer grant requires writer profile id");
      }
      await base.append(
        createSignedTreeholeWriterGrant({
          createdAt,
          identity,
          treeholeOwnerProfileId: ownerProfileId,
          writerKey: key,
          writerProfileId
        })
      );
      await base.update();
      return;
    }
    await base.append({
      type: "treehole.writer.add",
      key
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
    if (signedMode) {
      return applySignedTreeholeEvents(await getEvents(), signedPolicy);
    }
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
    deleteComment,
    deletePost,
    getEvents,
    getState,
    key: import_b4a8.default.toString(base.key, "hex"),
    like,
    localWriterKey: import_b4a8.default.toString(base.local.key, "hex"),
    post,
    replicate: (...args) => base.replicate(...args)
  };
  function assertSignedMode(method) {
    if (!signedMode) {
      throw new Error(`${method} requires signed treehole mode`);
    }
  }
}
function open(store) {
  return store.get({ name: "treehole-events", valueEncoding: "json" });
}
async function apply(nodes, view, host, { ownerProfileId = null, signedMode = false } = {}) {
  for (const node of nodes) {
    const event = node.value;
    if (!event) {
      continue;
    }
    if (event.type === "treehole.writer.add") {
      if (signedMode) {
        continue;
      }
      await host.addWriter(import_b4a8.default.from(event.key, "hex"), { indexer: true });
      continue;
    }
    if (event.type === "treehole.writer.grant.v1") {
      if (signedMode && event.treeholeOwnerProfileId === ownerProfileId && verifySignedTreeholeEvent(event)) {
        await host.addWriter(import_b4a8.default.from(event.writerKey, "hex"), { indexer: true });
        await view.append(event);
      }
      continue;
    }
    await view.append(event);
  }
}
function randomAccessMemory() {
  throw new Error("Treehole storage path is required");
}
var import_autobase, import_corestore, import_b4a8;
var init_treehole_base = __esm({
  "src/treehole-base.js"() {
    "use strict";
    import_autobase = __toESM(require("autobase"), 1);
    import_corestore = __toESM(require("corestore"), 1);
    import_b4a8 = __toESM(require("b4a"), 1);
    init_treehole_state();
    init_treehole_signed_events();
    init_treehole_policy();
  }
});

// src/treehole-storage.ts
function createTreeholeStoragePath({
  basePath,
  bootstrapKey = null,
  roomKey
}) {
  if (!basePath) {
    throw new Error("Treehole storage base path is required");
  }
  if (!roomKey) {
    throw new Error("Treehole room key is required");
  }
  const suffix = bootstrapKey ? bootstrapKey.slice(0, 16) : "host";
  return `${normalizeBasePath(basePath)}/kepos-treehole-${roomKey.slice(0, 16)}-${suffix}`;
}
function normalizeBasePath(basePath) {
  const path2 = basePath.startsWith("file://") ? decodeURI(basePath.slice("file://".length)) : basePath;
  return path2.replace(/\/+$/, "");
}
var init_treehole_storage = __esm({
  "src/treehole-storage.ts"() {
    "use strict";
  }
});

// src/treehole-state-publisher.ts
function createTreeholeStatePublisher({
  clearIntervalFn = clearInterval,
  getSnapshot,
  intervalMs = 1e3,
  onError = () => {
  },
  publish,
  setIntervalFn = setInterval
}) {
  let running = false;
  let stopped = false;
  async function refresh() {
    if (stopped || running) {
      return;
    }
    running = true;
    try {
      const snapshot = await getSnapshot();
      if (!stopped) {
        publish(snapshot);
      }
    } catch (error) {
      if (!stopped) {
        onError(error);
      }
    } finally {
      running = false;
    }
  }
  const intervalId = setIntervalFn(refresh, intervalMs);
  refresh();
  return {
    stop() {
      stopped = true;
      clearIntervalFn(intervalId);
    }
  };
}
var init_treehole_state_publisher = __esm({
  "src/treehole-state-publisher.ts"() {
    "use strict";
  }
});

// src/treehole-view.ts
function serializeTreeholeState(state) {
  return {
    posts: (state.posts || []).map((post) => ({
      ...post,
      comments: state.commentsByPost?.get(post.id) || []
    }))
  };
}
var init_treehole_view = __esm({
  "src/treehole-view.ts"() {
    "use strict";
  }
});

// src/desktop-treehole-runtime.js
function createDesktopTreeholeRuntime({
  createPublisher = createTreeholeStatePublisher,
  createSwarm = () => new import_hyperswarm3.default(),
  createTreehole = createTreeholeBase,
  homeDir = defaultDesktopTreeholeStorageBase,
  onError = () => {
  },
  onStateChanged = () => {
  },
  storageBasePath = null,
  serialize = serializeTreeholeState
} = {}) {
  let session = null;
  let homeJoinDetails = null;
  let treehole = null;
  let treeholeOpening = null;
  let treeholeSwarm = null;
  let treeholeStatePublisher = null;
  const addedWriters = /* @__PURE__ */ new Set();
  function configure(nextContext) {
    session = nextContext?.session || null;
    homeJoinDetails = nextContext?.homeJoinDetails || null;
  }
  function open2({ bootstrapKey = null, initialPosts = [], initialStatus = "ready" } = {}) {
    if (treehole) return;
    if (treeholeOpening) return treeholeOpening;
    if (!session) return;
    treeholeOpening = openOnce({ bootstrapKey, initialPosts, initialStatus }).finally(() => {
      treeholeOpening = null;
    });
    return treeholeOpening;
  }
  async function openOnce({ bootstrapKey, initialPosts, initialStatus }) {
    treehole = await createTreehole(
      createTreeholeSessionOptions({
        bootstrapKey,
        identity: homeJoinDetails?.identity,
        nick: session.nick,
        ownerProfileId: getOwnerProfileId(),
        profileId: session.profileId,
        storage: treeholeStoragePath(session.roomKey, bootstrapKey),
        treeholePolicy: homeJoinDetails?.treeholePolicy
      })
    );
    treeholeSwarm = createSwarm();
    treeholeSwarm.on("connection", (socket) => {
      treehole?.replicate(socket);
    });
    const discovery = treeholeSwarm.join(treehole.base.discoveryKey, {
      client: true,
      server: true
    });
    discovery.flushed().catch((error) => {
      onError(new Error(`Treehole replication unavailable: ${error.message}`));
    });
    startPublisher();
    onStateChanged({ canPost: canPost(), posts: initialPosts, status: initialStatus });
  }
  async function close() {
    treeholeOpening = null;
    await treeholeSwarm?.destroy();
    treeholeSwarm = null;
    treeholeStatePublisher?.stop();
    treeholeStatePublisher = null;
    await treehole?.close();
    treehole = null;
    addedWriters.clear();
  }
  async function post(payload) {
    const text = cleanText4(payload?.text);
    if (!treehole || !text || !canPost()) return;
    await treehole.post({ ...payload, text });
    await publishSnapshot();
  }
  async function comment(payload) {
    const text = cleanText4(payload?.text);
    if (!treehole || !text) return;
    await treehole.comment({ ...payload, text });
    await publishSnapshot();
  }
  async function like(payload) {
    if (!treehole) return;
    await treehole.like(payload);
    await publishSnapshot();
  }
  async function publishSnapshot() {
    if (!treehole) return;
    const treeholeState = await treehole.getState();
    const snapshot = serialize(treeholeState);
    onStateChanged({ canPost: canPost(), posts: snapshot.posts, status: "ready" });
  }
  function createBootstrapControl(remoteProfileId) {
    if (!treehole || !session || homeJoinDetails?.ownerProfileId !== session.profileId) {
      return null;
    }
    if (!canShareTreeholeBootstrap({
      localProfileId: session.profileId,
      ownerProfileId: session.profileId,
      policy: homeJoinDetails?.treeholePolicy,
      remoteProfileId
    })) {
      return null;
    }
    return {
      key: treehole.key,
      ownerProfileId: session.profileId,
      type: "treehole.bootstrap"
    };
  }
  function createWriterControl() {
    if (!treehole || !session) return null;
    return {
      key: treehole.localWriterKey,
      profileId: session.profileId,
      type: "treehole.writer"
    };
  }
  async function addWriter(message) {
    if (!treehole || addedWriters.has(message.key)) return false;
    if (!canGrantTreeholeWriter({
      ownerProfileId: getOwnerProfileId(),
      policy: homeJoinDetails?.treeholePolicy,
      writerProfileId: message.profileId
    })) {
      return false;
    }
    addedWriters.add(message.key);
    await treehole.addWriter(message.key, { profileId: message.profileId });
    await publishSnapshot();
    return true;
  }
  function hasTreehole() {
    return Boolean(treehole);
  }
  function canPost() {
    if (!session) return true;
    const ownerProfileId = homeJoinDetails?.ownerProfileId;
    return !ownerProfileId || ownerProfileId === session.profileId;
  }
  function getOwnerProfileId() {
    return homeJoinDetails?.ownerProfileId || session?.profileId;
  }
  function startPublisher() {
    treeholeStatePublisher?.stop();
    treeholeStatePublisher = createPublisher({
      getSnapshot: async () => {
        const treeholeState = await treehole.getState();
        return serialize(treeholeState);
      },
      onError: (error) => onError(new Error(`Treehole state unavailable: ${error.message}`)),
      publish: (snapshot) => {
        onStateChanged({ canPost: canPost(), posts: snapshot.posts, status: "ready" });
      }
    });
  }
  function treeholeStoragePath(roomKey, bootstrapKey) {
    return createTreeholeStoragePath({
      basePath: storageBasePath || homeDir(),
      bootstrapKey,
      roomKey
    });
  }
  return {
    addWriter,
    canPost,
    close,
    configure,
    createBootstrapControl,
    createWriterControl,
    hasTreehole,
    like,
    open: open2,
    post,
    comment,
    publishSnapshot
  };
}
function defaultDesktopTreeholeStorageBase() {
  const env = globalThis.process?.env || {};
  const home = env.HOME || env.USERPROFILE;
  if (home) return home;
  throw new Error("Desktop treehole storage base path is required");
}
function cleanText4(text) {
  return typeof text === "string" ? text.trim() : "";
}
var import_hyperswarm3;
var init_desktop_treehole_runtime = __esm({
  "src/desktop-treehole-runtime.js"() {
    "use strict";
    import_hyperswarm3 = __toESM(require("hyperswarm"), 1);
    init_treehole_base();
    init_treehole_policy();
    init_treehole_storage();
    init_treehole_state_publisher();
    init_treehole_view();
  }
});

// src/desktop-backend-runtime.js
function createDesktopBackendRuntime({
  createDirectTransport = null,
  createDmRuntime = createDesktopDmRuntime,
  createHomeRuntime = createDesktopHomeRuntime,
  createTreeholeRuntime = createDesktopTreeholeRuntime,
  emit = () => {
  },
  onDmSessionChanged = () => {
  },
  onHomeDebugState = () => {
  },
  onHomeControl = () => {
  },
  onHomeSessionChanged = () => {
  },
  onTreeholeStateChanged = () => {
  },
  onVerifiedHello = () => {
  },
  storageBasePath = null
} = {}) {
  const dm = createDmRuntime({
    onSessionChanged: (session) => {
      emit("dmMessageReceived", session);
      onDmSessionChanged(session);
    }
  });
  const home = createHomeRuntime({
    createDirectTransport,
    onControl: onHomeControl,
    onDebugState: (debug) => {
      emit("transportDebugChanged", debug);
      onHomeDebugState(debug);
    },
    onError: (error) => emit("errorReceived", error),
    onPeerCount: (peers) => emit("peerCountChanged", { peers }),
    onSessionChanged: (session) => {
      emit("homeMessageReceived", session);
      onHomeSessionChanged(session);
    },
    onVerifiedHello
  });
  const treehole = createTreeholeRuntime({
    onError: (error) => emit("errorReceived", error),
    onStateChanged: (snapshot) => {
      emit("treeholeStateChanged", snapshot);
      onTreeholeStateChanged(snapshot);
      home.broadcastControl({
        snapshot,
        type: "treehole.state.v1"
      });
    },
    storageBasePath
  });
  function configure(context) {
    home.configure(context);
    treehole.configure(context);
  }
  async function closeAll() {
    return await Promise.all([dm.closeAll(), home.leave(), treehole.close()]);
  }
  return {
    closeAll,
    configure,
    dm,
    home,
    treehole
  };
}
var init_desktop_backend_runtime = __esm({
  "src/desktop-backend-runtime.js"() {
    "use strict";
    init_desktop_dm_runtime();
    init_desktop_home_runtime();
    init_desktop_treehole_runtime();
  }
});

// src/desktop-command-registry.ts
function createDesktopCommandRegistry({
  handlers
}) {
  for (const command of DESKTOP_COMMANDS) {
    if (typeof handlers[command] !== "function") {
      throw new Error(`Missing desktop command handler: ${command}`);
    }
  }
  return {
    commands: DESKTOP_COMMANDS,
    async dispatch(command, payload) {
      if (!isDesktopCommand(command)) {
        throw new Error(`Unknown desktop command: ${command}`);
      }
      return await handlers[command]?.(payload);
    }
  };
}
var init_desktop_command_registry = __esm({
  "src/desktop-command-registry.ts"() {
    "use strict";
    init_desktop_command_vocabulary();
  }
});

// src/desktop-command-host.js
function createDesktopCommandHost({ actions }) {
  for (const command of DESKTOP_COMMANDS) {
    if (typeof actions?.[command] !== "function") {
      throw new Error(`Missing desktop command action: ${command}`);
    }
  }
  return createDesktopCommandRegistry({
    handlers: {
      acceptMessageRequest: (payload) => {
        const { message } = readCommandPayload(payload);
        if (message) return actions.acceptMessageRequest(message);
      },
      commentTreehole: (payload) => actions.commentTreehole(readCommandPayload(payload)),
      ignoreMessageRequest: (payload) => {
        const { message, profileId } = readCommandPayload(payload);
        return actions.ignoreMessageRequest({ message, profileId });
      },
      joinHome: (payload) => actions.joinHome(readCommandPayload(payload)),
      joinHomeUri: (payload) => actions.joinHomeUri(readCommandPayload(payload)),
      leaveHome: () => actions.leaveHome(),
      likeTreehole: (payload) => {
        const { postId } = readCommandPayload(payload);
        if (postId) return actions.likeTreehole(postId);
      },
      postTreehole: (payload) => actions.postTreehole(readCommandPayload(payload)),
      revokeContact: (payload) => {
        const { profileId } = readCommandPayload(payload);
        if (profileId) return actions.revokeContact(profileId);
      },
      sendDmMessage: (payload) => actions.sendDmMessage(readCommandPayload(payload)),
      sendHomeMessage: (payload) => actions.sendHomeMessage(readCommandPayload(payload)),
      sendMessageRequest: () => actions.sendMessageRequest(),
      trustProfileUri: (payload) => actions.trustProfileUri(readCommandPayload(payload)),
      updateDisplayName: (payload) => actions.updateDisplayName(readCommandPayload(payload))
    }
  });
}
function readCommandPayload(payload) {
  return payload && typeof payload === "object" ? payload : {};
}
var init_desktop_command_host = __esm({
  "src/desktop-command-host.js"() {
    "use strict";
    init_desktop_command_vocabulary();
    init_desktop_command_registry();
  }
});

// src/desktop-local-backend-host.js
function createDesktopLocalBackendHost({
  actions,
  createBackendBridge = createDesktopBackendBridge,
  createBackendRuntime = createDesktopBackendRuntime,
  createCommandHost = createDesktopCommandHost,
  runtimeOptions = {}
}) {
  const commands = createCommandHost({ actions });
  const bridge = createBackendBridge({
    dispatch: (command, payload) => commands.dispatch(command, payload)
  });
  const runtime = createBackendRuntime({
    ...runtimeOptions,
    emit: (event, payload) => bridge.emit(event, payload)
  });
  return {
    bridge,
    commands,
    dmRuntime: runtime.dm,
    homeRuntime: runtime.home,
    runtime,
    treeholeRuntime: runtime.treehole
  };
}
var init_desktop_local_backend_host = __esm({
  "src/desktop-local-backend-host.js"() {
    "use strict";
    init_desktop_backend_bridge();
    init_desktop_backend_runtime();
    init_desktop_command_host();
  }
});

// src/desktop-message-actions.js
function createDesktopMessageActions({
  createId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
  getDmRuntime = () => null,
  getDmSession = () => null,
  getHomeRuntime = () => null,
  getSession = () => null,
  getTreeholeCanPost = () => false,
  getTreeholeRuntime = () => null,
  now = () => Date.now(),
  onChanged = () => {
  },
  setSession = () => {
  }
} = {}) {
  return {
    async commentTreehole({ postId, text } = {}) {
      const cleanText5 = cleanMessageText(text);
      if (!cleanText5) return;
      await getTreeholeRuntime()?.comment({
        createdAt: now(),
        id: createId(),
        postId,
        text: cleanText5
      });
    },
    async likeTreehole(postId) {
      await getTreeholeRuntime()?.like({
        createdAt: now(),
        postId
      });
    },
    async postTreehole({ text } = {}) {
      const cleanText5 = cleanMessageText(text);
      if (!cleanText5 || !getTreeholeCanPost()) return;
      await getTreeholeRuntime()?.post({
        createdAt: now(),
        id: createId(),
        text: cleanText5
      });
    },
    sendDmMessage({ text, toProfileId } = {}) {
      const cleanText5 = cleanMessageText(text);
      const homeRuntime = getHomeRuntime();
      const dmRuntime = getDmRuntime();
      if (!homeRuntime?.isJoined() || !getDmSession() || !toProfileId || !cleanText5) return;
      const result = dmRuntime?.sendMessageOrRequest({
        broadcastControl: (request) => homeRuntime.broadcastControl(request),
        createdAt: now(),
        messageId: createId(),
        requestId: createId(),
        text: cleanText5,
        toProfileId
      });
      if (!result) return;
      if (result.kind === "message") {
        homeRuntime.broadcastControl({
          message: result.message,
          type: "kepos.dm.body.v1"
        });
      }
      onChanged();
    },
    sendHomeMessage({ text } = {}) {
      const cleanText5 = cleanMessageText(text);
      const homeRuntime = getHomeRuntime();
      const session = getSession();
      if (!homeRuntime?.isJoined() || !session || !cleanText5) return;
      const nextSession = homeRuntime.sendMessage({
        at: now(),
        id: createId(),
        text: cleanText5
      });
      setSession(nextSession);
      onChanged();
    }
  };
}
function cleanMessageText(text) {
  return typeof text === "string" ? text.trim() : "";
}
var init_desktop_message_actions = __esm({
  "src/desktop-message-actions.js"() {
    "use strict";
  }
});

// src/desktop-message-request-service.js
async function createDesktopMessageRequestAcceptance({
  acceptMessageRequest: acceptMessageRequest2,
  acceptedAt,
  book,
  message,
  threadId
}) {
  const remoteProfileId = message?.fromProfileId;
  if (!remoteProfileId) return null;
  const result = await acceptMessageRequest2({
    acceptedAt,
    book,
    remoteProfileId,
    threadId
  });
  if (!result) return null;
  return {
    book: result.book,
    invite: result.invite
  };
}
function createDesktopMessageRequestIgnore({
  book,
  hasDmSession = false,
  message = null,
  profileId = ""
}) {
  const requestProfileId = profileId || message?.fromProfileId || message?.profileId;
  if (!requestProfileId) return null;
  return {
    book: ignoreMessageRequest(book, { profileId: requestProfileId }),
    dismissedMessageId: hasDmSession && message?.id ? message.id : ""
  };
}
var init_desktop_message_request_service = __esm({
  "src/desktop-message-request-service.js"() {
    "use strict";
    init_contact_book();
  }
});

// src/desktop-message-request-actions.js
function createDesktopMessageRequestActions({
  acceptMessageRequest: acceptMessageRequest2 = createDesktopMessageRequestAcceptance,
  createId,
  getDmRuntime,
  getDmSession,
  getHomeRuntime,
  getProfileContext,
  ignoreMessageRequest: ignoreMessageRequest2 = createDesktopMessageRequestIgnore,
  now = () => Date.now(),
  onChanged = () => {
  },
  setNotice
}) {
  async function acceptIncomingMessageRequest(message) {
    const homeRuntime = getHomeRuntime();
    const dmSession = getDmSession();
    if (!homeRuntime.isJoined() || !dmSession) return;
    const context = getProfileContext();
    const result = await acceptMessageRequest2({
      acceptMessageRequest: (payload) => getDmRuntime().acceptMessageRequest(payload),
      acceptedAt: now(),
      book: context.contactBook,
      message,
      threadId: createId()
    });
    if (!result) return;
    context.saveContactBook(result.book);
    homeRuntime.broadcastControl(result.invite);
    setNotice("Message request accepted.");
    onChanged();
  }
  function ignoreIncomingMessageRequest({ message = null, profileId = "" } = {}) {
    const context = getProfileContext();
    const result = ignoreMessageRequest2({
      book: context.contactBook,
      hasDmSession: Boolean(getDmSession()),
      message,
      profileId
    });
    if (!result) return;
    context.saveContactBook(result.book);
    if (result.dismissedMessageId) {
      getDmRuntime().dismissMessage({ id: result.dismissedMessageId });
    }
    setNotice("Message request ignored.");
    onChanged();
  }
  return {
    acceptMessageRequest: acceptIncomingMessageRequest,
    ignoreMessageRequest: ignoreIncomingMessageRequest
  };
}
var init_desktop_message_request_actions = __esm({
  "src/desktop-message-request-actions.js"() {
    "use strict";
    init_desktop_message_request_service();
  }
});

// src/home-session.ts
function createHomeJoinSession({
  profile,
  nick
}) {
  const homeRoom = profile?.homeRoom;
  if (!homeRoom?.ownerProfileId) {
    throw new Error("Home owner profile id is required");
  }
  if (!isRoomKey4(homeRoom.roomKey)) {
    throw new Error("Invalid home room key");
  }
  return createJoinSession({
    address: homeRoom.address,
    identity: profile.identity,
    nick,
    ownerProfileId: homeRoom.ownerProfileId,
    policy: homeRoom.policy,
    profileId: profile.id,
    roomKey: homeRoom.roomKey
  });
}
function createManualHomeJoinSession({
  identity = null,
  nick,
  ownerProfileId = null,
  policy = "trusted_only",
  profileId = null,
  roomKey
}) {
  if (!isRoomKey4(roomKey)) {
    throw new Error("Invalid room key");
  }
  return createJoinSession({
    address: roomKey,
    identity,
    nick,
    ownerProfileId: ownerProfileId?.trim() || null,
    policy,
    profileId,
    roomKey
  });
}
function createHomeJoinSessionFromAddress({
  address,
  identity = null,
  nick,
  ownerProfileId,
  policy = "trusted_only",
  profileId = null,
  roomKey
}) {
  if (!isRoomKey4(roomKey)) {
    throw new Error("Invalid room key");
  }
  return createJoinSession({
    address,
    identity,
    nick,
    ownerProfileId: ownerProfileId?.trim() || null,
    policy,
    profileId,
    roomKey
  });
}
function createJoinSession({
  address,
  identity,
  nick,
  ownerProfileId,
  policy,
  profileId,
  roomKey
}) {
  return {
    address,
    identity,
    ownerProfileId,
    policy,
    profileId: profileId?.trim() || null,
    roomKey,
    session: createChatSession({
      nick,
      profileId,
      roomKey
    })
  };
}
function isRoomKey4(value) {
  return typeof value === "string" && ROOM_KEY_PATTERN4.test(value);
}
var ROOM_KEY_PATTERN4;
var init_home_session = __esm({
  "src/home-session.ts"() {
    "use strict";
    init_chat_session();
    ROOM_KEY_PATTERN4 = /^[0-9a-f]{64}$/;
  }
});

// src/desktop-home-join-service.js
function createDesktopHomeJoinDetails({
  contactBook,
  homeAddress = null,
  mode,
  nick,
  profile,
  roomKey = ""
}) {
  const treeholePolicy = createTreeholePolicyFromContactBook(contactBook);
  const homeJoin = homeAddress ? createHomeJoinSessionFromAddress({
    address: homeAddress.address,
    identity: profile.identity,
    nick,
    ownerProfileId: homeAddress.ownerProfileId,
    policy: homeAddress.policy,
    profileId: profile.id,
    roomKey: homeAddress.roomKey
  }) : roomKey ? createManualHomeJoinSession({
    identity: profile.identity,
    nick,
    profileId: profile.id,
    roomKey
  }) : createHomeJoinSession({ nick, profile });
  return {
    homeJoinDetails: { ...homeJoin, treeholePolicy },
    mode,
    session: homeJoin.session
  };
}
var init_desktop_home_join_service = __esm({
  "src/desktop-home-join-service.js"() {
    "use strict";
    init_contact_book_storage();
    init_home_session();
  }
});

// src/signed-qr-payload.ts
function createSignedTrustInvitePayload({
  createdAt = Date.now(),
  displayName,
  expiresAt = null,
  identity
}) {
  const payload = cleanTrustInvitePayload({
    displayName,
    expiresAt,
    identityPublicKey: identity?.publicKey,
    profileId: identity?.publicKey
  });
  const signed = createSignedRecord({
    createdAt,
    identity,
    payload,
    payloadEncoding: trustInvitePayloadEncoding,
    type: TRUST_INVITE,
    version: RECORD_VERSION3
  });
  return {
    type: TRUST_INVITE,
    ...payload,
    createdAt,
    proof: proofFromSignedRecord(signed)
  };
}
function verifySignedTrustInvitePayload(payload, { now = Date.now() } = {}) {
  try {
    const value = asRecord4(payload);
    const cleanPayload = cleanTrustInvitePayload(value);
    if (isExpired(cleanPayload.expiresAt, now)) {
      return false;
    }
    if (!hasMatchingProof(value, TRUST_INVITE, cleanPayload.profileId)) {
      return false;
    }
    return verifySignedRecord({
      payloadEncoding: trustInvitePayloadEncoding,
      record: recordFromPayload({ payload: value, signedPayload: cleanPayload })
    });
  } catch {
    return false;
  }
}
function createSignedHomeAddressPayload({
  address,
  createdAt = Date.now(),
  expiresAt = null,
  identity,
  policy = "trusted_only",
  roomKey
}) {
  const payload = cleanHomeAddressPayload({
    address,
    expiresAt,
    ownerProfileId: identity?.publicKey,
    policy,
    roomKey
  });
  const signed = createSignedRecord({
    createdAt,
    identity,
    payload,
    payloadEncoding: homeAddressPayloadEncoding,
    type: HOME_ADDRESS,
    version: RECORD_VERSION3
  });
  return {
    type: HOME_ADDRESS,
    ...payload,
    createdAt,
    proof: proofFromSignedRecord(signed)
  };
}
function verifySignedHomeAddressPayload(payload, { now = Date.now() } = {}) {
  try {
    const value = asRecord4(payload);
    const cleanPayload = cleanHomeAddressPayload(value);
    if (isExpired(cleanPayload.expiresAt, now)) {
      return false;
    }
    if (!hasMatchingProof(value, HOME_ADDRESS, cleanPayload.ownerProfileId)) {
      return false;
    }
    return verifySignedRecord({
      payloadEncoding: homeAddressPayloadEncoding,
      record: recordFromPayload({ payload: value, signedPayload: cleanPayload })
    });
  } catch {
    return false;
  }
}
function encodeQrUri(payload) {
  const route = routeForPayload(payload);
  const encodedPayload = encodeURIComponent(JSON.stringify(payload));
  return `kepos://${route}?v=${QR_VERSION}&payload=${encodedPayload}`;
}
function decodeQrUri(uri) {
  try {
    const parsed = new URL(uri);
    if (parsed.protocol !== "kepos:" || parsed.searchParams.get("v") !== QR_VERSION) {
      throw new Error("Invalid QR URI");
    }
    const payload = JSON.parse(decodeURIComponent(parsed.searchParams.get("payload") || ""));
    const route = routeForPayload(payload);
    if (parsed.hostname !== route) {
      throw new Error("Invalid QR route");
    }
    return payload;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Invalid")) {
      throw error;
    }
    throw new Error("Invalid QR URI");
  }
}
function proofFromSignedRecord(record) {
  return {
    createdAt: record.createdAt,
    signature: record.signature,
    signerProfileId: record.signerProfileId,
    type: record.type,
    version: record.version
  };
}
function recordFromPayload({
  payload,
  signedPayload
}) {
  const proof = asRecord4(payload.proof);
  return {
    createdAt: cleanTimestamp3(payload.createdAt),
    payload: signedPayload,
    signature: cleanString5(proof.signature, "Signature is required"),
    signerProfileId: cleanString5(proof.signerProfileId, "Signer profile id is required"),
    type: cleanString5(proof.type, "Signed record type is required"),
    version: cleanVersion2(proof.version)
  };
}
function hasMatchingProof(payload, type, signerProfileId) {
  const proof = payload.proof;
  return payload.type === type && !!proof && typeof proof === "object" && proof.type === type && proof.version === RECORD_VERSION3 && proof.createdAt === payload.createdAt && proof.signerProfileId === signerProfileId;
}
function routeForPayload(payload) {
  const value = asRecord4(payload);
  if (value.type === TRUST_INVITE) {
    return PROFILE_ROUTE;
  }
  if (value.type === HOME_ADDRESS) {
    return HOME_ROUTE;
  }
  if (value.type === MESSAGE_REQUEST) {
    return MESSAGE_REQUEST_ROUTE;
  }
  throw new Error("Invalid QR payload");
}
function cleanTrustInvitePayload(payload = {}) {
  const profileId = cleanKey4(payload.profileId, "Profile id is required");
  const identityPublicKey = cleanKey4(payload.identityPublicKey, "Identity public key is required");
  if (profileId !== identityPublicKey) {
    throw new Error("Invalid trust invite identity");
  }
  return {
    displayName: cleanString5(payload.displayName, "Display name is required"),
    expiresAt: cleanOptionalTimestamp(payload.expiresAt),
    identityPublicKey,
    profileId
  };
}
function cleanHomeAddressPayload(payload = {}) {
  const policy = cleanHomePolicy(payload.policy || "trusted_only");
  return {
    address: cleanKey4(payload.address, "Home address is required"),
    expiresAt: cleanOptionalTimestamp(payload.expiresAt),
    ownerProfileId: cleanKey4(payload.ownerProfileId, "Home owner profile id is required"),
    policy,
    roomKey: cleanKey4(payload.roomKey, "Home room key is required")
  };
}
function cleanHomePolicy(value) {
  if (!isHomePolicy(value)) {
    throw new Error("Invalid home policy");
  }
  return value;
}
function asRecord4(value) {
  if (!value || typeof value !== "object") {
    throw new Error("Expected object");
  }
  return value;
}
function cleanKey4(value, message) {
  const cleaned = cleanString5(value, message);
  if (!KEY_PATTERN6.test(cleaned)) {
    throw new Error("Invalid key");
  }
  return cleaned;
}
function cleanString5(value, message) {
  const cleaned = typeof value === "string" ? value.trim() : "";
  if (!cleaned) {
    throw new Error(message);
  }
  return cleaned;
}
function cleanTimestamp3(value) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error("Invalid timestamp");
  }
  return value;
}
function cleanOptionalTimestamp(value) {
  if (value === void 0 || value === null) {
    return null;
  }
  return cleanTimestamp3(value);
}
function isExpired(expiresAt, now) {
  if (expiresAt === null) {
    return false;
  }
  return cleanTimestamp3(now) >= expiresAt;
}
function cleanVersion2(value) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error("Invalid signed record version");
  }
  return value;
}
var import_compact_encoding7, TRUST_INVITE, HOME_ADDRESS, MESSAGE_REQUEST, PROFILE_ROUTE, HOME_ROUTE, MESSAGE_REQUEST_ROUTE, QR_VERSION, RECORD_VERSION3, KEY_PATTERN6, trustInvitePayloadEncoding, homeAddressPayloadEncoding;
var init_signed_qr_payload = __esm({
  "src/signed-qr-payload.ts"() {
    "use strict";
    import_compact_encoding7 = __toESM(require("compact-encoding"), 1);
    init_home_room();
    init_signed_record();
    TRUST_INVITE = "kepos.trust.invite.v1";
    HOME_ADDRESS = "kepos.home.address.v1";
    MESSAGE_REQUEST = "kepos.message.request.v1";
    PROFILE_ROUTE = "profile";
    HOME_ROUTE = "home";
    MESSAGE_REQUEST_ROUTE = "message-request";
    QR_VERSION = "1";
    RECORD_VERSION3 = 1;
    KEY_PATTERN6 = /^[0-9a-f]{64}$/;
    trustInvitePayloadEncoding = {
      preencode(state, payload) {
        import_compact_encoding7.default.string.preencode(state, payload.profileId);
        import_compact_encoding7.default.string.preencode(state, payload.identityPublicKey);
        import_compact_encoding7.default.string.preencode(state, payload.displayName);
        import_compact_encoding7.default.bool.preencode(state, payload.expiresAt !== null);
        if (payload.expiresAt !== null) {
          import_compact_encoding7.default.uint.preencode(state, payload.expiresAt);
        }
      },
      encode(state, payload) {
        import_compact_encoding7.default.string.encode(state, payload.profileId);
        import_compact_encoding7.default.string.encode(state, payload.identityPublicKey);
        import_compact_encoding7.default.string.encode(state, payload.displayName);
        import_compact_encoding7.default.bool.encode(state, payload.expiresAt !== null);
        if (payload.expiresAt !== null) {
          import_compact_encoding7.default.uint.encode(state, payload.expiresAt);
        }
      },
      decode(state) {
        const profileId = import_compact_encoding7.default.string.decode(state);
        const identityPublicKey = import_compact_encoding7.default.string.decode(state);
        const displayName = import_compact_encoding7.default.string.decode(state);
        const hasExpiresAt = import_compact_encoding7.default.bool.decode(state);
        return {
          profileId,
          identityPublicKey,
          displayName,
          expiresAt: hasExpiresAt ? import_compact_encoding7.default.uint.decode(state) : null
        };
      }
    };
    homeAddressPayloadEncoding = {
      preencode(state, payload) {
        import_compact_encoding7.default.string.preencode(state, payload.ownerProfileId);
        import_compact_encoding7.default.string.preencode(state, payload.address);
        import_compact_encoding7.default.string.preencode(state, payload.roomKey);
        import_compact_encoding7.default.string.preencode(state, payload.policy);
        import_compact_encoding7.default.bool.preencode(state, payload.expiresAt !== null);
        if (payload.expiresAt !== null) {
          import_compact_encoding7.default.uint.preencode(state, payload.expiresAt);
        }
      },
      encode(state, payload) {
        import_compact_encoding7.default.string.encode(state, payload.ownerProfileId);
        import_compact_encoding7.default.string.encode(state, payload.address);
        import_compact_encoding7.default.string.encode(state, payload.roomKey);
        import_compact_encoding7.default.string.encode(state, payload.policy);
        import_compact_encoding7.default.bool.encode(state, payload.expiresAt !== null);
        if (payload.expiresAt !== null) {
          import_compact_encoding7.default.uint.encode(state, payload.expiresAt);
        }
      },
      decode(state) {
        const ownerProfileId = import_compact_encoding7.default.string.decode(state);
        const address = import_compact_encoding7.default.string.decode(state);
        const roomKey = import_compact_encoding7.default.string.decode(state);
        const policy = cleanHomePolicy(import_compact_encoding7.default.string.decode(state));
        const hasExpiresAt = import_compact_encoding7.default.bool.decode(state);
        return {
          ownerProfileId,
          address,
          roomKey,
          policy,
          expiresAt: hasExpiresAt ? import_compact_encoding7.default.uint.decode(state) : null
        };
      }
    };
  }
});

// src/trust-grant.ts
function createTrustGrant({
  createdAt = Date.now(),
  ownerIdentity,
  revokedAt = null,
  trustedProfileId
}) {
  const payload = cleanTrustGrantPayload({
    ownerProfileId: ownerIdentity?.publicKey,
    revokedAt,
    scope: TRUST_SCOPE_HOME2,
    trustedProfileId
  });
  const signed = createSignedRecord({
    createdAt,
    identity: ownerIdentity,
    payload,
    payloadEncoding: trustGrantPayloadEncoding,
    type: TRUST_GRANT_TYPE,
    version: TRUST_GRANT_VERSION
  });
  return {
    ...payload,
    createdAt,
    proof: {
      createdAt: signed.createdAt,
      signature: signed.signature,
      signerProfileId: signed.signerProfileId,
      type: signed.type,
      version: signed.version
    }
  };
}
function verifyTrustGrant(grant) {
  try {
    const value = asRecord5(grant);
    const proof = asRecord5(value.proof);
    const payload = cleanTrustGrantPayload({
      ownerProfileId: value.ownerProfileId,
      revokedAt: value.revokedAt ?? null,
      scope: value.scope,
      trustedProfileId: value.trustedProfileId
    });
    if (proof.type !== TRUST_GRANT_TYPE || proof.version !== TRUST_GRANT_VERSION || proof.signerProfileId !== payload.ownerProfileId || proof.createdAt !== value.createdAt) {
      return false;
    }
    return verifySignedRecord({
      payloadEncoding: trustGrantPayloadEncoding,
      record: {
        createdAt: proof.createdAt,
        payload,
        signature: proof.signature,
        signerProfileId: proof.signerProfileId,
        type: proof.type,
        version: proof.version
      }
    });
  } catch {
    return false;
  }
}
function applyTrustGrantToContactBook(book, {
  alias,
  displayNameSnapshot,
  grant,
  homeAddress,
  homePolicy,
  source
}) {
  if (!verifyTrustGrant(grant) || grant.ownerProfileId !== book?.ownerProfileId) {
    throw new Error("Invalid trust grant");
  }
  return trustContact(book, {
    alias,
    displayNameSnapshot,
    homeAddress,
    homePolicy,
    profileId: grant.trustedProfileId,
    proof: grant.proof,
    source,
    trustedAt: grant.createdAt
  });
}
function cleanTrustGrantPayload({
  ownerProfileId,
  revokedAt,
  scope,
  trustedProfileId
}) {
  return {
    ownerProfileId: cleanKey5(ownerProfileId, "Owner profile id is required"),
    revokedAt: cleanOptionalTimestamp2(revokedAt),
    scope: cleanScope(scope),
    trustedProfileId: cleanKey5(trustedProfileId, "Trusted profile id is required")
  };
}
function asRecord5(value) {
  if (!value || typeof value !== "object") {
    throw new Error("Expected object");
  }
  return value;
}
function cleanKey5(value, message) {
  const cleaned = cleanString6(value, message);
  if (!KEY_PATTERN7.test(cleaned)) {
    throw new Error("Invalid profile id");
  }
  return cleaned;
}
function cleanScope(value) {
  if (value !== TRUST_SCOPE_HOME2) {
    throw new Error("Invalid trust scope");
  }
  return value;
}
function cleanString6(value, message) {
  const cleaned = typeof value === "string" ? value.trim() : "";
  if (!cleaned) {
    throw new Error(message);
  }
  return cleaned;
}
function cleanOptionalTimestamp2(value) {
  if (value === null || value === void 0) {
    return null;
  }
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error("Invalid revoke timestamp");
  }
  return value;
}
var import_compact_encoding8, TRUST_GRANT_TYPE, TRUST_GRANT_VERSION, TRUST_SCOPE_HOME2, KEY_PATTERN7, trustGrantPayloadEncoding;
var init_trust_grant = __esm({
  "src/trust-grant.ts"() {
    "use strict";
    import_compact_encoding8 = __toESM(require("compact-encoding"), 1);
    init_contact_book();
    init_signed_record();
    TRUST_GRANT_TYPE = "kepos.trust.grant.v1";
    TRUST_GRANT_VERSION = 1;
    TRUST_SCOPE_HOME2 = "home";
    KEY_PATTERN7 = /^[0-9a-f]{64}$/;
    trustGrantPayloadEncoding = {
      preencode(state, payload) {
        import_compact_encoding8.default.string.preencode(state, payload.ownerProfileId);
        import_compact_encoding8.default.string.preencode(state, payload.trustedProfileId);
        import_compact_encoding8.default.string.preencode(state, payload.scope);
        import_compact_encoding8.default.bool.preencode(state, payload.revokedAt !== null);
        if (payload.revokedAt !== null) {
          import_compact_encoding8.default.uint.preencode(state, payload.revokedAt);
        }
      },
      encode(state, payload) {
        import_compact_encoding8.default.string.encode(state, payload.ownerProfileId);
        import_compact_encoding8.default.string.encode(state, payload.trustedProfileId);
        import_compact_encoding8.default.string.encode(state, payload.scope);
        import_compact_encoding8.default.bool.encode(state, payload.revokedAt !== null);
        if (payload.revokedAt !== null) {
          import_compact_encoding8.default.uint.encode(state, payload.revokedAt);
        }
      },
      decode(state) {
        const ownerProfileId = import_compact_encoding8.default.string.decode(state);
        const trustedProfileId = import_compact_encoding8.default.string.decode(state);
        const scope = import_compact_encoding8.default.string.decode(state);
        const hasRevokedAt = import_compact_encoding8.default.bool.decode(state);
        return {
          ownerProfileId,
          revokedAt: hasRevokedAt ? import_compact_encoding8.default.uint.decode(state) : null,
          scope: cleanScope(scope),
          trustedProfileId
        };
      }
    };
  }
});

// src/signed-qr-scan.ts
function applySignedQrUriToContactBook({
  alias,
  book,
  localIdentity = null,
  localProfileId = book?.ownerProfileId,
  now = Date.now(),
  source = "profile_qr",
  uri
}) {
  const payload = decodeQrUri(uri);
  if (payload.type === "kepos.trust.invite.v1") {
    if (!verifySignedTrustInvitePayload(payload, { now })) {
      throw new Error("Invalid signed profile QR");
    }
    if (localIdentity) {
      const grant = createTrustGrant({
        createdAt: now,
        ownerIdentity: localIdentity,
        trustedProfileId: payload.profileId
      });
      const nextBook2 = applyTrustGrantToContactBook(book, {
        alias: alias?.trim() || payload.displayName,
        displayNameSnapshot: payload.displayName,
        grant,
        source
      });
      return {
        book: nextBook2,
        kind: "trust",
        profileId: payload.profileId
      };
    }
    const nextBook = trustContact(book, {
      alias: alias?.trim() || payload.displayName,
      displayNameSnapshot: payload.displayName,
      profileId: payload.profileId,
      source,
      trustedAt: payload.createdAt
    });
    return {
      book: nextBook,
      kind: "trust",
      profileId: payload.profileId
    };
  }
  if (payload.type === "kepos.home.address.v1") {
    if (!verifySignedHomeAddressPayload(payload, { now })) {
      throw new Error("Invalid signed home QR");
    }
    return {
      address: payload.address,
      book,
      canEnter: canEnterHomeFromLocalContactBook({
        book,
        localProfileId,
        ownerProfileId: payload.ownerProfileId,
        policy: payload.policy
      }),
      kind: "home",
      ownerProfileId: payload.ownerProfileId,
      policy: payload.policy,
      roomKey: payload.roomKey
    };
  }
  throw new Error("Unsupported signed QR payload");
}
function canEnterHomeFromLocalContactBook({
  book,
  localProfileId,
  ownerProfileId,
  policy
}) {
  if (policy === "public" || localProfileId === ownerProfileId) {
    return true;
  }
  return isContactTrusted(book, ownerProfileId);
}
var init_signed_qr_scan = __esm({
  "src/signed-qr-scan.ts"() {
    "use strict";
    init_contact_book();
    init_signed_qr_payload();
    init_trust_grant();
  }
});

// src/desktop-qr-service.js
function applyDesktopHomeQr({ book, localProfileId, uri }) {
  const result = applySignedQrUriToContactBook({
    book,
    localProfileId,
    uri
  });
  if (result.kind !== "home") {
    throw new Error("Home QR is required");
  }
  if (!result.canEnter) {
    throw new Error("This trusted-only home is not trusted locally");
  }
  return result;
}
function applyDesktopProfileTrustQr({
  alias,
  book,
  localIdentity,
  localProfileId,
  now,
  uri
}) {
  const result = applySignedQrUriToContactBook({
    alias,
    book,
    localIdentity,
    localProfileId,
    now,
    source: "profile_qr",
    uri
  });
  if (result.kind !== "trust") {
    throw new Error("Profile QR is required");
  }
  return {
    book: result.book,
    profileId: result.profileId,
    treeholePolicy: createTreeholePolicyFromContactBook(result.book)
  };
}
async function createDesktopShareQrOutputs({ profile }) {
  const profileUri = encodeQrUri(
    createSignedTrustInvitePayload({
      displayName: profile.displayName,
      identity: profile.identity
    })
  );
  const homeUri = encodeQrUri(
    createSignedHomeAddressPayload({
      address: profile.homeRoom.address,
      identity: profile.identity,
      policy: profile.homeRoom.policy,
      roomKey: profile.homeRoom.roomKey
    })
  );
  const [profileSvg, homeSvg] = await Promise.all([
    renderDesktopQrSvg(profileUri),
    renderDesktopQrSvg(homeUri)
  ]);
  return {
    homeSvg,
    homeUri,
    profileSvg,
    profileUri
  };
}
function renderDesktopQrSvg(value, options = {}) {
  return import_browser.default.toString(value, {
    ...SHARE_QR_OPTIONS,
    ...options
  });
}
var import_browser, SHARE_QR_OPTIONS;
var init_desktop_qr_service = __esm({
  "src/desktop-qr-service.js"() {
    "use strict";
    import_browser = __toESM(require("qrcode/lib/browser.js"), 1);
    init_contact_book_storage();
    init_signed_qr_payload();
    init_signed_qr_scan();
    SHARE_QR_OPTIONS = {
      errorCorrectionLevel: "M",
      margin: 1,
      type: "svg",
      width: 172
    };
  }
});

// src/desktop-state.js
function createDesktopState() {
  return {
    activeTab: "chat",
    messages: [],
    lastError: "",
    mode: null,
    nick: "Desktop",
    notice: "Create or join a home.",
    peers: 0,
    roomKey: "",
    transportDebug: null,
    treeholeCanPost: true,
    treeholePosts: [],
    treeholeStatus: "idle",
    view: "lobby"
  };
}
function setDesktopRoom(state, room) {
  return {
    ...state,
    mode: room.mode,
    nick: room.nick?.trim() || "Desktop",
    peers: room.peers || 0,
    roomKey: room.roomKey,
    view: "room"
  };
}
function setDesktopTreehole(state, treehole) {
  return {
    ...state,
    treeholeCanPost: typeof treehole.canPost === "boolean" ? treehole.canPost : state.treeholeCanPost,
    treeholePosts: treehole.posts || [],
    treeholeStatus: treehole.status || state.treeholeStatus
  };
}
var init_desktop_state = __esm({
  "src/desktop-state.js"() {
    "use strict";
  }
});

// src/desktop-room-actions.js
function createDesktopRoomActions({
  applyHomeQr = applyDesktopHomeQr,
  closeAll,
  configureTreeholeRuntime,
  createHomeJoinDetails = createDesktopHomeJoinDetails,
  createInitialState = createDesktopState,
  getCurrentDisplayName,
  getDmRuntime,
  getDirectTransportConfig = () => null,
  getHomeRuntime,
  getProfileContext,
  getTreeholeRuntime,
  onChanged = () => {
  },
  openTreehole,
  setContextFormDraft = () => {
  },
  setDmSession,
  setHomeJoinDetails,
  setSession,
  updateState
}) {
  async function leaveHome() {
    await closeAll();
    setSession(null);
    setDmSession(null);
    setHomeJoinDetails(null);
    configureTreeholeRuntime();
    updateState(() => createInitialState());
    onChanged();
  }
  async function joinHome({ createTreehole, displayName, homeAddress = null, mode, roomKey } = {}) {
    await leaveHome();
    const nick = displayName?.trim() || getCurrentDisplayName();
    const { contactBook, profile, storage } = getProfileContext(nick);
    const homeJoin = createHomeJoinDetails({
      contactBook,
      homeAddress,
      mode,
      nick,
      profile,
      roomKey
    });
    const directTransport = getDirectTransportConfig({ mode });
    if (directTransport) {
      homeJoin.homeJoinDetails = {
        ...homeJoin.homeJoinDetails,
        directTransport: {
          ...directTransport,
          mode: directTransport.mode || mode
        }
      };
    }
    setContextFormDraft({ roomKey: homeJoin.homeJoinDetails.roomKey });
    setHomeJoinDetails(homeJoin.homeJoinDetails);
    setSession(homeJoin.session);
    configureTreeholeRuntime();
    setDmSession(await getDmRuntime().start({ nick, profile, storage }));
    updateState((state) => {
      const roomState = setDesktopRoom(state, {
        mode: homeJoin.mode,
        nick,
        peers: 0,
        roomKey: homeJoin.homeJoinDetails.roomKey
      });
      return { ...roomState, notice: "Joining home..." };
    });
    onChanged();
    await getHomeRuntime().join({ homeJoinDetails: homeJoin.homeJoinDetails });
    if (createTreehole) {
      await openTreehole();
      getHomeRuntime().requestHomeHello();
    } else {
      updateState(
        (state) => setDesktopTreehole(state, {
          canPost: getTreeholeRuntime().canPost(),
          posts: [],
          status: "waiting-for-bootstrap"
        })
      );
    }
    updateState((state) => ({ ...state, notice: "Home joined." }));
    onChanged();
  }
  async function joinHomeUri({ displayName = "Desktop", uri } = {}) {
    if (!uri) return;
    const { contactBook, profile } = getProfileContext(displayName);
    const homeAddress = applyHomeQr({
      book: contactBook,
      localProfileId: profile.id,
      uri
    });
    setContextFormDraft({ homeQrUri: "" });
    await joinHome({
      createTreehole: false,
      homeAddress,
      mode: "peer"
    });
  }
  return {
    joinHome,
    joinHomeUri,
    leaveHome
  };
}
var init_desktop_room_actions = __esm({
  "src/desktop-room-actions.js"() {
    "use strict";
    init_desktop_home_join_service();
    init_desktop_qr_service();
    init_desktop_state();
  }
});

// src/revoke-state.js
function applyLocalContactRevoke({ book, profileId, revokedAt = Date.now(), threads = [] }) {
  const nextBook = revokeContact(book, { profileId, revokedAt });
  const revokedThreadIds = [];
  const nextThreads = threads.map((thread) => {
    if (thread.remoteProfileId !== profileId) {
      return thread;
    }
    revokedThreadIds.push(thread.threadId);
    return revokeDmThread(thread, { revokedAt });
  });
  return {
    book: nextBook,
    nextThreads,
    revokedAt,
    revokedThreadIds,
    treeholePolicy: createTreeholePolicyFromContactBook(nextBook)
  };
}
var init_revoke_state = __esm({
  "src/revoke-state.js"() {
    "use strict";
    init_contact_book_storage();
    init_contact_book();
    init_dm_thread();
  }
});

// src/desktop-revoke-service.js
function createDesktopContactRevoke({
  book,
  profileId,
  revokedAt,
  selectedRecipientProfileId = "",
  threads = []
}) {
  const result = applyLocalContactRevoke({
    book,
    profileId,
    revokedAt,
    threads
  });
  return {
    ...result,
    shouldClearRecipient: selectedRecipientProfileId === profileId
  };
}
var init_desktop_revoke_service = __esm({
  "src/desktop-revoke-service.js"() {
    "use strict";
    init_revoke_state();
  }
});

// src/desktop-trust-actions.js
function createDesktopTrustActions({
  applyProfileTrustQr = applyDesktopProfileTrustQr,
  configureTreeholeRuntime,
  createContactRevoke = createDesktopContactRevoke,
  getDmRuntime,
  getHomeJoinDetails,
  getProfileContext,
  getSelectedRecipientProfileId,
  onChanged = () => {
  },
  setContextFormDraft = () => {
  },
  setDirectComposerRecipient,
  setHomeJoinDetails,
  setNotice
}) {
  function refreshActiveTreeholePolicy({ localProfileId, treeholePolicy }) {
    const homeJoinDetails = getHomeJoinDetails();
    if (homeJoinDetails?.profileId !== localProfileId) return;
    setHomeJoinDetails({
      ...homeJoinDetails,
      treeholePolicy
    });
    configureTreeholeRuntime();
  }
  function trustProfileUri({ alias = "", displayName = "Desktop", uri } = {}) {
    if (!uri) return;
    const context = getProfileContext(displayName);
    const { contactBook, profile } = context;
    const result = applyProfileTrustQr({
      alias,
      book: contactBook,
      localIdentity: profile.identity,
      localProfileId: profile.id,
      uri
    });
    context.saveContactBook(result.book);
    refreshActiveTreeholePolicy({
      localProfileId: profile.id,
      treeholePolicy: result.treeholePolicy
    });
    setContextFormDraft({
      trustAlias: "",
      trustQrUri: ""
    });
    setNotice("Trusted friend added.");
    onChanged();
  }
  async function revokeContact2(profileId) {
    const context = getProfileContext();
    const { contactBook, profile } = context;
    const dmRuntime = getDmRuntime();
    const result = createContactRevoke({
      book: contactBook,
      profileId,
      selectedRecipientProfileId: getSelectedRecipientProfileId(),
      threads: dmRuntime.loadThreads()
    });
    context.saveContactBook(result.book);
    dmRuntime.replaceThreads(result.nextThreads);
    await dmRuntime.closeThreads(result.revokedThreadIds);
    refreshActiveTreeholePolicy({
      localProfileId: profile.id,
      treeholePolicy: result.treeholePolicy
    });
    if (result.shouldClearRecipient) {
      setDirectComposerRecipient("");
    }
    setNotice("Trust revoked.");
    onChanged();
  }
  return {
    revokeContact: revokeContact2,
    trustProfileUri
  };
}
var init_desktop_trust_actions = __esm({
  "src/desktop-trust-actions.js"() {
    "use strict";
    init_desktop_qr_service();
    init_desktop_revoke_service();
  }
});

// src/direct-room-transport.js
function createDirectRoomTransport({
  addPeer,
  endpoint = null,
  advertisedHost = null,
  listenHost = "0.0.0.0",
  mode,
  onEndpoint = () => {
  },
  onError = () => {
  },
  tcpApi = null
} = {}) {
  if (typeof addPeer !== "function") {
    throw new Error("Direct transport peer handler is required");
  }
  if (mode === "host") {
    return createHostTransport({
      addPeer,
      advertisedHost,
      listenHost,
      onEndpoint,
      onError,
      tcpApi: tcpApi || loadTcpApi()
    });
  }
  if (mode === "guest") {
    return createGuestTransport({
      addPeer,
      endpoint,
      onError,
      tcpApi: tcpApi || loadTcpApi()
    });
  }
  return {
    ready: Promise.resolve(null),
    close: () => {
    }
  };
}
function loadTcpApi() {
  if (typeof require !== "function") throw new Error("Direct transport TCP API is unavailable");
  return require("bare-tcp");
}
function createHostTransport({ addPeer, advertisedHost, listenHost, onEndpoint, onError, tcpApi }) {
  const server = tcpApi.createServer((socket) => addPeer(socket));
  server.on?.("error", onError);
  const ready = new Promise((resolve, reject) => {
    server.on?.("error", reject);
    server.listen(0, listenHost, () => {
      const address = server.address();
      const endpoint = {
        host: advertisedHost || address.address,
        port: address.port
      };
      onEndpoint(endpoint);
      resolve(endpoint);
    });
  });
  return {
    ready,
    close: () => closeServer(server)
  };
}
function createGuestTransport({ addPeer, endpoint, onError, tcpApi }) {
  if (!endpoint?.host || !endpoint?.port) {
    return {
      ready: Promise.resolve(null),
      close: () => {
      }
    };
  }
  const socket = tcpApi.createConnection(endpoint.port, endpoint.host);
  socket.on?.("error", onError);
  const ready = new Promise((resolve) => {
    socket.on?.("error", () => resolve(null));
    socket.on?.("connect", () => {
      addPeer(socket);
      resolve(endpoint);
    });
  });
  return {
    ready,
    close: () => closeSocket(socket)
  };
}
function closeServer(server) {
  return new Promise((resolve) => {
    server.close?.(() => resolve());
  });
}
function closeSocket(socket) {
  return new Promise((resolve) => {
    socket.on?.("close", resolve);
    socket.end?.();
    socket.destroy?.();
    setTimeout(resolve, 50);
  });
}
var init_direct_room_transport = __esm({
  "src/direct-room-transport.js"() {
    "use strict";
  }
});

// src/desktop-backend-session.js
function createDesktopBackendSession({
  controllerState,
  createDirectTransport = createDesktopDirectRoomTransport,
  createId,
  env = globalThis.process?.env || {},
  createLocalBackendHost = createDesktopLocalBackendHost,
  getCurrentDisplayName,
  getProfileContext,
  onChanged,
  onError = console.error,
  setContextFormDraft,
  setDirectComposerRecipient,
  setNotice,
  shortenProfileId,
  storageBasePath,
  updateState
}) {
  let backendRuntime = null;
  let dmRuntime = null;
  let homeRuntime = null;
  let treeholeRuntime = null;
  const displayNameActions = {
    updateDisplayName({ displayName } = {}) {
      controllerState.setCurrentDisplayName(displayName);
      onChanged();
    }
  };
  const messageActions = createDesktopMessageActions({
    createId,
    getDmRuntime: () => dmRuntime,
    getDmSession: () => controllerState.getDmSession(),
    getHomeRuntime: () => homeRuntime,
    getSession: () => controllerState.getSession(),
    getTreeholeCanPost: () => controllerState.getState().treeholeCanPost,
    getTreeholeRuntime: () => treeholeRuntime,
    onChanged,
    setSession: (nextSession) => {
      controllerState.setSession(nextSession);
    }
  });
  const controlActions = createDesktopControlActions({
    configureTreeholeRuntime,
    getDmRuntime: () => dmRuntime,
    getHomeJoinDetails: () => controllerState.getHomeJoinDetails(),
    getHomeRuntime: () => homeRuntime,
    getProfileContext,
    getTreeholeRuntime: () => treeholeRuntime,
    onChanged,
    openTreehole,
    setHomeJoinDetails: (nextDetails) => {
      controllerState.setHomeJoinDetails(nextDetails);
    },
    setNotice,
    shortenProfileId
  });
  const messageRequestActions = createDesktopMessageRequestActions({
    createId,
    getDmRuntime: () => dmRuntime,
    getDmSession: () => controllerState.getDmSession(),
    getHomeRuntime: () => homeRuntime,
    getProfileContext,
    onChanged,
    setNotice
  });
  const roomActions = createDesktopRoomActions({
    closeAll: () => backendRuntime.closeAll(),
    configureTreeholeRuntime,
    getDirectTransportConfig: ({ mode }) => getDesktopDirectTransportConfig({ env, mode }),
    getCurrentDisplayName,
    getDmRuntime: () => dmRuntime,
    getHomeRuntime: () => homeRuntime,
    getProfileContext,
    getTreeholeRuntime: () => treeholeRuntime,
    onChanged,
    openTreehole,
    setContextFormDraft,
    setDmSession: (nextSession) => {
      controllerState.setDmSession(nextSession);
    },
    setHomeJoinDetails: (nextDetails) => {
      controllerState.setHomeJoinDetails(nextDetails);
    },
    setSession: (nextSession) => {
      controllerState.setSession(nextSession);
    },
    updateState
  });
  const trustActions = createDesktopTrustActions({
    configureTreeholeRuntime,
    getDmRuntime: () => dmRuntime,
    getHomeJoinDetails: () => controllerState.getHomeJoinDetails(),
    getProfileContext,
    getSelectedRecipientProfileId: () => controllerState.getDirectComposerRecipientProfileId(),
    onChanged,
    setContextFormDraft,
    setDirectComposerRecipient,
    setHomeJoinDetails: (nextDetails) => {
      controllerState.setHomeJoinDetails(nextDetails);
    },
    setNotice
  });
  const backendActions = createDesktopBackendActions({
    displayNameActions,
    messageActions,
    messageRequestActions,
    roomActions,
    trustActions
  });
  const backendHost = createLocalBackendHost({
    actions: backendActions,
    runtimeOptions: {
      onDmSessionChanged: (session) => {
        controllerState.setDmSession(session);
        onChanged();
      },
      onHomeDebugState: (transportDebug) => {
        controllerState.updateState((state) => ({
          ...state,
          peers: Number.isInteger(transportDebug?.localPeers) && transportDebug.localPeers > 0 ? transportDebug.localPeers : state.peers,
          transportDebug
        }));
        onChanged();
      },
      onHomeControl: (message, peer) => controlActions.handleControl(message, peer).catch(onError),
      onTreeholeStateChanged: (snapshot) => {
        controllerState.updateState((state) => setDesktopTreehole(state, snapshot));
        onChanged();
      },
      onVerifiedHello: (message, peer) => controlActions.sendTreeholeBootstrap(peer, message.profileId),
      createDirectTransport,
      storageBasePath
    }
  });
  backendRuntime = backendHost.runtime;
  dmRuntime = backendHost.dmRuntime;
  homeRuntime = backendHost.homeRuntime;
  treeholeRuntime = backendHost.treeholeRuntime;
  void startDirectMessages().catch(onError);
  function configureTreeholeRuntime() {
    backendRuntime.configure({
      homeJoinDetails: controllerState.getHomeJoinDetails(),
      session: controllerState.getSession()
    });
  }
  async function startDirectMessages() {
    const nick = getCurrentDisplayName();
    const { profile, storage } = getProfileContext(nick);
    controllerState.setDmSession(await dmRuntime.start({ nick, profile, storage }));
    onChanged();
  }
  async function openTreehole(bootstrapKey = null) {
    configureTreeholeRuntime();
    await treeholeRuntime.open({
      bootstrapKey,
      initialPosts: controllerState.getState().treeholePosts,
      initialStatus: controllerState.getState().treeholeStatus
    });
  }
  return {
    backendHost,
    backendRuntime,
    configureTreeholeRuntime,
    controlActions,
    dmRuntime,
    homeRuntime,
    openTreehole,
    roomActions,
    treeholeRuntime
  };
}
function createDesktopDirectRoomTransport(options) {
  return createDirectRoomTransport({
    ...options,
    tcpApi: loadNodeTcpApi()
  });
}
function loadNodeTcpApi() {
  return globalThis.process?.getBuiltinModule?.("node:net") || null;
}
var init_desktop_backend_session = __esm({
  "src/desktop-backend-session.js"() {
    "use strict";
    init_desktop_backend_actions();
    init_desktop_control_actions();
    init_desktop_direct_transport_config();
    init_desktop_local_backend_host();
    init_desktop_message_actions();
    init_desktop_message_request_actions();
    init_desktop_room_actions();
    init_desktop_trust_actions();
    init_direct_room_transport();
    init_desktop_state();
  }
});

// src/desktop-controller-state.js
function createDesktopControllerState({
  defaultDisplayName = "Desktop",
  initialState = createDesktopState()
} = {}) {
  let currentDisplayName = defaultDisplayName;
  let directComposerRecipientProfileId = "";
  let dmSession = null;
  let homeJoinDetails = null;
  let session = null;
  let state = initialState;
  return {
    getCurrentDisplayName() {
      return currentDisplayName;
    },
    getDirectComposerRecipientProfileId() {
      return directComposerRecipientProfileId;
    },
    getDmSession() {
      return dmSession;
    },
    getHomeJoinDetails() {
      return homeJoinDetails;
    },
    getSession() {
      return session;
    },
    getState() {
      return state;
    },
    selectDirectContact(profileId = "") {
      if (!profileId) return false;
      directComposerRecipientProfileId = profileId;
      return true;
    },
    setCurrentDisplayName(displayName = defaultDisplayName) {
      currentDisplayName = displayName.trim() || defaultDisplayName;
      return currentDisplayName;
    },
    setDirectComposerRecipient(profileId = "") {
      directComposerRecipientProfileId = profileId.trim();
      return directComposerRecipientProfileId;
    },
    setDmSession(nextSession) {
      dmSession = nextSession;
    },
    setHomeJoinDetails(nextDetails) {
      homeJoinDetails = nextDetails;
    },
    setSession(nextSession) {
      session = nextSession;
    },
    setState(nextState) {
      state = nextState;
    },
    updateState(updater) {
      state = updater(state);
    }
  };
}
var init_desktop_controller_state = __esm({
  "src/desktop-controller-state.js"() {
    "use strict";
    init_desktop_state();
  }
});

// src/desktop-main-backend-session-core.js
var desktop_main_backend_session_core_exports = {};
__export(desktop_main_backend_session_core_exports, {
  createDesktopMainBackendSessionCore: () => createDesktopMainBackendSessionCore
});
function createDesktopMainBackendSessionCore({
  createBackendSession = createDesktopBackendSession,
  createControllerState = createDesktopControllerState,
  createId = defaultCreateId,
  env,
  createProfileContext,
  createShareQrOutputs = createDesktopShareQrOutputs,
  defaultDisplayName = "Desktop",
  storageBasePath
} = {}) {
  if (!createProfileContext) throw new Error("Desktop profile context factory is required");
  const controllerState = createControllerState({ defaultDisplayName });
  let backendSession = null;
  backendSession = createBackendSession({
    controllerState,
    createId,
    env,
    getCurrentDisplayName: () => controllerState.getCurrentDisplayName(),
    getProfileContext: (displayName = controllerState.getCurrentDisplayName()) => createProfileContext({ displayName, storageBasePath }),
    onChanged: () => {
      publishSnapshots();
      publishShareQrOutputs();
    },
    setContextFormDraft: (draft) => {
      backendSession?.backendHost.bridge.emit("contextFormDraftChanged", draft);
    },
    setDirectComposerRecipient: (profileId) => {
      controllerState.setDirectComposerRecipient(profileId);
      backendSession?.backendHost.bridge.emit("directComposerRecipientChanged", profileId);
    },
    setNotice: (notice) => {
      controllerState.updateState((state) => ({ ...state, notice }));
    },
    shortenProfileId: (value) => `${value.slice(0, 8)}...${value.slice(-8)}`,
    storageBasePath,
    updateState: (updater) => {
      controllerState.updateState(updater);
    }
  });
  publishSnapshots();
  publishShareQrOutputs();
  backendSession.publishSnapshots = () => {
    publishSnapshots();
    void publishShareQrOutputs();
  };
  return backendSession;
  function publishSnapshots() {
    backendSession?.backendHost.bridge.emit("desktopStateChanged", controllerState.getState());
    backendSession?.backendHost.bridge.emit(
      "contactBookChanged",
      createProfileContext({
        displayName: controllerState.getCurrentDisplayName(),
        storageBasePath
      }).contactBook
    );
    backendSession?.backendHost.bridge.emit("dmMessageReceived", controllerState.getDmSession());
  }
  async function publishShareQrOutputs() {
    try {
      const { profile } = createProfileContext({
        displayName: controllerState.getCurrentDisplayName(),
        storageBasePath
      });
      backendSession?.backendHost.bridge.emit(
        "shareQrOutputsChanged",
        await createShareQrOutputs({ profile })
      );
    } catch (error) {
      backendSession?.backendHost.bridge.emit("errorReceived", error);
    }
  }
}
function defaultCreateId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
var init_desktop_main_backend_session_core = __esm({
  "src/desktop-main-backend-session-core.js"() {
    "use strict";
    init_desktop_backend_session();
    init_desktop_controller_state();
    init_desktop_qr_service();
  }
});

// src/desktop-backend-worker-bare-entry.js
var desktop_backend_worker_bare_entry_exports = {};
__export(desktop_backend_worker_bare_entry_exports, {
  installBareEncodingGlobals: () => installBareEncodingGlobals,
  startDesktopBackendBareWorker: () => startDesktopBackendBareWorker
});
module.exports = __toCommonJS(desktop_backend_worker_bare_entry_exports);
var import_bare_encoding = __toESM(require("bare-encoding"), 1);

// src/desktop-backend-worker-ipc.js
init_desktop_command_vocabulary();
function createDesktopBackendWorkerIpcServer({ bridge, stream } = {}) {
  const unsubscribeFromBackend = [];
  const stopReading = readIpcMessages(stream, (message) => {
    if (message.type === "dispatch") void handleDispatch(message);
  });
  if (typeof bridge.subscribe === "function") {
    for (const event of DESKTOP_EVENTS) {
      unsubscribeFromBackend.push(
        bridge.subscribe(event, (payload) => {
          writeIpcMessage(stream, { event, payload, type: "event" });
        })
      );
    }
  }
  return {
    close() {
      stopReading();
      for (const unsubscribe of unsubscribeFromBackend) unsubscribe();
      stream.destroy?.();
    }
  };
  async function handleDispatch(message) {
    try {
      const value = await bridge.dispatch(message.command, message.payload);
      writeIpcMessage(stream, { id: message.id, ok: true, type: "dispatchResult", value });
    } catch (error) {
      writeIpcMessage(stream, {
        error: { message: error?.message || "Desktop worker dispatch failed" },
        id: message.id,
        ok: false,
        type: "dispatchResult"
      });
    }
  }
}
function readIpcMessages(stream, onMessage) {
  let buffer = "";
  function onData(chunk) {
    buffer += chunk.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (!line) continue;
      onMessage(JSON.parse(line, reviveIpcValue));
    }
  }
  stream.on("data", onData);
  return () => stream.off?.("data", onData);
}
function writeIpcMessage(stream, message) {
  stream.write(`${JSON.stringify(message, replaceIpcValue)}
`);
}
function replaceIpcValue(_key, value) {
  if (value instanceof Error) {
    return {
      __keposIpcType: "Error",
      code: value.code,
      message: value.message,
      name: value.name,
      stack: value.stack
    };
  }
  if (value instanceof Map) {
    return {
      __keposIpcType: "Map",
      entries: Array.from(value.entries())
    };
  }
  if (value instanceof Set) {
    return {
      __keposIpcType: "Set",
      values: Array.from(value.values())
    };
  }
  return value;
}
function reviveIpcValue(_key, value) {
  if (value?.__keposIpcType === "Error") {
    const error = new Error(value.message || "Desktop worker error");
    error.name = value.name || "Error";
    if (value.stack) error.stack = value.stack;
    if (value.code) error.code = value.code;
    return error;
  }
  if (value?.__keposIpcType === "Map") return new Map(value.entries || []);
  if (value?.__keposIpcType === "Set") return new Set(value.values || []);
  return value;
}

// src/desktop-backend-worker-bare-entry.js
function startDesktopBackendBareWorker({
  BareRuntime = globalThis.Bare,
  createIpcServer = createDesktopBackendWorkerIpcServer,
  createMainBackendSession,
  startBackendWorker = startDesktopBackendWorkerInBare
} = {}) {
  if (!BareRuntime?.IPC) throw new Error("Bare IPC is required for desktop backend worker");
  installBareEncodingGlobals();
  const worker = startBackendWorker({
    createIpcServer,
    createMainBackendSession,
    env: parseWorkerEnv(BareRuntime.argv?.[3]),
    storageBasePath: BareRuntime.argv?.[2],
    stream: BareRuntime.IPC
  });
  BareRuntime.on?.("beforeExit", () => worker.close());
  return worker;
}
function installBareEncodingGlobals({
  globalObject = globalThis,
  utils = import_bare_encoding.default
} = {}) {
  if (!globalObject.TextEncoder) globalObject.TextEncoder = utils.TextEncoder;
  if (!globalObject.TextDecoder) globalObject.TextDecoder = utils.TextDecoder;
}
function startDesktopBackendWorkerInBare({
  createIpcServer,
  env,
  createMainBackendSession,
  storageBasePath,
  stream
} = {}) {
  if (!createMainBackendSession) {
    throw new Error("Desktop Bare backend session factory is required");
  }
  const session = createMainBackendSession({ env, storageBasePath });
  const server = createIpcServer({
    bridge: session.backendHost.bridge,
    stream
  });
  session.publishSnapshots?.();
  return {
    close() {
      server.close();
      return session.backendRuntime?.closeAll?.();
    }
  };
}
function parseWorkerEnv(value) {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}
async function startDefaultDesktopBackendBareWorker() {
  const [{ createDesktopBareProfileContext: createDesktopBareProfileContext2 }, { createDesktopMainBackendSessionCore: createDesktopMainBackendSessionCore2 }] = await Promise.all([
    Promise.resolve().then(() => (init_desktop_bare_profile_context(), desktop_bare_profile_context_exports)),
    Promise.resolve().then(() => (init_desktop_main_backend_session_core(), desktop_main_backend_session_core_exports))
  ]);
  return startDesktopBackendBareWorker({
    createMainBackendSession: (options) => createDesktopMainBackendSessionCore2({
      ...options,
      createProfileContext: createDesktopBareProfileContext2
    })
  });
}
if (globalThis.Bare?.IPC) startDefaultDesktopBackendBareWorker();
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  installBareEncodingGlobals,
  startDesktopBackendBareWorker
});
