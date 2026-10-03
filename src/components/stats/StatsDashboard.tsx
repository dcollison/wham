import React, { useState, useMemo, useEffect } from 'react';
import {
  Boulder,
  Attempt,
  Profile,
  Gym,
  GymArea,
  CLIMBER_COLORS,
  CLIMBER_ACCENT_PALETTE,
  getClimberColor,
  BoulderReview
} from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useGym } from '../../context/GymContext';
import { STORAGE_KEYS, getStorageJson, setStorageJson } from '../../lib/storage';
import {
  computeClimberStats,
  computeGroupStats,
  computeAccolades
} from '../../lib/statsEngine';
import { StatsOverview, AreaBreakdownItem } from './StatsOverview';

export { CLIMBER_COLORS, CLIMBER_ACCENT_PALETTE, getClimberColor };

interface StatsDashboardProps {
  boulders: Boulder[];
  attempts: Attempt[];
  climbers: Profile[];
  gyms: Gym[];
  areas: GymArea[];
  currentUserId?: string;
  initialTab?: string;
  onSelectBoulder?: (boulder: Boulder) => void;
  reviews?: BoulderReview[];
}

export const StatsDashboard: React.FC<StatsDashboardProps> = ({
  boulders,
  attempts,
  climbers,
  gyms,
  areas,
  currentUserId,
  onSelectBoulder,
  reviews: propReviews
}) => {
  const { reviews: gymReviews } = useGym();
  const reviews = propReviews || gymReviews || [];

  const [viewMode, setViewMode] = useState<'my' | 'group'>('my');
  const [selectedGymId, setSelectedGymId] = useState<string>('all');
  const [selectedClimberId, setSelectedClimberId] = useState<string>(
    currentUserId || climbers[0]?.id || ''
  );

  const { currentUser } = useAuth();
  const activeUser = climbers.find((c) => c.id === currentUserId) || currentUser;
  const activeColor = currentUser?.accent_color || activeUser?.accent_color || '#3B82F6';

  const [showAccolades, setShowAccolades] = useState<boolean>(() => {
    return getStorageJson(STORAGE_KEYS.SHOW_ACCOLADES, true);
  });

  const handleToggleAccolades = (show: boolean) => {
    setShowAccolades(show);
    setStorageJson(STORAGE_KEYS.SHOW_ACCOLADES, show);
  };

  useEffect(() => {
    if (currentUserId && !selectedClimberId) {
      setSelectedClimberId(currentUserId);
    }
  }, [currentUserId, selectedClimberId]);

  const areaMap = useMemo(() => new Map(areas.map((a) => [a.id, a])), [areas]);

  // Filter boulders by selected gym, strictly excluding ungraded comp wall boulders
  const filteredBoulders = useMemo(() => {
    const list = selectedGymId === 'all' ? boulders : boulders.filter((b) => b.gym_id === selectedGymId);
    return list.filter((b) => !b.is_comp && !areaMap.get(b.area_id)?.is_comp_wall);
  }, [boulders, selectedGymId, areaMap]);

  const boulderIdSet = useMemo(() => new Set(filteredBoulders.map((b) => b.id)), [filteredBoulders]);

  const filteredAttempts = useMemo(() => {
    return attempts.filter((a) => boulderIdSet.has(a.boulder_id));
  }, [attempts, boulderIdSet]);

  const activeGymBoulders = useMemo(() => {
    return filteredBoulders.filter((b) => !b.is_archived);
  }, [filteredBoulders]);

  // Climber stats computations
  const climberStatsList = useMemo(() => {
    return climbers.map((c, idx) => {
      const stats = computeClimberStats(c.id, filteredAttempts, filteredBoulders, activeGymBoulders);
      return {
        ...stats,
        profile: c,
        color: getClimberColor(c, idx)
      };
    });
  }, [climbers, filteredAttempts, filteredBoulders, activeGymBoulders]);

  const groupStats = useMemo(() => {
    return computeGroupStats(filteredAttempts, filteredBoulders, activeGymBoulders);
  }, [filteredAttempts, filteredBoulders, activeGymBoulders]);

  const activeStats = useMemo(() => {
    if (viewMode === 'group') return groupStats;
    const targetId = selectedClimberId || currentUserId;
    const found = climberStatsList.find((c) => c.profile.id === targetId);
    return found || climberStatsList[0] || groupStats;
  }, [viewMode, selectedClimberId, currentUserId, climberStatsList, groupStats]);

  const userSentActiveBoulders = useMemo(() => {
    const targetId = selectedClimberId || currentUserId;
    return activeGymBoulders.filter((b) => {
      if (viewMode === 'my') {
        return filteredAttempts.some(
          (a) => a.boulder_id === b.id && a.user_id === targetId && (a.status === 'sent' || a.status === 'flashed')
        );
      }
      return filteredAttempts.some(
        (a) => a.boulder_id === b.id && (a.status === 'sent' || a.status === 'flashed')
      );
    });
  }, [activeGymBoulders, filteredAttempts, viewMode, selectedClimberId, currentUserId]);

  const completionPct = useMemo(() => {
    if (activeGymBoulders.length === 0) return 0;
    return Math.round((userSentActiveBoulders.length / activeGymBoulders.length) * 100);
  }, [userSentActiveBoulders.length, activeGymBoulders.length]);

  const accoladesList = useMemo(() => {
    return computeAccolades(climberStatsList);
  }, [climberStatsList]);

  const areaBreakdown = useMemo((): AreaBreakdownItem[] => {
    const relevantAreas = areas.filter((a) => selectedGymId === 'all' || a.gym_id === selectedGymId);
    const targetId = selectedClimberId || currentUserId;

    // Group areas by gym name first so sectors from the same gym are together, then sort by sort_order
    const sortedAreas = [...relevantAreas].sort((a, b) => {
      if (a.gym_id !== b.gym_id) {
        const gymA = gyms.find((g) => g.id === a.gym_id)?.name || '';
        const gymB = gyms.find((g) => g.id === b.gym_id)?.name || '';
        return gymA.localeCompare(gymB);
      }
      return a.sort_order - b.sort_order;
    });

    return sortedAreas.map((area) => {
      const areaBoulders = activeGymBoulders.filter((b) => b.area_id === area.id);
      const gym = gyms.find((g) => g.id === area.gym_id);
      const sent = areaBoulders.filter((b) => {
        if (viewMode === 'my') {
          return filteredAttempts.some(
            (a) => a.boulder_id === b.id && a.user_id === targetId && (a.status === 'sent' || a.status === 'flashed')
          );
        }
        return filteredAttempts.some(
          (a) => a.boulder_id === b.id && (a.status === 'sent' || a.status === 'flashed')
        );
      });
      return {
        area,
        gym,
        total: areaBoulders.length,
        sent: sent.length,
        remaining: areaBoulders.length - sent.length,
        pct: areaBoulders.length > 0 ? Math.round((sent.length / areaBoulders.length) * 100) : 0
      };
    }).filter((ab) => ab.total > 0);
  }, [areas, selectedGymId, activeGymBoulders, filteredAttempts, viewMode, currentUserId, selectedClimberId, gyms]);

  return (
    <div className="flex flex-col gap-6 pb-20 animate-in fade-in duration-300">
      <StatsOverview
        viewMode={viewMode}
        onSetViewMode={setViewMode}
        selectedClimberId={selectedClimberId}
        onSelectClimberId={setSelectedClimberId}
        activeStats={activeStats}
        climbers={climbers}
        currentUserId={currentUserId}
        activeColor={activeColor}
        showAccolades={showAccolades}
        onToggleAccolades={handleToggleAccolades}
        accoladesList={accoladesList}
        areaBreakdown={areaBreakdown}
        activeGymBoulders={activeGymBoulders}
        completionPct={completionPct}
        userSentActiveBouldersCount={userSentActiveBoulders.length}
        reviews={reviews}
        onSelectBoulder={onSelectBoulder}
        gyms={gyms}
        selectedGymId={selectedGymId}
        onSelectGymId={setSelectedGymId}
        filteredAttempts={filteredAttempts}
        allBoulders={filteredBoulders}
      />
    </div>
  );
};
