import {
  allowContactRequests as allowContactRequestsInBook,
  createTreeholePolicyFromContactBook
} from './contact-book.ts'
import { createDesktopContactRevoke } from './desktop-revoke-service.ts'
import { createFriendRequestTargetViewModel } from './friend-request-target-view-model.ts'
import { readSignedProfileQrRequestTarget } from './signed-qr-scan.ts'
import type { DmThread } from './dm-thread.ts'
import type { DesktopProfileContext } from './desktop-profile-context-core.ts'
import type { FriendRequestTargetViewModel } from './friend-request-target-view-model.ts'

type TreeholePolicy = Record<string, unknown>

type HomeJoinDetails = Record<string, unknown> & {
  profileId?: string | null
  treeholePolicy?: TreeholePolicy
}

type DmRuntime = {
  closeThreads(threadIds: string[]): unknown | Promise<unknown>
  loadThreads(): DmThread[]
  replaceThreads(threads: DmThread[]): unknown
}

type ProfileTrustQrResult = {
  createdAt: number
  displayName: string
  kind: 'profile_request_target'
  profileId: string
}

type ProfileTrustQrReader = (options: { now?: number; uri: string }) => ProfileTrustQrResult

type ContactRevokeCreator = typeof createDesktopContactRevoke

type ProfileRequestTargetPayload = {
  alias?: string
  displayName?: string
  uri?: string
}

export type DesktopTrustActions = {
  allowContactRequests(profileId: string): Promise<void>
  revokeContact(profileId: string): Promise<void>
  prepareProfileRequestTarget(payload?: ProfileRequestTargetPayload): void
}

export function createDesktopTrustActions({
  configureTreeholeRuntime,
  createContactRevoke = createDesktopContactRevoke,
  getDmRuntime,
  getHomeJoinDetails,
  getProfileContext,
  getSelectedRecipientProfileId,
  onChanged = () => {},
  readProfileTrustQr = readSignedProfileQrRequestTarget,
  setContextFormDraft = () => {},
  setDirectComposerRecipient,
  setProfileRequestTarget = () => {},
  setHomeJoinDetails,
  setNotice
}: {
  configureTreeholeRuntime: () => void
  createContactRevoke?: ContactRevokeCreator
  getDmRuntime: () => DmRuntime
  getHomeJoinDetails: () => HomeJoinDetails | null
  getProfileContext: (displayName?: string) => DesktopProfileContext
  getSelectedRecipientProfileId: () => string
  onChanged?: () => void
  setContextFormDraft?: (draft: Record<string, unknown>) => void
  setDirectComposerRecipient: (profileId: string) => void
  setProfileRequestTarget?: (target: FriendRequestTargetViewModel | null) => void
  setHomeJoinDetails: (details: HomeJoinDetails) => void
  setNotice: (notice: string) => void
  readProfileTrustQr?: ProfileTrustQrReader
}): DesktopTrustActions {
  function refreshActiveTreeholePolicy({
    localProfileId,
    treeholePolicy
  }: {
    localProfileId: string
    treeholePolicy: TreeholePolicy
  }): void {
    const homeJoinDetails = getHomeJoinDetails()
    if (homeJoinDetails?.profileId !== localProfileId) return

    setHomeJoinDetails({
      ...homeJoinDetails,
      treeholePolicy
    })
    configureTreeholeRuntime()
  }

  function prepareProfileRequestTarget({
    displayName = 'Desktop',
    uri
  }: ProfileRequestTargetPayload = {}): void {
    if (!uri) return

    const context = getProfileContext(displayName)
    const result = readProfileTrustQr({
      uri
    })
    const targetView = createFriendRequestTargetViewModel({
      contactBook: context.contactBook,
      shortenProfileId: (profileId) => `${profileId.slice(0, 8)}...${profileId.slice(-8)}`,
      target: result
    })

    setDirectComposerRecipient(result.profileId)
    setProfileRequestTarget(targetView)
    setContextFormDraft({
      trustAlias: '',
      trustQrUri: ''
    })
    setNotice('Friend request target ready.')
    onChanged()
  }

  async function revokeContact(profileId: string): Promise<void> {
    const context = getProfileContext()
    const { contactBook, profile } = context
    const dmRuntime = getDmRuntime()
    const result = createContactRevoke({
      book: contactBook,
      profileId,
      selectedRecipientProfileId: getSelectedRecipientProfileId(),
      threads: dmRuntime.loadThreads()
    })

    context.saveContactBook(result.book)
    dmRuntime.replaceThreads(result.nextThreads)

    await dmRuntime.closeThreads(result.revokedThreadIds)

    refreshActiveTreeholePolicy({
      localProfileId: profile.id,
      treeholePolicy: result.treeholePolicy
    })

    if (result.shouldClearRecipient) {
      setDirectComposerRecipient('')
    }

    setNotice('Friend removed.')
    onChanged()
  }

  function allowContactRequests(profileId: string): Promise<void> {
    const context = getProfileContext()
    const { contactBook, profile } = context
    const nextBook = allowContactRequestsInBook(contactBook, { profileId })
    const treeholePolicy = createTreeholePolicyFromContactBook(nextBook)

    context.saveContactBook(nextBook)

    refreshActiveTreeholePolicy({
      localProfileId: profile.id,
      treeholePolicy
    })

    setNotice('Requests allowed again.')
    onChanged()
    return Promise.resolve()
  }

  return {
    allowContactRequests,
    revokeContact,
    prepareProfileRequestTarget
  }
}
