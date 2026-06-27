/* global document */

import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { MessageCircle, Send, Sprout } from 'lucide-react'
import { ContextPanel } from './context-components.jsx'
import { AppRail, HomeStatusPanel, Topbar } from './shell-components.jsx'

const THEME_STORAGE_KEY = 'kepos.desktop.theme'
const DEFAULT_STATUS = {
  errorDetailLabel: 'none',
  homeStatusLabel: 'Offline',
  noticeLabel: 'Create or join a home.',
  peerLabel: '0',
  profileIdLabel: 'not ready',
  roomKeyLabel: 'not joined',
  treeholeStatusLabel: 'Treehole offline'
}
const DEFAULT_CONTROLS = {
  canCreateHome: true,
  canLeaveHome: false,
  canPostTreehole: false,
  canUseDirectComposer: false,
  canUseHomeQrJoin: false,
  canUseHomeChatComposer: false,
  canUseManualHomeJoin: false,
  canUseTrustProfile: false
}
const DEFAULT_CONTEXT_FORM = {
  displayName: 'Desktop',
  homeQrUri: '',
  roomKey: '',
  trustAlias: '',
  trustQrUri: ''
}
const EMPTY_LARGE_QR = { isOpen: false, svg: '', title: '' }
const EMPTY_SHARE_QR_OUTPUTS = {
  homeSvg: '',
  homeUri: '',
  profileSvg: '',
  profileUri: ''
}
const desktopUiBridge = {
  setActiveTab: () => {},
  setContextFormActions: () => {},
  setContextFormDraft: () => {},
  setControls: () => {},
  setDirectComposerActions: () => {},
  setDirectComposerRecipient: () => {},
  setDirectContactPicker: () => {},
  setDirectContactPickerActions: () => {},
  setDirectMessageActions: () => {},
  setDirectMessages: () => {},
  setHomeComposerActions: () => {},
  setHomeMessages: () => {},
  setLargeQr: () => {},
  setPeople: () => {},
  setPeopleActions: () => {},
  setShareQrOutputs: () => {},
  setShellActions: () => {},
  setShellBusy: () => {},
  setStatus: () => {},
  setTreeholeActions: () => {},
  setTreeholeComposerActions: () => {},
  setTreeholePosts: () => {}
}

globalThis.keposDesktopUi = {
  setActiveTab(tab = 'chat') {
    desktopUiBridge.setActiveTab(tab)
  },
  setContextFormActions(actions = {}) {
    desktopUiBridge.setContextFormActions(actions)
  },
  setContextFormDraft(draft = {}) {
    desktopUiBridge.setContextFormDraft(draft)
  },
  setControls(controls = DEFAULT_CONTROLS) {
    desktopUiBridge.setControls(controls)
  },
  setDirectComposerActions(actions = {}) {
    desktopUiBridge.setDirectComposerActions(actions)
  },
  setDirectComposerRecipient(toProfileId = '') {
    desktopUiBridge.setDirectComposerRecipient(toProfileId)
  },
  setDirectContactPicker(
    picker = {
      contacts: [],
      empty: {
        actionLabel: 'Add trusted friend',
        copy: 'Add a trusted friend before starting a direct message.',
        title: 'No trusted friends yet'
      }
    }
  ) {
    desktopUiBridge.setDirectContactPicker(picker)
  },
  setDirectContactPickerActions(actions = {}) {
    desktopUiBridge.setDirectContactPickerActions(actions)
  },
  setDirectMessageActions(actions = {}) {
    desktopUiBridge.setDirectMessageActions(actions)
  },
  setDirectMessages(messages = []) {
    desktopUiBridge.setDirectMessages(messages)
  },
  setHomeComposerActions(actions = {}) {
    desktopUiBridge.setHomeComposerActions(actions)
  },
  setHomeMessages(messages = []) {
    desktopUiBridge.setHomeMessages(messages)
  },
  setLargeQr(qr = EMPTY_LARGE_QR) {
    desktopUiBridge.setLargeQr(qr)
  },
  setPeople(people = { messageRequests: [], trustedContacts: [] }) {
    desktopUiBridge.setPeople(people)
  },
  setPeopleActions(actions = {}) {
    desktopUiBridge.setPeopleActions(actions)
  },
  setShareQrOutputs(outputs = EMPTY_SHARE_QR_OUTPUTS) {
    desktopUiBridge.setShareQrOutputs(outputs)
  },
  setShellActions(actions = {}) {
    desktopUiBridge.setShellActions(actions)
  },
  setShellBusy(isBusy = false) {
    desktopUiBridge.setShellBusy(isBusy)
  },
  setStatus(status = DEFAULT_STATUS) {
    desktopUiBridge.setStatus(status)
  },
  setTreeholeActions(actions = {}) {
    desktopUiBridge.setTreeholeActions(actions)
  },
  setTreeholeComposerActions(actions = {}) {
    desktopUiBridge.setTreeholeComposerActions(actions)
  },
  setTreeholePosts(posts = []) {
    desktopUiBridge.setTreeholePosts(posts)
  }
}

