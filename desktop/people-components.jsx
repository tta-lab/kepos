import React from 'react'
import { MessageCircle, UserX, Users } from 'lucide-react'
import { ActionButton, PaneHeader, RequestActionButton, SectionTitle } from './ui-components.tsx'

export function PeoplePane({ activeTab, actions, messageRequests, trustedContacts }) {
  return (
    <section id='peoplePane' className={activeTab === 'people' ? 'pane' : 'pane hidden'}>
      <PaneHeader
        eyebrow='trusted'
        title='People'
        description='Manage who can enter your home and start direct threads.'
      />
      <PeopleLists
        actions={actions}
        messageRequests={messageRequests}
        trustedContacts={trustedContacts}
      />
    </section>
  )
}

export function PeopleLists({ actions, messageRequests, trustedContacts }) {
  return (
    <>
      <section className='panel contactsPanel card border border-base-300 bg-base-200/70 shadow-sm'>
        <SectionTitle icon={<MessageCircle size={15} />} text='Message requests' />
        <div id='requestList' className='managedContacts grid gap-2'>
          {messageRequests.length === 0 ? (
            <PeopleEmptyState
              icon={<MessageCircle size={18} />}
              title='No requests waiting'
              copy='Message requests from trusted Home traffic will appear here.'
            />
          ) : (
            messageRequests.map((request) => (
              <div
                key={request.profileId}
                className='managedContact card grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg border border-base-300 bg-base-100/80 p-3'
              >
                <div>
                  <p className='font-black text-base-content'>{request.title}</p>
                  <p className='mono muted smallText text-xs text-base-content/60'>
                    {request.profileLabel}
                  </p>
                  <p className='muted smallText text-xs text-base-content/65'>{request.preview}</p>
                </div>
                <div className='inlineActions flex flex-wrap justify-end gap-2'>
                  <RequestActionButton
                    ariaLabel={`Ignore message request from ${request.title}`}
                    onClick={() => actions.ignoreMessageRequest(request.profileId)}
                    variant='ignore'
                  />
                  <RequestActionButton
                    ariaLabel={`Accept message request from ${request.title}`}
                    onClick={() => actions.acceptMessageRequest(request.acceptMessage)}
                    variant='accept'
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </section>
      <section className='panel contactsPanel card border border-base-300 bg-base-200/70 shadow-sm'>
        <SectionTitle icon={<Users size={15} />} text='Trusted friends' />
        <div id='contactList' className='managedContacts grid gap-2'>
          {trustedContacts.length === 0 ? (
            <PeopleEmptyState
              icon={<Users size={18} />}
              title='No trusted friends yet'
              copy='Trusted people will appear here after you add a Profile QR.'
            />
          ) : (
            trustedContacts.map((contact) => (
              <div
                key={contact.profileId}
                className='managedContact card grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg border border-base-300 bg-base-100/80 p-3'
              >
                <div>
                  <p className='font-black text-base-content'>{contact.alias}</p>
                  <p className='mono muted smallText text-xs text-base-content/60'>
                    {contact.shortProfileId}
                  </p>
                  <div className='trustMeta flex flex-wrap gap-1 text-xs text-base-content/65'>
                    <span className='badge badge-success badge-sm font-black'>
                      {contact.statusLabel}
                    </span>
                    <span>{contact.sourceLabel}</span>
                    <span>{contact.trustedAtLabel}</span>
                  </div>
                </div>
                <ActionButton
                  ariaLabel={`Revoke trust for ${contact.alias}`}
                  className='smallButton dangerButton'
                  icon={<UserX size={15} />}
                  label='Revoke'
                  onClick={() => actions.revokeContact(contact.profileId)}
                />
              </div>
            ))
          )}
        </div>
      </section>
    </>
  )
}

function PeopleEmptyState({ copy, icon, title }) {
  return (
    <div className='peopleEmpty rounded-lg border border-dashed border-base-300 bg-base-100/70 p-3'>
      <span
        className='peopleEmptyIcon rounded-lg border border-base-300 bg-success/15 text-success'
        aria-hidden='true'
      >
        {icon}
      </span>
      <div>
        <p className='peopleEmptyTitle text-sm font-black text-base-content'>{title}</p>
        <p className='peopleEmptyCopy text-xs font-semibold text-base-content/65'>{copy}</p>
      </div>
    </div>
  )
}
