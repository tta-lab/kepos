/* global document */

import React from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import {
  Home,
  LogOut,
  MessageCircle,
  QrCode,
  Send,
  ShieldCheck,
  Sprout,
  UserPlus,
  Users
} from 'lucide-react'

function DesktopApp() {
  return (
    <>
      <main className='shell'>
        <aside className='sidebar'>
          <div className='brand'>
            <div className='mark'>K</div>
            <div>
              <p className='kicker'>private garden</p>
              <h1>Kepos Peer</h1>
            </div>
          </div>

          <form id='lobbyForm' className='panel'>
            <label>
              Nick
              <input id='nickInput' autoComplete='off' defaultValue='Desktop' />
            </label>
            <div className='actions singleAction'>
              <button id='createButton' type='button'>
                <HomeIcon />
                Create Home
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
                Join Home
              </button>
            </details>
          </form>

          <form id='homeQrForm' className='panel qrPanel'>
            <SectionTitle icon={<Home size={15} />} text='Home' />
            <div id='homeQrCode' className='qrCode' aria-label='My home QR code' />
            <button id='showLargeHomeQrButton' type='button'>
              <QrCode size={17} />
              Large Home QR
            </button>
            <details id='advancedHomeShare' className='advanced'>
              <summary>Advanced</summary>
              <label>
                My home URI
                <textarea id='homeQrOutput' className='compactArea' readOnly spellCheck='false' />
              </label>
            </details>
            <label>
              Join home URI
              <textarea
                id='homeQrInput'
                className='compactArea'
                placeholder='kepos://home...'
                spellCheck='false'
              />
            </label>
            <button id='joinHomeQrButton' type='submit'>
              <LogOut size={17} />
              Join Home URI
            </button>
          </form>

          <form id='trustForm' className='panel qrPanel'>
            <SectionTitle icon={<ShieldCheck size={15} />} text='People' />
            <div id='profileQrCode' className='qrCode' aria-label='My profile QR code' />
            <button id='showLargeProfileQrButton' type='button'>
              <QrCode size={17} />
              Large Profile QR
            </button>
            <details id='advancedProfileShare' className='advanced'>
              <summary>Advanced</summary>
              <label>
                My profile URI
                <textarea
                  id='profileQrOutput'
                  className='compactArea'
                  readOnly
                  spellCheck='false'
                />
              </label>
            </details>
            <label>
              Trust profile URI
              <textarea
                id='trustQrInput'
                className='compactArea'
                placeholder='kepos://profile...'
                spellCheck='false'
              />
            </label>
            <label>
              Alias
              <input id='trustAliasInput' autoComplete='off' placeholder='Contact name' />
            </label>
            <button id='trustButton' type='submit'>
              <UserPlus size={17} />
              Trust Profile
            </button>
          </form>

          <section className='panel contactsPanel'>
            <SectionTitle icon={<Users size={15} />} text='Contacts' />
            <div id='contactList' className='managedContacts' />
          </section>

          <section className='panel roomMeta'>
            <p className='label'>Home address</p>
            <p id='roomKeyLabel' className='mono muted'>
              not joined
            </p>
            <p className='label'>Profile</p>
            <p id='profileIdLabel' className='mono muted'>
              not ready
            </p>
            <p className='label'>Peers</p>
            <p id='peerLabel' className='metric'>
              0
            </p>
            <button id='leaveButton' type='button' disabled>
              <LogOut size={17} />
              Leave
            </button>
          </section>
        </aside>

        <section className='workspace'>
          <header className='topbar'>
            <div>
              <p id='noticeLabel' className='notice'>
                Create or join a home.
              </p>
              <p id='treeholeStatusLabel' className='subnotice'>
                treehole idle
              </p>
            </div>
            <div className='tabs'>
              <button id='chatTab' className='tab active' type='button' title='Home chat'>
                <MessageCircle size={17} />
                Chat
              </button>
              <button id='dmTab' className='tab' type='button' title='Direct messages'>
                <Send size={17} />
                DM
              </button>
              <button id='treeholeTab' className='tab' type='button' title='Treehole'>
                <Sprout size={17} />
                Treehole
              </button>
            </div>
          </header>

          <section id='chatPane' className='pane'>
            <ol id='messageList' className='list' />
            <form id='chatForm' className='composer'>
              <input id='chatInput' placeholder='Write to the home' autoComplete='off' />
              <button type='submit'>
                <Send size={17} />
                Send
              </button>
            </form>
          </section>

          <section id='dmPane' className='pane hidden'>
            <ol id='dmList' className='list' />
            <form id='dmForm' className='composer tall'>
              <div id='dmContactList' className='contactList' />
              <input
                id='dmRecipientInput'
                placeholder='Recipient profile id'
                autoComplete='off'
                spellCheck='false'
              />
              <textarea id='dmInput' placeholder='Write a direct message' />
              <button type='submit'>
                <Send size={17} />
                Send DM
              </button>
            </form>
          </section>

          <section id='treeholePane' className='pane hidden'>
            <ol id='treeholeList' className='list posts' />
            <form id='treeholeForm' className='composer tall'>
              <textarea id='treeholeInput' placeholder='Post to the treehole' />
              <button type='submit'>
                <Sprout size={17} />
                Post
              </button>
            </form>
          </section>
        </section>
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

function HomeIcon() {
  return <Home size={17} />
}

function SectionTitle({ icon, text }) {
  return (
    <p className='label sectionTitle'>
      {icon}
      <span>{text}</span>
    </p>
  )
}

const root = createRoot(document.querySelector('#root'))

flushSync(() => {
  root.render(<DesktopApp />)
})

import('./controller.js').catch((error) => {
  console.error('[kepos-desktop] failed to start controller', error)
})
