import React from 'react'
import {
  Fingerprint,
  House,
  MessageCircle,
  RefreshCw,
  Send,
  ShieldOff,
  Sprout,
  User,
  UserPlus,
  UserX,
  Users,
  X
} from 'lucide-react'
import { ActionButton, PaneHeader, RequestActionButton, SectionTitle } from './ui-components.tsx'
import type { ProfileRelationshipState } from '../src/profile-relationship-state.ts'
import { createProfileDetailActions } from '../src/profile-detail-actions.ts'

type PeopleActions = {
  acceptMessageRequest(message: MessageRequestView['acceptMessage']): unknown
  allowContactRequests(profileId: string): unknown
  closeProfile(): unknown
  enterContactHome(profileId: string): unknown
  ignoreMessageRequest(profileId: string): unknown
  messageContact(profileId: string): unknown
  openProfile(profileId: string): unknown
  retryOutgoingFriendRequest(profileId: string): unknown
  revokeContact(profileId: string): unknown
}

export type MessageRequestView = {
  acceptMessage: {
    fromProfileId: string
    nick: string
    type: 'kepos.message.request.v1'
  }
  preview: string
  profileId: string
  profileLabel: string
  title: string
}

export type OutgoingRequestView = {
  profileId: string
  profileLabel: string
  retryActionEnabled: boolean
  retryActionLabel: string
  requestedAtLabel: string
  statusLabel: string
  textPreview: string
  title: string
}

export type BlockedContactView = {
  blockedAtLabel: string
  copy: string
  profileId: string
  profileLabel: string
  shortProfileId: string
  statusLabel: string
}

export type TrustedContactView = {
  acceptMessage?: MessageRequestView['acceptMessage']
  alias: string
  avatar?: ProfileAvatarView
  canRemove?: boolean
  homeActionEnabled: boolean
  homeActionLabel: string
  messageActionEnabled: boolean
  messageActionLabel: string
  profileId: string
  recentCopy?: string
  recentPosts?: {
    id: string
    metaLabel: string
    text: string
  }[]
  recentTitle: string
  relationshipState: ProfileRelationshipState
  revokeActionLabel?: string
  shortProfileId: string
  sourceLabel: string
  statusLabel: string
  trustedAtLabel: string
}

type ProfileAvatarView = {
  imageUri?: string
  initials: string
  label: string
  tone: string
}

type PeoplePaneProps = {
  activeTab: string
  actions: PeopleActions
  blockedContacts?: BlockedContactView[]
  messageRequests: MessageRequestView[]
  outgoingRequests?: OutgoingRequestView[]
  selectedProfile?: TrustedContactView | null
  trustedContacts: TrustedContactView[]
}

export function PeoplePane({
  activeTab,
  actions,
  blockedContacts = [],
  messageRequests,
  outgoingRequests = [],
  selectedProfile = null,
  trustedContacts
}: PeoplePaneProps) {
  return (
    <section id='peoplePane' className={activeTab === 'people' ? 'pane' : 'pane hidden'}>
      <PaneHeader
        eyebrow='profiles'
        title='Contacts'
        description='Trusted profiles, Chat, and Home entry live here.'
      />
      <PeopleLists
        actions={actions}
        blockedContacts={blockedContacts}
        messageRequests={messageRequests}
        outgoingRequests={outgoingRequests}
        trustedContacts={trustedContacts}
      />
      <ContactProfileDetail actions={actions} profile={selectedProfile} />
    </section>
  )
}