function DesktopApp() {
  const [activeTab, setActiveTab] = useState('chat')
  const [contextForm, setContextForm] = useState(DEFAULT_CONTEXT_FORM)
  const [contextFormActions, setContextFormActions] = useState({
    copyHomeQr: () => {},
    copyProfileQr: () => {},
    createHome: () => {},
    joinHomeQr: () => {},
    joinManualHome: () => {},
    showLargeHomeQr: () => {},
    showLargeProfileQr: () => {},
    trustProfileQr: () => {},
    updateDisplayName: () => {}
  })
  const [controls, setControls] = useState(DEFAULT_CONTROLS)
  const [directContactPicker, setDirectContactPicker] = useState({
    contacts: [],
    empty: {
      actionLabel: 'Add trusted friend',
      copy: 'Add a trusted friend before starting a direct message.',
      title: 'No trusted friends yet'
    }
  })
  const [directContactPickerActions, setDirectContactPickerActions] = useState({
    openPeople: () => {},
    selectContact: () => {}
  })
  const [directComposer, setDirectComposer] = useState({
    text: '',
    toProfileId: ''
  })
  const [directComposerActions, setDirectComposerActions] = useState({
    sendDirectMessage: () => {},
    updateRecipient: () => {}
  })
  const [directMessageActions, setDirectMessageActions] = useState({
    acceptMessage: () => {},
    ignoreMessage: () => {}
  })
  const [directMessages, setDirectMessages] = useState([])
  const [homeComposerActions, setHomeComposerActions] = useState({
    sendHomeMessage: () => {}
  })
  const [homeMessages, setHomeMessages] = useState([])
  const [largeQr, setLargeQr] = useState(EMPTY_LARGE_QR)
  const [people, setPeople] = useState({ messageRequests: [], trustedContacts: [] })
  const [peopleActions, setPeopleActions] = useState({
    acceptMessageRequest: () => {},
    ignoreMessageRequest: () => {},
    revokeContact: () => {}
  })
  const [shareQrOutputs, setShareQrOutputs] = useState(EMPTY_SHARE_QR_OUTPUTS)
  const [isShellBusy, setShellBusy] = useState(false)
  const [shellActions, setShellActions] = useState({
    hideLargeQr: () => {},
    leaveHome: () => {},
    setTab: () => {}
  })
  const [treeholeActions, setTreeholeActions] = useState({
    commentPost: () => {},
    likePost: () => {}
  })
  const [treeholeComposerActions, setTreeholeComposerActions] = useState({
    postTreehole: () => {}
  })
  const [treeholePosts, setTreeholePosts] = useState([])
  const [status, setStatus] = useState(DEFAULT_STATUS)
  const [theme, setTheme] = useState(getInitialTheme)
  desktopUiBridge.setActiveTab = setActiveTab
  desktopUiBridge.setContextFormActions = setContextFormActions
  desktopUiBridge.setContextFormDraft = (draft = {}) => {
    setContextForm((current) => ({ ...current, ...draft }))
  }
  desktopUiBridge.setControls = setControls
  desktopUiBridge.setDirectComposerActions = setDirectComposerActions
  desktopUiBridge.setDirectComposerRecipient = (toProfileId = '') => {
    setDirectComposer((current) => ({ ...current, toProfileId }))
  }
  desktopUiBridge.setDirectContactPicker = setDirectContactPicker
  desktopUiBridge.setDirectContactPickerActions = setDirectContactPickerActions
  desktopUiBridge.setDirectMessageActions = setDirectMessageActions
  desktopUiBridge.setDirectMessages = setDirectMessages
  desktopUiBridge.setHomeComposerActions = setHomeComposerActions
  desktopUiBridge.setHomeMessages = setHomeMessages
  desktopUiBridge.setLargeQr = setLargeQr
  desktopUiBridge.setPeople = setPeople
  desktopUiBridge.setPeopleActions = setPeopleActions
  desktopUiBridge.setShareQrOutputs = setShareQrOutputs
  desktopUiBridge.setShellActions = setShellActions
  desktopUiBridge.setShellBusy = setShellBusy
  desktopUiBridge.setStatus = setStatus
  desktopUiBridge.setTreeholeActions = setTreeholeActions
  desktopUiBridge.setTreeholeComposerActions = setTreeholeComposerActions
  desktopUiBridge.setTreeholePosts = setTreeholePosts

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      globalThis.localStorage?.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      // Theme persistence is optional; the UI still works without storage.
    }
  }, [theme])

  useEffect(() => {
    document.body.setAttribute('aria-busy', String(isShellBusy))
  }, [isShellBusy])

  return (
    <>
      <main className='shell'>
        <AppRail activeTab={activeTab} shellActions={shellActions} />

        <section className='workspace'>
          <Topbar setTheme={setTheme} status={status} theme={theme} />

          <section id='chatPane' className={activeTab === 'chat' ? 'pane' : 'pane hidden'}>
            <PaneLabel eyebrow='live' title='Live home chat' />
            <HomeChatList messages={homeMessages} />
            <HomeChatComposer controls={controls} onSend={homeComposerActions.sendHomeMessage} />
          </section>

          <section id='dmPane' className={activeTab === 'dm' ? 'pane' : 'pane hidden'}>
            <PaneLabel eyebrow='durable' title='Direct messages' />
            <DirectMessageList
              messages={directMessages}
              onAccept={directMessageActions.acceptMessage}
              onIgnore={directMessageActions.ignoreMessage}
            />
            <DirectComposer
              actions={directComposerActions}
              composer={directComposer}
              contactPicker={directContactPicker}
              contactPickerActions={directContactPickerActions}
              controls={controls}
              setComposer={setDirectComposer}
            />
          </section>

          <section id='treeholePane' className={activeTab === 'treehole' ? 'pane' : 'pane hidden'}>
            <PaneLabel eyebrow='durable' title='Durable treehole' />
            <TreeholeList actions={treeholeActions} posts={treeholePosts} />
            <TreeholeComposer controls={controls} onPost={treeholeComposerActions.postTreehole} />
          </section>

          <section id='peoplePane' className={activeTab === 'people' ? 'pane' : 'pane hidden'}>
            <PaneLabel eyebrow='trusted' title='People' />
            <PeopleLists
              actions={peopleActions}
              messageRequests={people.messageRequests}
              trustedContacts={people.trustedContacts}
            />
          </section>
        </section>

        <aside className='contextPanel' aria-label='Home and people context'>
          <ContextPanel
            actions={contextFormActions}
            controls={controls}
            form={contextForm}
            setForm={setContextForm}
            shareQrOutputs={shareQrOutputs}
          />
          <HomeStatusPanel controls={controls} onLeave={shellActions.leaveHome} status={status} />
        </aside>
      </main>

      <LargeQrDialog onClose={shellActions.hideLargeQr} qr={largeQr} />
    </>
  )
}

