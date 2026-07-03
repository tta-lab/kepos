import React, { useState } from 'react'
import { Heart, MessageCircle, Send, Sprout, User, UserPlus } from 'lucide-react'
import {
  ActionButton,
  ComposerSubmitButton,
  cx,
  PaneHeader,
  RequestActionButton
} from './ui-components.tsx'
import { getDirectChatEmptyCopy } from '../src/direct-chat-empty-copy.ts'
import { createDirectChatComposerState } from '../src/direct-chat-composer-state.ts'
import { createDirectChatLayoutState } from '../src/direct-chat-layout-state.ts'
import { filterDirectMessagesForProfile, findSelectedDmThreadView } from '../src/dm-thread-list.ts'
import type { ProfileRelationshipState } from '../src/profile-relationship-state.ts'

type ActiveTab = 'chat' | 'dm' | 'treehole' | 'people' | string

type ControlsView = {
  canPostTreehole: boolean
  canUseDirectComposer: boolean
  canUseHomeChatComposer: boolean
}

type ComposerView = {
  text: string
  toProfileId: string
}

type ContactPickerContactView = {
  alias: string
  avatar?: ProfileAvatarView
  isSelected?: boolean
  profileId: string
}

type ContactPickerView = {
  contacts: unknown[]
  empty: {
    actionLabel: string
    copy: string
    title: string
  }
}

type DirectThreadView = {
  avatar?: ProfileAvatarView
  label: string
  preview?: string
  profileId: string
  requestActions?: {
    acceptMessage: unknown
    ignoreMessage: unknown
  }
  statusLabel?: string
  threadId?: React.Key
  timeLabel?: string
  unreadCount?: number
  unreadLabel?: string
}

type ProfileAvatarView = {
  imageUri?: string
  initials: string
  label: string
  tone: string
}

type HomeOwnerView = {
  actionLabel?: string
  canOpenProfile: boolean
  ownerProfileId: string
  subtitle: string
  title: string
}

type ProfileRequestTargetView = {
  avatar?: ProfileAvatarView
  copy?: string
  displayName?: string
  profileId: string
  relationshipState?: ProfileRelationshipState
  shortProfileId?: string
  statusLabel?: string
} | null

type MessageView = {
  actions?: {
    acceptMessage: unknown
    ignoreMessage: unknown
  }
  avatar?: ProfileAvatarView
  className?: string
  meta?: string
  text?: string
  [key: string]: unknown
}

type TreeholeCommentView = {
  authorAvatar?: ProfileAvatarView
  authorLabel: string
  className?: string
  text: string
}

type TreeholePostView = {
  actions: {
    commentPostId: string
    likePostId: string
  }
  authorAvatar?: ProfileAvatarView
  authorLabel: string
  className?: string
  comments?: TreeholeCommentView[]
  statsLabel: string
  text: string
  timeLabel: string
}

type DirectComposerActions = {
  sendDirectMessage(payload: { text: string; toProfileId: string }): unknown
  updateRecipient(payload: { toProfileId: string }): unknown
}

type DirectContactPickerActions = {
  openPeople(): unknown
  selectContact(profileId: string): unknown
}

type DirectMessageActions = {
  acceptMessage(message: unknown): unknown
  ignoreMessage(message: unknown): unknown
}

type TreeholeActions = {
  commentPost(payload: { postId: string; text: string }): unknown
  likePost(postId: string): unknown
}

type ComposerSetter = React.Dispatch<React.SetStateAction<ComposerView>>