export function PeopleLists({
  actions,
  blockedContacts = [],
  messageRequests,
  outgoingRequests = [],
  trustedContacts
}: Omit<PeoplePaneProps, 'activeTab'>) {
  return (
    <>
      <section className='panel contactsPanel card border border-base-300 bg-base-200/70 shadow-sm'>
        <SectionTitle
          id='friendRequestsTitle'
          icon={<MessageCircle size={15} />}
          text='Friend requests'
        />
        <div id='requestList' className='managedContacts grid gap-2'>
          {messageRequests.length === 0 ? (
            <PeopleEmptyState
              icon={<MessageCircle size={18} />}
              title='No requests waiting'
              copy='Friend requests you receive will appear here.'
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
                  <ActionButton
                    ariaLabel={`Open ${request.profileLabel} profile`}
                    className='smallButton'
                    icon={<User size={15} />}
                    label='Profile'
                    onClick={() => actions.openProfile(request.profileId)}
                  />
                  <RequestActionButton
                    ariaLabel={`Ignore friend request from ${request.title}`}
                    onClick={() => actions.ignoreMessageRequest(request.profileId)}
                    variant='ignore'
                  />
                  <RequestActionButton
                    ariaLabel={`Accept friend request from ${request.title}`}
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
        <SectionTitle id='sentRequestsTitle' icon={<Send size={15} />} text='Sent requests' />
        <div id='outgoingRequestList' className='managedContacts grid gap-2'>
          {outgoingRequests.length === 0 ? (
            <PeopleEmptyState
              icon={<Send size={18} />}
              title='No sent requests'
              copy='Friend requests you send will stay here until accepted.'
            />
          ) : (
            outgoingRequests.map((request) => (
              <div
                key={request.profileId}
                className='managedContact card grid gap-2 rounded-lg border border-base-300 bg-base-100/80 p-3'
              >
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <p className='font-black text-base-content'>{request.title}</p>
                  <span className='badge badge-warning badge-sm font-black'>
                    {request.statusLabel}
                  </span>
                </div>
                <p className='mono muted smallText text-xs text-base-content/60'>
                  {request.profileLabel}
                </p>
                <p className='muted smallText text-xs text-base-content/65'>
                  {request.textPreview}
                </p>
                <p className='muted smallText text-xs text-base-content/60'>
                  {request.requestedAtLabel}
                </p>
                <div className='inlineActions flex flex-wrap justify-end gap-2'>
                  <ActionButton
                    ariaLabel={`Retry friend request to ${request.profileLabel}`}
                    className='smallButton'
                    disabled={!request.retryActionEnabled}
                    icon={<RefreshCw size={15} />}
                    label={request.retryActionLabel}
                    onClick={() => actions.retryOutgoingFriendRequest(request.profileId)}
                  />
                  <ActionButton
                    ariaLabel={`Open ${request.profileLabel} profile`}
                    className='smallButton'
                    icon={<User size={15} />}
                    label='Profile'
                    onClick={() => actions.openProfile(request.profileId)}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </section>
      <section className='panel contactsPanel card border border-base-300 bg-base-200/70 shadow-sm'>
        <SectionTitle id='profilesTitle' icon={<Users size={15} />} text='Profiles' />
        <div id='contactList' className='managedContacts grid gap-2'>
          {trustedContacts.length === 0 ? (
            <PeopleEmptyState
              icon={<Users size={18} />}
              title='No trusted friends yet'
              copy='Trusted contacts will appear here after a friend request is accepted.'
            />
          ) : (
            trustedContacts.map((contact) => (
              <div
                key={contact.profileId}
                className='managedContact card grid grid-cols-[1fr_auto] gap-3 rounded-lg border border-base-300 bg-base-100/80 p-3'
              >
                <div className='grid gap-2'>
                  <div className='flex min-w-0 items-start gap-3'>
                    <ProfileAvatar avatar={contact.avatar} />
                    <div className='min-w-0'>
                      <p className='font-black text-base-content'>{contact.alias}</p>
                      <p className='mono muted smallText text-xs text-base-content/60'>
                        {contact.shortProfileId}
                      </p>
                    </div>
                  </div>
                  <div className='trustMeta flex flex-wrap gap-1 text-xs text-base-content/65'>
                    <span className='badge badge-success badge-sm font-black'>
                      {contact.statusLabel}
                    </span>
                    <span>{contact.sourceLabel}</span>
                    <span>{contact.trustedAtLabel}</span>
                  </div>
                  <div className='profileRecent rounded-lg border border-dashed border-base-300 bg-base-200/60 p-2'>
                    <p className='flex items-center gap-1 text-xs font-black uppercase text-base-content/70'>
                      <Sprout size={13} />
                      {contact.recentTitle}
                    </p>
                    <p className='text-xs font-semibold text-base-content/60'>
                      {contact.recentCopy ||
                        'Recent posts from this profile will appear here when available.'}
                    </p>
                    {contact.recentPosts?.length ? (
                      <div className='mt-2 grid gap-2'>
                        {contact.recentPosts.map((post) => (
                          <article
                            className='rounded-lg border border-base-300 bg-base-100/70 p-2'
                            key={post.id}
                          >
                            <p className='text-sm font-bold text-base-content'>{post.text}</p>
                            <p className='mt-1 text-xs font-semibold text-base-content/55'>
                              {post.metaLabel}
                            </p>
                          </article>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className='inlineActions flex flex-col items-end gap-2'>
                  <ActionButton
                    ariaLabel={`Message ${contact.alias}`}
                    className='smallButton'
                    icon={<Send size={15} />}
                    label={contact.messageActionLabel}
                    onClick={() => actions.messageContact(contact.profileId)}
                  />
                  <ActionButton
                    ariaLabel={`Open ${contact.alias} profile`}
                    className='smallButton'
                    icon={<User size={15} />}
                    label='Profile'
                    onClick={() => actions.openProfile(contact.profileId)}
                  />
                  <ActionButton
                    ariaLabel={`Enter ${contact.alias}'s home`}
                    className='smallButton'
                    disabled={!contact.homeActionEnabled}
                    icon={<House size={15} />}
                    label={contact.homeActionLabel}
                    onClick={() => actions.enterContactHome(contact.profileId)}
                  />
                  <ActionButton
                    ariaLabel={`Remove ${contact.alias} as friend`}
                    className='smallButton dangerButton'
                    icon={<UserX size={15} />}
                    label={contact.revokeActionLabel || 'Remove friend'}
                    onClick={() => actions.revokeContact(contact.profileId)}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </section>
      <section className='panel contactsPanel card border border-base-300 bg-base-200/70 shadow-sm'>
        <SectionTitle
          id='blockedProfilesTitle'
          icon={<ShieldOff size={15} />}
          text='Removed / ignored'
        />
        <div id='blockedContactList' className='managedContacts grid gap-2'>
          {blockedContacts.length === 0 ? (
            <PeopleEmptyState
              icon={<ShieldOff size={18} />}
              title='No removed profiles'
              copy='Profiles you remove or ignore will appear here.'
            />
          ) : (
            blockedContacts.map((contact) => (
              <div
                key={contact.profileId}
                className='managedContact card grid gap-2 rounded-lg border border-base-300 bg-base-100/80 p-3'
              >
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <div>
                    <p className='font-black text-base-content'>{contact.profileLabel}</p>
                    <p className='mono muted smallText text-xs text-base-content/60'>
                      {contact.shortProfileId}
                    </p>
                  </div>
                  <span className='badge badge-warning badge-sm font-black'>
                    {contact.statusLabel}
                  </span>
                </div>
                <p className='muted smallText text-xs text-base-content/65'>{contact.copy}</p>
                <p className='muted smallText text-xs text-base-content/60'>
                  {contact.blockedAtLabel}
                </p>
                <ActionButton
                  ariaLabel={`Allow requests from ${contact.profileLabel}`}
                  className='smallButton'
                  icon={<UserPlus size={15} />}
                  label='Allow requests'
                  onClick={() => actions.allowContactRequests(contact.profileId)}
                />
                <ActionButton
                  ariaLabel={`Open ${contact.profileLabel} profile`}
                  className='smallButton'
                  icon={<User size={15} />}
                  label='Profile'
                  onClick={() => actions.openProfile(contact.profileId)}
                />
              </div>
            ))
          )}
        </div>
      </section>
    </>
  )
}

function ContactProfileDetail({
  actions,
  profile
}: {
  actions: PeopleActions
  profile?: TrustedContactView | null
}) {
  if (!profile) return null
  const canRemove = profile.canRemove !== false
  const relationshipActions = createProfileDetailActions({
    acceptRequest: profile.acceptMessage,
    canRemove,
    ignoreRequest: { profileId: profile.profileId },
    relationshipState: profile.relationshipState
  })

  return (
    <section
      id='contactProfileDetail'
      className='panel contactsPanel card border border-base-300 bg-base-200/80 shadow-sm'
      aria-label={`${profile.alias} profile`}
    >
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div className='flex min-w-0 items-start gap-3'>
          <ProfileAvatar avatar={profile.avatar} size='large' />
          <div className='min-w-0'>
            <p className='text-lg font-black text-base-content'>{profile.alias}</p>
            <p className='mono truncate text-xs font-bold text-base-content/60'>
              {profile.shortProfileId}
            </p>
            <div className='trustMeta mt-2 flex flex-wrap gap-1 text-xs text-base-content/65'>
              <span
                className={
                  canRemove
                    ? 'badge badge-success badge-sm font-black'
                    : 'badge badge-warning badge-sm font-black'
                }
              >
                {profile.statusLabel}
              </span>
              <span>{profile.sourceLabel}</span>
              <span>{profile.trustedAtLabel}</span>
            </div>
          </div>
        </div>
        <ActionButton
          ariaLabel={`Close ${profile.alias} profile`}
          className='smallButton'
          icon={<X size={15} />}
          label='Close'
          onClick={() => actions.closeProfile()}
        />
      </div>

      <div className='mt-4 grid gap-2 sm:grid-cols-3'>
        <ActionButton
          ariaLabel={`Message ${profile.alias}`}
          className='smallButton'
          disabled={!profile.messageActionEnabled}
          icon={<Send size={15} />}
          label={profile.messageActionLabel}
          onClick={() => actions.messageContact(profile.profileId)}
        />
        <ActionButton
          ariaLabel={`Enter ${profile.alias}'s home`}
          className='smallButton'
          disabled={!profile.homeActionEnabled}
          icon={<House size={15} />}
          label={profile.homeActionLabel}
          onClick={() => actions.enterContactHome(profile.profileId)}
        />
        {relationshipActions.kind === 'respond' ? (
          <>
            <RequestActionButton
              ariaLabel={`Ignore friend request from ${profile.alias}`}
              onClick={() =>
                actions.ignoreMessageRequest(relationshipActions.ignoreRequest.profileId)
              }
              variant='ignore'
            />
            <RequestActionButton
              ariaLabel={`Accept friend request from ${profile.alias}`}
              onClick={() => actions.acceptMessageRequest(relationshipActions.acceptRequest)}
              variant='accept'
            />
          </>
        ) : relationshipActions.kind === 'allow_requests' ? (
          <ActionButton
            ariaLabel={`Allow requests from ${profile.alias}`}
            className='smallButton'
            icon={<UserPlus size={15} />}
            label='Allow requests'
            onClick={() => actions.allowContactRequests(profile.profileId)}
          />
        ) : relationshipActions.kind === 'remove' ? (
          <ActionButton
            ariaLabel={`Remove ${profile.alias} as friend`}
            className='smallButton dangerButton'
            icon={<UserX size={15} />}
            label={profile.revokeActionLabel || 'Remove friend'}
            onClick={() => actions.revokeContact(profile.profileId)}
          />
        ) : null}
      </div>

      <div className='profileRecent mt-4 rounded-lg border border-dashed border-base-300 bg-base-100/70 p-3'>
        <p className='flex items-center gap-1 text-xs font-black uppercase text-base-content/70'>
          <Sprout size={13} />
          {profile.recentTitle}
        </p>
        <p className='text-xs font-semibold text-base-content/60'>
          {profile.recentCopy || 'Recent posts from this profile will appear here when available.'}
        </p>
        {profile.recentPosts?.length ? (
          <div className='mt-2 grid gap-2'>
            {profile.recentPosts.map((post) => (
              <article
                className='rounded-lg border border-base-300 bg-base-200/70 p-2'
                key={post.id}
              >
                <p className='text-sm font-bold text-base-content'>{post.text}</p>
                <p className='mt-1 text-xs font-semibold text-base-content/55'>{post.metaLabel}</p>
              </article>
            ))}
          </div>
        ) : null}
      </div>

      <details className='advanced mt-4'>
        <summary>Advanced identity</summary>
        <p className='label mt-2 flex items-center gap-1'>
          <Fingerprint size={13} />
          Profile fingerprint
        </p>
        <p className='mono break-all text-xs text-base-content/60'>{profile.profileId}</p>
      </details>
    </section>
  )
}

function ProfileAvatar({
  avatar,
  size = 'normal'
}: {
  avatar?: ProfileAvatarView
  size?: 'normal' | 'large'
}) {
  return (
    <span
      aria-label={avatar?.label || 'Profile avatar'}
      className={`${size === 'large' ? 'profileAvatar profileAvatarLarge' : 'profileAvatar'} ${avatar?.tone || 'avatarTone0'}`}
      role='img'
    >
      {avatar?.imageUri ? (
        <img alt='' className='profileAvatarImage' src={avatar.imageUri} />
      ) : (
        avatar?.initials || <User size={16} />
      )}
    </span>
  )
}

function PeopleEmptyState({
  copy,
  icon,
  title
}: {
  copy: string
  icon: React.ReactNode
  title: string
}) {
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
