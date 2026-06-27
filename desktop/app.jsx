/* global document */

import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import {
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

function DesktopApp() {
  const [theme, setTheme] = useState(getInitialTheme)

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
            <button id='chatTab' className='railButton active' type='button' title='Home chat'>
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
            <ol
              id='messageList'
              className='list'
              aria-label='Home chat messages'
              data-empty='No messages yet'
            />
            <form id='chatForm' className='composer'>
              <input id='chatInput' placeholder='Write to the home' autoComplete='off' />
              <button type='submit'>
                <Send size={17} />
                Send
              </button>
            </form>
          </section>

          <section id='dmPane' className='pane hidden'>
            <PaneLabel eyebrow='durable' title='Direct messages' />
            <ol
              id='dmList'
              className='list'
              aria-label='Direct messages'
              data-empty='No direct messages yet'
            />
            <form id='dmForm' className='composer tall'>
              <div id='dmContactList' className='contactList' />
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
              <button type='submit'>
                <Send size={17} />
                Send message
              </button>
            </form>
          </section>

          <section id='treeholePane' className='pane hidden'>
            <PaneLabel eyebrow='durable' title='Durable treehole' />
            <ol
              id='treeholeList'
              className='list posts'
              aria-label='Treehole posts'
              data-empty='No posts yet'
            />
            <form id='treeholeForm' className='composer tall'>
              <p id='treeholePostPolicy' className='composerHint' hidden>
                Only the owner can post here.
              </p>
              <textarea id='treeholeInput' placeholder='Post to the treehole' />
              <button type='submit'>
                <Sprout size={17} />
                Post
              </button>
            </form>
          </section>
        </section>

        <aside className='contextPanel' aria-label='Home and people context'>
          <section className='contextGroup homeActions' aria-labelledby='homeActionsTitle'>
            <div className='contextHead'>
              <SectionTitle id='homeActionsTitle' icon={<Home size={15} />} text='Home' />
              <p className='contextHint'>Start your home, invite a friend, or join theirs.</p>
            </div>

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
              <button id='showLargeHomeQrButton' type='button'>
                <QrCode size={17} />
                Invite a friend
              </button>
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
          </section>

          <section className='contextGroup peopleActions' aria-labelledby='peopleActionsTitle'>
            <div className='contextHead'>
              <SectionTitle
                id='peopleActionsTitle'
                icon={<ShieldCheck size={15} />}
                text='People'
              />
              <p className='contextHint'>Trust a friend before home access or direct messages.</p>
            </div>

            <form id='trustForm' className='panel qrPanel'>
              <button id='showLargeProfileQrButton' type='button'>
                <QrCode size={17} />
                Show my profile
              </button>
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
          </section>

          <section className='panel contactsPanel'>
            <SectionTitle icon={<Users size={15} />} text='Trusted friends' />
            <div id='contactList' className='managedContacts' />
          </section>

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
            </details>
            <button id='leaveButton' type='button' disabled>
              <LogOut size={17} />
              Leave
            </button>
          </section>
        </aside>
      </main>

      <div id='largeQrDialog' className='largeQrDialog hidden' role='dialog' aria-modal='true'>
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

const root = createRoot(document.querySelector('#root'))

flushSync(() => {
  root.render(<DesktopApp />)
})

import('./controller.js').catch((error) => {
  console.error('[kepos-desktop] failed to start controller', error)
})