export function HomePane({
  activeTab,
  controls,
  homeOwner,
  messages,
  onOpenOwnerProfile,
  onSend
}: {
  activeTab: ActiveTab
  controls: ControlsView
  homeOwner: HomeOwnerView
  messages: unknown[]
  onOpenOwnerProfile(profileId: string): unknown
  onSend(payload: { text: string }): unknown
}) {
  return (
    <section id='chatPane' className={activeTab === 'chat' ? 'pane' : 'pane hidden'}>
      <PaneHeader
        eyebrow='live'
        title='Live home chat'
        description='Ephemeral messages for everyone currently inside this home.'
      />
      <div className='panel mx-5 mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-base-300 bg-base-200/70 p-3'>
        <div>
          <p className='text-sm font-black text-base-content'>{homeOwner.title}</p>
          <p className='text-xs font-semibold text-base-content/65'>{homeOwner.subtitle}</p>
        </div>
        {homeOwner.canOpenProfile ? (
          <ActionButton
            ariaLabel={`Open ${homeOwner.title} owner profile`}
            className='smallButton'
            icon={<User size={15} />}
            label={homeOwner.actionLabel || 'Open profile'}
            onClick={() => onOpenOwnerProfile(homeOwner.ownerProfileId)}
          />
        ) : null}
      </div>
      <HomeChatList messages={messages} />
      <HomeChatComposer controls={controls} onSend={onSend} />
    </section>
  )
}

export function DirectPane({
  activeTab,
  composer,
  composerActions,
  contactPicker,
  contactPickerActions,
  controls,
  messageActions,
  messages,
  onOpenProfile,
  requestTarget = null,
  setComposer,
  threads = []
}: {
  activeTab: ActiveTab
  composer: ComposerView
  composerActions: DirectComposerActions
  contactPicker: ContactPickerView
  contactPickerActions: DirectContactPickerActions
  controls: ControlsView
  messageActions: DirectMessageActions
  messages: unknown[]
  onOpenProfile(profileId: string): unknown
  requestTarget?: ProfileRequestTargetView
  setComposer: ComposerSetter
  threads?: unknown[]
}) {
  const selectedThread = findSelectedDmThreadView({
    selectedProfileId: composer.toProfileId.trim(),
    threads: threads.map(readDirectThreadView).filter(Boolean) as DirectThreadView[]
  })
  const selectedProfileId = composer.toProfileId.trim()
  const visibleMessages = filterDirectMessagesForProfile(messages, selectedProfileId)
  const layoutState = createDirectChatLayoutState({
    recipientProfileId: selectedProfileId,
    requestTargetProfileId: requestTarget?.profileId
  })

  function selectThread(profileId: string) {
    const toProfileId = profileId.trim()
    setComposer((current) => ({ ...current, toProfileId }))
    composerActions.updateRecipient({ toProfileId })
    contactPickerActions.selectContact(toProfileId)
  }

  return (
    <section id='dmPane' className={activeTab === 'dm' ? 'pane' : 'pane hidden'}>
      <PaneHeader
        eyebrow='durable'
        title='Chat'
        description='Private pairwise threads that survive restarts.'
      />
      {layoutState.hideThreadList ? null : (
        <DirectThreadList
          onAccept={messageActions.acceptMessage}
          onIgnore={messageActions.ignoreMessage}
          onOpenPeople={contactPickerActions.openPeople}
          onOpenProfile={onOpenProfile}
          onSelect={selectThread}
          selectedProfileId={selectedProfileId}
          threads={threads}
        />
      )}
      <DirectThreadHeader onOpenProfile={onOpenProfile} thread={selectedThread} />
      <ProfileRequestTargetCard
        onOpenProfile={onOpenProfile}
        recipient={selectedProfileId}
        requestTarget={requestTarget}
      />
      <DirectMessageList
        messages={visibleMessages}
        onAccept={messageActions.acceptMessage}
        onIgnore={messageActions.ignoreMessage}
        relationshipState={requestTarget?.relationshipState}
      />
      <DirectComposer
        actions={composerActions}
        composer={composer}
        contactPicker={contactPicker}
        contactPickerActions={contactPickerActions}
        controls={controls}
        hideContactEmpty={layoutState.hideContactEmpty}
        relationshipState={requestTarget?.relationshipState}
        selectedThread={selectedThread}
        setComposer={setComposer}
      />
    </section>
  )
}

