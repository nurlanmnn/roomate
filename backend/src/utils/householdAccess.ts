import mongoose from 'mongoose';
import { Household } from '../models/Household';

/**
 * Minimal household projection used by member-access checks. We only ever need
 * `members` (to verify access + validate participants) and `name` (for push
 * notification copy), so we fetch a lean doc with just those fields instead of
 * hydrating the entire Household document on every household-scoped request.
 */
export interface HouseholdMemberContext {
  _id: mongoose.Types.ObjectId;
  members: mongoose.Types.ObjectId[];
  name: string;
}

export type HouseholdAccessResult =
  | { ok: true; household: HouseholdMemberContext }
  | { ok: false; status: number; error: string };

/**
 * Verify `userId` is a member of `householdId` using a lean, projected read.
 *
 * Returns a discriminated result so callers stay explicit about the 404 vs 403
 * response without an extra full-document round trip. Replaces the repeated
 * `Household.findById(...)` + `members.some(...)` gate copy-pasted across routes.
 */
export async function checkHouseholdMember(
  householdId: string | mongoose.Types.ObjectId,
  userId: string
): Promise<HouseholdAccessResult> {
  const household = await Household.findById(householdId)
    .select('members name')
    .lean<HouseholdMemberContext>()
    .exec();

  if (!household) {
    return { ok: false, status: 404, error: 'Household not found' };
  }

  const userIdObjectId = new mongoose.Types.ObjectId(userId);
  const isMember = household.members.some((m) => m.equals(userIdObjectId));
  if (!isMember) {
    return { ok: false, status: 403, error: 'Access denied' };
  }

  return { ok: true, household };
}
