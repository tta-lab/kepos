const PROFILE_ID_FILE = 'profile-id.txt'

export async function getOrCreateMobileProfileId({ baseUri, createId, fileSystem }) {
  if (!baseUri) {
    throw new Error('App storage directory is unavailable')
  }

  const profileDir = `${baseUri.replace(/\/+$/, '')}/kepos`
  const profilePath = `${profileDir}/${PROFILE_ID_FILE}`

  await fileSystem.makeDirectoryAsync(profileDir, { intermediates: true })

  try {
    const existingId = (await fileSystem.readAsStringAsync(profilePath)).trim()

    if (existingId) {
      return existingId
    }
  } catch {}

  const profileId = createId()
  await fileSystem.writeAsStringAsync(profilePath, profileId)
  return profileId
}