function DirectThreadHeader({
  onOpenProfile,
  thread
}: {
  onOpenProfile(profileId: string): unknown
  thread: DirectThreadView | null
}) {
  if (!thread) return null

  return (
    <section
      className='panel directThreadHeader card border border-base-300 bg-base-200/70 p-3 shadow-sm'
      aria-label={`Current message thread ${thread.label}`}
    >
      <ProfileAvatar avatar={thread.avatar} />
      <div className='min-w-0'>
        <p className='text-xs font-black uppercase text-base-content/60'>Current thread</p>
        <p className='truncate text-base font-black text-base-content'>{thread.label}</p>
        <p className='text-xs font-semibold text-base-content/60'>{thread.statusLabel}</p>
      </div>
      <ActionButton
        ariaLabel={`Open ${thread.label} profile`}
        className='smallButton'
        icon={<User size={15} />}
        label='Profile'
        onClick={() => onOpenProfile(thread.profileId)}
      />
    </section>
  )
}

function ProfileRequestTargetCard({
  onOpenProfile,
  recipient,
  requestTarget
}: {
  onOpenProfile(profileId: string): unknown
  recipient: string
  requestTarget: ProfileRequestTargetView
}) {
  if (!requestTarget || requestTarget.profileId !== recipient) return null

  const displayName = requestTarget.displayName || 'Profile'

  return (
    <section
      id='profileRequestTargetCard'
      className='panel card border border-warning/40 bg-warning/10 p-3 shadow-sm'
      aria-label={`${displayName} friend request target`}
    >
      <div className='grid gap-2'>
        <p className='text-xs font-black uppercase text-warning'>
          {requestTarget.statusLabel || 'Friend request'}
        </p>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <div className='flex min-w-0 items-center gap-3'>
            <ProfileAvatar avatar={requestTarget.avatar} />
            <div className='min-w-0'>
              <p className='truncate text-base font-black text-base-content'>{displayName}</p>
              <p className='mono text-xs font-semibold text-base-content/60'>
                {requestTarget.shortProfileId || shortenProfileId(requestTarget.profileId)}
              </p>
            </div>
          </div>
          <ActionButton
            ariaLabel={`Open ${displayName} profile`}
            className='smallButton'
            icon={<User size={15} />}
            label='Profile'
            onClick={() => onOpenProfile(requestTarget.profileId)}
          />
        </div>
        <p className='text-xs font-semibold text-base-content/65'>
          {requestTarget.copy || 'Write an intro in Chat to send a friend request.'}
        </p>
      </div>
    </section>
  )
}

