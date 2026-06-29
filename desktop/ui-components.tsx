import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Check, X } from 'lucide-react'

type HeaderProps = {
  description: string
  eyebrow: string
  title: string
}

type SectionTitleProps = {
  icon: ReactNode
  id: string
  text: string
}

type ActionButtonProps = {
  ariaLabel?: string
  autoFocus?: boolean
  className?: string
  disabled?: boolean
  icon?: ReactNode
  id?: string
  label: string
  onClick?: ButtonHTMLAttributes<HTMLButtonElement>['onClick']
  type?: ButtonHTMLAttributes<HTMLButtonElement>['type']
}

type RequestActionButtonProps = {
  ariaLabel: string
  onClick: ButtonHTMLAttributes<HTMLButtonElement>['onClick']
  variant: 'accept' | 'ignore'
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export function PaneHeader({ description, eyebrow, title }: HeaderProps) {
  return (
    <div className='paneLabel flex flex-col gap-2'>
      <div>
        <p className='paneEyebrow text-xs font-semibold uppercase'>{eyebrow}</p>
        <h2 className='paneTitle text-2xl font-semibold'>{title}</h2>
      </div>
      <p className='paneDescription text-sm'>{description}</p>
    </div>
  )
}

export function PanelHeader({ description, eyebrow, title }: HeaderProps) {
  return (
    <div className='panelHeader flex items-start gap-3'>
      <p className='label badge badge-sm badge-ghost'>{eyebrow}</p>
      <div className='panelHeaderText min-w-0'>
        <h3 className='panelTitle text-sm font-semibold'>{title}</h3>
        <p className='panelDescription text-xs'>{description}</p>
      </div>
    </div>
  )
}

export function SectionTitle({ icon, id, text }: SectionTitleProps) {
  return (
    <p id={id} className='label sectionTitle flex items-center gap-2'>
      {icon}
      <span>{text}</span>
    </p>
  )
}

export function ActionButton({
  ariaLabel,
  autoFocus,
  className,
  disabled = false,
  icon,
  id,
  label,
  onClick,
  type = 'button'
}: ActionButtonProps) {
  return (
    <button
      aria-label={ariaLabel}
      autoFocus={autoFocus}
      className={cx('btn btn-primary min-h-9 rounded-md', className)}
      id={id}
      type={type}
      disabled={disabled}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  )
}

export function ComposerSubmitButton({
  className,
  disabled,
  icon,
  id,
  label
}: Pick<ActionButtonProps, 'className' | 'disabled' | 'icon' | 'id' | 'label'>) {
  return (
    <ActionButton
      className={className}
      disabled={disabled}
      icon={icon}
      id={id}
      label={label}
      type='submit'
    />
  )
}

export function RequestActionButton({ ariaLabel, onClick, variant }: RequestActionButtonProps) {
  const isAccept = variant === 'accept'
  const Icon = isAccept ? Check : X
  const label = isAccept ? 'Accept' : 'Ignore'

  return (
    <button
      aria-label={ariaLabel}
      className='btn btn-sm smallButton'
      type='button'
      onClick={onClick}
    >
      <Icon size={15} />
      {label}
    </button>
  )
}
