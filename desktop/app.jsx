/* global document */

import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import {
  Copy,
  Home,
  LogOut,
  MessageCircle,
  Moon,
  QrCode,
  Send,
  ShieldCheck,
  Sprout,
  Sun,
  UserPlus,
  Users
} from 'lucide-react'

const THEME_STORAGE_KEY = 'kepos.desktop.theme'
const desktopUiBridge = {
  setDirectContactPicker: () => {},
  setDirectContactPickerActions: () => {},
  setDirectMessageActions: () => {},
  setDirectMessages: () => {},
  setHomeMessages: () => {},
  setPeople: () => {},
  setPeopleActions: () => {},
  setTreeholeActions: () => {},
  setTreeholePosts: () => {}
}

globalThis.keposDesktopUi = {
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
  setHomeMessages(messages = []) {
    desktopUiBridge.setHomeMessages(messages)
  },
  setPeople(people = { messageRequests: [], trustedContacts: [] }) {
    desktopUiBridge.setPeople(people)
  },
  setPeopleActions(actions = {}) {
    desktopUiBridge.setPeopleActions(actions)
  },
  setTreeholeActions(actions = {}) {
    desktopUiBridge.setTreeholeActions(actions)
  },
  setTreeholePosts(posts = []) {
    desktopUiBridge.setTreeholePosts(posts)
  }
}

