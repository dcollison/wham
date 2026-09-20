import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Profile, CLIMBER_ACCENT_PALETTE } from '../types';
import { INITIAL_PROFILES } from '../lib/mockData';
import { updateWhamFavicon } from '../components/WhamLogo';

interface AuthContextType {
  currentUser: Profile | null;
  climbers: Profile[];
  isAuthenticated: boolean;
  isDemoMode: boolean;
  loading: boolean;
  signInWithOtp: (email: string) => Promise<{ error: Error | null }>;
  signInWithOAuth: (provider: 'google') => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  switchClimber: (profileId: string) => void;
  updateDisplayName: (displayName: string) => Promise<void>;
  updateAccentColor: (accentColor: string) => Promise<void>;
  updateAvatarIcon: (avatarIcon: string) => Promise<void>;
  updateClimber: (profileId: string, updates: { display_name?: string; accent_color?: string; avatar_icon?: string }) => Promise<void>;
  addClimber: (displayName: string, avatarUrl?: string, accentColor?: string, avatarIcon?: string) => Promise<Profile>;
  removeClimber: (profileId: string) => Promise<void>;
  restoreProfilesFromBackup: (profiles: Profile[], customizations?: Record<string, any>) => void;
}

const COLOR_MIGRATION_MAP: Record<string, string> = {
  '#f59e0b': '#E2A336', // Amber
  '#f97316': '#E07638', // Orange
  '#06b6d4': '#2BB3C7', // Cyan
  '#8b5cf6': '#8B6BD6', // Purple
  '#f43f5e': '#D85470', // Rose
  '#10b981': '#32A378', // Emerald
  '#3b82f6': '#4682D7', // Blue
  '#84cc16': '#7CA832', // Lime
  '#ec4899': '#D45C8E', // Pink
  '#6366f1': '#686BD6', // Indigo
  '#14b8a6': '#2AA698', // Teal
  '#ef4444': '#D85454', // Red
};

function normalizeMutedAccent(color?: string | null): string {
  if (!color) return CLIMBER_ACCENT_PALETTE[0].hex;
  const lower = color.toLowerCase();
  return COLOR_MIGRATION_MAP[lower] || color;
}

const CUSTOMIZATIONS_KEY = 'wham_climber_customizations';

export interface ClimberCustomization {
  accent_color?: string;
  avatar_icon?: string;
  display_name?: string;
  updated_at?: string;
}

