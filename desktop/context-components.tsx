import React from 'react'
import { Copy, Home, LogOut, QrCode, ShieldCheck, UserPlus } from 'lucide-react'
import { ActionButton, PanelHeader, SectionTitle } from './ui-components.tsx'

const ROOM_KEY_PATTERN = /^[0-9a-f]{64}$/

type ContextFormState = {
  avatarUri: string
  displayName: string
  homeQrUri: string
  roomKey: string
  trustAlias: string
  trustQrUri: string
}

type ContextControls = {
  canCreateHome: boolean
  canUseHomeQrJoin: boolean
  canUseManualHomeJoin: boolean
  canUseTrustProfile: boolean
}

type ContextActions = {
  copyHomeQr(): unknown
  copyProfileQr(): unknown
  createHome(payload: { displayName: string }): unknown
  joinHomeQr(payload: { displayName: string; uri: string }): unknown
  joinManualHome(payload: { displayName: string; roomKey: string }): unknown
  showLargeHomeQr(payload: { returnFocus: EventTarget & HTMLButtonElement }): unknown
  showLargeProfileQr(payload: { returnFocus: EventTarget & HTMLButtonElement }): unknown
  prepareProfileRequestTarget(payload: { alias: string; displayName: string; uri: string }): unknown
  updateAvatarMedia(payload: { bytesBase64: string; mimeType: string }): unknown
  updateAvatarUri(payload: { avatarUri: string }): unknown
  updateDisplayName(payload: { displayName: string }): unknown
}

type ShareQrOutputs = {
  homeSvg: string
  homeUri: string
  profileSvg: string
  profileUri: string
}

type QrShareOutputProps = {
  detailsId: string
  label: string
  outputId: string
  qrId: string
  qrLabel: string
  svg: string
  uri: string
}