function DirectThreadList({
  onAccept,
  onIgnore,
  onOpenPeople,
  onOpenProfile,
  onSelect,
  selectedProfileId,
  threads = []
}: {
  onAccept(message: unknown): unknown
  onIgnore(message: unknown): unknown
  onOpenPeople(): unknown
  onOpenProfile(profileId: string): unknown
  onSelect(profileId: string): unknown
  selectedProfileId: string
  threads?: unknown[]
}) {
  const visibleThreads = threads.map(readDirectThreadView).filter(Boolean) as DirectThreadView[]

  if (visibleThreads.length === 0) {
    return (
      <div id='messageThreadList' className='contactList grid gap-2' aria-label='Message threads'>
        <div className='contactEmpty' role='status'>
          <span className='contactEmptyIcon' aria-hidden='true'>
            <UserPlus size={18} />
          </span>
          <div>
            <p className='contactEmptyTitle'>No message threads yet</p>
            <p className='contactEmptyCopy'>
              Open Contacts to scan a profile or accept a friend request.
            </p>
          </div>
          <button className='smallButton contactEmptyAction' type='button' onClick={onOpenPeople}>
            Open Contacts
          </button>
        </div>
      </div>
    )
  }

  return (
    <div id='messageThreadList' className='contactList grid gap-2' aria-label='Message threads'>
      {visibleThreads.map((thread) => {
        const selected = thread.profileId === selectedProfileId
        const preview = typeof thread.preview === 'string' ? thread.preview : 'No messages yet'
        const requestActions = thread.requestActions
        const timeLabel = typeof thread.timeLabel === 'string' ? thread.timeLabel : ''
        const rawUnreadCount = thread.unreadCount
        const unreadCount =
          typeof rawUnreadCount === 'number' && Number.isSafeInteger(rawUnreadCount)
            ? rawUnreadCount
            : 0
        const statusLabel =
          typeof thread.statusLabel === 'string' ? thread.statusLabel : 'Accepted thread'

        return (
          <div
            key={thread.threadId || thread.profileId}
            className={
              selected
                ? 'contactButton activeContactButton threadButton'
                : 'contactButton threadButton'
            }
          >
            <button
              aria-label={`Open message thread ${thread.label}`}
              aria-pressed={selected}
              className='threadMainButton'
              type='button'
              onClick={() => onSelect(thread.profileId)}
            >
              <ProfileAvatar avatar={thread.avatar} />
              <span className='threadHeader'>
                <span className='threadLabel'>{thread.label}</span>
                <span className='threadMetaCluster'>
                  {unreadCount > 0 ? (
                    <span className='threadUnreadBadge'>{thread.unreadLabel || unreadCount}</span>
                  ) : null}
                  {timeLabel ? <span className='threadTime'>{timeLabel}</span> : null}
                </span>
              </span>
              <span className='threadPreview'>{preview}</span>
              <span className='threadStatus'>{statusLabel}</span>
            </button>
            <ActionButton
              ariaLabel={`Open ${thread.label} profile`}
              className='smallButton'
              icon={<User size={15} />}
              label='Profile'
              onClick={() => onOpenProfile(thread.profileId)}
            />
            {requestActions ? (
              <div className='inlineActions'>
                <RequestActionButton
                  ariaLabel={`Ignore friend request from ${thread.label}`}
                  onClick={() => onIgnore(requestActions.ignoreMessage)}
                  variant='ignore'
                />
                <RequestActionButton
                  ariaLabel={`Accept friend request from ${thread.label}`}
                  onClick={() => onAccept(requestActions.acceptMessage)}
                  variant='accept'
                />
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

function ProfileAvatar({ avatar }: { avatar?: ProfileAvatarView }) {
  return (
    <span
      aria-label={avatar?.label || 'Profile avatar'}
      className={`profileAvatar threadAvatar ${avatar?.tone || 'avatarTone0'}`}
      role='img'
    >
      {avatar?.imageUri ? (
        <img alt='' className='profileAvatarImage' src={avatar.imageUri} />
      ) : (
        avatar?.initials || <User size={14} />
      )}
    </span>
  )
}

export function TreeholePane({
  activeTab,
  actions,
  controls,
  onPost,
  posts
}: {
  activeTab: ActiveTab
  actions: TreeholeActions
  controls: ControlsView
  onPost(payload: { text: string }): unknown
  posts: unknown[]
}) {
  return (
    <section id='treeholePane' className={activeTab === 'treehole' ? 'pane' : 'pane hidden'}>
      <PaneHeader
        eyebrow='durable'
        title='Treehole'
        description='Your durable posts stay here; trusted friends can react and comment.'
      />
      <TreeholeList actions={actions} canPost={controls.canPostTreehole} posts={posts} />
      <TreeholeComposer controls={controls} onPost={onPost} />
    </section>
  )
}

function HomeChatComposer({
  controls,
  onSend
}: {
  controls: ControlsView
  onSend(payload: { text: string }): unknown
}) {
  const [draft, setDraft] = useState('')
  const canSend = controls.canUseHomeChatComposer && Boolean(draft.trim())

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSend) return
    onSend({ text: draft.trim() })
    setDraft('')
  }

  return (
    <form id='chatForm' className='composer border-base-300 bg-base-100/80' onSubmit={handleSubmit}>
      <input
        id='chatInput'
        className='input input-bordered w-full bg-base-100 text-base-content'
        placeholder='Write to the home'
        autoComplete='off'
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
      <ComposerSubmitButton
        disabled={!canSend}
        icon={<Send size={17} />}
        id='chatSendButton'
        label='Send'
      />
    </form>
  )
}

function DirectComposer({
  actions,
  composer,
  contactPicker,
  contactPickerActions,
  controls,
  hideContactEmpty,
  relationshipState,
  selectedThread,
  setComposer
}: {
  actions: DirectComposerActions
  composer: ComposerView
  contactPicker: ContactPickerView
  contactPickerActions: DirectContactPickerActions
  controls: ControlsView
  hideContactEmpty: boolean
  relationshipState?: ProfileRelationshipState
  selectedThread: DirectThreadView | null
  setComposer: ComposerSetter
}) {
  const composerState = createDirectChatComposerState({
    draft: composer.text,
    enabled: controls.canUseDirectComposer,
    recipientProfileId: composer.toProfileId,
    relationshipState,
    threadLabel: selectedThread?.label
  })

  function setRecipient(toProfileId: string) {
    setComposer((current) => ({ ...current, toProfileId }))
    actions.updateRecipient({ toProfileId: toProfileId.trim() })
  }

  function handleSelectContact(profileId: string) {
    setRecipient(profileId)
    contactPickerActions.selectContact(profileId)
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!composerState.canSend) return

    actions.sendDirectMessage({
      text: composer.text.trim(),
      toProfileId: composer.toProfileId.trim()
    })
    setComposer((current) => ({ ...current, text: '' }))
  }

  return (
    <form
      id='dmForm'
      className='composer tall border-base-300 bg-base-100/80'
      onSubmit={handleSubmit}
    >
      <DirectContactPicker
        actions={{
          openPeople: contactPickerActions.openPeople,
          selectContact: handleSelectContact
        }}
        contacts={contactPicker.contacts}
        empty={contactPicker.empty}
        hideEmpty={hideContactEmpty}
        selectedProfileId={composer.toProfileId.trim()}
      />
      <details
        id='advancedDmRecipient'
        className='advanced advancedComposer collapse collapse-arrow rounded-lg border border-base-300 bg-base-200/60'
      >
        <summary>Advanced</summary>
        <label className='form-control grid gap-2 px-3 pb-3 text-xs font-black uppercase text-base-content/70'>
          Manual recipient profile id
          <input
            id='dmRecipientInput'
            className='input input-bordered input-sm w-full bg-base-100 text-sm normal-case text-base-content'
            placeholder='Manual recipient profile id'
            autoComplete='off'
            spellCheck='false'
            value={composer.toProfileId}
            onChange={(event) => setRecipient(event.target.value)}
          />
        </label>
      </details>
      <textarea
        id='dmInput'
        className='textarea textarea-bordered min-h-24 w-full resize-y bg-base-100 text-base-content'
        placeholder={composerState.placeholder}
        value={composer.text}
        onChange={(event) => setComposer((current) => ({ ...current, text: event.target.value }))}
      />
      <ComposerSubmitButton
        disabled={!composerState.canSend}
        icon={<Send size={17} />}
        id='dmSendButton'
        label={composerState.sendLabel}
      />
    </form>
  )
}

function TreeholeComposer({
  controls,
  onPost
}: {
  controls: ControlsView
  onPost(payload: { text: string }): unknown
}) {
  const [draft, setDraft] = useState('')
  const canPost = controls.canPostTreehole && Boolean(draft.trim())

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canPost) return
    onPost({ text: draft.trim() })
    setDraft('')
  }

  return (
    <form
      id='treeholeForm'
      className={controls.canPostTreehole ? 'composer tall' : 'composer tall disabledComposer'}
      onSubmit={handleSubmit}
    >
      <p
        id='treeholePostPolicy'
        className='composerHint alert alert-warning py-2 text-xs font-black'
        hidden={controls.canPostTreehole}
      >
        Only the owner can post here.
      </p>
      <textarea
        id='treeholeInput'
        className='textarea textarea-bordered min-h-24 w-full resize-y bg-base-100 text-base-content disabled:bg-base-200'
        placeholder='Post to Treehole'
        disabled={!controls.canPostTreehole}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
      <ComposerSubmitButton
        disabled={!canPost}
        icon={<Sprout size={17} />}
        id='treeholeSendButton'
        label='Post'
      />
    </form>
  )
}

function HomeChatList({ messages }: { messages: unknown[] }) {
  const visibleMessages = messages.map(readMessageView)

  return (
    <ol id='messageList' className='list bg-base-100' aria-label='Home chat messages'>
      {visibleMessages.length === 0 ? (
        <ListEmptyState
          icon={<MessageCircle size={18} />}
          title='No messages yet'
          copy='Send the first line from this desktop.'
        />
      ) : (
        visibleMessages.map((message, index) => (
          <li
            key={`${message.meta}-${index}-${message.text}`}
            className={cx('item card border border-base-300 shadow-sm', message.className)}
          >
            <div className='messageMetaRow'>
              <p className='meta'>{message.meta}</p>
            </div>
            <p className='messageText'>{message.text}</p>
          </li>
        ))
      )}
    </ol>
  )
}

function DirectMessageList({
  messages,
  onAccept,
  onIgnore,
  relationshipState
}: {
  messages: unknown[]
  onAccept(message: unknown): unknown
  onIgnore(message: unknown): unknown
  relationshipState?: ProfileRelationshipState
}) {
  const visibleMessages = messages.map(readMessageView)
  const emptyCopy = getDirectChatEmptyCopy({
    relationshipState
  })

  return (
    <ol id='dmList' className='list bg-base-100' aria-label='Chat'>
      {visibleMessages.length === 0 ? (
        <ListEmptyState icon={<Send size={18} />} title='No messages yet' copy={emptyCopy} />
      ) : (
        visibleMessages.map((message, index) => {
          const actions = message.actions

          return (
            <li
              key={`${message.meta}-${index}-${message.text}`}
              className={cx('item card border border-base-300 shadow-sm', message.className)}
            >
              <ProfileAvatar avatar={message.avatar} />
              <div className='directMessageContent'>
                <div className='messageMetaRow'>
                  <p className='meta'>{message.meta}</p>
                </div>
                <p className='messageText'>{message.text}</p>
                {actions ? (
                  <div className='inlineActions'>
                    <RequestActionButton
                      ariaLabel='Ignore friend request'
                      onClick={() => onIgnore(actions.ignoreMessage)}
                      variant='ignore'
                    />
                    <RequestActionButton
                      ariaLabel='Accept friend request'
                      onClick={() => onAccept(actions.acceptMessage)}
                      variant='accept'
                    />
                  </div>
                ) : null}
              </div>
            </li>
          )
        })
      )}
    </ol>
  )
}

function DirectContactPicker({
  actions,
  contacts,
  empty,
  hideEmpty = false,
  selectedProfileId
}: {
  actions: DirectContactPickerActions
  contacts: unknown[]
  empty: ContactPickerView['empty']
  hideEmpty?: boolean
  selectedProfileId: string
}) {
  const visibleContacts = contacts
    .map(readContactPickerContact)
    .filter(Boolean) as ContactPickerContactView[]

  if (visibleContacts.length === 0 && hideEmpty) return null

  return (
    <div id='dmContactList' className='contactList flex flex-wrap gap-2'>
      {visibleContacts.length === 0 ? (
        <div className='contactEmpty'>
          <span className='contactEmptyIcon' aria-hidden='true'>
            <UserPlus size={18} />
          </span>
          <div>
            <p className='contactEmptyTitle'>{empty.title}</p>
            <p className='contactEmptyCopy'>{empty.copy}</p>
          </div>
          <button
            className='smallButton contactEmptyAction'
            type='button'
            onClick={actions.openPeople}
          >
            {empty.actionLabel}
          </button>
        </div>
      ) : (
        visibleContacts.map((contact) => {
          const selected = contact.profileId === selectedProfileId || contact.isSelected

          return (
            <button
              key={contact.profileId}
              aria-label={`Message recipient ${contact.alias}`}
              aria-pressed={selected}
              className={selected ? 'contactButton activeContactButton' : 'contactButton'}
              type='button'
              onClick={() => actions.selectContact(contact.profileId)}
            >
              <ProfileAvatar avatar={contact.avatar} />
              <span>{contact.alias}</span>
            </button>
          )
        })
      )}
    </div>
  )
}

function TreeholeList({
  actions,
  canPost,
  posts
}: {
  actions: TreeholeActions
  canPost: boolean
  posts: unknown[]
}) {
  const visiblePosts = posts.map(readTreeholePostView)
  const emptyCopy = canPost
    ? 'Write the first post from this desktop.'
    : 'Posts from this home will appear here.'

  return (
    <ol id='treeholeList' className='list posts bg-base-100' aria-label='Treehole posts'>
      {visiblePosts.length === 0 ? (
        <ListEmptyState icon={<Sprout size={18} />} title='No posts yet' copy={emptyCopy} />
      ) : (
        visiblePosts.map((post, index) => (
          <li
            key={`${post.timeLabel}-${index}-${post.text}`}
            className={cx(
              'item post card border border-base-300 bg-base-100 shadow-sm',
              post.className
            )}
          >
            <div className='postHead'>
              <div className='postAuthorRow'>
                <ProfileAvatar avatar={post.authorAvatar} />
                <p className='meta'>{post.authorLabel}</p>
              </div>
              <p className='time'>{post.timeLabel}</p>
            </div>
            <p className='postText'>{post.text}</p>
            <p className='stats'>{post.statsLabel}</p>
            <div className='comments'>
              {(post.comments || []).map((comment, commentIndex) => (
                <div
                  key={`${comment.authorLabel}-${commentIndex}-${comment.text}`}
                  className={cx(
                    'comment rounded-r-md bg-base-200 text-base-content',
                    comment.className
                  )}
                >
                  <div className='commentAuthorRow'>
                    <ProfileAvatar avatar={comment.authorAvatar} />
                    <p className='meta'>{comment.authorLabel}</p>
                  </div>
                  <p>{comment.text}</p>
                </div>
              ))}
            </div>
            <TreeholePostActions actions={actions} post={post} />
          </li>
        ))
      )}
    </ol>
  )
}

function ListEmptyState({
  copy,
  icon,
  title
}: {
  copy: string
  icon: React.ReactNode
  title: string
}) {
  return (
    <li className='listEmpty rounded-lg border border-dashed border-base-300 bg-base-200/70 p-3'>
      <span
        className='listEmptyIcon rounded-lg border border-base-300 bg-success/15 text-success'
        aria-hidden='true'
      >
        {icon}
      </span>
      <div>
        <p className='listEmptyTitle text-sm font-black text-base-content'>{title}</p>
        <p className='listEmptyCopy text-xs font-semibold text-base-content/65'>{copy}</p>
      </div>
    </li>
  )
}

function TreeholePostActions({
  actions,
  post
}: {
  actions: TreeholeActions
  post: TreeholePostView
}) {
  const [draft, setDraft] = useState('')
  const hasDraft = Boolean(draft.trim())

  function submitComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft.trim()) return
    actions.commentPost({ postId: post.actions.commentPostId, text: draft.trim() })
    setDraft('')
  }

  return (
    <div className='postActions'>
      <ActionButton
        className='smallButton'
        icon={<Heart size={15} />}
        label='Like'
        onClick={() => actions.likePost(post.actions.likePostId)}
      />
      <form className='commentForm' onSubmit={submitComment}>
        <input
          className='input input-bordered input-sm commentInput bg-base-100 text-base-content'
          placeholder='Write a comment'
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <ComposerSubmitButton
          className='smallButton'
          disabled={!hasDraft}
          icon={<MessageCircle size={15} />}
          label='Comment'
        />
      </form>
    </div>
  )
}

function shortenProfileId(value: string): string {
  return `${value.slice(0, 8)}...${value.slice(-8)}`
}

function readDirectThreadView(value: unknown): DirectThreadView | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const thread = value as Record<string, unknown>

  if (typeof thread.profileId !== 'string') {
    return null
  }

  return {
    avatar: readProfileAvatarView(thread.avatar),
    label: readString(thread.label, thread.profileId),
    preview: readString(thread.preview, ''),
    profileId: thread.profileId,
    requestActions: readMessageActions(thread.requestActions),
    statusLabel: readString(thread.statusLabel, ''),
    threadId:
      typeof thread.threadId === 'string' || typeof thread.threadId === 'number'
        ? thread.threadId
        : thread.profileId,
    timeLabel: readString(thread.timeLabel, ''),
    unreadCount: readNumber(thread.unreadCount, 0),
    unreadLabel: readString(thread.unreadLabel, '')
  }
}

