import React from 'react'
import { MessageCircle, Users } from 'lucide-react'
import { PaneHeader, SectionTitle } from './ui-components.jsx'

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
      <section className='panel contactsPanel'>
        <SectionTitle icon={<MessageCircle size={15} />} text='Message requests' />
        <div id='requestList' className='managedContacts'>
          {messageRequests.length === 0 ? (
            <PeopleEmptyState
              icon={<MessageCircle size={18} />}
              title='No requests waiting'
              copy='Message requests from trusted Home traffic will appear here.'
            />
          ) : (
            messageRequests.map((request) => (
              <div key={request.profileId} className='managedContact'>
                <div>
                  <p>{request.title}</p>
                  <p className='mono muted smallText'>{request.profileLabel}</p>
                  <p className='muted smallText'>{request.preview}</p>
                </div>
                <div className='inlineActions'>
                  <button
                    className='smallButton'
                    type='button'
                    onClick={() => actions.ignoreMessageRequest(request.profileId)}
                  >
                    Ignore
                  </button>
                  <button
                    className='smallButton'
                    type='button'
                    onClick={() => actions.acceptMessageRequest(request.acceptMessage)}
                  >
                    Accept
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
      <section className='panel contactsPanel'>
        <SectionTitle icon={<Users size={15} />} text='Trusted friends' />
        <div id='contactList' className='managedContacts'>
          {trustedContacts.length === 0 ? (
            <PeopleEmptyState
              icon={<Users size={18} />}
              title='No trusted friends yet'
              copy='Trusted people will appear here after you add a Profile QR.'
            />
          ) : (
            trustedContacts.map((contact) => (
              <div key={contact.profileId} className='managedContact'>
                <div>
                  <p>{contact.alias}</p>
                  <p className='mono muted smallText'>{contact.shortProfileId}</p>
                  <div className='trustMeta'>
                    <span>{contact.statusLabel}</span>
                    <span>{contact.sourceLabel}</span>
                    <span>{contact.trustedAtLabel}</span>
                  </div>
                </div>
                <button
                  className='smallButton dangerButton'
                  type='button'
                  onClick={() => actions.revokeContact(contact.profileId)}
                >
                  Revoke
                </button>
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
    <div className='peopleEmpty'>
      <span className='peopleEmptyIcon' aria-hidden='true'>
        {icon}
      </span>
      <div>
        <p className='peopleEmptyTitle'>{title}</p>
        <p className='peopleEmptyCopy'>{copy}</p>
      </div>
    </div>
  )
}
