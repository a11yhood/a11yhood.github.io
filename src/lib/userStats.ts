import { APIService } from '@/lib/api'

export type UserStats = {
  productsSubmitted: number
  collectionsCreated: number
  productsOwnedSubmitted: number
  productsEditedManaged: number
  collectionsOwnedSubmitted: number
  collectionsEditedManaged: number
  ratingsGiven: number
  discussionsParticipated: number
  totalContributions: number
}

export const EMPTY_USER_STATS: UserStats = {
  productsSubmitted: 0,
  collectionsCreated: 0,
  productsOwnedSubmitted: 0,
  productsEditedManaged: 0,
  collectionsOwnedSubmitted: 0,
  collectionsEditedManaged: 0,
  ratingsGiven: 0,
  discussionsParticipated: 0,
  totalContributions: 0,
}

export async function fetchUserStats(userRef: string): Promise<UserStats> {
  return APIService.getUserStats(userRef)
}