export function ContextPanel({
  actions,
  controls,
  form,
  setForm,
  shareQrOutputs
}: {
  actions: ContextActions
  controls: ContextControls
  form: ContextFormState
  setForm: React.Dispatch<React.SetStateAction<ContextFormState>>
  shareQrOutputs: ShareQrOutputs
}) {
  const displayName = form.displayName.trim() || 'Desktop'
  const canJoinManualHome =
    controls.canUseManualHomeJoin && ROOM_KEY_PATTERN.test(form.roomKey.trim())
  const canJoinHomeQr = controls.canUseHomeQrJoin && Boolean(form.homeQrUri.trim())
  const canTrustProfile = controls.canUseTrustProfile && Boolean(form.trustQrUri.trim())

  function updateForm(patch: Partial<ContextFormState>) {
    setForm((current) => ({ ...current, ...patch }))
  }

  function handleDisplayNameChange(value: string) {
    updateForm({ displayName: value })
    actions.updateDisplayName({ displayName: value.trim() || 'Desktop' })
  }

  function handleAvatarUriChange(value: string) {
    updateForm({ avatarUri: value })
    actions.updateAvatarUri({ avatarUri: value })
  }

  async function handleAvatarFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    const bytesBase64 = arrayBufferToBase64(await file.arrayBuffer())
    updateForm({ avatarUri: file.name })
    actions.updateAvatarMedia({ bytesBase64, mimeType: file.type })
  }

  function handleManualJoin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canJoinManualHome) return
    actions.joinManualHome({ displayName, roomKey: form.roomKey.trim() })
  }

  function handleHomeQrJoin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canJoinHomeQr) return
    actions.joinHomeQr({
      displayName,
      uri: form.homeQrUri.trim()
    })
  }

  function handleProfileRequestTarget(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canTrustProfile) return
    actions.prepareProfileRequestTarget({
      alias: form.trustAlias,
      displayName,
      uri: form.trustQrUri.trim()
    })
  }

  return (
    <>
      <details className='contextGroup peopleActions' aria-labelledby='peopleActionsTitle' open>
        <summary className='contextHead'>
          <SectionTitle id='peopleActionsTitle' icon={<ShieldCheck size={15} />} text='Contacts' />
          <p className='contextHint'>Show My QR, scan a Profile QR, and start requests.</p>
        </summary>

        <form
          id='trustForm'
          className='panel qrPanel card border border-base-300 bg-base-100/75 shadow-sm'
          onSubmit={handleProfileRequestTarget}
        >
          <PanelHeader
            eyebrow='Contacts'
            title='Add friend'
            description='Paste a Profile QR, then write a request in Chat.'
          />
          <div className='actions'>
            <ActionButton
              icon={<QrCode size={17} />}
              id='showLargeProfileQrButton'
              label='Show My QR'
              onClick={(event) => actions.showLargeProfileQr({ returnFocus: event.currentTarget })}
            />
            <ActionButton
              icon={<Copy size={17} />}
              id='copyProfileQrButton'
              label='Copy Profile QR'
              onClick={() => actions.copyProfileQr()}
            />
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
            Profile QR
            <textarea
              id='trustQrInput'
              className='textarea textarea-bordered compactArea min-h-16 w-full resize-y bg-base-100 text-sm normal-case text-base-content'
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
              className='input input-bordered input-sm w-full bg-base-100 text-sm normal-case text-base-content'
              autoComplete='off'
              placeholder='Ada'
              value={form.trustAlias}
              onChange={(event) => updateForm({ trustAlias: event.target.value })}
            />
          </label>
          <ActionButton
            disabled={!canTrustProfile}
            icon={<UserPlus size={17} />}
            id='trustButton'
            label='Start request'
            type='submit'
          />
        </form>
      </details>

      <details className='contextGroup homeActions' aria-labelledby='homeActionsTitle'>
        <summary className='contextHead'>
          <SectionTitle id='homeActionsTitle' icon={<Home size={15} />} text='Home' />
          <p className='contextHint'>Open your home or enter a trusted live room.</p>
        </summary>

        <form
          id='lobbyForm'
          className='panel compactPanel card border border-base-300 bg-base-100/75 shadow-sm'
          onSubmit={handleManualJoin}
        >
          <PanelHeader
            eyebrow='Home'
            title='My home'
            description='Open your saved home on this device.'
          />
          <label>
            Name
            <input
              id='nickInput'
              className='input input-bordered input-sm w-full bg-base-100 text-sm normal-case text-base-content'
              autoComplete='off'
              value={form.displayName}
              onChange={(event) => handleDisplayNameChange(event.target.value)}
            />
          </label>
          <label>
            Avatar image
            <input
              id='avatarFileInput'
              className='file-input file-input-bordered file-input-sm mb-2 w-full bg-base-100 text-sm normal-case text-base-content'
              accept='image/png,image/jpeg,image/webp'
              type='file'
              onChange={handleAvatarFileChange}
            />
            <input
              id='avatarUriInput'
              className='input input-bordered input-sm w-full bg-base-100 text-sm normal-case text-base-content'
              autoComplete='off'
              value={form.avatarUri}
              onChange={(event) => handleAvatarUriChange(event.target.value)}
            />
          </label>
          <div className='actions singleAction'>
            <ActionButton
              disabled={!controls.canCreateHome}
              icon={<Home size={17} />}
              id='createButton'
              label='Open Home'
              onClick={() => actions.createHome({ displayName })}
            />
            <ActionButton
              icon={<QrCode size={17} />}
              id='showMyQrButton'
              label='Show My QR'
              onClick={(event) => actions.showLargeProfileQr({ returnFocus: event.currentTarget })}
            />
          </div>
          <details
            id='advancedJoin'
            className='advanced collapse collapse-arrow rounded-lg border border-base-300 bg-base-100/60'
          >
            <summary>Advanced</summary>
            <label>
              Manual home key
              <textarea
                id='roomKeyInput'
                className='textarea textarea-bordered min-h-20 w-full resize-y bg-base-100 text-sm normal-case text-base-content'
                placeholder='64-character manual key'
                spellCheck='false'
                value={form.roomKey}
                onChange={(event) => updateForm({ roomKey: event.target.value })}
              />
            </label>
            <ActionButton
              disabled={!canJoinManualHome}
              icon={<LogOut size={17} />}
              id='joinButton'
              label='Enter Home'
              type='submit'
            />
          </details>
        </form>

        <details
          id='advancedHomeQrControls'
          className='advanced collapse collapse-arrow rounded-lg border border-base-300 bg-base-100/60'
        >
          <summary>Advanced</summary>
          <form
            id='homeQrForm'
            className='panel qrPanel card border border-base-300 bg-base-100/75 shadow-sm'
            onSubmit={handleHomeQrJoin}
          >
            <PanelHeader
              eyebrow='Advanced'
              title='Debug Home QR'
              description='Debug home descriptor for explicit live-room entry; it does not create friendship.'
            />
            <div className='actions'>
              <ActionButton
                icon={<QrCode size={17} />}
                id='showLargeHomeQrButton'
                label='Show Debug Home QR'
                onClick={(event) => actions.showLargeHomeQr({ returnFocus: event.currentTarget })}
              />
              <ActionButton
                icon={<Copy size={17} />}
                id='copyHomeQrButton'
                label='Copy Debug Home QR'
                onClick={() => actions.copyHomeQr()}
              />
            </div>
            <QrShareOutput
              detailsId='advancedHomeShare'
              label='Debug Home QR details'
              outputId='homeQrOutput'
              qrId='homeQrCode'
              qrLabel='My debug home QR code'
              svg={shareQrOutputs.homeSvg}
              uri={shareQrOutputs.homeUri}
            />
            <label>
              Enter Home
              <textarea
                id='homeQrInput'
                className='textarea textarea-bordered compactArea min-h-16 w-full resize-y bg-base-100 text-sm normal-case text-base-content'
                placeholder='Paste Debug Home QR'
                spellCheck='false'
                value={form.homeQrUri}
                onChange={(event) => updateForm({ homeQrUri: event.target.value })}
              />
            </label>
            <ActionButton
              disabled={!canJoinHomeQr}
              icon={<LogOut size={17} />}
              id='joinHomeQrButton'
              label='Enter Home'
              type='submit'
            />
          </form>
        </details>
      </details>
    </>
  )
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''

  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index])
  }

  return btoa(binary)
}

function QrShareOutput({
  detailsId,
  label,
  outputId,
  qrId,
  qrLabel,
  svg,
  uri
}: QrShareOutputProps) {
  return (
    <details
      id={detailsId}
      className='advanced collapse collapse-arrow rounded-lg border border-base-300 bg-base-100/60'
    >
      <summary>Advanced</summary>
      <div
        id={qrId}
        className='qrCode rounded-lg border border-base-300 bg-base-100 p-2'
        aria-label={qrLabel}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <label>
        {label}
        <textarea
          id={outputId}
          className='textarea textarea-bordered compactArea min-h-16 w-full resize-y bg-base-100 text-sm normal-case text-base-content'
          readOnly
          spellCheck='false'
          value={uri}
        />
      </label>
    </details>
  )
}
