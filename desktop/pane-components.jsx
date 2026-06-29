import React, { useState } from 'react'
import { Heart, MessageCircle, Send, Sprout, UserPlus } from 'lucide-react'
import {
  ActionButton,
  ComposerSubmitButton,
  cx,
  PaneHeader,
  RequestActionButton
} from './ui-components.tsx'

export function HomePane({ activeTab, controls, messages, onSend }) {
  return (
    <section id='chatPane' className={activeTab === 'chat' ? 'pane' : 'pane hidden'}>
      <PaneHeader
        eyebrow='live'
        title='Live home chat'
        description='Ephemeral messages for everyone currently inside this home.'
      />
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
  setComposer
}) {
  return (
    <section id='dmPane' className={activeTab === 'dm' ? 'pane' : 'pane hidden'}>
      <PaneHeader
        eyebrow='durable'
        title='Direct messages'
        description='Private pairwise threads that survive restarts.'
      />
      <DirectMessageList
        messages={messages}
        onAccept={messageActions.acceptMessage}
        onIgnore={messageActions.ignoreMessage}
      />
      <DirectComposer
        actions={composerActions}
        composer={composer}
        contactPicker={contactPicker}
        contactPickerActions={contactPickerActions}
        controls={controls}
        setComposer={setComposer}
      />
    </section>
  )
}

export function TreeholePane({ activeTab, actions, controls, onPost, posts }) {
  return (
    <section id='treeholePane' className={activeTab === 'treehole' ? 'pane' : 'pane hidden'}>
      <PaneHeader
        eyebrow='durable'
        title='Durable treehole'
        description='The home owner writes the wall; trusted friends can react and comment.'
      />
      <TreeholeList actions={actions} posts={posts} />
      <TreeholeComposer controls={controls} onPost={onPost} />
    </section>
  )
}

function HomeChatComposer({ controls, onSend }) {
  const [draft, setDraft] = useState('')
  const canSend = controls.canUseHomeChatComposer && Boolean(draft.trim())

  function handleSubmit(event) {
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
  setComposer
}) {
  const canSend =
    controls.canUseDirectComposer &&
    Boolean(composer.text.trim()) &&
    Boolean(composer.toProfileId.trim())

  function setRecipient(toProfileId) {
    setComposer((current) => ({ ...current, toProfileId }))
    actions.updateRecipient({ toProfileId: toProfileId.trim() })
  }

  function handleSelectContact(profileId) {
    setRecipient(profileId)
    contactPickerActions.selectContact(profileId)
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (!canSend) return

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
        selectedProfileId={composer.toProfileId.trim()}
      />
      <details
        id='advancedDmRecipient'
        className='advanced advancedComposer collapse collapse-arrow rounded-lg border border-base-300 bg-base-200/60'
      >
        <summary>Advanced</summary>
        <label className='form-control grid gap-2 px-3 pb-3 text-xs font-black uppercase text-base-content/70'>
          Recipient profile id
          <input
            id='dmRecipientInput'
            className='input input-bordered input-sm w-full bg-base-100 text-sm normal-case text-base-content'
            placeholder='Recipient profile id'
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
        placeholder='Write a direct message'
        value={composer.text}
        onChange={(event) => setComposer((current) => ({ ...current, text: event.target.value }))}
      />
      <ComposerSubmitButton
        disabled={!canSend}
        icon={<Send size={17} />}
        id='dmSendButton'
        label='Send message'
      />
    </form>
  )
}

function TreeholeComposer({ controls, onPost }) {
  const [draft, setDraft] = useState('')
  const canPost = controls.canPostTreehole && Boolean(draft.trim())

  function handleSubmit(event) {
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
        placeholder='Post to the treehole'
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

function HomeChatList({ messages }) {
  return (
    <ol id='messageList' className='list bg-base-100' aria-label='Home chat messages'>
      {messages.length === 0 ? (
        <ListEmptyState
          icon={<MessageCircle size={18} />}
          title='No messages yet'
          copy='Send the first line from this desktop.'
        />
      ) : (
        messages.map((message, index) => (
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

function DirectMessageList({ messages, onAccept, onIgnore }) {
  return (
    <ol id='dmList' className='list bg-base-100' aria-label='Direct messages'>
      {messages.length === 0 ? (
        <ListEmptyState
          icon={<Send size={18} />}
          title='No direct messages yet'
          copy='Choose a trusted friend and send the first message.'
        />
      ) : (
        messages.map((message, index) => (
          <li
            key={`${message.meta}-${index}-${message.text}`}
            className={cx('item card border border-base-300 shadow-sm', message.className)}
          >
            <div className='messageMetaRow'>
              <p className='meta'>{message.meta}</p>
            </div>
            <p className='messageText'>{message.text}</p>
            {message.actions ? (
              <div className='inlineActions'>
                <RequestActionButton
                  ariaLabel='Ignore direct message request'
                  onClick={() => onIgnore(message.actions.ignoreMessage)}
                  variant='ignore'
                />
                <RequestActionButton
                  ariaLabel='Accept direct message request'
                  onClick={() => onAccept(message.actions.acceptMessage)}
                  variant='accept'
                />
              </div>
            ) : null}
          </li>
        ))
      )}
    </ol>
  )
}

function DirectContactPicker({ actions, contacts, empty, selectedProfileId }) {
  return (
    <div id='dmContactList' className='contactList flex flex-wrap gap-2'>
      {contacts.length === 0 ? (
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
        contacts.map((contact) => {
          const selected = contact.profileId === selectedProfileId || contact.isSelected

          return (
            <button
              key={contact.profileId}
              aria-label={`Direct recipient ${contact.alias}`}
              aria-pressed={selected}
              className={selected ? 'contactButton activeContactButton' : 'contactButton'}
              type='button'
              onClick={() => actions.selectContact(contact.profileId)}
            >
              {contact.alias}
            </button>
          )
        })
      )}
    </div>
  )
}

function TreeholeList({ actions, posts }) {
  return (
    <ol id='treeholeList' className='list posts bg-base-100' aria-label='Treehole posts'>
      {posts.length === 0 ? (
        <ListEmptyState
          icon={<Sprout size={18} />}
          title='No posts yet'
          copy='Posts from this home will appear here.'
        />
      ) : (
        posts.map((post, index) => (
          <li
            key={`${post.timeLabel}-${index}-${post.text}`}
            className={cx(
              'item post card border border-base-300 bg-base-100 shadow-sm',
              post.className
            )}
          >
            <div className='postHead'>
              <p className='meta'>{post.authorLabel}</p>
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
                  <p className='meta'>{comment.authorLabel}</p>
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

function ListEmptyState({ copy, icon, title }) {
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

function TreeholePostActions({ actions, post }) {
  const [draft, setDraft] = useState('')
  const hasDraft = Boolean(draft.trim())

  function submitComment(event) {
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
