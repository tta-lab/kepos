import React from 'react'
import { MessageCircle, Users } from 'lucide-react'

export function PeoplePane({ activeTab, actions, messageRequests, trustedContacts }) {
  return (
    <section id='peoplePane' className={activeTab === 'people' ? 'pane' : 'pane hidden'}>
      <PaneLabel eyebrow='trusted' title='People' />
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
            <p className='muted smallText'>No message requests</p>
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
            <p className='muted smallText'>No trusted friends yet</p>
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

function PaneLabel({ eyebrow, title }) {
  return (
    <div className='paneLabel'>
      <p className='paneEyebrow'>{eyebrow}</p>
      <h2 className='paneTitle'>{title}</h2>
    </div>
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