function LargeQrDialog({ onClose, qr }) {
  return (
    <div
      id='largeQrDialog'
      className={qr.isOpen ? 'largeQrDialog' : 'largeQrDialog hidden'}
      role='dialog'
      aria-modal='true'
      aria-labelledby='largeQrTitle'
      tabIndex={-1}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose()
      }}
    >
      <section className='largeQrPanel'>
        <div className='largeQrHeader'>
          <p id='largeQrTitle' className='label'>
            {qr.title || 'QR'}
          </p>
          <button
            id='largeQrCloseButton'
            className='smallButton'
            type='button'
            autoFocus={qr.isOpen}
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div
          id='largeQrCode'
          className='largeQrCode'
          aria-label='Large QR code'
          dangerouslySetInnerHTML={{ __html: qr.svg }}
        />
      </section>
    </div>
  )
}

function getInitialTheme() {
  try {
    const savedTheme = globalThis.localStorage?.getItem(THEME_STORAGE_KEY)
    if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme
  } catch {
    // Ignore unavailable storage and fall through to system preference.
  }

  return globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
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

function SectionTitle({ icon, id, text }) {
  return (
    <p id={id} className='label sectionTitle'>
      {icon}
      <span>{text}</span>
    </p>
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
          <p className='meta'>{message.meta}</p>
          <p>{message.text}</p>
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
          <p className='meta'>{message.meta}</p>
          <p>{message.text}</p>
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

function PeopleLists({ actions, messageRequests, trustedContacts }) {
  return (
    <>
      <section className='panel contactsPanel'>
        <SectionTitle icon={<MessageCircle size={15} />} text='Message requests' />
        <div id='requestList' className='managedContacts'>
          {messageRequests.length === 0 ? (
            <p className='muted smallText'>No message requests</p>
          ) : (
            messageRequests.map((request) => (
              <div key={request.profileId} className='managedContact'>
                <div>
                  <p>{request.title}</p>
                  <p className='mono muted smallText'>{request.profileLabel}</p>
                  <p className='muted smallText'>{request.preview}</p>
                </div>
                <div className='inlineActions'>
                  <button
                    className='smallButton'
                    type='button'
                    onClick={() => actions.ignoreMessageRequest(request.profileId)}
                  >
                    Ignore
                  </button>
                  <button
                    className='smallButton'
                    type='button'
                    onClick={() => actions.acceptMessageRequest(request.acceptMessage)}
                  >
                    Accept
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
      <section className='panel contactsPanel'>
        <SectionTitle icon={<Users size={15} />} text='Trusted friends' />
        <div id='contactList' className='managedContacts'>
          {trustedContacts.length === 0 ? (
            <p className='muted smallText'>No trusted friends yet</p>
          ) : (
            trustedContacts.map((contact) => (
              <div key={contact.profileId} className='managedContact'>
                <div>
                  <p>{contact.alias}</p>
                  <p className='mono muted smallText'>{contact.shortProfileId}</p>
                  <div className='trustMeta'>
                    <span>{contact.statusLabel}</span>
                    <span>{contact.sourceLabel}</span>
                    <span>{contact.trustedAtLabel}</span>
                  </div>
                </div>
                <button
                  className='smallButton dangerButton'
                  type='button'
                  onClick={() => actions.revokeContact(contact.profileId)}
                >
                  Revoke
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </>
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
          <p>{post.text}</p>
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

const root = createRoot(document.querySelector('#root'))

flushSync(() => {
  root.render(<DesktopApp />)
})

import('./controller.js').catch((error) => {
  console.error('[kepos-desktop] failed to start controller', error)
})
