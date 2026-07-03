import {
  canAllowRequestsForRelationshipState,
  canRespondToFriendRequestForRelationshipState,
  type ProfileRelationshipState
} from './profile-relationship-state.ts'

export type ProfileDetailActionsInput<TAcceptRequest, TIgnoreRequest> = {
  acceptRequest?: TAcceptRequest
  canAllowRequests?: boolean
  canRemove?: boolean
  ignoreRequest?: TIgnoreRequest
  relationshipState?: ProfileRelationshipState
}

export type ProfileDetailActions<TAcceptRequest, TIgnoreRequest> =
  | {
      acceptRequest: TAcceptRequest
      ignoreRequest: TIgnoreRequest
      kind: 'respond'
    }
  | {
      kind: 'allow_requests'
    }
  | {
      kind: 'remove'
    }
  | {
      kind: 'none'
    }

export type ProfileDetailState<TAcceptRequest, TIgnoreRequest> = {
  actions: ProfileDetailActions<TAcceptRequest, TIgnoreRequest>
  canRemove: boolean
}

export function createProfileDetailState<TAcceptRequest, TIgnoreRequest>({
  acceptRequest,
  canAllowRequests,
  canRemove,
  ignoreRequest,
  relationshipState
}: ProfileDetailActionsInput<TAcceptRequest, TIgnoreRequest>): ProfileDetailState<
  TAcceptRequest,
  TIgnoreRequest
> {
  const resolvedCanRemove = canRemove !== false

  return {
    actions: createProfileDetailActions({
      acceptRequest,
      canAllowRequests,
      canRemove: resolvedCanRemove,
      ignoreRequest,
      relationshipState
    }),
    canRemove: resolvedCanRemove
  }
}

export function createProfileDetailActions<TAcceptRequest, TIgnoreRequest>({
  acceptRequest,
  canAllowRequests,
  canRemove = true,
  ignoreRequest,
  relationshipState
}: ProfileDetailActionsInput<TAcceptRequest, TIgnoreRequest>): ProfileDetailActions<
  TAcceptRequest,
  TIgnoreRequest
> {
  if (
    canRespondToFriendRequestForRelationshipState(relationshipState) &&
    acceptRequest &&
    ignoreRequest
  ) {
    return {
      acceptRequest,
      ignoreRequest,
      kind: 'respond'
    }
  }

  if (canAllowRequests || canAllowRequestsForRelationshipState(relationshipState)) {
    return { kind: 'allow_requests' }
  }

  if (canRemove) {
    return { kind: 'remove' }
  }

  return { kind: 'none' }
}
