import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { supabase, isSupabaseConfigured, uploadBoulderPhoto } from '../lib/supabase';
import { Boulder, Attempt, Comment, Gym, GymArea, Grade, AttemptStatus } from '../types';
import {
  INITIAL_GYMS,
  INITIAL_AREAS,
  INITIAL_BOULDERS,
  INITIAL_ATTEMPTS,
  INITIAL_COMMENTS
} from '../lib/mockData';
import { useAuth } from './AuthContext';
import confetti from 'canvas-confetti';

interface LogAttemptParams {
  boulderId: string;
  status: AttemptStatus;
  attemptCount: number;
}

interface AddBoulderParams {
  gymId: string;
  areaId: string;
  holdColour: string;
  grade: Grade;
  notes?: string;
  imageFile?: File | null;
  imageDataUrl?: string | null;
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
  loading: boolean;
  hideSent: boolean;
  setHideSent: (hide: boolean | ((prev: boolean) => boolean)) => void;
  showArchived: boolean;
  setShowArchived: (show: boolean | ((prev: boolean) => boolean)) => void;
  logAttempt: (params: LogAttemptParams) => Promise<void>;
  deleteAttempt: (boulderId: string) => Promise<void>;
  addBoulder: (params: AddBoulderParams) => Promise<Boulder>;
  archiveBoulder: (boulderId: string, archive?: boolean) => Promise<void>;
  archiveAreaBoulders: (areaId: string) => Promise<void>;
  addComment: (boulderId: string, content: string) => Promise<void>;
  getBoulderAttempts: (boulderId: string) => Attempt[];
  getBoulderComments: (boulderId: string) => Comment[];
  getUserAttemptOnBoulder: (boulderId: string, userId?: string) => Attempt | undefined;
  orderedActiveBouldersInCurrentArea: Boulder[];
}

const GymContext = createContext<GymContextType | undefined>(undefined);

