import { applyDesktopProfileTrustQr } from './desktop-qr-service.js'
import { createDesktopContactRevoke } from './desktop-revoke-service.ts'
import type { ContactBook } from './contact-book.ts'
import type { DmThread } from './dm-thread.ts'
import type { DesktopProfileContext } from './desktop-profile-context-core.ts'
import type { SigningIdentity } from './signed-record.ts'

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
  book: ContactBook
  profileId: string
  treeholePolicy: TreeholePolicy
}

type ProfileTrustQrApplier = (options: {
  alias?: string
  book: ContactBook
  localIdentity?: SigningIdentity | null
  localProfileId: string
  uri: string
}) => ProfileTrustQrResult

type ContactRevokeCreator = typeof createDesktopContactRevoke

type TrustProfileUriPayload = {
  alias?: string
  displayName?: string
  uri?: string
}

export type DesktopTrustActions = {
  revokeContact(profileId: string): Promise<void>
  trustProfileUri(payload?: TrustProfileUriPayload): void
}

export function createDesktopTrustActions({
  applyProfileTrustQr = applyDesktopProfileTrustQr as unknown as ProfileTrustQrApplier,
  configureTreeholeRuntime,
  createContactRevoke = createDesktopContactRevoke,
  getDmRuntime,
  getHomeJoinDetails,
  getProfileContext,
  getSelectedRecipientProfileId,
  onChanged = () => {},
  setContextFormDraft = () => {},
  setDirectComposerRecipient,
  setHomeJoinDetails,
  setNotice
}: {
  applyProfileTrustQr?: ProfileTrustQrApplier
  configureTreeholeRuntime: () => void
  createContactRevoke?: ContactRevokeCreator
  getDmRuntime: () => DmRuntime
  getHomeJoinDetails: () => HomeJoinDetails | null
  getProfileContext: (displayName?: string) => DesktopProfileContext
  getSelectedRecipientProfileId: () => string
  onChanged?: () => void
  setContextFormDraft?: (draft: Record<string, unknown>) => void
  setDirectComposerRecipient: (profileId: string) => void
  setHomeJoinDetails: (details: HomeJoinDetails) => void
  setNotice: (notice: string) => void
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

  function trustProfileUri({
    alias = '',
    displayName = 'Desktop',
    uri
  }: TrustProfileUriPayload = {}): void {
    if (!uri) return

    const context = getProfileContext(displayName)
    const { contactBook, profile } = context
    const result = applyProfileTrustQr({
      alias,
      book: contactBook,
      localIdentity: profile.identity,
      localProfileId: profile.id,
      uri
    })

    context.saveContactBook(result.book)
    refreshActiveTreeholePolicy({
      localProfileId: profile.id,
      treeholePolicy: result.treeholePolicy
    })
    setContextFormDraft({
      trustAlias: '',
      trustQrUri: ''
    })
    setNotice('Trusted friend added.')
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

    setNotice('Trust revoked.')
    onChanged()
  }

  return {
    revokeContact,
    trustProfileUri
  }
}
