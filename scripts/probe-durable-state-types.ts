import type { ContactBook, ContactBookContact } from '../src/contact-book.ts'
import {
  createContactBook,
  getContact,
  listTrustedContacts,
  trustContact
} from '../src/contact-book.ts'
import type { DmThread } from '../src/dm-thread.ts'
import { acceptDmThread, createDmThread, isDmThreadActive } from '../src/dm-thread.ts'

const book: ContactBook = createContactBook({ ownerProfileId: 'owner-a' })
const trustedBook = trustContact(book, {
  alias: 'Ada',
  profileId: 'profile-b',
  trustedAt: 1000
})
const contact: ContactBookContact | null = getContact(trustedBook, 'profile-b')

const thread: DmThread = acceptDmThread(
  createDmThread({
    channelDiscoveryKey: 'a'.repeat(64),
    channelPublicKey: 'b'.repeat(64),
    createdAt: 1000,
    localProfileId: '1'.repeat(64),
    remoteProfileId: '2'.repeat(64),
    threadId: 'thread-1'
  }),
  { acceptedAt: 1100 }
)

if (!contact || listTrustedContacts(trustedBook).length !== 1 || !isDmThreadActive(thread)) {
  throw new Error('Durable state type probe failed')
}
