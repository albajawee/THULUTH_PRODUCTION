'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, limit, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { RoscaGroup, RoscaEntry, RoscaSchedule, RoscaOverview } from '../types';
import { buildRoscaSchedule, summariseRosca, todayISO } from '../utils/rosca';

/**
 * Realtime reads for rotating savings groups.
 *
 * All the arithmetic lives in `utils/rosca.ts` so the detail page, the dashboard card and the list
 * page render from one derivation rather than three that can disagree.
 *
 * Note the query shapes: nothing here combines a `where` with an `orderBy` on a different field, so
 * no composite index is required. Adding `orderBy('round')` to the per-group query below would be
 * the one change that forces one — sort by round in memory instead.
 */

/** Frozen per mount: a value that changed every render would churn every downstream `useMemo`. */
function useToday(): string {
  const [today] = useState(todayISO);
  return today;
}

export function useRoscaGroups(userId: string | null) {
  const [groups, setGroups] = useState<RoscaGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }

    const q = query(
      collection(db, 'users', userId, 'rosca_groups'),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      setGroups(snap.docs.map((d) => ({ id: d.id, ...d.data() } as RoscaGroup)));
      setLoading(false);
    }, () => setLoading(false));

    return unsub;
  }, [userId]);

  const activeGroups = groups.filter((g) => g.status === 'active');
  const closedGroups = groups.filter((g) => g.status !== 'active');

  return { groups, activeGroups, closedGroups, loading };
}

/**
 * Entries for one group, or every group when `groupId` is omitted.
 *
 * The account-wide read is capped: a group produces at most `memberCount + 1` entries, so 500 covers
 * roughly forty full groups. Past that the cap would silently under-count the oldest ones in the
 * dashboard aggregate — the per-group query below is uncapped and stays exact regardless.
 */
export function useRoscaEntries(userId: string | null, groupId?: string) {
  const [entries, setEntries] = useState<RoscaEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }

    const base = collection(db, 'users', userId, 'rosca_entries');
    const q = groupId
      ? query(base, where('groupId', '==', groupId))
      : query(base, orderBy('createdAt', 'desc'), limit(500));

    const unsub = onSnapshot(q, (snap) => {
      setEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() } as RoscaEntry)));
      setLoading(false);
    }, () => setLoading(false));

    return unsub;
  }, [userId, groupId]);

  return { entries, loading };
}

/** One group's full derived state, for the detail page. */
export function useRoscaGroup(userId: string | null, groupId: string) {
  const { groups, loading: groupsLoading } = useRoscaGroups(userId);
  const { entries, loading: entriesLoading } = useRoscaEntries(userId, groupId);
  const today = useToday();

  const group = groups.find((g) => g.id === groupId) ?? null;

  const schedule = useMemo<RoscaSchedule | null>(
    () => (group ? buildRoscaSchedule(group, entries, today) : null),
    [group, entries, today]
  );

  return { group, schedule, loading: groupsLoading || entriesLoading };
}

/** Account-wide roll-up, for the dashboard card and the list page. */
export function useRoscaOverview(userId: string | null) {
  const { groups, loading: groupsLoading } = useRoscaGroups(userId);
  const { entries, loading: entriesLoading } = useRoscaEntries(userId);
  const today = useToday();

  const overview = useMemo<RoscaOverview>(
    () => summariseRosca(groups, entries, today),
    [groups, entries, today]
  );

  return { overview, schedules: overview.schedules, loading: groupsLoading || entriesLoading };
}
