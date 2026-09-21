import React, { createContext, useContext, useEffect, useState, useMemo, useRef } from 'react';
import { supabase, isSupabaseConfigured, uploadBoulderPhoto, uploadAreaPhoto, deleteStoragePhotos } from '../lib/supabase';
import { Boulder, Attempt, Comment, Gym, GymArea, Grade, AttemptStatus, BulkAddBoulderItem, BulkAddBouldersParams } from '../types';
import {
  INITIAL_GYMS,
  INITIAL_AREAS,
  INITIAL_BOULDERS,
  INITIAL_ATTEMPTS,
  INITIAL_COMMENTS
} from '../lib/mockData';
import { useAuth } from './AuthContext';
import confetti from 'canvas-confetti';
import {
  WhamBackupData,
  LocalSnapshotMeta,
  createBackupPayload,
  saveLocalSnapshot,
  getLocalSnapshotsMeta,
  getLocalSnapshotData
} from '../lib/backup';

interface LogAttemptParams {
  boulderId: string;
  status: AttemptStatus;
  attemptCount: number;
  loggedAt?: string;
  userId?: string;
}

interface AddBoulderParams {
  gymId: string;
  areaId: string;
  holdColour: string;
  grade: Grade;
  notes?: string;
  imageFile?: File | null;
  imageDataUrl?: string | null;
  positionOrder?: number;
  insertAfterBoulderId?: string | null; // For adjacent insertion
}

