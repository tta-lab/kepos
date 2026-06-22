const HOME_POLICIES = new Set(['trusted_only', 'public'])

export function createHomeRoom({
  ownerProfileId,
  address = ownerProfileId,
  policy = 'trusted_only'
}) {
  const cleanOwnerProfileId = cleanRequiredString(
    ownerProfileId,
    'Home owner profile id is required'
  )
  const cleanAddress = cleanRequiredString(address, 'Home address is required')

  if (!isHomePolicy(policy)) {
    throw new Error('Invalid home policy')
  }

  return {
    ownerProfileId: cleanOwnerProfileId,
    address: cleanAddress,
    policy
  }
}

export function isHomePolicy(policy) {
  return HOME_POLICIES.has(policy)
}

function cleanRequiredString(value, message) {
  const cleaned = value?.trim()

  if (!cleaned) {
    throw new Error(message)
  }

  return cleaned
}
