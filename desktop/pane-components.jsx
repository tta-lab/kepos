import React, { useState } from 'react'
import { Send, Sprout } from 'lucide-react'

export function HomePane({ activeTab, controls, messages, onSend }) {
  return (
    <section id='chatPane' className={activeTab === 'chat' ? 'pane' : 'pane hidden'}>
      <PaneLabel eyebrow='live' title='Live home chat' />
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
      <PaneLabel eyebrow='durable' title='Direct messages' />
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
      <PaneLabel eyebrow='durable' title='Durable treehole' />
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
    <form id='chatForm' className='composer' onSubmit={handleSubmit}>
      <input
        id='chatInput'
        placeholder='Write to the home'
        autoComplete='off'
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
      <button id='chatSendButton' type='submit' disabled={!canSend}>
        <Send size={17} />
        Send
      </button>
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
    <form id='dmForm' className='composer tall' onSubmit={handleSubmit}>
      <DirectContactPicker
        actions={{
          openPeople: contactPickerActions.openPeople,
          selectContact: handleSelectContact
        }}
        contacts={contactPicker.contacts}
        empty={contactPicker.empty}
        selectedProfileId={composer.toProfileId.trim()}
      />
      <details id='advancedDmRecipient' className='advanced advancedComposer'>
        <summary>Advanced</summary>
        <label>
          Recipient profile id
          <input
            id='dmRecipientInput'
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
        placeholder='Write a direct message'
        value={composer.text}
        onChange={(event) => setComposer((current) => ({ ...current, text: event.target.value }))}
      />
      <button id='dmSendButton' type='submit' disabled={!canSend}>
        <Send size={17} />
        Send message
      </button>
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
      <p id='treeholePostPolicy' className='composerHint' hidden={controls.canPostTreehole}>
        Only the owner can post here.
      </p>
      <textarea
        id='treeholeInput'
        placeholder='Post to the treehole'
        disabled={!controls.canPostTreehole}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
      <button id='treeholeSendButton' type='submit' disabled={!canPost}>
        <Sprout size={17} />
        Post
      </button>
    </form>
  )
}

function PaneLabel({ eyebrow, title }) {
  return (
    <div className='paneLabel'>
      <p className='paneEyebrow'>{eyebrow}</p>
      <h2 className='paneTitle'>{title}</h2>
    </div>
  )
}

function HomeChatList({ messages }) {
  return (
    <ol
      id='messageList'
      className='list'
      aria-label='Home chat messages'
      data-empty='No messages yet'
      data-empty-detail='Send the first line from this desktop.'
    >
      {messages.map((message, index) => (
        <li key={`${message.meta}-${index}-${message.text}`} className={message.className}>
          <div className='messageMetaRow'>
            <p className='meta'>{message.meta}</p>
          </div>
          <p className='messageText'>{message.text}</p>
        </li>
      ))}
    </ol>
  )
}

function DirectMessageList({ messages, onAccept, onIgnore }) {
  return (
    <ol
      id='dmList'
      className='list'
      aria-label='Direct messages'
      data-empty='No direct messages yet'
      data-empty-detail='Choose a trusted friend and send the first message.'
    >
      {messages.map((message, index) => (
        <li key={`${message.meta}-${index}-${message.text}`} className={message.className}>
          <div className='messageMetaRow'>
            <p className='meta'>{message.meta}</p>
          </div>
          <p className='messageText'>{message.text}</p>
          {message.actions ? (
            <div className='inlineActions'>
              <button
                className='smallButton'
                type='button'
                onClick={() => onIgnore(message.actions.ignoreMessage)}
              >
                Ignore
              </button>
              <button
                className='smallButton'
                type='button'
                onClick={() => onAccept(message.actions.acceptMessage)}
              >
                Accept
              </button>
            </div>
          ) : null}
        </li>
      ))}
    </ol>
  )
}

function DirectContactPicker({ actions, contacts, empty, selectedProfileId }) {
  return (
    <div id='dmContactList' className='contactList'>
      {contacts.length === 0 ? (
        <div className='contactEmpty'>
          <p className='contactEmptyTitle'>{empty.title}</p>
          <p className='contactEmptyCopy'>{empty.copy}</p>
          <button type='button' onClick={actions.openPeople}>
            {empty.actionLabel}
          </button>
        </div>
      ) : (
        contacts.map((contact) => (
          <button
            key={contact.profileId}
            className={
              contact.profileId === selectedProfileId || contact.isSelected
                ? 'contactButton activeContactButton'
                : 'contactButton'
            }
            type='button'
            onClick={() => actions.selectContact(contact.profileId)}
          >
            {contact.alias}
          </button>
        ))
      )}
    </div>
  )
}

function TreeholeList({ actions, posts }) {
  return (
    <ol
      id='treeholeList'
      className='list posts'
      aria-label='Treehole posts'
      data-empty='No posts yet'
      data-empty-detail='Posts from this home will appear here.'
    >
      {posts.map((post, index) => (
        <li key={`${post.timeLabel}-${index}-${post.text}`} className={post.className}>
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
                className={comment.className}
              >
                <p className='meta'>{comment.authorLabel}</p>
                <p>{comment.text}</p>
              </div>
            ))}
          </div>
          <TreeholePostActions actions={actions} post={post} />
        </li>
      ))}
    </ol>
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
      <button
        className='smallButton'
        type='button'
        onClick={() => actions.likePost(post.actions.likePostId)}
      >
        Like
      </button>
      <form className='commentForm' onSubmit={submitComment}>
        <input
          className='commentInput'
          placeholder='Write a comment'
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button className='smallButton' disabled={!hasDraft} type='submit'>
          Comment
        </button>
      </form>
    </div>
  )
}
