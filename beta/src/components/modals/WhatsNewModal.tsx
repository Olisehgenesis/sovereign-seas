'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';

const STORAGE_KEY = 'sovseas_whats_new_seen';

interface WhatsNewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WhatsNewModal({ isOpen, onClose }: WhatsNewModalProps) {
  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    onClose();
  };

  const changes = [
    {
      title: 'Tasks & Milestones System',
      description: 'Browse open tasks, claim milestones, and track your progress. Filter by status, search, and manage all your tasks in one place.',
    },
    {
      title: 'Project Creation & Management',
      description: 'Create comprehensive project profiles with rich metadata, team information, technical details, and milestone roadmaps.',
    },
    {
      title: 'Campaign Hosting',
      description: 'Host funding campaigns with flexible distribution methods, voting mechanisms, and real-time analytics for project funding.',
    },
    {
      title: 'Multi-Token Support',
      description: 'Vote and tip projects with CELO, cUSD, GoodDollar, and other supported tokens. Seamless multi-token ecosystem integration.',
    },
    {
      title: 'Direct Tipping',
      description: 'Support projects directly by tipping with any supported token. Show your appreciation and fund projects instantly.',
    },
    {
      title: 'Enhanced Analytics',
      description: 'Track project performance, funding metrics, campaign statistics, and user engagement with comprehensive analytics dashboards.',
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Sparkles className="h-6 w-6 text-blue-600" />
            </div>
            <DialogTitle className="text-2xl font-bold text-gray-900">
              What's New in SovSeas
            </DialogTitle>
          </div>
          <DialogDescription className="text-gray-600">
            We've been working hard to improve your experience. Here are the latest updates:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-6">
          {changes.map((change, index) => (
            <div
              key={index}
              className="flex gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
            >
              <div className="flex-shrink-0 mt-1">
                <div className="p-2 bg-blue-100 rounded-full">
                  <CheckCircle2 className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">{change.title}</h3>
                <p className="text-sm text-gray-600">{change.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <Button
            onClick={handleClose}
            className="w-full bg-gray-900 hover:bg-gray-800 text-white"
          >
            Got it!
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook to check if the modal should be shown
export function useWhatsNewModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const hasSeen = localStorage.getItem(STORAGE_KEY);
    if (!hasSeen) {
      // Small delay to ensure smooth page load
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  return {
    isOpen,
    onClose: () => setIsOpen(false),
  };
}