interface GymContextType {
  gyms: Gym[];
  currentGym: Gym | null;
  setCurrentGym: (gym: Gym) => void;
  areas: GymArea[];
  currentArea: GymArea | null;
  setCurrentArea: (area: GymArea | null) => void;
  boulders: Boulder[];
  attempts: Attempt[];
  comments: Comment[];
  propsMap: Record<string, string[]>;
  toggleProp: (attemptId: string, userId: string) => Promise<void>;
  loading: boolean;
  hideSent: boolean;
  setHideSent: (hide: boolean | ((prev: boolean) => boolean)) => void;
  showArchived: boolean;
  setShowArchived: (show: boolean | ((prev: boolean) => boolean)) => void;
  logAttempt: (params: LogAttemptParams) => Promise<void>;
  deleteAttempt: (boulderId: string, userId?: string) => Promise<void>;
  addBoulder: (params: AddBoulderParams) => Promise<Boulder>;
  bulkAddBoulders: (params: BulkAddBouldersParams) => Promise<Boulder[]>;
  archiveBoulder: (boulderId: string, archive?: boolean) => Promise<void>;
  moveBoulder: (boulderId: string, targetAreaId: string, unarchive?: boolean) => Promise<void>;
  archiveAreaBoulders: (areaId: string) => Promise<void>;
  updateAreaPhoto: (areaId: string, imageFile?: File | null, imageDataUrl?: string | null) => Promise<string | null>;
  removeAreaPhoto: (areaId: string) => Promise<void>;
  pruneArchivedClimbPhotos: (olderThanDays?: number) => Promise<{ removedCount: number; freedBytesEstimate: number }>;
  addComment: (boulderId: string, content: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  getBoulderAttempts: (boulderId: string) => Attempt[];
  getBoulderComments: (boulderId: string) => Comment[];
  getUserAttemptOnBoulder: (boulderId: string, userId?: string) => Attempt | undefined;
  orderedActiveBouldersInCurrentArea: Boulder[];
  restoreBackupData: (backup: WhamBackupData) => Promise<{ success: boolean; message: string; counts: any }>;
  createManualSnapshot: (reason?: string) => void;
  restoreSnapshotById: (snapshotId: string) => Promise<boolean>;
  getSnapshotsList: () => LocalSnapshotMeta[];
}

const GymContext = createContext<GymContextType | undefined>(undefined);

export const GymProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, climbers, isDemoMode, restoreProfilesFromBackup } = useAuth();

  const [gyms, setGyms] = useState<Gym[]>(() => {
    const cached = localStorage.getItem('wham_gyms');
    return cached ? JSON.parse(cached) : INITIAL_GYMS;
  });

  const [currentGym, setCurrentGymState] = useState<Gym | null>(null);

  const [areas, setAreas] = useState<GymArea[]>(() => {
    const cached = localStorage.getItem('wham_areas');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        const hasNumberedBondAreas = Array.isArray(parsed) && parsed.some((a: GymArea) => /^\d+:/.test(a.name));
        if (Array.isArray(parsed) && parsed.length >= INITIAL_AREAS.length && !hasNumberedBondAreas) {
          return parsed;
        }
      } catch {
        // Fallback
      }
    }
    return INITIAL_AREAS;
  });

  const [currentArea, setCurrentAreaState] = useState<GymArea | null>(null);

  const [boulders, setBoulders] = useState<Boulder[]>(() => {
    const cached = localStorage.getItem('wham_boulders');
    return cached ? JSON.parse(cached) : INITIAL_BOULDERS;
  });

  const [attempts, setAttempts] = useState<Attempt[]>(() => {
    const cached = localStorage.getItem('wham_attempts');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const firstDate = parsed[0]?.logged_at;
          const isOldMonolithicDate =
            parsed.length > 50 &&
            parsed.every((a) => a.logged_at === firstDate && firstDate === '2026-09-10T19:00:00Z');
          if (isOldMonolithicDate) {
            return INITIAL_ATTEMPTS;
          }
          return parsed;
        }
      } catch {
        // Fallback
      }
    }
    return INITIAL_ATTEMPTS;
  });

  const [comments, setComments] = useState<Comment[]>(() => {
    const cached = localStorage.getItem('wham_comments');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          return parsed.filter((c: Comment) => !c.id.startsWith('e0000000-0000-0000-0000-'));
        }
      } catch {
        // Fallback
      }
    }
    return INITIAL_COMMENTS;
  });

  const [propsMap, setPropsMap] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem('wham_sends_props');
      if (!saved) return {};
      const parsed = JSON.parse(saved);
      const migrated: Record<string, string[]> = {};
      for (const [key, val] of Object.entries(parsed)) {
        if (Array.isArray(val)) {
          migrated[key] = val.filter((id) => typeof id === 'string');
        } else if (typeof val === 'number' && val > 0) {
          migrated[key] = Array.from({ length: val }, (_, i) => `legacy-climber-${i}`);
        }
      }
      return migrated;
    } catch {
      return {};
    }
  });

  const channelRef = useRef<any>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [hideSent, setHideSent] = useState<boolean>(false);
  const [showArchived, setShowArchived] = useState<boolean>(false);

  // Initialize active gym & area from stored preferences or defaults
  useEffect(() => {
    if (gyms.length > 0 && !currentGym) {
      const savedGymId = localStorage.getItem('wham_active_gym_id');
      const gym = gyms.find(g => g.id === savedGymId) || gyms[0];
      setCurrentGymState(gym);
    }
  }, [gyms, currentGym]);

  useEffect(() => {
    if (currentGym) {
      const gymAreas = areas.filter(a => a.gym_id === currentGym.id).sort((a, b) => a.sort_order - b.sort_order);
      const savedAreaId = localStorage.getItem(`wham_active_area_${currentGym.id}`);
      if (savedAreaId === 'all') {
        setCurrentAreaState(null);
      } else if (savedAreaId) {
        const area = gymAreas.find(a => a.id === savedAreaId) || null;
        setCurrentAreaState(area);
      } else if (currentArea && currentArea.gym_id !== currentGym.id) {
        setCurrentAreaState(null);
      }
    }
  }, [currentGym, areas, currentArea]);

  const setCurrentGym = (gym: Gym) => {
    setCurrentGymState(gym);
    localStorage.setItem('wham_active_gym_id', gym.id);
    const gymAreas = areas.filter(a => a.gym_id === gym.id).sort((a, b) => a.sort_order - b.sort_order);
    const savedAreaId = localStorage.getItem(`wham_active_area_${gym.id}`);
    if (savedAreaId === 'all') {
      setCurrentAreaState(null);
    } else if (savedAreaId) {
      const area = gymAreas.find(a => a.id === savedAreaId) || null;
      setCurrentAreaState(area);
    } else {
      setCurrentAreaState(null);
    }
  };

  const setCurrentArea = (area: GymArea | null) => {
    setCurrentAreaState(area);
    if (currentGym) {
      if (area) {
        localStorage.setItem(`wham_active_area_${currentGym.id}`, area.id);
      } else {
        localStorage.setItem(`wham_active_area_${currentGym.id}`, 'all');
      }
    }
  };

  const climbersRef = useRef(climbers);
  useEffect(() => {
    climbersRef.current = climbers;
  }, [climbers]);

  // Sync with Supabase or fallback to LocalStorage
  useEffect(() => {
    let channel: any = null;
    let isMounted = true;

    async function fetchData() {
      if (!isSupabaseConfigured || !supabase) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const [gymsRes, areasRes, bouldersRes, attemptsRes, commentsRes, propsRes] = await Promise.all([
          supabase.from('gyms').select('*').order('name'),
          supabase.from('gym_areas').select('*').order('sort_order'),
          supabase.from('boulders').select('*').order('position_order'),
          supabase.from('attempts').select('*, profile:profiles(*)'),
          supabase.from('comments').select('*, profile:profiles(*)').order('created_at', { ascending: true }),
          supabase.from('send_props').select('attempt_id, user_id')
        ]);

        if (!isMounted) return;

        if (gymsRes.data && gymsRes.data.length > 0) setGyms(gymsRes.data);
        if (areasRes.data && areasRes.data.length > 0) {
          setAreas(areasRes.data);
          try {
            localStorage.setItem('wham_areas', JSON.stringify(areasRes.data));
          } catch (e) {
            console.warn('Failed to cache areas to localStorage:', e);
          }
          setCurrentAreaState((prev) => {
            if (!prev) return prev;
            const fresh = areasRes.data.find((a: GymArea) => a.id === prev.id);
            return fresh || prev;
          });
        }
        if (bouldersRes.data && bouldersRes.data.length > 0) setBoulders(bouldersRes.data);
        if (attemptsRes.data && attemptsRes.data.length > 0) setAttempts(attemptsRes.data);
        if (commentsRes.data && commentsRes.data.length > 0) setComments(commentsRes.data);

        if (!propsRes.error && Array.isArray(propsRes.data)) {
          const remoteMap: Record<string, string[]> = {};
          for (const row of propsRes.data) {
            if (!remoteMap[row.attempt_id]) remoteMap[row.attempt_id] = [];
            if (!remoteMap[row.attempt_id].includes(row.user_id)) {
              remoteMap[row.attempt_id].push(row.user_id);
            }
          }
          setPropsMap(remoteMap);
        }

        // Setup real-time subscriptions
        channel = supabase
          .channel('wham-realtime', {
            config: {
              broadcast: { ack: true }
            }
          })
          .on('broadcast', { event: 'prop_toggled' }, ({ payload }) => {
            if (!payload?.attemptId || !payload?.userId) return;
            const { attemptId, userId, action } = payload;
            setPropsMap((prev) => {
              const currentList = Array.isArray(prev[attemptId]) ? prev[attemptId] : [];
              let updatedList: string[];
              if (action === 'remove') {
                updatedList = currentList.filter((id) => id !== userId);
              } else {
                if (currentList.includes(userId)) return prev;
                updatedList = [...currentList, userId];
              }
              return { ...prev, [attemptId]: updatedList };
            });
          })
          .on('broadcast', { event: 'area_photo_updated' }, ({ payload }) => {
            if (!payload?.areaId) return;
            const { areaId, imageUrl } = payload;
            setAreas((prev) => {
              const updated = prev.map((a) => (a.id === areaId ? { ...a, image_url: imageUrl } : a));
              try {
                localStorage.setItem('wham_areas', JSON.stringify(updated));
              } catch (e) {}
              return updated;
            });
            setCurrentAreaState((prev) => (prev && prev.id === areaId ? { ...prev, image_url: imageUrl } : prev));
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'gym_areas' }, (payload) => {
            if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
              const updated = payload.new as GymArea;
              if (!updated?.id) return;
              setAreas((prev) => {
                const exists = prev.some((a) => a.id === updated.id);
                const next = exists
                  ? prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a))
                  : [...prev, updated];
                try {
                  localStorage.setItem('wham_areas', JSON.stringify(next));
                } catch (e) {}
                return next;
              });
              setCurrentAreaState((prev) => (prev && prev.id === updated.id ? { ...prev, ...updated } : prev));
            } else if (payload.eventType === 'DELETE') {
              const oldArea = payload.old as GymArea;
              if (!oldArea?.id) return;
              setAreas((prev) => {
                const next = prev.filter((a) => a.id !== oldArea.id);
                try {
                  localStorage.setItem('wham_areas', JSON.stringify(next));
                } catch (e) {}
                return next;
              });
              setCurrentAreaState((prev) => (prev && prev.id === oldArea.id ? null : prev));
            }
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'send_props' }, (payload) => {
            if (payload.eventType === 'INSERT') {
              const row = payload.new as { attempt_id: string; user_id: string };
              if (!row?.attempt_id || !row?.user_id) return;
              setPropsMap((prev) => {
                const currentList = Array.isArray(prev[row.attempt_id]) ? prev[row.attempt_id] : [];
                if (currentList.includes(row.user_id)) return prev;
                return { ...prev, [row.attempt_id]: [...currentList, row.user_id] };
              });
            } else if (payload.eventType === 'DELETE') {
              const row = payload.old as { attempt_id: string; user_id: string };
              if (!row?.attempt_id || !row?.user_id) return;
              setPropsMap((prev) => {
                const currentList = Array.isArray(prev[row.attempt_id]) ? prev[row.attempt_id] : [];
                return { ...prev, [row.attempt_id]: currentList.filter((id) => id !== row.user_id) };
              });
            }
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'boulders' }, (payload) => {
            if (payload.eventType === 'INSERT') {
              setBoulders(prev => [...prev, payload.new as Boulder]);
            } else if (payload.eventType === 'UPDATE') {
              setBoulders(prev => prev.map(b => b.id === payload.new.id ? { ...b, ...payload.new } : b));
            } else if (payload.eventType === 'DELETE') {
              setBoulders(prev => prev.filter(b => b.id !== payload.old.id));
            }
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'attempts' }, (payload) => {
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const incoming = payload.new as Attempt;
              setAttempts(prev => {
                const targetClimber = climbersRef.current.find(c => c.id === incoming.user_id);
                const enriched: Attempt = {
                  ...incoming,
                  profile: targetClimber || undefined
                };
                const filtered = prev.filter(a =>
                  a.id !== incoming.id &&
                  !(a.boulder_id === incoming.boulder_id && a.user_id === incoming.user_id)
                );
                return [...filtered, enriched];
              });
            } else if (payload.eventType === 'DELETE') {
              setAttempts(prev => prev.filter(a =>
                a.id !== payload.old.id &&
                !(a.boulder_id === payload.old.boulder_id && a.user_id === payload.old.user_id)
              ));
            }
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, (payload) => {
            if (payload.eventType === 'INSERT') {
              const newComm = payload.new as Comment;
              setComments(prev => {
                // Ignore if already present
                if (prev.some(c => c.id === newComm.id)) return prev;

                const authorProfile = climbersRef.current.find(cl => cl.id === newComm.user_id);
                const commentWithProfile: Comment = {
                  ...newComm,
                  profile: authorProfile || newComm.profile
                };

                // Replace optimistic comment if found
                const optimisticIdx = prev.findIndex(c =>
                  c.id.startsWith('comm-') &&
                  c.boulder_id === newComm.boulder_id &&
                  c.user_id === newComm.user_id &&
                  c.content === newComm.content
                );

                if (optimisticIdx !== -1) {
                  const updated = [...prev];
                  updated[optimisticIdx] = commentWithProfile;
                  return updated;
                }

                return [...prev, commentWithProfile];
              });
            } else if (payload.eventType === 'DELETE') {
              setComments(prev => prev.filter(c => c.id !== payload.old.id));
            }
          })
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              channelRef.current = channel;
            }
          });

        channelRef.current = channel;
      } catch (err) {
        console.error('Error fetching Supabase data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchData();

    return () => {
      isMounted = false;
      channelRef.current = null;
      if (channel) {
        supabase?.removeChannel(channel);
      }
    };
  }, []);

  // Multi-device sync: poll periodically and re-fetch when tab becomes visible or receives window focus
  useEffect(() => {
    const client = supabase;
    if (!isSupabaseConfigured || !client) return;

    const refreshData = async () => {
      try {
        const [attRes, commRes, propsRes] = await Promise.all([
          client.from('attempts').select('*, profile:profiles(*)'),
          client.from('comments').select('*, profile:profiles(*)'),
          client.from('send_props').select('attempt_id, user_id')
        ]);

        if (!attRes.error && attRes.data && attRes.data.length > 0) {
          setAttempts(attRes.data);
        }
        if (!commRes.error && commRes.data && commRes.data.length > 0) {
          setComments(commRes.data);
        }
        if (!propsRes.error && Array.isArray(propsRes.data)) {
          const remoteMap: Record<string, string[]> = {};
          for (const row of propsRes.data) {
            if (!remoteMap[row.attempt_id]) remoteMap[row.attempt_id] = [];
            if (!remoteMap[row.attempt_id].includes(row.user_id)) {
              remoteMap[row.attempt_id].push(row.user_id);
            }
          }
          setPropsMap(remoteMap);
        }
      } catch (err) {
        console.warn('Silent sync poll warning:', err);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshData();
      }
    };

    window.addEventListener('focus', refreshData);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Periodic poll every 25 seconds for reliable multi-device syncing
    const interval = setInterval(refreshData, 25000);

    return () => {
      window.removeEventListener('focus', refreshData);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, []);

  // Save to localStorage whenever state changes (for offline/demo mode)
  useEffect(() => {
    localStorage.setItem('wham_gyms', JSON.stringify(gyms));
  }, [gyms]);

  useEffect(() => {
    localStorage.setItem('wham_areas', JSON.stringify(areas));
  }, [areas]);

  useEffect(() => {
    localStorage.setItem('wham_boulders', JSON.stringify(boulders));
  }, [boulders]);

  useEffect(() => {
    localStorage.setItem('wham_attempts', JSON.stringify(attempts));
  }, [attempts]);

  useEffect(() => {
    localStorage.setItem('wham_comments', JSON.stringify(comments));
  }, [comments]);

  useEffect(() => {
    localStorage.setItem('wham_sends_props', JSON.stringify(propsMap));
  }, [propsMap]);

  // Compute Clockwise ordered active boulders in current area (or across the entire gym if currentArea is null)
  const orderedActiveBouldersInCurrentArea = useMemo(() => {
    if (!currentGym) return [];

    const filtered = boulders.filter(b => {
      const matchesGym = b.gym_id === currentGym.id;
      const matchesArea = currentArea ? b.area_id === currentArea.id : true;
      const matchesArchived = showArchived ? true : !b.is_archived;
      return matchesGym && matchesArea && matchesArchived;
    });

    const areaMap = new Map(areas.map(a => [a.id, a]));

    // Sort: If all areas are displayed, sort by area sort_order first, then position_order
    filtered.sort((a, b) => {
      if (!currentArea && a.area_id !== b.area_id) {
        const sortA = areaMap.get(a.area_id)?.sort_order ?? 0;
        const sortB = areaMap.get(b.area_id)?.sort_order ?? 0;
        return sortA - sortB;
      }
      return a.position_order - b.position_order;
    });

    // Calculate sequential 1-based order within each area and adjacent indicators
    const areaCounters = new Map<string, number>();
    return filtered.map((boulder, index) => {
      const currentAreaCount = (areaCounters.get(boulder.area_id) || 0) + 1;
      areaCounters.set(boulder.area_id, currentAreaCount);

      // Only link adjacent if in the same area
      const prevBoulder =
        index > 0 && filtered[index - 1].area_id === boulder.area_id
          ? filtered[index - 1]
          : null;
      const nextBoulder =
        index < filtered.length - 1 && filtered[index + 1].area_id === boulder.area_id
          ? filtered[index + 1]
          : null;

      return {
        ...boulder,
        display_order: currentAreaCount,
        adjacent_prev: prevBoulder ? { hold_colour: prevBoulder.hold_colour, grade: prevBoulder.grade } : null,
        adjacent_next: nextBoulder ? { hold_colour: nextBoulder.hold_colour, grade: nextBoulder.grade } : null
      };
    });
  }, [boulders, currentGym, currentArea, areas, showArchived]);

  // Log or update an attempt (Flash, Send, Attempt) - supports logging on behalf of another climber
  const logAttempt = async ({ boulderId, status, attemptCount, loggedAt, userId }: LogAttemptParams) => {
    const targetUserId = userId || currentUser?.id;
    if (!targetUserId) return;

    const targetClimber = climbers.find(c => c.id === targetUserId) || (targetUserId === currentUser?.id ? currentUser : null);
    const accentColor = targetClimber?.accent_color || '#E2A336';

    // Trigger celebration confetti on Flash or Send using climber's accent colour!
    if (status === 'flashed') {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.7 },
        colors: [accentColor, '#E2A336', '#D85454', '#32A378']
      });
    } else if (status === 'sent') {
      confetti({
        particleCount: 50,
        spread: 50,
        origin: { y: 0.7 },
        colors: [accentColor, '#32A378', '#4682D7']
      });
    }

    const existingAttempt = attempts.find(
      (a) => a.boulder_id === boulderId && a.user_id === targetUserId
    );

    const newAttempt: Attempt = {
      id: existingAttempt?.id || `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      boulder_id: boulderId,
      user_id: targetUserId,
      status,
      attempt_count: attemptCount,
      logged_at: loggedAt || existingAttempt?.logged_at || new Date().toISOString(),
      profile: targetClimber || currentUser || undefined
    };

    // Optimistically update state
    setAttempts(prev => {
      const filtered = prev.filter(
        a => !(a.boulder_id === boulderId && a.user_id === targetUserId)
      );
      return [...filtered, newAttempt];
    });

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('attempts').upsert({
          boulder_id: boulderId,
          user_id: targetUserId,
          status,
          attempt_count: attemptCount,
          logged_at: loggedAt || new Date().toISOString()
        }, { onConflict: 'boulder_id,user_id' });

        if (error) {
          console.error('Failed to log attempt to Supabase:', error);
          if (error.code === '42501' || error.message?.includes('row-level security')) {
            console.warn('⚠️ Supabase Row-Level Security policy blocked writing attempt. To resolve, ensure public access is enabled for public.attempts in supabase_schema.sql.');
          }
        }
      } catch (err) {
        console.error('Failed to log attempt to Supabase:', err);
      }
    }
  };

  // Delete an attempt
  const deleteAttempt = async (boulderId: string, userId?: string) => {
    const targetUserId = userId || currentUser?.id;
    if (!targetUserId) return;

    setAttempts(prev =>
      prev.filter(a => !(a.boulder_id === boulderId && a.user_id === targetUserId))
    );

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('attempts')
          .delete()
          .match({ boulder_id: boulderId, user_id: targetUserId });
      } catch (err) {
        console.error('Failed to delete attempt from Supabase:', err);
      }
    }
  };

  // Add a boulder with "Insert Boulder Adjacent" logic:
  // Calculate position_order between Boulder X and the subsequent boulder: (p1 + p2) / 2
  const addBoulder = async ({
    gymId,
    areaId,
    holdColour,
    grade,
    notes,
    imageFile,
    imageDataUrl,
    insertAfterBoulderId
  }: AddBoulderParams): Promise<Boulder> => {
    const areaBoulders = boulders
      .filter(b => b.gym_id === gymId && b.area_id === areaId && !b.is_archived)
      .sort((a, b) => a.position_order - b.position_order);

    let calculatedPosition = 1.0;

    if (insertAfterBoulderId) {
      const targetIndex = areaBoulders.findIndex(b => b.id === insertAfterBoulderId);
      if (targetIndex !== -1) {
        const p1 = areaBoulders[targetIndex].position_order;
        if (targetIndex < areaBoulders.length - 1) {
          const p2 = areaBoulders[targetIndex + 1].position_order;
          // Midpoint between p1 and p2
          calculatedPosition = (p1 + p2) / 2;
        } else {
          // It's the last boulder in area, insert at p1 + 1.0
          calculatedPosition = p1 + 1.0;
        }
      }
    } else {
      // Append at the end of the area
      const maxPosition = areaBoulders.reduce((max, b) => Math.max(max, b.position_order), 0);
      calculatedPosition = maxPosition + 1.0;
    }

    const tempBoulderId = `bould-${Date.now()}`;
    let finalImageUrl: string | null = null;

    if (imageFile && imageDataUrl) {
      finalImageUrl = await uploadBoulderPhoto(imageFile, imageDataUrl, tempBoulderId);
    } else if (imageDataUrl) {
      finalImageUrl = imageDataUrl;
    }

    const newBoulder: Boulder = {
      id: tempBoulderId,
      gym_id: gymId,
      area_id: areaId,
      hold_colour: holdColour,
      grade,
      position_order: calculatedPosition,
      notes: notes || null,
      image_url: finalImageUrl,
      date_added: new Date().toISOString().split('T')[0],
      is_archived: false,
      created_by: currentUser?.id || null,
      created_at: new Date().toISOString()
    };

    setBoulders(prev => [...prev, newBoulder]);

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('boulders')
          .insert({
            gym_id: gymId,
            area_id: areaId,
            hold_colour: holdColour,
            grade,
            position_order: calculatedPosition,
            notes: notes || null,
            image_url: finalImageUrl,
            date_added: newBoulder.date_added,
            is_archived: false,
            created_by: currentUser?.id
          })
          .select()
          .single();

        if (!error && data) {
          // Replace temp id with Supabase-generated UUID
          setBoulders(prev => prev.map(b => b.id === tempBoulderId ? data : b));
          return data;
        }
      } catch (err) {
        console.error('Failed to insert boulder into Supabase:', err);
      }
    }

    return newBoulder;
  };

  // Bulk add multiple boulders to an area (for resets or initial gym setup)
  const bulkAddBoulders = async ({
    gymId,
    areaId,
    boulders: newItems,
    archiveExistingAreaBoulders = false,
    dateAdded
  }: BulkAddBouldersParams): Promise<Boulder[]> => {
    if (!newItems || newItems.length === 0) return [];

    const effectiveDate = dateAdded || new Date().toISOString().split('T')[0];

    // If archiveExistingAreaBoulders is true, archive current active boulders in this area
    if (archiveExistingAreaBoulders) {
      setBoulders(prev => prev.map(b => (b.area_id === areaId && !b.is_archived) ? { ...b, is_archived: true } : b));
      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.from('boulders').update({ is_archived: true }).eq('area_id', areaId).eq('is_archived', false);
        } catch (err) {
          console.error('Failed to archive existing area boulders during bulk add:', err);
        }
      }
    }

    // Determine starting position order
    let startPosition = 1.0;
    if (!archiveExistingAreaBoulders) {
      const existingInArea = boulders.filter(b => b.gym_id === gymId && b.area_id === areaId && !b.is_archived);
      const maxPos = existingInArea.reduce((max, b) => Math.max(max, b.position_order), 0);
      startPosition = maxPos > 0 ? maxPos + 1.0 : 1.0;
    }

    // Process each item (upload photos if any)
    const timestamp = Date.now();
    const preparedBoulders: Boulder[] = [];

    for (let i = 0; i < newItems.length; i++) {
      const item = newItems[i];
      const tempId = `bould-${timestamp}-${i}-${Math.random().toString(36).substring(2, 6)}`;
      let finalImageUrl: string | null = null;

      if (item.imageFile && item.imageDataUrl) {
        try {
          finalImageUrl = await uploadBoulderPhoto(item.imageFile, item.imageDataUrl, tempId);
        } catch (err) {
          console.error('Failed to upload photo for bulk boulder:', err);
          finalImageUrl = item.imageDataUrl;
        }
      } else if (item.imageDataUrl) {
        finalImageUrl = item.imageDataUrl;
      }

      preparedBoulders.push({
        id: tempId,
        gym_id: gymId,
        area_id: areaId,
        hold_colour: item.holdColour,
        grade: item.grade,
        position_order: startPosition + (i * 1.0),
        notes: item.notes?.trim() || null,
        image_url: finalImageUrl,
        date_added: effectiveDate,
        is_archived: false,
        created_by: currentUser?.id || null,
        created_at: new Date().toISOString()
      });
    }

    // Optimistically update boulders state
    setBoulders(prev => {
      const updated = archiveExistingAreaBoulders
        ? prev.map(b => (b.area_id === areaId && !b.is_archived) ? { ...b, is_archived: true } : b)
        : [...prev];
      return [...updated, ...preparedBoulders];
    });

    // Confetti celebration
    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#E2A336', '#32A378', '#4682D7', '#D45C8E']
    });

    // Sync to Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        const payload = preparedBoulders.map(b => ({
          gym_id: b.gym_id,
          area_id: b.area_id,
          hold_colour: b.hold_colour,
          grade: b.grade,
          position_order: b.position_order,
          notes: b.notes,
          image_url: b.image_url,
          date_added: b.date_added,
          is_archived: false,
          created_by: currentUser?.id || null
        }));

        const { data, error } = await supabase.from('boulders').insert(payload).select();
        if (!error && data && data.length > 0) {
          // Replace temporary IDs with database UUIDs
          setBoulders(prev => {
            const tempIds = new Set(preparedBoulders.map(pb => pb.id));
            const filtered = prev.filter(b => !tempIds.has(b.id));
            return [...filtered, ...data];
          });
          return data;
        }
      } catch (err) {
        console.error('Failed to bulk insert boulders to Supabase:', err);
      }
    }

    return preparedBoulders;
  };

  // Archive / unarchive single climb
  const archiveBoulder = async (boulderId: string, archive = true) => {
    setBoulders(prev => prev.map(b => b.id === boulderId ? { ...b, is_archived: archive } : b));

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('boulders')
          .update({ is_archived: archive })
          .eq('id', boulderId);
      } catch (err) {
        console.error('Failed to archive boulder in Supabase:', err);
      }
    }
  };

  // Move boulder to another area / wall sector (and optionally restore it if archived)
  const moveBoulder = async (boulderId: string, targetAreaId: string, unarchive = true) => {
    // Determine position order in the target area (append to end of active climbs)
    const targetAreaBoulders = boulders.filter(b => b.area_id === targetAreaId && !b.is_archived);
    const maxPos = targetAreaBoulders.reduce((max, b) => Math.max(max, b.position_order), 0);
    const newPosition = maxPos > 0 ? maxPos + 1.0 : 1.0;

    setBoulders(prev => {
      const updated = prev.map(b => {
        if (b.id === boulderId) {
          return {
            ...b,
            area_id: targetAreaId,
            position_order: newPosition,
            is_archived: unarchive ? false : b.is_archived
          };
        }
        return b;
      });
      try {
        localStorage.setItem('wham_boulders', JSON.stringify(updated));
      } catch (e) {
        // Ignore
      }
      return updated;
    });

    if (isSupabaseConfigured && supabase) {
      try {
        const updatePayload: Record<string, any> = {
          area_id: targetAreaId,
          position_order: newPosition
        };
        if (unarchive) {
          updatePayload.is_archived = false;
        }
        await supabase
          .from('boulders')
          .update(updatePayload)
          .eq('id', boulderId);
      } catch (err) {
        console.error('Failed to move boulder in Supabase:', err);
      }
    }
  };

  // Bulk Reset: Archive Entire Area
  const archiveAreaBoulders = async (areaId: string) => {
    const targetArea = areas.find(a => a.id === areaId);
    createManualSnapshot(`Auto: Before resetting ${targetArea?.name || 'area'}`);

    setBoulders(prev => {
      const updated = prev.map(b => b.area_id === areaId ? { ...b, is_archived: true } : b);
      try {
        localStorage.setItem('wham_boulders', JSON.stringify(updated));
      } catch (e) {
        // Ignore
      }
      return updated;
    });

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('boulders')
          .update({ is_archived: true })
          .eq('area_id', areaId);
      } catch (err) {
        console.error('Failed to archive area boulders in Supabase:', err);
      }
    }
  };

  // Upload or update whole area / sector photo
  const updateAreaPhoto = async (
    areaId: string,
    imageFile?: File | null,
    imageDataUrl?: string | null
  ): Promise<string | null> => {
    let finalUrl: string | null = null;
    if (imageFile && imageDataUrl) {
      finalUrl = await uploadAreaPhoto(imageFile, imageDataUrl, areaId);
    } else if (imageDataUrl) {
      finalUrl = imageDataUrl;
    }

    setAreas((prev) => {
      const updated = prev.map((a) => (a.id === areaId ? { ...a, image_url: finalUrl } : a));
      try {
        localStorage.setItem('wham_areas', JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to persist areas to localStorage:', e);
      }
      return updated;
    });

    if (currentArea?.id === areaId) {
      setCurrentAreaState((prev) => (prev ? { ...prev, image_url: finalUrl } : null));
    }

    // Broadcast immediately to all active peer sessions
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'area_photo_updated',
        payload: { areaId, imageUrl: finalUrl }
      }).catch((e: any) => console.warn('Broadcast area photo error:', e));
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const { error: updateErr } = await supabase
          .from('gym_areas')
          .update({ image_url: finalUrl })
          .eq('id', areaId);
        if (updateErr) {
          console.error('Supabase update area photo error:', updateErr);
        }
      } catch (err) {
        console.warn('Supabase update area photo notice:', err);
      }
    }

    return finalUrl;
  };

  // Remove area wall photo
  const removeAreaPhoto = async (areaId: string): Promise<void> => {
    const area = areas.find((a) => a.id === areaId);
    const existingUrl = area?.image_url;

    setAreas((prev) => {
      const updated = prev.map((a) => (a.id === areaId ? { ...a, image_url: null } : a));
      try {
        localStorage.setItem('wham_areas', JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to persist areas to localStorage:', e);
      }
      return updated;
    });

    if (currentArea?.id === areaId) {
      setCurrentAreaState((prev) => (prev ? { ...prev, image_url: null } : null));
    }

    // Broadcast removal to peers
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'area_photo_updated',
        payload: { areaId, imageUrl: null }
      }).catch((e: any) => console.warn('Broadcast remove area photo error:', e));
    }

    if (existingUrl) {
      await deleteStoragePhotos([existingUrl]);
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const { error: removeErr } = await supabase
          .from('gym_areas')
          .update({ image_url: null })
          .eq('id', areaId);
        if (removeErr) {
          console.error('Supabase remove area photo error:', removeErr);
        }
      } catch (err) {
        console.warn('Failed to remove area photo in Supabase:', err);
      }
    }
  };

  // Photo Quota & Storage Management: Prune photos from oldest archived climbs
  const pruneArchivedClimbPhotos = async (
    olderThanDays = 0
  ): Promise<{ removedCount: number; freedBytesEstimate: number }> => {
    const now = Date.now();
    const cutoffMs = olderThanDays > 0 ? now - olderThanDays * 24 * 60 * 60 * 1000 : now;

    const targetedBoulders = boulders.filter((b) => {
      if (!b.is_archived || !b.image_url) return false;
      if (olderThanDays > 0) {
        const addedMs = new Date(b.date_added).getTime();
        return !isNaN(addedMs) && addedMs < cutoffMs;
      }
      return true;
    });

    if (targetedBoulders.length === 0) {
      return { removedCount: 0, freedBytesEstimate: 0 };
    }

    // Auto snapshot before pruning photos to protect ticklists and metadata
    createManualSnapshot(`Auto-save: Before pruning ${targetedBoulders.length} archived photos`);

    const urlsToDelete = targetedBoulders.map((b) => b.image_url!).filter(Boolean);
    const targetIds = new Set(targetedBoulders.map((b) => b.id));

    // Delete files from Supabase Storage
    await deleteStoragePhotos(urlsToDelete);

    // Update local state and keep climb metadata (grade, notes, attempts) intact
    setBoulders((prev) => {
      const updated = prev.map((b) => (targetIds.has(b.id) ? { ...b, image_url: null } : b));
      try {
        localStorage.setItem('wham_boulders', JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save boulders after photo prune:', e);
      }
      return updated;
    });

    // Update Supabase database
    if (isSupabaseConfigured && supabase) {
      try {
        const idList = Array.from(targetIds);
        await supabase
          .from('boulders')
          .update({ image_url: null })
          .in('id', idList);
      } catch (err) {
        console.error('Failed to clear image_url in Supabase for pruned climbs:', err);
      }
    }

    const estimatePerPhotoBytes = 110 * 1024; // ~110 KB average compressed JPEG
    return {
      removedCount: targetedBoulders.length,
      freedBytesEstimate: targetedBoulders.length * estimatePerPhotoBytes
    };
  };

  // Add Comment (Threaded beta discussion)
  const addComment = async (boulderId: string, content: string) => {
    if (!currentUser) return;
    const trimmed = content.trim();
    if (!trimmed) return;

    const newComment: Comment = {
      id: `comm-${Date.now()}`,
      boulder_id: boulderId,
      user_id: currentUser.id,
      content: trimmed,
      created_at: new Date().toISOString(),
      profile: currentUser
    };

    setComments(prev => [...prev, newComment]);

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('comments')
          .insert({
            boulder_id: boulderId,
            user_id: currentUser.id,
            content: trimmed
          })
          .select('*, profile:profiles(*)')
          .single();

        if (!error && data) {
          setComments(prev => {
            const hasReal = prev.some(c => c.id === data.id);
            if (hasReal) {
              return prev.filter(c => c.id !== newComment.id);
            }
            return prev.map(c => c.id === newComment.id ? data : c);
          });
        }
      } catch (err) {
        console.error('Failed to insert comment in Supabase:', err);
      }
    }
  };

  // Delete Comment
  const deleteComment = async (commentId: string) => {
    setComments(prev => prev.filter(c => c.id !== commentId));

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('comments')
          .delete()
          .eq('id', commentId);
      } catch (err) {
        console.error('Failed to delete comment in Supabase:', err);
      }
    }
  };

  const getBoulderAttempts = (boulderId: string) => {
    return attempts.filter(a => a.boulder_id === boulderId);
  };

  const getBoulderComments = (boulderId: string) => {
    return comments.filter(c => c.boulder_id === boulderId);
  };

  const getUserAttemptOnBoulder = (boulderId: string, userId?: string) => {
    const targetUserId = userId || currentUser?.id;
    if (!targetUserId) return undefined;
    return attempts.find(a => a.boulder_id === boulderId && a.user_id === targetUserId);
  };

  const toggleProp = async (attemptId: string, userId: string) => {
    let willBePropped = false;
    setPropsMap((prev) => {
      const currentList = Array.isArray(prev[attemptId]) ? prev[attemptId] : [];
      const hasPropped = currentList.includes(userId);
      willBePropped = !hasPropped;
      let updatedList: string[];
      if (hasPropped) {
        updatedList = currentList.filter((id) => id !== userId);
      } else {
        updatedList = [...currentList, userId];
      }
      return { ...prev, [attemptId]: updatedList };
    });

    if (isSupabaseConfigured && supabase) {
      // 1. Instant WebSocket broadcast across all open clients/tabs
      try {
        if (channelRef.current) {
          const res = await channelRef.current.send({
            type: 'broadcast',
            event: 'prop_toggled',
            payload: {
              attemptId,
              userId,
              action: willBePropped ? 'add' : 'remove'
            }
          });
          if (res !== 'ok') {
            console.warn('Realtime prop broadcast status:', res);
          }
        }
      } catch (broadcastErr) {
        console.warn('Realtime prop broadcast warning:', broadcastErr);
      }

      // 2. Persist to database table if available
      try {
        if (willBePropped) {
          const { error } = await supabase.from('send_props').insert({
            attempt_id: attemptId,
            user_id: userId
          });
          if (error) {
            console.warn('Supabase send_props insert error:', error.message);
          }
        } else {
          const { error } = await supabase.from('send_props').delete().match({
            attempt_id: attemptId,
            user_id: userId
          });
          if (error) {
            console.warn('Supabase send_props delete error:', error.message);
          }
        }
      } catch (dbErr) {
        // Table may not exist yet if user hasn't run the migration
        console.warn('Supabase send_props persistence warning:', dbErr);
      }
    }
  };

  // Baseline automatic snapshot on session startup
  useEffect(() => {
    if (!loading && boulders.length > 0) {
      const existingSnaps = getLocalSnapshotsMeta();
      if (existingSnaps.length === 0) {
        const payload = createBackupPayload({
          gyms,
          areas,
          boulders,
          attempts,
          comments,
          profiles: climbers,
          propsMap
        });
        saveLocalSnapshot(payload, 'Session baseline snapshot');
      }
    }
  }, [loading, boulders.length]);

  const restoreBackupData = async (
    backup: WhamBackupData
  ): Promise<{ success: boolean; message: string; counts: any }> => {
    try {
      // 1. Take a safety snapshot of current state BEFORE applying restore
      const currentPayload = createBackupPayload({
        gyms,
        areas,
        boulders,
        attempts,
        comments,
        profiles: climbers,
        propsMap
      });
      saveLocalSnapshot(currentPayload, 'Pre-restore automatic safety snapshot');

      // 2. Restore state locally
      if (backup.gyms && backup.gyms.length > 0) {
        setGyms(backup.gyms);
        localStorage.setItem('wham_gyms', JSON.stringify(backup.gyms));
      }
      if (backup.areas && backup.areas.length > 0) {
        setAreas(backup.areas);
        localStorage.setItem('wham_areas', JSON.stringify(backup.areas));
      }
      if (backup.boulders && backup.boulders.length > 0) {
        setBoulders(backup.boulders);
        localStorage.setItem('wham_boulders', JSON.stringify(backup.boulders));
      }
      if (backup.attempts && backup.attempts.length > 0) {
        setAttempts(backup.attempts);
        localStorage.setItem('wham_attempts', JSON.stringify(backup.attempts));
      }
      if (backup.comments && backup.comments.length > 0) {
        setComments(backup.comments);
        localStorage.setItem('wham_comments', JSON.stringify(backup.comments));
      }
      if (backup.sendsProps && typeof backup.sendsProps === 'object') {
        setPropsMap(backup.sendsProps);
        localStorage.setItem('wham_sends_props', JSON.stringify(backup.sendsProps));
      }
      if (backup.profiles && backup.profiles.length > 0 && restoreProfilesFromBackup) {
        restoreProfilesFromBackup(backup.profiles, backup.climberCustomizations);
      }

      // 3. If Supabase is configured, sync restored data to remote
      if (isSupabaseConfigured && supabase) {
        try {
          if (backup.boulders && backup.boulders.length > 0) {
            const cleanBoulders = backup.boulders.map((b) => {
              const { adjacent_prev, adjacent_next, ...rest } = b;
              return rest;
            });
            await supabase.from('boulders').upsert(cleanBoulders, { onConflict: 'id' });
          }
          if (backup.attempts && backup.attempts.length > 0) {
            const cleanAttempts = backup.attempts.map((a) => {
              const { profile, ...rest } = a;
              return rest;
            });
            await supabase.from('attempts').upsert(cleanAttempts, { onConflict: 'boulder_id,user_id' });
          }
          if (backup.comments && backup.comments.length > 0) {
            const cleanComments = backup.comments.map((c) => {
              const { profile, ...rest } = c;
              return rest;
            });
            await supabase.from('comments').upsert(cleanComments, { onConflict: 'id' });
          }
        } catch (supabaseErr) {
          console.warn('Supabase restore sync note:', supabaseErr);
        }
      }

      const counts = {
        boulders: backup.boulders?.length ?? 0,
        attempts: backup.attempts?.length ?? 0,
        comments: backup.comments?.length ?? 0,
        profiles: backup.profiles?.length ?? 0
      };

      return {
        success: true,
        message: `Successfully restored ${counts.boulders} climbs, ${counts.attempts} logs, and ${counts.profiles} crew profiles.`,
        counts
      };
    } catch (err: any) {
      console.error('Failed to restore backup data:', err);
      return {
        success: false,
        message: err?.message || 'Failed to restore backup data.',
        counts: {}
      };
    }
  };

  const createManualSnapshot = (reason = 'Manual snapshot') => {
    const payload = createBackupPayload({
      gyms,
      areas,
      boulders,
      attempts,
      comments,
      profiles: climbers,
      propsMap
    });
    saveLocalSnapshot(payload, reason);
  };

  const restoreSnapshotById = async (snapshotId: string): Promise<boolean> => {
    const snapshotData = getLocalSnapshotData(snapshotId);
    if (!snapshotData) return false;
    const res = await restoreBackupData(snapshotData);
    return res.success;
  };

  const getSnapshotsList = (): LocalSnapshotMeta[] => {
    return getLocalSnapshotsMeta();
  };

  return (
    <GymContext.Provider
      value={{
        gyms,
        currentGym,
        setCurrentGym,
        areas,
        currentArea,
        setCurrentArea,
        boulders,
        attempts,
        comments,
        propsMap,
        toggleProp,
        loading,
        hideSent,
        setHideSent,
        showArchived,
        setShowArchived,
        logAttempt,
        deleteAttempt,
        addBoulder,
        bulkAddBoulders,
        archiveBoulder,
        moveBoulder,
        archiveAreaBoulders,
        updateAreaPhoto,
        removeAreaPhoto,
        pruneArchivedClimbPhotos,
        addComment,
        deleteComment,
        getBoulderAttempts,
        getBoulderComments,
        getUserAttemptOnBoulder,
        orderedActiveBouldersInCurrentArea,
        restoreBackupData,
        createManualSnapshot,
        restoreSnapshotById,
        getSnapshotsList
      }}
    >
      {children}
    </GymContext.Provider>
  );
};

export const useGym = () => {
  const context = useContext(GymContext);
  if (!context) {
    throw new Error('useGym must be used within a GymProvider');
  }
  return context;
};
