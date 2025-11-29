'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ButtonCool } from '@/components/ui/button-cool';
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
      <DialogContent className="relative max-w-2xl max-h-[90vh] overflow-y-auto bg-white border-[0.35em] border-[#2563eb] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] p-0 [&>button]:hidden">
        {/* Pattern Grid Overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-30 z-[1]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
            backgroundSize: '0.5em 0.5em',
          }}
        />

        {/* Accent Corner */}
        <div className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#2563eb] rotate-45 z-[1]" />
        <div className="absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">
          ★
        </div>

        <DialogHeader
          className="relative px-[1.5em] pt-[1.4em] pb-[1em] text-white font-extrabold border-b-[0.35em] border-[#050505] uppercase tracking-[0.05em] z-[2] overflow-hidden"
          style={{
            background: '#2563eb',
            backgroundImage:
              'repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1) 0.5em, transparent 0.5em, transparent 1em)',
            backgroundBlendMode: 'overlay',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 border-[0.15em] border-white/30 rounded-[0.3em]">
              <Sparkles className="h-6 w-6 text-yellow-200" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-extrabold text-white tracking-[0.05em]">
                What&apos;s New in SovSeas
              </DialogTitle>
              <DialogDescription className="text-white/90 text-sm font-semibold normal-case mt-1">
                We&apos;ve been shipping upgrades. Here&apos;s what changed:
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="relative px-[1.5em] pb-[1.5em] pt-4 space-y-4 z-[2]">
          {changes.map((change, index) => (
            <div
              key={index}
              className="flex gap-4 p-4 bg-gray-50 border-[0.2em] border-gray-300 rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all"
            >
              <div className="flex-shrink-0 mt-1">
                <div className="w-[2.2em] h-[2.2em] flex items-center justify-center bg-[#dbeafe] border-[0.15em] border-[#2563eb] rounded-[999px] shadow-[0.15em_0.15em_0_#000000]">
                  <CheckCircle2 className="h-4 w-4 text-[#2563eb]" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-extrabold text-[#050505] mb-1 uppercase tracking-[0.05em]">
                  {change.title}
                </h3>
                <p className="text-sm text-[#050505] font-semibold">{change.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t-[0.35em] border-[#050505] flex justify-end">
          <ButtonCool
            onClick={handleClose}
            text="Got it!"
            bgColor="#050505"
            hoverBgColor="#111827"
            textColor="#ffffff"
            borderColor="#050505"
            size="md"
          >
            <ArrowRight className="h-4 w-4 ml-2" />
          </ButtonCool>
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

