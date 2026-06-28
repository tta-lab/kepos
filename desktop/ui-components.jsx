import React from 'react'

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
