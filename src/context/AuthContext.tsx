import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Profile } from '../types';
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
  addClimber: (displayName: string, avatarUrl?: string) => Promise<Profile>;
  removeClimber: (profileId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [climbers, setClimbers] = useState<Profile[]>(INITIAL_PROFILES);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(!isSupabaseConfigured);
  const [loading, setLoading] = useState<boolean>(true);

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
            setClimbers(remoteProfiles);
          }

          if (session?.user) {
            // Find current user's profile
            const profile = (remoteProfiles || climbers).find(p => p.id === session.user.id);
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
                avatar_url: session.user.user_metadata?.avatar_url || null
              };
              setCurrentUser(fallbackProfile);
            }
            setIsDemoMode(false);
          } else {
            // No active session in Supabase, pick first climber or saved profile for viewing
            const active = (remoteProfiles || climbers).find(p => p.id === savedProfileId) || (remoteProfiles || climbers)[0];
            setCurrentUser(active);
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
                setCurrentUser(profile);
              } else {
                setCurrentUser({
                  id: session.user.id,
                  display_name: session.user.email?.split('@')[0] || 'Climber',
                  avatar_url: null
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
      const loadedClimbers = stored ? JSON.parse(stored) : INITIAL_PROFILES;
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

  const addClimber = async (displayName: string, avatarUrl?: string): Promise<Profile> => {
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

    const colors = ['ffb703', 'fb8500', '219ebc', '023047', '8338ec', '3a86ff', 'ff006e', '06d6a0'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const generatedAvatar = avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(trimmed)}&backgroundColor=${randomColor}`;

    const newProfile: Profile = {
      id: newId,
      display_name: trimmed,
      avatar_url: generatedAvatar,
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
          avatar_url: newProfile.avatar_url
        }]);
      } catch (err) {
        console.warn('Failed to insert new profile to Supabase:', err);
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
