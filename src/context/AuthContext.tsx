import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Profile, CLIMBER_ACCENT_PALETTE } from '../types';
import { INITIAL_PROFILES } from '../lib/mockData';

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
  addClimber: (displayName: string, avatarUrl?: string, accentColor?: string, avatarIcon?: string) => Promise<Profile>;
  removeClimber: (profileId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [climbers, setClimbers] = useState<Profile[]>(() => {
    try {
      const stored = localStorage.getItem('wham_profiles');
      if (stored) {
        const raw = JSON.parse(stored);
        if (Array.isArray(raw) && raw.length > 0) {
          return raw.map((c: Profile, idx: number) => ({
            ...c,
            accent_color: c.accent_color || CLIMBER_ACCENT_PALETTE[idx % CLIMBER_ACCENT_PALETTE.length].hex
          }));
        }
      }
    } catch {
      // Fallback
    }
    return INITIAL_PROFILES;
  });

  const [currentUser, setCurrentUser] = useState<Profile | null>(() => {
    try {
      const savedProfileId = localStorage.getItem('wham_active_profile_id');
      const stored = localStorage.getItem('wham_profiles');
      const list: Profile[] = stored ? JSON.parse(stored) : INITIAL_PROFILES;
      if (savedProfileId) {
        const found = list.find((p) => p.id === savedProfileId);
        if (found) {
          return {
            ...found,
            accent_color: found.accent_color || CLIMBER_ACCENT_PALETTE[0].hex
          };
        }
      }
      return list[0] || null;
    } catch {
      return INITIAL_PROFILES[0] || null;
    }
  });

  const [isDemoMode, setIsDemoMode] = useState<boolean>(!isSupabaseConfigured);
  const [loading, setLoading] = useState<boolean>(true);

  // Dynamically update CSS custom properties for app accent colour to match active user
  useEffect(() => {
    const accent = currentUser?.accent_color || '#F59E0B';
    document.documentElement.style.setProperty('--color-accent', accent);
    document.documentElement.style.setProperty('--wham-accent', accent);
  }, [currentUser?.accent_color]);

  // Initialize session and profiles
  useEffect(() => {
    async function initAuth() {
      setLoading(true);

      // Check for locally stored profile preference
      const savedProfileId = localStorage.getItem('wham_active_profile_id');

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
            const mappedProfiles: Profile[] = remoteProfiles.map((p, idx) => ({
              ...p,
              avatar_icon: p.avatar_icon || (p.avatar_url?.startsWith('icon:') ? p.avatar_url.replace('icon:', '') : null),
              accent_color: p.accent_color || CLIMBER_ACCENT_PALETTE[idx % CLIMBER_ACCENT_PALETTE.length].hex
            }));
            setClimbers(mappedProfiles);
          }

          if (session?.user) {
            // Find current user's profile
            const profile = (remoteProfiles || climbers).find(p => p.id === session.user.id);
            if (profile) {
              setCurrentUser({
                ...profile,
                accent_color: profile.accent_color || CLIMBER_ACCENT_PALETTE[0].hex
              });
            } else {
              // Auto create/fetch profile if trigger hadn't fired yet
              const fallbackProfile: Profile = {
                id: session.user.id,
                display_name: session.user.user_metadata?.display_name ||
                              session.user.user_metadata?.full_name ||
                              session.user.email?.split('@')[0] ||
                              'Climber',
                avatar_url: session.user.user_metadata?.avatar_url || null,
                accent_color: CLIMBER_ACCENT_PALETTE[0].hex
              };
              setCurrentUser(fallbackProfile);
            }
            setIsDemoMode(false);
          } else {
            // No active session in Supabase, pick first climber or saved profile for viewing
            const active = (remoteProfiles || climbers).find(p => p.id === savedProfileId) || (remoteProfiles || climbers)[0];
            setCurrentUser(active ? {
              ...active,
              accent_color: active.accent_color || CLIMBER_ACCENT_PALETTE[0].hex
            } : null);
          }

          // Listen for auth state changes
          const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
              const { data: profile } = await supabase!
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

              if (profile) {
                setCurrentUser({
                  ...profile,
                  accent_color: profile.accent_color || CLIMBER_ACCENT_PALETTE[0].hex
                });
              } else {
                setCurrentUser({
                  id: session.user.id,
                  display_name: session.user.email?.split('@')[0] || 'Climber',
                  avatar_url: null,
                  accent_color: CLIMBER_ACCENT_PALETTE[0].hex
                });
              }
              setIsDemoMode(false);
            } else {
              // When logged out in Supabase, fallback to climber preview
              const active = climbers.find(p => p.id === savedProfileId) || climbers[0];
              setCurrentUser(active);
            }
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
      const loadedClimbers: Profile[] = rawClimbers.map((c, idx) => ({
        ...c,
        accent_color: c.accent_color || INITIAL_PROFILES[idx]?.accent_color || CLIMBER_ACCENT_PALETTE[idx % CLIMBER_ACCENT_PALETTE.length].hex
      }));
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

  const updateDisplayName = async (displayName: string) => {
    if (!currentUser) return;
    const trimmed = displayName.trim();
    if (!trimmed) return;

    const updatedUser = { ...currentUser, display_name: trimmed };
    setCurrentUser(updatedUser);

    const updatedClimbers = climbers.map(c => c.id === currentUser.id ? updatedUser : c);
    setClimbers(updatedClimbers);
    localStorage.setItem('wham_profiles', JSON.stringify(updatedClimbers));

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('profiles')
          .update({ display_name: trimmed })
          .eq('id', currentUser.id);
      } catch (err) {
        console.error('Failed to update display name on Supabase:', err);
      }
    }
  };

  const updateAccentColor = async (accentColor: string) => {
    if (!currentUser) return;
    const trimmed = accentColor.trim();
    if (!trimmed) return;

    const updatedUser = { ...currentUser, accent_color: trimmed };
    setCurrentUser(updatedUser);

    const updatedClimbers = climbers.map(c => c.id === currentUser.id ? updatedUser : c);
    setClimbers(updatedClimbers);
    localStorage.setItem('wham_profiles', JSON.stringify(updatedClimbers));

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('profiles')
          .update({ accent_color: trimmed })
          .eq('id', currentUser.id);
      } catch (err) {
        console.warn('Failed to update accent color on Supabase:', err);
      }
    }
  };

  const updateAvatarIcon = async (avatarIcon: string) => {
    if (!currentUser) return;
    const trimmed = avatarIcon.trim().toLowerCase();
    if (!trimmed) return;

    const updatedUser: Profile = {
      ...currentUser,
      avatar_icon: trimmed,
      avatar_url: `icon:${trimmed}`
    };
    setCurrentUser(updatedUser);

    const updatedClimbers = climbers.map((c) => (c.id === currentUser.id ? updatedUser : c));
    setClimbers(updatedClimbers);
    localStorage.setItem('wham_profiles', JSON.stringify(updatedClimbers));

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('profiles')
          .update({
            avatar_url: `icon:${trimmed}`,
            avatar_icon: trimmed
          })
          .eq('id', currentUser.id);
      } catch (err) {
        try {
          await supabase
            .from('profiles')
            .update({ avatar_url: `icon:${trimmed}` })
            .eq('id', currentUser.id);
        } catch (innerErr) {
          console.warn('Failed to update avatar icon on Supabase:', innerErr);
        }
      }
    }
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
        addClimber,
        removeClimber
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