function readMessageView(value: unknown): MessageView {
  if (!value || typeof value !== 'object') {
    return { meta: '', text: '' }
  }

  const message = value as Record<string, unknown>
  const actions = readMessageActions(message.actions)

  return {
    ...(actions ? { actions } : {}),
    className: readString(message.className, ''),
    meta: readString(message.meta, ''),
    text: readString(message.text, '')
  }
}

function readMessageActions(value: unknown): MessageView['actions'] | undefined {
  if (!value || typeof value !== 'object') {
    return undefined
  }

  const actions = value as Record<string, unknown>

  return {
    acceptMessage: actions.acceptMessage,
    ignoreMessage: actions.ignoreMessage
  }
}

function readContactPickerContact(value: unknown): ContactPickerContactView | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const contact = value as Record<string, unknown>

  if (typeof contact.profileId !== 'string') {
    return null
  }

  return {
    alias: readString(contact.alias, contact.profileId),
    avatar: readProfileAvatarView(contact.avatar),
    isSelected: Boolean(contact.isSelected),
    profileId: contact.profileId
  }
}

function readTreeholePostView(value: unknown): TreeholePostView {
  if (!value || typeof value !== 'object') {
    return createEmptyTreeholePost()
  }

  const post = value as Record<string, unknown>
  const actions = readTreeholePostActions(post.actions)

  return {
    actions,
    authorAvatar: readProfileAvatarView(post.authorAvatar),
    authorLabel: readString(post.authorLabel, ''),
    className: readString(post.className, ''),
    comments: readTreeholeComments(post.comments),
    statsLabel: readString(post.statsLabel, ''),
    text: readString(post.text, ''),
    timeLabel: readString(post.timeLabel, '')
  }
}