export const GymProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isDemoMode } = useAuth();

  const [gyms, setGyms] = useState<Gym[]>(() => {
    const cached = localStorage.getItem('wham_gyms');
    return cached ? JSON.parse(cached) : INITIAL_GYMS;
  });

  const [currentGym, setCurrentGymState] = useState<Gym | null>(null);

  const [areas, setAreas] = useState<GymArea[]>(() => {
    const cached = localStorage.getItem('wham_areas');
    return cached ? JSON.parse(cached) : INITIAL_AREAS;
  });

  const [currentArea, setCurrentAreaState] = useState<GymArea | null>(null);

  const [boulders, setBoulders] = useState<Boulder[]>(() => {
    const cached = localStorage.getItem('wham_boulders');
    return cached ? JSON.parse(cached) : INITIAL_BOULDERS;
  });

  const [attempts, setAttempts] = useState<Attempt[]>(() => {
    const cached = localStorage.getItem('wham_attempts');
    return cached ? JSON.parse(cached) : INITIAL_ATTEMPTS;
  });

  const [comments, setComments] = useState<Comment[]>(() => {
    const cached = localStorage.getItem('wham_comments');
    return cached ? JSON.parse(cached) : INITIAL_COMMENTS;
  });

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
      } else {
        // Default to All Areas if no preference saved
        setCurrentAreaState(null);
      }
    }
  }, [currentGym, areas]);

  const setCurrentGym = (gym: Gym) => {
    setCurrentGymState(gym);
    localStorage.setItem('wham_active_gym_id', gym.id);
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

  // Sync with Supabase or fallback to LocalStorage
  useEffect(() => {
    async function fetchData() {
      if (!isSupabaseConfigured || !supabase) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const [gymsRes, areasRes, bouldersRes, attemptsRes, commentsRes] = await Promise.all([
          supabase.from('gyms').select('*').order('name'),
          supabase.from('gym_areas').select('*').order('sort_order'),
          supabase.from('boulders').select('*').order('position_order'),
          supabase.from('attempts').select('*, profile:profiles(*)'),
          supabase.from('comments').select('*, profile:profiles(*)').order('created_at', { ascending: true })
        ]);

        if (gymsRes.data && gymsRes.data.length > 0) setGyms(gymsRes.data);
        if (areasRes.data && areasRes.data.length > 0) setAreas(areasRes.data);
        if (bouldersRes.data && bouldersRes.data.length > 0) setBoulders(bouldersRes.data);
        if (attemptsRes.data && attemptsRes.data.length > 0) setAttempts(attemptsRes.data);
        if (commentsRes.data && commentsRes.data.length > 0) setComments(commentsRes.data);

        // Setup real-time subscriptions
        const channel = supabase
          .channel('wham-realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'boulders' }, (payload) => {
            if (payload.eventType === 'INSERT') {
              setBoulders(prev => [...prev, payload.new as Boulder]);
            } else if (payload.eventType === 'UPDATE') {
              setBoulders(prev => prev.map(b => b.id === payload.new.id ? { ...b, ...payload.new } : b));
            } else if (payload.eventType === 'DELETE') {
              setBoulders(prev => prev.filter(b => b.id === payload.old.id));
            }
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'attempts' }, (payload) => {
            if (payload.eventType === 'INSERT') {
              setAttempts(prev => [...prev.filter(a => !(a.boulder_id === payload.new.boulder_id && a.user_id === payload.new.user_id)), payload.new as Attempt]);
            } else if (payload.eventType === 'UPDATE') {
              setAttempts(prev => prev.map(a => a.id === payload.new.id ? { ...a, ...payload.new } : a));
            } else if (payload.eventType === 'DELETE') {
              setAttempts(prev => prev.filter(a => a.id !== payload.old.id));
            }
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, (payload) => {
            if (payload.eventType === 'INSERT') {
              setComments(prev => [...prev, payload.new as Comment]);
            }
          })
          .subscribe();

        return () => {
          supabase?.removeChannel(channel);
        };
      } catch (err) {
        console.error('Error fetching Supabase data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
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

    // Calculate adjacent prev / next indicators for each climb
    return filtered.map((boulder, index) => {
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
        adjacent_prev: prevBoulder ? { hold_colour: prevBoulder.hold_colour, grade: prevBoulder.grade } : null,
        adjacent_next: nextBoulder ? { hold_colour: nextBoulder.hold_colour, grade: nextBoulder.grade } : null
      };
    });
  }, [boulders, currentGym, currentArea, areas, showArchived]);

  // Log or update an attempt (Flash, Send, Attempt)
  const logAttempt = async ({ boulderId, status, attemptCount }: LogAttemptParams) => {
    if (!currentUser) return;

    // Trigger celebration confetti on Flash or Send!
    if (status === 'flashed') {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.7 },
        colors: ['#FACC15', '#F59E0B', '#EF4444', '#10B981']
      });
    } else if (status === 'sent') {
      confetti({
        particleCount: 50,
        spread: 50,
        origin: { y: 0.7 },
        colors: ['#10B981', '#3B82F6', '#6EE7B7']
      });
    }

    const newAttempt: Attempt = {
      id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      boulder_id: boulderId,
      user_id: currentUser.id,
      status,
      attempt_count: attemptCount,
      logged_at: new Date().toISOString(),
      profile: currentUser
    };

    // Optimistically update state
    setAttempts(prev => {
      const filtered = prev.filter(
        a => !(a.boulder_id === boulderId && a.user_id === currentUser.id)
      );
      return [...filtered, newAttempt];
    });

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('attempts').upsert({
          boulder_id: boulderId,
          user_id: currentUser.id,
          status,
          attempt_count: attemptCount,
          logged_at: new Date().toISOString()
        }, { onConflict: 'boulder_id,user_id' });

        if (error) throw error;
      } catch (err) {
        console.error('Failed to log attempt to Supabase:', err);
      }
    }
  };

  // Delete an attempt
  const deleteAttempt = async (boulderId: string) => {
    if (!currentUser) return;

    setAttempts(prev =>
      prev.filter(a => !(a.boulder_id === boulderId && a.user_id === currentUser.id))
    );

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('attempts')
          .delete()
          .match({ boulder_id: boulderId, user_id: currentUser.id });
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
      .filter(b => b.area_id === areaId && !b.is_archived)
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

  // Bulk Reset: Archive Entire Area
  const archiveAreaBoulders = async (areaId: string) => {
    setBoulders(prev => prev.map(b => b.area_id === areaId ? { ...b, is_archived: true } : b));

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
          setComments(prev => prev.map(c => c.id === newComment.id ? data : c));
        }
      } catch (err) {
        console.error('Failed to insert comment in Supabase:', err);
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
        loading,
        hideSent,
        setHideSent,
        showArchived,
        setShowArchived,
        logAttempt,
        deleteAttempt,
        addBoulder,
        archiveBoulder,
        archiveAreaBoulders,
        addComment,
        getBoulderAttempts,
        getBoulderComments,
        getUserAttemptOnBoulder,
        orderedActiveBouldersInCurrentArea
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
