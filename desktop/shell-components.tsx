import React from 'react'
import { House, LogOut, Moon, Send, Sprout, Sun, Users } from 'lucide-react'
import { productSurfaceTabs, type ProductSurfaceId } from '../src/product-surfaces.ts'
import { ActionButton } from './ui-components.tsx'

type ActiveTab = ProductSurfaceId
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

const RAIL_ICONS: Record<ProductSurfaceId, React.ReactNode> = {
  chat: <House size={20} />,
  dm: <Send size={19} />,
  people: <Users size={19} />,
  treehole: <Sprout size={19} />
}

const RAIL_TAB_IDS: Record<ProductSurfaceId, string> = {
  chat: 'chatTab',
  dm: 'dmTab',
  people: 'peopleTab',
  treehole: 'treeholeTab'
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
        {productSurfaceTabs.map((surface) => (
          <RailButton
            key={surface.id}
            id={RAIL_TAB_IDS[surface.id]}
            icon={RAIL_ICONS[surface.id]}
            isActive={activeTab === surface.id}
            label={surface.label}
            badgeCount={getRailBadgeCount(surface.id, navBadges)}
            onSelect={() => shellActions.setTab(surface.id)}
            title={surface.title}
          />
        ))}
      </nav>
    </aside>
  )
}

function getRailBadgeCount(surfaceId: ProductSurfaceId, navBadges: NavBadges): number {
  if (surfaceId === 'dm') return navBadges.direct
  if (surfaceId === 'people') return navBadges.people
  return 0
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
