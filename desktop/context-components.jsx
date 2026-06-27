import React from 'react'
import { Copy, Home, LogOut, QrCode, ShieldCheck, UserPlus } from 'lucide-react'

const ROOM_KEY_PATTERN = /^[0-9a-f]{64}$/

export function ContextPanel({ actions, controls, form, setForm, shareQrOutputs }) {
  const displayName = form.displayName.trim() || 'Desktop'
  const canJoinManualHome =
    controls.canUseManualHomeJoin && ROOM_KEY_PATTERN.test(form.roomKey.trim())
  const canJoinHomeQr = controls.canUseHomeQrJoin && Boolean(form.homeQrUri.trim())
  const canTrustProfile = controls.canUseTrustProfile && Boolean(form.trustQrUri.trim())

  function updateForm(patch) {
    setForm((current) => ({ ...current, ...patch }))
  }

  function handleDisplayNameChange(value) {
    updateForm({ displayName: value })
    actions.updateDisplayName({ displayName: value.trim() || 'Desktop' })
  }

  function handleManualJoin(event) {
    event.preventDefault()
    if (!canJoinManualHome) return
    actions.joinManualHome({ roomKey: form.roomKey.trim() })
  }

  function handleHomeQrJoin(event) {
    event.preventDefault()
    if (!canJoinHomeQr) return
    actions.joinHomeQr({
      displayName,
      uri: form.homeQrUri.trim()
    })
  }

  function handleTrustProfile(event) {
    event.preventDefault()
    if (!canTrustProfile) return
    actions.trustProfileQr({
      alias: form.trustAlias,
      displayName,
      uri: form.trustQrUri.trim()
    })
  }

  return (
    <>
      <details className='contextGroup homeActions' aria-labelledby='homeActionsTitle' open>
        <summary className='contextHead'>
          <SectionTitle id='homeActionsTitle' icon={<Home size={15} />} text='Home' />
          <p className='contextHint'>Start your home, invite a friend, or join theirs.</p>
        </summary>

        <form id='lobbyForm' className='panel compactPanel' onSubmit={handleManualJoin}>
          <label>
            Name
            <input
              id='nickInput'
              autoComplete='off'
              value={form.displayName}
              onChange={(event) => handleDisplayNameChange(event.target.value)}
            />
          </label>
          <div className='actions singleAction'>
            <button
              id='createButton'
              type='button'
              disabled={!controls.canCreateHome}
              onClick={() => actions.createHome()}
            >
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
                value={form.roomKey}
                onChange={(event) => updateForm({ roomKey: event.target.value })}
              />
            </label>
            <button id='joinButton' type='submit' disabled={!canJoinManualHome}>
              <LogOut size={17} />
              Join home
            </button>
          </details>
        </form>

        <form id='homeQrForm' className='panel qrPanel' onSubmit={handleHomeQrJoin}>
          <div className='actions'>
            <button
              id='showLargeHomeQrButton'
              type='button'
              onClick={(event) => actions.showLargeHomeQr({ returnFocus: event.currentTarget })}
            >
              <QrCode size={17} />
              Invite a friend
            </button>
            <button id='copyHomeQrButton' type='button' onClick={() => actions.copyHomeQr()}>
              <Copy size={17} />
              Copy Home QR
            </button>
          </div>
          <QrShareOutput
            detailsId='advancedHomeShare'
            label='Home QR details'
            outputId='homeQrOutput'
            qrId='homeQrCode'
            qrLabel='My home QR code'
            svg={shareQrOutputs.homeSvg}
            uri={shareQrOutputs.homeUri}
          />
          <label>
            Join a friend&apos;s home
            <textarea
              id='homeQrInput'
              className='compactArea'
              placeholder='Paste Home QR'
              spellCheck='false'
              value={form.homeQrUri}
              onChange={(event) => updateForm({ homeQrUri: event.target.value })}
            />
          </label>
          <button id='joinHomeQrButton' type='submit' disabled={!canJoinHomeQr}>
            <LogOut size={17} />
            Join home
          </button>
        </form>
      </details>

      <details className='contextGroup peopleActions' aria-labelledby='peopleActionsTitle'>
        <summary className='contextHead'>
          <SectionTitle id='peopleActionsTitle' icon={<ShieldCheck size={15} />} text='People' />
          <p className='contextHint'>Trust a friend before home access or direct messages.</p>
        </summary>

        <form id='trustForm' className='panel qrPanel' onSubmit={handleTrustProfile}>
          <div className='actions'>
            <button
              id='showLargeProfileQrButton'
              type='button'
              onClick={(event) => actions.showLargeProfileQr({ returnFocus: event.currentTarget })}
            >
              <QrCode size={17} />
              Show my profile
            </button>
            <button id='copyProfileQrButton' type='button' onClick={() => actions.copyProfileQr()}>
              <Copy size={17} />
              Copy Profile QR
            </button>
          </div>
          <QrShareOutput
            detailsId='advancedProfileShare'
            label='Profile QR details'
            outputId='profileQrOutput'
            qrId='profileQrCode'
            qrLabel='My profile QR code'
            svg={shareQrOutputs.profileSvg}
            uri={shareQrOutputs.profileUri}
          />
          <label>
            Friend profile
            <textarea
              id='trustQrInput'
              className='compactArea'
              placeholder='Paste Profile QR'
              spellCheck='false'
              value={form.trustQrUri}
              onChange={(event) => updateForm({ trustQrUri: event.target.value })}
            />
          </label>
          <label>
            Friend name
            <input
              id='trustAliasInput'
              autoComplete='off'
              placeholder='Ada'
              value={form.trustAlias}
              onChange={(event) => updateForm({ trustAlias: event.target.value })}
            />
          </label>
          <button id='trustButton' type='submit' disabled={!canTrustProfile}>
            <UserPlus size={17} />
            Add trusted friend
          </button>
        </form>
      </details>
    </>
  )
}

function QrShareOutput({ detailsId, label, outputId, qrId, qrLabel, svg, uri }) {
  return (
    <details id={detailsId} className='advanced'>
      <summary>Advanced</summary>
      <div
        id={qrId}
        className='qrCode'
        aria-label={qrLabel}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <label>
        {label}
        <textarea id={outputId} className='compactArea' readOnly spellCheck='false' value={uri} />
      </label>
    </details>
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

function HomeIcon() {
  return <Home size={17} />
}
