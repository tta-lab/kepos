import React from 'react'
import { LogOut, MessageCircle, Moon, Send, Sprout, Sun, Users } from 'lucide-react'

export function AppRail({ activeTab, shellActions }) {
  return (
    <aside className='appRail' aria-label='Kepos views'>
      <div className='mark'>K</div>
      <nav className='railNav' aria-label='Main views'>
        <RailButton
          id='chatTab'
          icon={<MessageCircle size={19} />}
          isActive={activeTab === 'chat'}
          label='Home'
          onSelect={() => shellActions.setTab('chat')}
          title='Home chat'
        />
        <RailButton
          id='dmTab'
          icon={<Send size={19} />}
          isActive={activeTab === 'dm'}
          label='Direct'
          onSelect={() => shellActions.setTab('dm')}
          title='Direct messages'
        />
        <RailButton
          id='treeholeTab'
          icon={<Sprout size={19} />}
          isActive={activeTab === 'treehole'}
          label='Treehole'
          onSelect={() => shellActions.setTab('treehole')}
          title='Treehole'
        />
        <RailButton
          id='peopleTab'
          icon={<Users size={19} />}
          isActive={activeTab === 'people'}
          label='People'
          onSelect={() => shellActions.setTab('people')}
          title='People'
        />
      </nav>
    </aside>
  )
}

export function Topbar({ setTheme, status, theme }) {
  return (
    <header className='topbar'>
      <div>
        <p className='kicker'>private garden</p>
        <h1>Kepos Home</h1>
        <p id='noticeLabel' className='notice'>
          {status.noticeLabel}
        </p>
        <p id='treeholeStatusLabel' className='subnotice'>
          {status.treeholeStatusLabel}
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
  )
}

export function HomeStatusPanel({ controls, onLeave, status }) {
  return (
    <section className='panel roomMeta'>
      <p className='label'>Home</p>
      <p id='homeStatusLabel' className='metric'>
        {status.homeStatusLabel}
      </p>
      <p className='label'>Online</p>
      <p id='peerLabel' className='metric'>
        {status.peerLabel}
      </p>
      <details id='advancedStatus' className='advanced'>
        <summary>Advanced</summary>
        <p className='label'>Home</p>
        <p id='roomKeyLabel' className='mono muted'>
          {status.roomKeyLabel}
        </p>
        <p className='label'>Profile</p>
        <p id='profileIdLabel' className='mono muted'>
          {status.profileIdLabel}
        </p>
        <p className='label'>Error detail</p>
        <p id='errorDetailLabel' className='mono muted'>
          {status.errorDetailLabel}
        </p>
      </details>
      <button id='leaveButton' type='button' disabled={!controls.canLeaveHome} onClick={onLeave}>
        <LogOut size={17} />
        Leave
      </button>
    </section>
  )
}

function RailButton({ icon, id, isActive, label, onSelect, title }) {
  return (
    <button
      id={id}
      className={isActive ? 'railButton active' : 'railButton'}
      type='button'
      title={title}
      aria-current={isActive ? 'page' : undefined}
      onClick={onSelect}
    >
      {icon}
      <span className='railLabel'>{label}</span>
    </button>
  )
}