export function getClimberCustomizations(): Record<string, ClimberCustomization> {
  try {
    const raw = localStorage.getItem(CUSTOMIZATIONS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveClimberCustomization(climberId: string, custom: Partial<ClimberCustomization>) {
  try {
    const all = getClimberCustomizations();
    all[climberId] = {
      ...all[climberId],
      ...custom,
      updated_at: new Date().toISOString()
    };
    localStorage.setItem(CUSTOMIZATIONS_KEY, JSON.stringify(all));
  } catch (e) {
    console.warn('Failed to save climber customization to localStorage:', e);
  }
}

function enrichProfile(
  p: Profile,
  idx: number,
  customizations: Record<string, ClimberCustomization>
): Profile {
  const custom = customizations[p.id];
  const initialMatch = INITIAL_PROFILES.find((ip) => ip.id === p.id);

  // 1. Accent Color: custom > p.accent_color > initial > palette fallback
  const rawColor =
    custom?.accent_color ||
    p.accent_color ||
    initialMatch?.accent_color ||
    CLIMBER_ACCENT_PALETTE[idx % CLIMBER_ACCENT_PALETTE.length].hex;
  const accent_color = normalizeMutedAccent(rawColor);

  // 2. Avatar Icon: custom > p.avatar_icon > icon: in url > initial icon > 'zap'
  let rawIcon: string | undefined = undefined;
  if (custom?.avatar_icon) {
    // Explicit user customization ALWAYS wins
    rawIcon = custom.avatar_icon;
  } else if (p.avatar_icon) {
    rawIcon = p.avatar_icon;
  } else if (p.avatar_url?.startsWith('icon:')) {
    rawIcon = p.avatar_url.replace('icon:', '');
  }

  // Only fallback to initial profile icon if user hasn't explicitly set a custom icon
  if (!custom?.avatar_icon && (!rawIcon || rawIcon === 'zap') && initialMatch?.avatar_icon && initialMatch.avatar_icon !== 'zap') {
    rawIcon = initialMatch.avatar_icon;
  }
  const avatar_icon = (rawIcon || initialMatch?.avatar_icon || 'zap').toLowerCase().trim();
  const avatar_url = p.avatar_url?.startsWith('http') ? p.avatar_url : `icon:${avatar_icon}`;

  // 3. Display name: custom > p.display_name
  const display_name = custom?.display_name || p.display_name;

  return {
    ...p,
    display_name,
    accent_color,
    avatar_icon,
    avatar_url
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [climbers, setClimbers] = useState<Profile[]>(() => {
    const customizations = getClimberCustomizations();
    try {
      const stored = localStorage.getItem('wham_profiles');
      if (stored) {
        const raw = JSON.parse(stored);
        if (Array.isArray(raw) && raw.length > 0) {
          return raw.map((c: Profile, idx: number) => enrichProfile(c, idx, customizations));
        }
      }
    } catch {
      // Fallback
    }
    return INITIAL_PROFILES.map((c, idx) => enrichProfile(c, idx, customizations));
  });

  const [currentUser, setCurrentUser] = useState<Profile | null>(() => {
    const customizations = getClimberCustomizations();
    try {
      const savedProfileId = localStorage.getItem('wham_active_profile_id');
      const stored = localStorage.getItem('wham_profiles');
      const list: Profile[] = stored ? JSON.parse(stored) : INITIAL_PROFILES;
      const mapped = list.map((c, idx) => enrichProfile(c, idx, customizations));
      if (savedProfileId) {
        const found = mapped.find((p) => p.id === savedProfileId);
        if (found) return found;
      }
      return mapped[0] || null;
    } catch {
      return INITIAL_PROFILES[0] ? enrichProfile(INITIAL_PROFILES[0], 0, customizations) : null;
    }
  });

  const [isDemoMode, setIsDemoMode] = useState<boolean>(!isSupabaseConfigured);
  const [loading, setLoading] = useState<boolean>(true);

  // Dynamically update CSS custom properties and browser favicon to match active user
  useEffect(() => {
    const accent = normalizeMutedAccent(currentUser?.accent_color);
    document.documentElement.style.setProperty('--color-accent', accent);
    document.documentElement.style.setProperty('--wham-accent', accent);
    updateWhamFavicon(accent);
  }, [currentUser?.accent_color]);

  // Initialize session and profiles
  useEffect(() => {
    async function initAuth() {
      setLoading(true);

      // Check for locally stored profile preference
      const savedProfileId = localStorage.getItem('wham_active_profile_id');
      const customizations = getClimberCustomizations();

      if (isSupabaseConfigured && supabase) {
        try {
          // Fetch existing session
          const { data: { session } } = await supabase.auth.getSession();

          // Fetch profiles from Supabase
          const { data: remoteProfiles, error: profileErr } = await supabase
            .from('profiles')
            .select('*')
            .order('display_name');

          if (!profileErr && remoteProfiles && remoteProfiles.length > 0) {
            const mappedProfiles: Profile[] = remoteProfiles.map((p, idx) =>
              enrichProfile(p, idx, customizations)
            );
            setClimbers(mappedProfiles);
            localStorage.setItem('wham_profiles', JSON.stringify(mappedProfiles));

            if (session?.user) {
              // Find current user's profile
              const profile = mappedProfiles.find(p => p.id === session.user.id);
              if (profile) {
                setCurrentUser(profile);
              } else {
                // Auto create/fetch profile if trigger hadn't fired yet
                const fallbackProfile: Profile = {
                  id: session.user.id,
                  display_name: session.user.user_metadata?.display_name ||
                                session.user.user_metadata?.full_name ||
                                session.user.email?.split('@')[0] ||
                                'Climber',
                  avatar_url: session.user.user_metadata?.avatar_url || null,
                  avatar_icon: 'zap',
                  accent_color: normalizeMutedAccent(CLIMBER_ACCENT_PALETTE[0].hex)
                };
                setCurrentUser(fallbackProfile);
              }
              setIsDemoMode(false);
            } else {
              // No active session in Supabase, pick first climber or saved profile for viewing
              const active = mappedProfiles.find(p => p.id === savedProfileId) || mappedProfiles[0];
              setCurrentUser(active || null);
            }
          }

          // Listen for auth state changes (e.g. login/logout via email or OAuth)
          const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
              const { data: profile } = await supabase!
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

              if (profile) {
                setCurrentUser(enrichProfile(profile, 0, getClimberCustomizations()));
              } else {
                setCurrentUser({
                  id: session.user.id,
                  display_name: session.user.email?.split('@')[0] || 'Climber',
                  avatar_url: null,
                  avatar_icon: 'zap',
                  accent_color: CLIMBER_ACCENT_PALETTE[0].hex
                });
              }
              setIsDemoMode(false);
            }
            // In shared crew mode (session is null), do NOT overwrite currentUser with stale closure
          });

          setLoading(false);
          return () => {
            authListener.subscription.unsubscribe();
          };
        } catch (err) {
          console.warn('Supabase auth initialization failed, defaulting to offline demo mode:', err);
          setIsDemoMode(true);
        }
      }

      // Offline / Demo fallback
      const stored = localStorage.getItem('wham_profiles');
      const rawClimbers: Profile[] = stored ? JSON.parse(stored) : INITIAL_PROFILES;
      const loadedClimbers: Profile[] = rawClimbers.map((c, idx) =>
        enrichProfile(c, idx, customizations)
      );
      setClimbers(loadedClimbers);

      const active = loadedClimbers.find((p: Profile) => p.id === savedProfileId) || loadedClimbers[0];
      setCurrentUser(active);
      setIsDemoMode(true);
      setLoading(false);
    }

    initAuth();
  }, []);

  const switchClimber = (profileId: string) => {
    const climber = climbers.find(c => c.id === profileId);
    if (climber) {
      setCurrentUser(climber);
      localStorage.setItem('wham_active_profile_id', profileId);
    }
  };

  const updateClimber = async (
    profileId: string,
    updates: { display_name?: string; accent_color?: string; avatar_icon?: string }
  ): Promise<void> => {
    const customToSave: Partial<ClimberCustomization> = {};
    if (updates.display_name !== undefined) customToSave.display_name = updates.display_name.trim();
    if (updates.accent_color !== undefined) customToSave.accent_color = updates.accent_color.trim();
    if (updates.avatar_icon !== undefined) customToSave.avatar_icon = updates.avatar_icon.trim().toLowerCase();

    // 1. Immediately persist to localStorage customizations
    saveClimberCustomization(profileId, customToSave);

    // 2. Functional updates to React state to prevent race conditions
    setClimbers((prevClimbers) => {
      const updated = prevClimbers.map((c) => {
        if (c.id !== profileId) return c;
        const newColor = updates.accent_color !== undefined ? updates.accent_color.trim() : c.accent_color;
        const newIcon = updates.avatar_icon !== undefined ? updates.avatar_icon.trim().toLowerCase() : c.avatar_icon;
        const newName = updates.display_name !== undefined ? updates.display_name.trim() : c.display_name;
        return {
          ...c,
          display_name: newName,
          accent_color: newColor,
          avatar_icon: newIcon,
          avatar_url: newIcon ? `icon:${newIcon}` : c.avatar_url
        };
      });
      try {
        localStorage.setItem('wham_profiles', JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save wham_profiles to localStorage:', e);
      }
      return updated;
    });

    setCurrentUser((prevUser) => {
      if (!prevUser || prevUser.id !== profileId) return prevUser;
      const newColor = updates.accent_color !== undefined ? updates.accent_color.trim() : prevUser.accent_color;
      const newIcon = updates.avatar_icon !== undefined ? updates.avatar_icon.trim().toLowerCase() : prevUser.avatar_icon;
      const newName = updates.display_name !== undefined ? updates.display_name.trim() : prevUser.display_name;
      return {
        ...prevUser,
        display_name: newName,
        accent_color: newColor,
        avatar_icon: newIcon,
        avatar_url: newIcon ? `icon:${newIcon}` : prevUser.avatar_url
      };
    });

    // 3. Sync to Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        const payload: Record<string, any> = {};
        if (updates.display_name) payload.display_name = updates.display_name.trim();
        if (updates.accent_color) payload.accent_color = updates.accent_color.trim();
        if (updates.avatar_icon) {
          payload.avatar_icon = updates.avatar_icon.trim().toLowerCase();
          payload.avatar_url = `icon:${payload.avatar_icon}`;
        }

        const { data, error } = await supabase
          .from('profiles')
          .update(payload)
          .eq('id', profileId)
          .select();

        if (error || !data || data.length === 0) {
          console.warn('Notice: Supabase profiles update was not persisted remotely (saved locally in browser storage):', error?.message || '0 rows matched RLS.');
        }
      } catch (err) {
        console.warn('Supabase profile sync error (saved locally):', err);
      }
    }
  };

  const updateDisplayName = async (displayName: string) => {
    if (!currentUser) return;
    const trimmed = displayName.trim();
    if (!trimmed) return;
    await updateClimber(currentUser.id, { display_name: trimmed });
  };

  const updateAccentColor = async (accentColor: string) => {
    if (!currentUser) return;
    const trimmed = accentColor.trim();
    if (!trimmed) return;
    await updateClimber(currentUser.id, { accent_color: trimmed });
  };

  const updateAvatarIcon = async (avatarIcon: string) => {
    if (!currentUser) return;
    const trimmed = avatarIcon.trim().toLowerCase();
    if (!trimmed) return;
    await updateClimber(currentUser.id, { avatar_icon: trimmed });
  };

  const addClimber = async (
    displayName: string,
    avatarUrl?: string,
    accentColor?: string,
    avatarIcon?: string
  ): Promise<Profile> => {
    const trimmed = displayName.trim();
    if (!trimmed) {
      throw new Error('Name cannot be empty');
    }

    const newId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });

    const existingColors = new Set(climbers.map(c => c.accent_color?.toLowerCase()).filter(Boolean));
    const defaultColor = CLIMBER_ACCENT_PALETTE.find(c => !existingColors.has(c.hex.toLowerCase()))?.hex ||
      CLIMBER_ACCENT_PALETTE[climbers.length % CLIMBER_ACCENT_PALETTE.length].hex;
    const finalAccentColor = accentColor || defaultColor;
    const finalIcon = avatarIcon || 'zap';
    const finalAvatarUrl = avatarUrl || `icon:${finalIcon}`;

    const newProfile: Profile = {
      id: newId,
      display_name: trimmed,
      avatar_url: finalAvatarUrl,
      avatar_icon: finalIcon,
      accent_color: finalAccentColor,
      created_at: new Date().toISOString()
    };

    saveClimberCustomization(newId, {
      display_name: trimmed,
      accent_color: finalAccentColor,
      avatar_icon: finalIcon
    });

    const updatedClimbers = [...climbers, newProfile];
    setClimbers(updatedClimbers);
    setCurrentUser(newProfile);
    localStorage.setItem('wham_profiles', JSON.stringify(updatedClimbers));
    localStorage.setItem('wham_active_profile_id', newProfile.id);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('profiles').insert([{
          id: newProfile.id,
          display_name: newProfile.display_name,
          avatar_url: newProfile.avatar_url,
          avatar_icon: newProfile.avatar_icon,
          accent_color: newProfile.accent_color
        }]);
      } catch (err) {
        try {
          await supabase.from('profiles').insert([{
            id: newProfile.id,
            display_name: newProfile.display_name,
            avatar_url: newProfile.avatar_url,
            accent_color: newProfile.accent_color
          }]);
        } catch (innerErr) {
          console.warn('Failed to insert new profile to Supabase:', innerErr);
        }
      }
    }

    return newProfile;
  };

  const removeClimber = async (profileId: string): Promise<void> => {
    if (climbers.length <= 1) {
      alert('Cannot remove the only climber in the group.');
      return;
    }

    const updatedClimbers = climbers.filter(c => c.id !== profileId);
    setClimbers(updatedClimbers);
    localStorage.setItem('wham_profiles', JSON.stringify(updatedClimbers));

    if (currentUser?.id === profileId) {
      const nextUser = updatedClimbers[0];
      setCurrentUser(nextUser);
      localStorage.setItem('wham_active_profile_id', nextUser.id);
    }

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('profiles').delete().eq('id', profileId);
      } catch (err) {
        console.warn('Failed to delete profile from Supabase:', err);
      }
    }
  };

  const signInWithOtp = async (email: string) => {
    if (!supabase || !isSupabaseConfigured) {
      // Demo simulated login
      const matchedClimber = climbers.find(
        c => c.display_name.toLowerCase() === email.split('@')[0].toLowerCase()
      ) || climbers[0];
      setCurrentUser(matchedClimber);
      return { error: null };
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin
        }
      });
      return { error };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signInWithOAuth = async (provider: 'google') => {
    if (!supabase || !isSupabaseConfigured) {
      return { error: new Error('Supabase credentials not configured yet.') };
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin
        }
      });
      return { error };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signOut = async () => {
    if (supabase && isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    // Switch to first default climber
    setCurrentUser(climbers[0]);
  };

  const restoreProfilesFromBackup = (
    restoredProfiles: Profile[],
    restoredCustomizations?: Record<string, any>
  ) => {
    if (!Array.isArray(restoredProfiles) || restoredProfiles.length === 0) return;
    if (restoredCustomizations && typeof restoredCustomizations === 'object') {
      try {
        const existing = getClimberCustomizations();
        const merged = { ...existing, ...restoredCustomizations };
        localStorage.setItem(CUSTOMIZATIONS_KEY, JSON.stringify(merged));
      } catch (e) {
        // Ignore
      }
    }
    const customizations = getClimberCustomizations();
    const mapped = restoredProfiles.map((p, idx) => enrichProfile(p, idx, customizations));
    setClimbers(mapped);
    localStorage.setItem('wham_profiles', JSON.stringify(mapped));
    const activeId = localStorage.getItem('wham_active_profile_id') || currentUser?.id;
    const active = mapped.find((p) => p.id === activeId) || mapped[0];
    setCurrentUser(active);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        climbers,
        isAuthenticated: Boolean(currentUser),
        isDemoMode,
        loading,
        signInWithOtp,
        signInWithOAuth,
        signOut,
        switchClimber,
        updateDisplayName,
        updateAccentColor,
        updateAvatarIcon,
        updateClimber,
        addClimber,
        removeClimber,
        restoreProfilesFromBackup
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
