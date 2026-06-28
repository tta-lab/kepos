/* global document */

import React from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { X } from 'lucide-react'
import { useDesktopAppModel } from './app-state.jsx'
import { ContextPanel } from './context-components.jsx'
import { DirectPane, HomePane, TreeholePane } from './pane-components.jsx'
import { PeoplePane } from './people-components.jsx'
import { AppRail, HomeStatusPanel, Topbar } from './shell-components.jsx'

function DesktopApp() {
  const model = useDesktopAppModel()
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
            aria-label='Close QR dialog'
            autoFocus={qr.isOpen}
            onClick={onClose}
          >
            <X size={16} />
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

const root = createRoot(document.querySelector('#root'))

flushSync(() => {
  root.render(<DesktopApp />)
})
