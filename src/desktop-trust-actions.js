import { applyDesktopProfileTrustQr } from './desktop-qr-service.js'
import { createDesktopContactRevoke } from './desktop-revoke-service.js'

export function createDesktopTrustActions({
  applyProfileTrustQr = applyDesktopProfileTrustQr,
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
}) {
  function refreshActiveTreeholePolicy({ localProfileId, treeholePolicy }) {
    const homeJoinDetails = getHomeJoinDetails()
    if (homeJoinDetails?.profileId !== localProfileId) return

    setHomeJoinDetails({
      ...homeJoinDetails,
      treeholePolicy
    })
    configureTreeholeRuntime()
  }

  function trustProfileUri({ alias = '', displayName = 'Desktop', uri } = {}) {
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

  async function revokeContact(profileId) {
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
