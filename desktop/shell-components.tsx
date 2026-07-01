import React from 'react'
import { House, LogOut, Moon, Send, Sprout, Sun, Users } from 'lucide-react'
import { getProductSurfaceLabel, getProductSurfaceTitle } from '../src/product-surfaces.ts'
import { ActionButton } from './ui-components.tsx'

type ActiveTab = 'chat' | 'dm' | 'treehole' | 'people'
type ThemeName = 'light' | 'dark'

type NavBadges = {
  direct: number
  people: number
}

type ShellActions = {
  setTab(tab: ActiveTab): unknown
}

type StatusView = {
  errorDetailLabel: string
  homeStatusLabel: string
  noticeLabel: string
  peerLabel: string
  profileIdLabel: string
  roomKeyLabel: string
  transportDebugLabel: string
  treeholeStatusLabel: string
}

type ControlsView = {
  canLeaveHome: boolean
}

type ThemeButtonProps = {
  active: boolean
  icon: React.ReactNode
  id: string
  label: string
  onClick(): unknown
  title: string
}

type RailButtonProps = {
  badgeCount?: number
  icon: React.ReactNode
  id: string
  isActive: boolean
  label: string
  onSelect(): unknown
  title: string
}

export function AppRail({
  activeTab,
  navBadges,
  shellActions
}: {
  activeTab: ActiveTab
  navBadges: NavBadges
  shellActions: ShellActions
}) {
  return (
    <aside className='appRail' aria-label='Kepos views'>
      <div className='mark'>K</div>
      <nav className='railNav' aria-label='Main views' role='tablist'>
        <RailButton
          id='chatTab'
          icon={<House size={20} />}
          isActive={activeTab === 'chat'}
          label={getProductSurfaceLabel('chat')}
          onSelect={() => shellActions.setTab('chat')}
          title={getProductSurfaceTitle('chat')}
        />
        <RailButton
          id='dmTab'
          icon={<Send size={19} />}
          isActive={activeTab === 'dm'}
          label={getProductSurfaceLabel('dm')}
          badgeCount={navBadges.direct}
          onSelect={() => shellActions.setTab('dm')}
          title={getProductSurfaceTitle('dm')}
        />
        <RailButton
          id='peopleTab'
          icon={<Users size={19} />}
          isActive={activeTab === 'people'}
          label={getProductSurfaceLabel('people')}
          badgeCount={navBadges.people}
          onSelect={() => shellActions.setTab('people')}
          title={getProductSurfaceTitle('people')}
        />
        <RailButton
          id='treeholeTab'
          icon={<Sprout size={19} />}
          isActive={activeTab === 'treehole'}
          label={getProductSurfaceLabel('treehole')}
          onSelect={() => shellActions.setTab('treehole')}
          title={getProductSurfaceTitle('treehole')}
        />
      </nav>
    </aside>
  )
}

export function Topbar({
  setTheme,
  status,
  theme
}: {
  setTheme(theme: ThemeName): unknown
  status: StatusView
  theme: ThemeName
}) {
  return (
    <header className='topbar'>
      <div>
        <p className='kicker'>private garden</p>
        <h1>Kepos</h1>
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
        <ThemeButton
          active={theme === 'light'}
          icon={<Sun size={15} />}
          id='lightThemeButton'
          label='Light'
          onClick={() => setTheme('light')}
          title='Neo Cozy light'
        />
        <ThemeButton
          active={theme === 'dark'}
          icon={<Moon size={15} />}
          id='darkThemeButton'
          label='Dark'
          onClick={() => setTheme('dark')}
          title='Indie Console dark'
        />
      </div>
    </header>
  )
}

function ThemeButton({ active, icon, id, label, onClick, title }: ThemeButtonProps) {
  return (
    <button
      id={id}
      className={active ? 'themeButton active' : 'themeButton'}
      type='button'
      aria-pressed={active}
      title={title}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  )
}

export function HomeStatusPanel({
  controls,
  onLeave,
  status
}: {
  controls: ControlsView
  onLeave(): unknown
  status: StatusView
}) {
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
        <p className='label'>Transport</p>
        <p id='transportDebugLabel' className='mono muted'>
          {status.transportDebugLabel}
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

function RailButton({
  badgeCount = 0,
  icon,
  id,
  isActive,
  label,
  onSelect,
  title
}: RailButtonProps) {
  return (
    <button
      id={id}
      className={isActive ? 'railButton active' : 'railButton'}
      type='button'
      title={title}
      role='tab'
      aria-label={getRailButtonLabel(label, badgeCount)}
      aria-selected={isActive}
      onClick={onSelect}
    >
      {icon}
      {badgeCount > 0 ? (
        <span className='railBadge' aria-label={`${label} pending ${badgeCount}`}>
          {badgeCount > 99 ? '99+' : badgeCount}
        </span>
      ) : null}
    </button>
  )
}

function getRailButtonLabel(label: string, badgeCount: number): string {
  if (badgeCount > 0) {
    return `${label}, ${badgeCount} pending`
  }

  return label
}
