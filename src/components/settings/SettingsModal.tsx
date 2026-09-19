import React, { useState } from 'react';
import { Profile } from '../../types';
import { isSupabaseConfigured, reconfigureSupabase } from '../../lib/supabase';
import { Users, User, Shield, Key, RefreshCw, X, Check, Mail, LogOut } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: Profile | null;
  climbers: Profile[];
  onSwitchClimber: (profileId: string) => void;
  onUpdateDisplayName: (name: string) => Promise<void>;
  onSignInWithOtp: (email: string) => Promise<{ error: Error | null }>;
  onSignInWithOAuth: (provider: 'google') => Promise<{ error: Error | null }>;
  onSignOut: () => Promise<void>;
  isDemoMode: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  climbers,
  onSwitchClimber,
  onUpdateDisplayName,
  onSignInWithOtp,
  onSignInWithOAuth,
  onSignOut,
  isDemoMode
}) => {
  const [displayName, setDisplayName] = useState<string>(currentUser?.display_name || '');
  const [emailInput, setEmailInput] = useState<string>('');
  const [supabaseUrl, setSupabaseUrl] = useState<string>(localStorage.getItem('wham_supabase_url') || '');
  const [supabaseKey, setSupabaseKey] = useState<string>(localStorage.getItem('wham_supabase_key') || '');
  const [savedStatus, setSavedStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    await onUpdateDisplayName(displayName.trim());
    setSavedStatus('Name updated!');
    setTimeout(() => setSavedStatus(null), 2000);
  };

  const handleOtpLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    const { error } = await onSignInWithOtp(emailInput.trim());
    if (error) {
      alert(`Login error: ${error.message}`);
    } else {
      alert(`Magic Link sent to ${emailInput}! Check your inbox.`);
      setEmailInput('');
    }
  };

  const handleSaveSupabaseConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (supabaseUrl && supabaseKey) {
      const ok = reconfigureSupabase(supabaseUrl, supabaseKey);
      if (ok) {
        setSavedStatus('Supabase credentials saved! Reloading...');
        setTimeout(() => window.location.reload(), 800);
      }
    }
  };

  const handleResetData = () => {
    if (window.confirm('Reset all climbs and attempts back to the initial seed dataset?')) {
      localStorage.removeItem('wham_gyms');
      localStorage.removeItem('wham_areas');
      localStorage.removeItem('wham_boulders');
      localStorage.removeItem('wham_attempts');
      localStorage.removeItem('wham_comments');
      localStorage.removeItem('wham_profiles');
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-slate-900 border-t sm:border border-slate-700/80 rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">The Circle & Account</h2>
              <p className="text-xs text-slate-400">Private climbing group settings</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Climber Switcher (Alex, Dale, Taiye, Euan) */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Active Climber Profile
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {climbers.map((climber) => {
              const isSelected = currentUser?.id === climber.id;
              return (
                <button
                  key={climber.id}
                  type="button"
                  onClick={() => onSwitchClimber(climber.id)}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all active-press ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-md ring-1 ring-amber-400/50'
                      : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  {climber.avatar_url ? (
                    <img
                      src={climber.avatar_url}
                      alt={climber.display_name}
                      className="w-8 h-8 rounded-full border border-slate-600"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-amber-400 text-black font-black flex items-center justify-center text-xs">
                      {climber.display_name.charAt(0)}
                    </div>
                  )}
                  <span className="font-bold text-xs">{climber.display_name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Display Name Edit */}
        <form onSubmit={handleUpdateName} className="flex flex-col gap-2">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Your Display Name
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="flex-1 bg-slate-800 border border-slate-700 text-slate-100 text-xs rounded-xl px-3.5 py-2.5 outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-black active-press transition-colors"
            >
              Save
            </button>
          </div>
          {savedStatus && <span className="text-[11px] text-emerald-400 font-medium">{savedStatus}</span>}
        </form>

        {/* Supabase Magic Link Auth / Google OAuth */}
        <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/60 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-400" />
              Supabase Authentication
            </span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
              isSupabaseConfigured ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-700 text-slate-300'
            }`}>
              {isSupabaseConfigured ? 'Online' : 'Local / Demo'}
            </span>
          </div>

          <form onSubmit={handleOtpLogin} className="flex flex-col gap-2">
            <label className="text-[11px] text-slate-400">
              Sign in with Email (Magic Link OTP)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="climber@wham.app"
                className="flex-1 bg-slate-900 border border-slate-700 text-slate-100 text-xs rounded-xl px-3.5 py-2 outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-700 hover:bg-slate-600 text-white flex items-center gap-1 active-press"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Send OTP</span>
              </button>
            </div>
          </form>

          {isSupabaseConfigured && (
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => onSignInWithOAuth('google')}
                className="flex-1 py-2 px-3 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 active-press"
              >
                <span>Continue with Google</span>
              </button>

              <button
                type="button"
                onClick={onSignOut}
                className="p-2 rounded-xl border border-rose-900/40 bg-rose-950/30 text-rose-300 hover:bg-rose-900/40 active-press"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Dynamic Supabase Backend Credentials Configuration */}
        <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/60 flex flex-col gap-3">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Key className="w-4 h-4 text-amber-400" />
            Supabase Connection Config
          </span>
          <p className="text-[11px] text-slate-400">
            Set environment variables <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> or input them directly here:
          </p>

          <form onSubmit={handleSaveSupabaseConfig} className="flex flex-col gap-2">
            <input
              type="text"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              placeholder="https://xyzcompany.supabase.co"
              className="bg-slate-900 border border-slate-700 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none font-mono"
            />
            <input
              type="password"
              value={supabaseKey}
              onChange={(e) => setSupabaseKey(e.target.value)}
              placeholder="eyJhbGciOi... (anon key)"
              className="bg-slate-900 border border-slate-700 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none font-mono"
            />
            <button
              type="submit"
              className="mt-1 py-2 rounded-xl text-xs font-bold bg-slate-700 hover:bg-slate-600 text-white active-press"
            >
              Connect & Sync Supabase
            </button>
          </form>
        </div>

        {/* Reset Database */}
        <div className="border-t border-slate-800 pt-3 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-300 block">Reset Dataset</span>
            <span className="text-[11px] text-slate-500">Restore Google Sheet seed data</span>
          </div>
          <button
            type="button"
            onClick={handleResetData}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-900/50 text-rose-400 hover:bg-rose-950/40 text-xs font-semibold active-press transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset to Seed Data</span>
          </button>
        </div>
      </div>
    </div>
  );
};
