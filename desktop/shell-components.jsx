import React from 'react'
import { LogOut, MessageCircle, Moon, Send, Sprout, Sun, Users } from 'lucide-react'
import { ActionButton } from './ui-components.jsx'

export function AppRail({ activeTab, navBadges, shellActions }) {
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
          badgeCount={navBadges.direct}
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
          badgeCount={navBadges.people}
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
        <div className='statusStrip' aria-label='Current status' aria-live='polite' role='status'>
          <p id='noticeLabel' className='statusPill noticePill'>
            {status.noticeLabel}
          </p>
          <p id='treeholeStatusLabel' className='statusPill treeholePill'>
            {status.treeholeStatusLabel}
          </p>
        </div>
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
      <div className='metricGrid'>
        <div className='metricCard'>
          <div className='metricLabel'>
            <p className='label'>Home</p>
          </div>
          <p id='homeStatusLabel' className='metric'>
            {status.homeStatusLabel}
          </p>
        </div>
        <div className='metricCard'>
          <div className='metricLabel'>
            <p className='label'>Online</p>
          </div>
          <p id='peerLabel' className='metric'>
            {status.peerLabel}
          </p>
        </div>
      </div>
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
      <ActionButton
        disabled={!controls.canLeaveHome}
        icon={<LogOut size={17} />}
        id='leaveButton'
        label='Leave'
        onClick={onLeave}
      />
    </section>
  )
}

function RailButton({ badgeCount = 0, icon, id, isActive, label, onSelect, title }) {
  return (
    <button
      id={id}
      className={isActive ? 'railButton active' : 'railButton'}
      type='button'
      title={title}
      aria-label={getRailButtonLabel(label, badgeCount)}
      aria-current={isActive ? 'page' : undefined}
      onClick={onSelect}
    >
      {icon}
      <span className='railLabel'>{label}</span>
      {badgeCount > 0 ? (
        <span className='railBadge' aria-label={`${label} pending ${badgeCount}`}>
          {badgeCount > 99 ? '99+' : badgeCount}
        </span>
      ) : null}
    </button>
  )
}

function getRailButtonLabel(label, badgeCount) {
  if (badgeCount > 0) {
    return `${label}, ${badgeCount} pending`
  }

  return label
}
