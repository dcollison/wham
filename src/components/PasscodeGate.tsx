import React, { useState, useEffect, useCallback } from 'react';
import { WhamBadge } from './WhamLogo';
import { Lock, Delete, AlertCircle } from 'lucide-react';
import { STORAGE_KEYS } from '../lib/storage';

interface PasscodeGateProps {
  onUnlock: () => void;
}

const REQUIRED_PIN = '2338';
const PIN_LENGTH = 4;

export const PasscodeGate: React.FC<PasscodeGateProps> = ({ onUnlock }) => {
  const [pin, setPin] = useState<string>('');
  const [isError, setIsError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const handleSuccess = useCallback(() => {
    setIsSuccess(true);
    setIsError(false);
    setErrorMessage('');
    localStorage.setItem(STORAGE_KEYS.PASSCODE_UNLOCKED, 'true');
    window.dispatchEvent(new Event('wham_passcode_status_changed'));

    setTimeout(() => {
      onUnlock();
    }, 220);
  }, [onUnlock]);

  const handleInputDigit = useCallback((digit: string) => {
    if (isSuccess) return;
    setIsError(false);
    setErrorMessage('');

    setPin((prev) => (prev.length < PIN_LENGTH ? prev + digit : prev));
  }, [isSuccess]);

  useEffect(() => {
    if (pin.length !== PIN_LENGTH || isSuccess) return;

    let outerTimer: ReturnType<typeof setTimeout> | null = null;
    let innerTimer: ReturnType<typeof setTimeout> | null = null;

    if (pin === REQUIRED_PIN) {
      outerTimer = setTimeout(() => {
        handleSuccess();
      }, 50);
    } else {
      outerTimer = setTimeout(() => {
        setIsError(true);
        setErrorMessage('Incorrect passcode. Try again.');
        innerTimer = setTimeout(() => {
          setPin('');
          setIsError(false);
        }, 750);
      }, 100);
    }

    return () => {
      if (outerTimer) clearTimeout(outerTimer);
      if (innerTimer) clearTimeout(innerTimer);
    };
  }, [pin, isSuccess, handleSuccess]);

  const handleDelete = useCallback(() => {
    if (isSuccess) return;
    setIsError(false);
    setErrorMessage('');
    setPin((prev) => prev.slice(0, -1));
  }, [isSuccess]);

  const handleClear = useCallback(() => {
    if (isSuccess) return;
    setIsError(false);
    setErrorMessage('');
    setPin('');
  }, [isSuccess]);

  // Physical keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleInputDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      } else if (e.key === 'Escape' || e.key === 'c' || e.key === 'C') {
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleInputDigit, handleDelete, handleClear]);

  return (
    <div className="fixed inset-0 z-50 bg-carbon flex flex-col items-center justify-between p-6 select-none overflow-y-auto">
      {/* Top Header & Branding */}
      <div className="relative z-10 w-full max-w-xs flex flex-col items-center pt-8 sm:pt-12 text-center">
        <div className="mb-4 transition-transform hover:scale-105 active-press">
          <WhamBadge size="lg" />
        </div>
        <h1 className="font-extrabold text-2xl tracking-tight text-white">
          Wham.
        </h1>
        <p className="text-xs font-semibold text-slate-400 tracking-wider uppercase mt-1">
          Private Crew Access
        </p>
      </div>

      {/* Center: PIN Indicators & Status */}
      <div className="relative z-10 w-full max-w-xs flex flex-col items-center my-auto py-6">
        <div className="flex items-center gap-2 mb-6">
          <Lock className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs font-medium text-slate-300">
            Enter 4-digit PIN to continue
          </span>
        </div>

        {/* 4-digit PIN display circles */}
        <div className={`flex items-center justify-center gap-4 mb-3 ${isError ? 'animate-shake' : ''}`}>
          {Array.from({ length: PIN_LENGTH }).map((_, i) => {
            const isFilled = i < pin.length;
            return (
              <div
                key={i}
                className={`w-12 h-14 rounded-2xl border-2 flex items-center justify-center transition-all duration-150 ${
                  isError
                    ? 'border-red-500 bg-red-500/10 text-red-400'
                    : isSuccess
                    ? 'border-emerald-400 bg-emerald-400/20 text-emerald-300'
                    : isFilled
                    ? 'border-amber-400 bg-amber-400/15 text-amber-300 animate-pop'
                    : 'border-white/[0.08] bg-surface text-slate-400'
                }`}
              >
                {isFilled ? (
                  <span className="font-mono tabular-nums text-xl font-bold leading-none">
                    {pin[i]}
                  </span>
                ) : (
                  <div className="w-2.5 h-2.5 rounded-full bg-surface-higher" />
                )}
              </div>
            );
          })}
        </div>

        {/* Error / Helper text */}
        <div className="h-6 flex items-center justify-center">
          {errorMessage ? (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-red-400 animate-fadeIn">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          ) : isSuccess ? (
            <span className="text-xs font-bold text-emerald-400 animate-fadeIn">
              Access Granted
            </span>
          ) : (
            <span className="text-xs text-slate-400">
              Only required once per device
            </span>
          )}
        </div>
      </div>

      {/* Bottom: Tactile Gym-Friendly Keypad (3x4 Grid) */}
      <div className="relative z-10 w-full max-w-xs pb-6">
        <div className="grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleInputDigit(digit)}
              className="h-14 sm:h-16 rounded-2xl bg-surface border border-white/[0.08] hover:border-white/[0.16] active:border-amber-400/80 active:bg-surface-elevated text-xl font-mono tabular-nums font-bold text-slate-100 flex items-center justify-center transition-all shadow-md active-press"
            >
              {digit}
            </button>
          ))}

          {/* Clear Key */}
          <button
            type="button"
            onClick={handleClear}
            className="h-14 sm:h-16 rounded-2xl bg-surface/70 border border-white/[0.07] hover:border-white/[0.14] text-xs font-bold text-slate-300 hover:text-white flex items-center justify-center transition-all active-press uppercase tracking-wider"
          >
            Clear
          </button>

          {/* Digit 0 */}
          <button
            type="button"
            onClick={() => handleInputDigit('0')}
            className="h-14 sm:h-16 rounded-2xl bg-surface border border-white/[0.08] hover:border-white/[0.16] active:border-amber-400/80 active:bg-surface-elevated text-xl font-mono tabular-nums font-bold text-slate-100 flex items-center justify-center transition-all shadow-md active-press"
          >
            0
          </button>

          {/* Backspace Key */}
          <button
            type="button"
            onClick={handleDelete}
            className="h-14 sm:h-16 rounded-2xl bg-surface/70 border border-white/[0.07] hover:border-white/[0.14] text-slate-300 hover:text-white flex items-center justify-center transition-all active-press"
            title="Delete"
            aria-label="Delete"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
