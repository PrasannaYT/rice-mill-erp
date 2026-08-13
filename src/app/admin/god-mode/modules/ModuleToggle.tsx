'use client'

import { useState, useTransition } from 'react';
import { toggleGlobalSetting } from '@/app/actions/settingsActions';
import { Power } from 'lucide-react';

export function ModuleToggle({ settingKey, initialEnabled }: { settingKey: string, initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    const newState = !enabled;
    setEnabled(newState); // Optimistic UI update
    startTransition(async () => {
      try {
        await toggleGlobalSetting(settingKey, newState);
      } catch (e) {
        // Revert on error
        setEnabled(!newState);
        console.error('Failed to toggle module:', e);
      }
    });
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-[#1a1315] ${
        enabled ? 'bg-red-600' : 'bg-neutral-800'
      } ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span className="sr-only">Toggle Module</span>
      <span
        className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-7' : 'translate-x-1'
        }`}
      />
    </button>
  );
}
