import { Activity, Trophy, Timer, Clock } from 'lucide-react';
import type { CampaignStatus } from './types';

export const getCampaignStatusStyling = (status: string): CampaignStatus => {
  switch (status) {
    case 'active':
      return {
        bgClass: 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200',
        textClass: 'text-emerald-700',
        badgeClass: 'bg-emerald-500',
        icon: Activity,
        label: 'Active'
      };
    case 'ended':
      return {
        bgClass: 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200',
        textClass: 'text-blue-700',
        badgeClass: 'bg-blue-500',
        icon: Trophy,
        label: 'Completed'
      };
    case 'upcoming':
      return {
        bgClass: 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200',
        textClass: 'text-amber-700',
        badgeClass: 'bg-amber-500',
        icon: Timer,
        label: 'Upcoming'
      };
    default:
      return {
        bgClass: 'bg-gray-50 border-gray-200',
        textClass: 'text-gray-700',
        badgeClass: 'bg-gray-500',
        icon: Clock,
        label: 'Inactive'
      };
  }
};

export const formatDate = (timestamp: bigint): string => {
  return new Date(Number(timestamp) * 1000).toLocaleDateString();
};

export const formatYear = (dateString: string): string => {
  return new Date(dateString).getFullYear().toString();
};