function readTreeholePostActions(value: unknown): TreeholePostView['actions'] {
  if (!value || typeof value !== 'object') {
    return {
      commentPostId: '',
      likePostId: ''
    }
  }

  const actions = value as Record<string, unknown>

  return {
    commentPostId: readString(actions.commentPostId, ''),
    likePostId: readString(actions.likePostId, '')
  }
}

function readTreeholeComments(value: unknown): TreeholeCommentView[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.map((comment) => {
    if (!comment || typeof comment !== 'object') {
      return {
        authorLabel: '',
        text: ''
      }
    }

    const entry = comment as Record<string, unknown>

    return {
      authorAvatar: readProfileAvatarView(entry.authorAvatar),
      authorLabel: readString(entry.authorLabel, ''),
      className: readString(entry.className, ''),
      text: readString(entry.text, '')
    }
  })
}

function createEmptyTreeholePost(): TreeholePostView {
  return {
    actions: {
      commentPostId: '',
      likePostId: ''
    },
    authorLabel: '',
    comments: [],
    statsLabel: '',
    text: '',
    timeLabel: ''
  }
}

function readString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback
}

function readNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isSafeInteger(value) ? value : fallback
}

function readProfileAvatarView(value: unknown): ProfileAvatarView | undefined {
  if (!value || typeof value !== 'object') {
    return undefined
  }

  const avatar = value as Record<string, unknown>
  const imageUri = readString(avatar.imageUri, '')
  const initials = readString(avatar.initials, '')
  const label = readString(avatar.label, '')
  const tone = readString(avatar.tone, '')

  if (!initials || !label || !tone) {
    return undefined
  }

  return { ...(imageUri ? { imageUri } : {}), initials, label, tone }
}
