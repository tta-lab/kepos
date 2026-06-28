import React from 'react'
import { Check, X } from 'lucide-react'

export function PaneHeader({ description, eyebrow, title }) {
  return (
    <div className='paneLabel'>
      <div>
        <p className='paneEyebrow'>{eyebrow}</p>
        <h2 className='paneTitle'>{title}</h2>
      </div>
      <p className='paneDescription'>{description}</p>
    </div>
  )
}

export function PanelHeader({ description, eyebrow, title }) {
  return (
    <div className='panelHeader'>
      <p className='label'>{eyebrow}</p>
      <div className='panelHeaderText'>
        <h3 className='panelTitle'>{title}</h3>
        <p className='panelDescription'>{description}</p>
      </div>
    </div>
  )
}

export function SectionTitle({ icon, id, text }) {
  return (
    <p id={id} className='label sectionTitle'>
      {icon}
      <span>{text}</span>
    </p>
  )
}

export function ComposerSubmitButton({ disabled, icon, id, label }) {
  return (
    <button id={id} type='submit' disabled={disabled}>
      {icon}
      {label}
    </button>
  )
}

export function RequestActionButton({ ariaLabel, onClick, variant }) {
  const isAccept = variant === 'accept'
  const Icon = isAccept ? Check : X
  const label = isAccept ? 'Accept' : 'Ignore'

  return (
    <button aria-label={ariaLabel} className='smallButton' type='button' onClick={onClick}>
      <Icon size={15} />
      {label}
    </button>
  )
}
