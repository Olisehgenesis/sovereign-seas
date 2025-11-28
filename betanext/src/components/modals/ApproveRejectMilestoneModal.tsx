'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ButtonCool } from '@/components/ui/button-cool';
import { 
  MobileDialog as Dialog,
  MobileDialogContent as DialogContent,
  MobileDialogHeader as DialogHeader,
  MobileDialogDescription as DialogDescription,
} from '@/components/ui/mobile-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, CheckCircle, XCircle, Users, Clock, ExternalLink } from 'lucide-react';
import { 
  useApproveProjectMilestone, 
  useRejectProjectMilestone,
  useProjectMilestone
} from '@/hooks/useProjectMilestones';

type ApproveRejectMilestoneModalProps = {
  isOpen: boolean;
  onClose: () => void;
  milestoneId: bigint;
  action: 'approve' | 'reject';
  onSuccess?: () => void;
};

export default function ApproveRejectMilestoneModal({
  isOpen,
  onClose,
  milestoneId,
  action,
  onSuccess
}: ApproveRejectMilestoneModalProps) {
  const { address } = useAccount();
  const { approveProjectMilestone, isPending: isApproving } = useApproveProjectMilestone();
  const { rejectProjectMilestone, isPending: isRejecting } = useRejectProjectMilestone();
  const { milestone } = useProjectMilestone(milestoneId, isOpen);
  
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const isPending = action === 'approve' ? isApproving : isRejecting;

  useEffect(() => {
    if (isOpen) {
      setMessage('');
      setErrorMsg('');
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!message.trim()) {
      setErrorMsg(`${action === 'approve' ? 'Approval' : 'Rejection'} message is required`);
      return;
    }

    if (!address) {
      setErrorMsg('Please connect your wallet');
      return;
    }

    try {
      setErrorMsg('');
      if (action === 'approve') {
        await approveProjectMilestone(milestoneId, message.trim());
      } else {
        await rejectProjectMilestone(milestoneId, message.trim());
      }
      onSuccess?.();
      onClose();
    } catch (e: any) {
      const msg = e?.shortMessage || e?.message || `Failed to ${action} milestone`;
      setErrorMsg(msg);
    }
  };

  if (!isOpen) return null;

  const approvalCount = milestone ? Number(milestone.requiredApprovals) : 0;
  const isApproval = action === 'approve';

  const borderColor = isApproval ? '#10b981' : '#ef4444';
  const bgColor = isApproval ? '#10b981' : '#ef4444';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-2xl max-h-[90vh] overflow-y-auto bg-white border-[0.35em] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] p-0 [&>button]:hidden relative`}
        style={{ borderColor }}
      >
        {/* Pattern Grid Overlay */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-30 z-[1]"
          style={{
            backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
            backgroundSize: '0.5em 0.5em'
          }}
        />

        {/* Accent Corner */}
        <div className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] rotate-45 z-[1]" style={{ backgroundColor: bgColor }} />
        <div className="absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">★</div>

        <DialogHeader className={`relative px-[1.5em] pt-[1.4em] pb-[1em] text-white font-extrabold border-b-[0.35em] border-[#050505] uppercase tracking-[0.05em] z-[2] overflow-hidden`}
          style={{ 
            background: bgColor,
            backgroundImage: 'repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1) 0.5em, transparent 0.5em, transparent 1em)',
            backgroundBlendMode: 'overlay'
          }}
        >
          <div className="relative z-10 flex items-center gap-3">
            {isApproval ? (
              <CheckCircle className="h-6 w-6" />
            ) : (
              <XCircle className="h-6 w-6" />
            )}
            <DialogDescription className="text-white text-2xl font-extrabold uppercase tracking-[0.05em]">
              {isApproval ? 'Approve Milestone' : 'Reject Milestone'}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="relative px-[1.5em] pb-[1.5em] space-y-4 sm:space-y-5 z-[2]">
          {errorMsg && (
            <div className="p-3 sm:p-4 border-[0.2em] border-[#ef4444] bg-[#fee2e2] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] text-sm text-[#050505] flex items-start gap-2">
              <XCircle className="h-5 w-5 text-[#ef4444] flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-extrabold mb-1 uppercase tracking-[0.05em]">Error</p>
                <p className="font-semibold">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Milestone Info */}
          {milestone && (
            <div className="p-4 bg-gray-50 border-[0.2em] border-gray-300 rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] space-y-3">
              <div>
                <h3 className="font-extrabold text-[#050505] text-base sm:text-lg mb-1 uppercase tracking-[0.05em]">{milestone.title}</h3>
                <p className="text-sm text-[#050505] line-clamp-2 font-semibold">{milestone.description}</p>
              </div>
              
              {milestone.requirements && (
                <div className="p-3 bg-white border-[0.15em] border-gray-300 rounded-[0.3em] shadow-[0.1em_0.1em_0_#000000]">
                  <p className="text-xs font-extrabold text-[#050505] mb-1 uppercase tracking-[0.05em]">Requirements:</p>
                  <p className="text-xs text-[#050505] font-semibold">{milestone.requirements}</p>
                </div>
              )}
              
              {milestone.evidenceHash && (
                <div className="pt-2 border-t-[0.15em] border-gray-300">
                  <p className="text-xs font-extrabold text-[#050505] mb-2 flex items-center gap-1 uppercase tracking-[0.05em]">
                    <CheckCircle className="h-3 w-3 text-[#10b981]" />
                    Evidence Submitted
                  </p>
                  <a
                    href={`https://ipfs.io/ipfs/${milestone.evidenceHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[#2563eb] hover:text-[#1d4ed8] font-mono break-all bg-[#dbeafe] border-[0.15em] border-[#2563eb] px-2 py-1 rounded-[0.3em] shadow-[0.1em_0.1em_0_#000000] font-extrabold"
                  >
                    {milestone.evidenceHash.slice(0, 20)}...
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
              
              {isApproval && (
                <div className="pt-2 border-t-[0.15em] border-gray-300 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-[#050505]" />
                    <span className="text-xs text-[#050505] font-semibold">
                      Required approvals: <span className="font-extrabold">{approvalCount}</span>
                    </span>
                  </div>
                  {milestone.deadline > 0n && (
                    <div className="flex items-center gap-1 text-xs text-[#050505] font-semibold">
                      <Clock className="h-3 w-3" />
                      {new Date(Number(milestone.deadline) * 1000).toLocaleDateString()}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Message Input */}
          <div className="space-y-2">
            <label className="text-sm font-extrabold text-[#050505] uppercase tracking-[0.05em]">
              {isApproval ? 'Approval' : 'Rejection'} Message *
            </label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                isApproval
                  ? 'Explain why you are approving this milestone...'
                  : 'Explain why you are rejecting this milestone and what needs to be improved...'
              }
              className="min-h-[120px] border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] focus:outline-none font-semibold"
            />
            <p className="text-xs text-[#050505] font-semibold">
              {isApproval
                ? 'This message will be visible to the milestone assignee and other approvers.'
                : 'This message will help the assignee understand what needs to be fixed.'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t-[0.35em] border-[#050505]">
            <ButtonCool
              onClick={onClose}
              text="Cancel"
              bgColor="#ffffff"
              hoverBgColor="#f3f4f6"
              textColor="#050505"
              borderColor="#050505"
              size="md"
              disabled={isPending}
            />
            <ButtonCool
              onClick={handleSubmit}
              text={isPending ? (isApproval ? 'Approving...' : 'Rejecting...') : (isApproval ? 'Approve Milestone' : 'Reject Milestone')}
              bgColor={bgColor}
              hoverBgColor={isApproval ? '#059669' : '#dc2626'}
              textColor="#ffffff"
              borderColor="#050505"
              size="md"
              disabled={!message.trim() || isPending}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                isApproval ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />
              )}
            </ButtonCool>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