function DesktopApp() {
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
  const [directMessageActions, setDirectMessageActions] = useState({
    acceptMessage: () => {},
    ignoreMessage: () => {}
  })
  const [directMessages, setDirectMessages] = useState([])
  const [homeMessages, setHomeMessages] = useState([])
  const [people, setPeople] = useState({ messageRequests: [], trustedContacts: [] })
  const [peopleActions, setPeopleActions] = useState({
    acceptMessageRequest: () => {},
    ignoreMessageRequest: () => {},
    revokeContact: () => {}
  })
  const [treeholeActions, setTreeholeActions] = useState({
    commentPost: () => {},
    likePost: () => {}
  })
  const [treeholePosts, setTreeholePosts] = useState([])
  const [theme, setTheme] = useState(getInitialTheme)
  desktopUiBridge.setDirectContactPicker = setDirectContactPicker
  desktopUiBridge.setDirectContactPickerActions = setDirectContactPickerActions
  desktopUiBridge.setDirectMessageActions = setDirectMessageActions
  desktopUiBridge.setDirectMessages = setDirectMessages
  desktopUiBridge.setHomeMessages = setHomeMessages
  desktopUiBridge.setPeople = setPeople
  desktopUiBridge.setPeopleActions = setPeopleActions
  desktopUiBridge.setTreeholeActions = setTreeholeActions
  desktopUiBridge.setTreeholePosts = setTreeholePosts

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      globalThis.localStorage?.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      // Theme persistence is optional; the UI still works without storage.
    }
  }, [theme])

  return (
    <>
      <main className='shell'>
        <aside className='appRail' aria-label='Kepos views'>
          <div className='mark'>K</div>
          <nav className='railNav' aria-label='Main views'>
            <button
              id='chatTab'
              className='railButton active'
              type='button'
              title='Home chat'
              aria-current='page'
            >
              <MessageCircle size={19} />
              <span className='railLabel'>Home</span>
            </button>
            <button id='dmTab' className='railButton' type='button' title='Direct messages'>
              <Send size={19} />
              <span className='railLabel'>Direct</span>
            </button>
            <button id='treeholeTab' className='railButton' type='button' title='Treehole'>
              <Sprout size={19} />
              <span className='railLabel'>Treehole</span>
            </button>
            <button id='peopleTab' className='railButton' type='button' title='People'>
              <Users size={19} />
              <span className='railLabel'>People</span>
            </button>
          </nav>
        </aside>

        <section className='workspace'>
          <header className='topbar'>
            <div>
              <p className='kicker'>private garden</p>
              <h1>Kepos Home</h1>
              <p id='noticeLabel' className='notice'>
                Create or join a home.
              </p>
              <p id='treeholeStatusLabel' className='subnotice'>
                Treehole offline
              </p>
            </div>
            <div className='themeSwitch' role='group' aria-label='Theme'>
              <button
                id='lightThemeButton'
                className={theme === 'light' ? 'themeButton active' : 'themeButton'}
                type='button'
                aria-pressed={theme === 'light'}
                title='Neo Cozy light'
                onClick={() => setTheme('light')}
              >
                <Sun size={15} />
                Light
              </button>
              <button
                id='darkThemeButton'
                className={theme === 'dark' ? 'themeButton active' : 'themeButton'}
                type='button'
                aria-pressed={theme === 'dark'}
                title='Indie Console dark'
                onClick={() => setTheme('dark')}
              >
                <Moon size={15} />
                Dark
              </button>
            </div>
          </header>

          <section id='chatPane' className='pane'>
            <PaneLabel eyebrow='live' title='Live home chat' />
            <HomeChatList messages={homeMessages} />
            <form id='chatForm' className='composer'>
              <input id='chatInput' placeholder='Write to the home' autoComplete='off' />
              <button id='chatSendButton' type='submit'>
                <Send size={17} />
                Send
              </button>
            </form>
          </section>

          <section id='dmPane' className='pane hidden'>
            <PaneLabel eyebrow='durable' title='Direct messages' />
            <DirectMessageList
              messages={directMessages}
              onAccept={directMessageActions.acceptMessage}
              onIgnore={directMessageActions.ignoreMessage}
            />
            <form id='dmForm' className='composer tall'>
              <DirectContactPicker
                actions={directContactPickerActions}
                contacts={directContactPicker.contacts}
                empty={directContactPicker.empty}
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
                  />
                </label>
              </details>
              <textarea id='dmInput' placeholder='Write a direct message' />
              <button id='dmSendButton' type='submit'>
                <Send size={17} />
                Send message
              </button>
            </form>
          </section>

          <section id='treeholePane' className='pane hidden'>
            <PaneLabel eyebrow='durable' title='Durable treehole' />
            <TreeholeList actions={treeholeActions} posts={treeholePosts} />
            <form id='treeholeForm' className='composer tall'>
              <p id='treeholePostPolicy' className='composerHint' hidden>
                Only the owner can post here.
              </p>
              <textarea id='treeholeInput' placeholder='Post to the treehole' />
              <button id='treeholeSendButton' type='submit'>
                <Sprout size={17} />
                Post
              </button>
            </form>
          </section>

          <section id='peoplePane' className='pane hidden'>
            <PaneLabel eyebrow='trusted' title='People' />
            <PeopleLists
              actions={peopleActions}
              messageRequests={people.messageRequests}
              trustedContacts={people.trustedContacts}
            />
          </section>
        </section>

        <aside className='contextPanel' aria-label='Home and people context'>
          <details className='contextGroup homeActions' aria-labelledby='homeActionsTitle' open>
            <summary className='contextHead'>
              <SectionTitle id='homeActionsTitle' icon={<Home size={15} />} text='Home' />
              <p className='contextHint'>Start your home, invite a friend, or join theirs.</p>
            </summary>

            <form id='lobbyForm' className='panel compactPanel'>
              <label>
                Name
                <input id='nickInput' autoComplete='off' defaultValue='Desktop' />
              </label>
              <div className='actions singleAction'>
                <button id='createButton' type='button'>
                  <HomeIcon />
                  Create my home
                </button>
              </div>
              <details id='advancedJoin' className='advanced'>
                <summary>Advanced</summary>
                <label>
                  Manual home key
                  <textarea
                    id='roomKeyInput'
                    placeholder='64-character manual key'
                    spellCheck='false'
                  />
                </label>
                <button id='joinButton' type='submit'>
                  <LogOut size={17} />
                  Join home
                </button>
              </details>
            </form>

            <form id='homeQrForm' className='panel qrPanel'>
              <div className='actions'>
                <button id='showLargeHomeQrButton' type='button'>
                  <QrCode size={17} />
                  Invite a friend
                </button>
                <button id='copyHomeQrButton' type='button'>
                  <Copy size={17} />
                  Copy Home QR
                </button>
              </div>
              <details id='advancedHomeShare' className='advanced'>
                <summary>Advanced</summary>
                <div id='homeQrCode' className='qrCode' aria-label='My home QR code' />
                <label>
                  Home QR details
                  <textarea id='homeQrOutput' className='compactArea' readOnly spellCheck='false' />
                </label>
              </details>
              <label>
                Join a friend&apos;s home
                <textarea
                  id='homeQrInput'
                  className='compactArea'
                  placeholder='Paste Home QR'
                  spellCheck='false'
                />
              </label>
              <button id='joinHomeQrButton' type='submit'>
                <LogOut size={17} />
                Join home
              </button>
            </form>
          </details>

          <details className='contextGroup peopleActions' aria-labelledby='peopleActionsTitle'>
            <summary className='contextHead'>
              <SectionTitle
                id='peopleActionsTitle'
                icon={<ShieldCheck size={15} />}
                text='People'
              />
              <p className='contextHint'>Trust a friend before home access or direct messages.</p>
            </summary>

            <form id='trustForm' className='panel qrPanel'>
              <div className='actions'>
                <button id='showLargeProfileQrButton' type='button'>
                  <QrCode size={17} />
                  Show my profile
                </button>
                <button id='copyProfileQrButton' type='button'>
                  <Copy size={17} />
                  Copy Profile QR
                </button>
              </div>
              <details id='advancedProfileShare' className='advanced'>
                <summary>Advanced</summary>
                <div id='profileQrCode' className='qrCode' aria-label='My profile QR code' />
                <label>
                  Profile QR details
                  <textarea
                    id='profileQrOutput'
                    className='compactArea'
                    readOnly
                    spellCheck='false'
                  />
                </label>
              </details>
              <label>
                Friend profile
                <textarea
                  id='trustQrInput'
                  className='compactArea'
                  placeholder='Paste Profile QR'
                  spellCheck='false'
                />
              </label>
              <label>
                Friend name
                <input id='trustAliasInput' autoComplete='off' placeholder='Friend name' />
              </label>
              <button id='trustButton' type='submit'>
                <UserPlus size={17} />
                Add trusted friend
              </button>
            </form>
          </details>

          <section className='panel roomMeta'>
            <p className='label'>Home</p>
            <p id='homeStatusLabel' className='metric'>
              Offline
            </p>
            <p className='label'>Online</p>
            <p id='peerLabel' className='metric'>
              0
            </p>
            <details id='advancedStatus' className='advanced'>
              <summary>Advanced</summary>
              <p className='label'>Home</p>
              <p id='roomKeyLabel' className='mono muted'>
                not joined
              </p>
              <p className='label'>Profile</p>
              <p id='profileIdLabel' className='mono muted'>
                not ready
              </p>
              <p className='label'>Error detail</p>
              <p id='errorDetailLabel' className='mono muted'>
                none
              </p>
            </details>
            <button id='leaveButton' type='button' disabled>
              <LogOut size={17} />
              Leave
            </button>
          </section>
        </aside>
      </main>

      <div
        id='largeQrDialog'
        className='largeQrDialog hidden'
        role='dialog'
        aria-modal='true'
        aria-labelledby='largeQrTitle'
      >
        <section className='largeQrPanel'>
          <div className='largeQrHeader'>
            <p id='largeQrTitle' className='label'>
              QR
            </p>
            <button id='largeQrCloseButton' className='smallButton' type='button'>
              Close
            </button>
          </div>
          <div id='largeQrCode' className='largeQrCode' aria-label='Large QR code' />
        </section>
      </div>
    </>
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

function HomeIcon() {
  return <Home size={17} />
}

function SectionTitle({ icon, id, text }) {
  return (
    <p id={id} className='label sectionTitle'>
      {icon}
      <span>{text}</span>
    </p>
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

function DirectContactPicker({ actions, contacts, empty }) {
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
            className={contact.isSelected ? 'contactButton activeContactButton' : 'contactButton'}
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
