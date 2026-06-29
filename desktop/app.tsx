/* global document */

import type { KeyboardEvent, MouseEvent } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { X } from 'lucide-react'
import { useDesktopAppModel } from './app-state.jsx'
import { ContextPanel } from './context-components.jsx'
import { DirectPane, HomePane, TreeholePane } from './pane-components.jsx'
import { PeoplePane } from './people-components.jsx'
import { AppRail, HomeStatusPanel, Topbar } from './shell-components.jsx'
import { ActionButton } from './ui-components.tsx'

type LargeQrState = {
  isOpen: boolean
  svg: string
  title?: string
}

type DesktopAppModel = {
  activeTab: string
  contextForm: unknown
  contextFormActions: unknown
  controls: unknown
  directComposer: unknown
  directComposerActions: unknown
  directContactPicker: unknown
  directContactPickerActions: unknown
  directMessageActions: unknown
  directMessages: Array<{ actions?: unknown }>
  homeComposerActions: { sendHomeMessage: () => void }
  homeMessages: unknown[]
  largeQr: LargeQrState
  people: { messageRequests: unknown[]; trustedContacts: unknown[] }
  peopleActions: unknown
  setContextForm: unknown
  setDirectComposer: unknown
  setTheme: (theme: string) => void
  shareQrOutputs: unknown
  shellActions: {
    hideLargeQr: () => void
    leaveHome: () => void
    setTab: (tab: string) => void
  }
  status: unknown
  theme: string
  treeholeActions: unknown
  treeholeComposerActions: { postTreehole: () => void }
  treeholePosts: unknown[]
}

function DesktopApp() {
  const model = useDesktopAppModel() as DesktopAppModel
  const navBadges = {
    direct: model.directMessages.filter((message) => message.actions).length,
    people: model.people.messageRequests.length
  }

  return (
    <>
      <main className='shell'>
        <AppRail
          activeTab={model.activeTab}
          navBadges={navBadges}
          shellActions={model.shellActions}
        />

        <section className='workspace'>
          <Topbar setTheme={model.setTheme} status={model.status} theme={model.theme} />

          <HomePane
            activeTab={model.activeTab}
            controls={model.controls}
            messages={model.homeMessages}
            onSend={model.homeComposerActions.sendHomeMessage}
          />

          <DirectPane
            activeTab={model.activeTab}
            composer={model.directComposer}
            composerActions={model.directComposerActions}
            contactPicker={model.directContactPicker}
            contactPickerActions={model.directContactPickerActions}
            controls={model.controls}
            messageActions={model.directMessageActions}
            messages={model.directMessages}
            setComposer={model.setDirectComposer}
          />

          <TreeholePane
            activeTab={model.activeTab}
            actions={model.treeholeActions}
            controls={model.controls}
            onPost={model.treeholeComposerActions.postTreehole}
            posts={model.treeholePosts}
          />

          <PeoplePane
            activeTab={model.activeTab}
            actions={model.peopleActions}
            messageRequests={model.people.messageRequests}
            trustedContacts={model.people.trustedContacts}
          />
        </section>

        <aside className='contextPanel' aria-label='Home and people context'>
          <ContextPanel
            actions={model.contextFormActions}
            controls={model.controls}
            form={model.contextForm}
            setForm={model.setContextForm}
            shareQrOutputs={model.shareQrOutputs}
          />
          <HomeStatusPanel
            controls={model.controls}
            onLeave={model.shellActions.leaveHome}
            status={model.status}
          />
        </aside>
      </main>

      <LargeQrDialog onClose={model.shellActions.hideLargeQr} qr={model.largeQr} />
    </>
  )
}

function LargeQrDialog({ onClose, qr }: { onClose: () => void; qr: LargeQrState }) {
  return (
    <div
      id='largeQrDialog'
      className={qr.isOpen ? 'largeQrDialog' : 'largeQrDialog hidden'}
      role='dialog'
      aria-modal='true'
      aria-labelledby='largeQrTitle'
      tabIndex={-1}
      onClick={(event: MouseEvent<HTMLDivElement>) => {
        if (event.target === event.currentTarget) onClose()
      }}
      onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Escape') onClose()
      }}
    >
      <section className='largeQrPanel'>
        <div className='largeQrHeader'>
          <p id='largeQrTitle' className='label'>
            {qr.title || 'QR'}
          </p>
          <ActionButton
            ariaLabel='Close QR dialog'
            autoFocus={qr.isOpen}
            className='smallButton'
            icon={<X size={16} />}
            id='largeQrCloseButton'
            label='Close'
            onClick={onClose}
          />
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

const rootElement = document.querySelector('#root')
if (!rootElement) throw new Error('Desktop root element is missing.')

const root = createRoot(rootElement)

flushSync(() => {
  root.render(<DesktopApp />)
})
