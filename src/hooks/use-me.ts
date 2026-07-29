import { useQuery } from '@tanstack/react-query';

import { userKeys } from '@/hooks/query-keys';
import { getMe } from '@/services/user-service';

/**
 * Current driver's profile. No mock fallback here, unlike the deliveries
 * hooks — there's no plausible placeholder identity to show for "who is
 * signed in" the way there's plausible placeholder job data. Offline
 * support instead comes from the same place every other query gets it:
 * the MMKV-backed query persister (services/query-client.ts) serves the
 * last-fetched response from disk before revalidating, so this only shows
 * a hard error on a genuinely first-ever offline load.
 */
export function useMe() {
  return useQuery({
    queryKey: userKeys.me,
    queryFn: getMe,
  });
}
