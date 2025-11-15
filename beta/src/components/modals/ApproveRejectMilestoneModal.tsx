'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white p-0 [&>button]:hidden">
        <DialogHeader className="p-6 pb-3 sticky top-0 bg-white z-10 border-b">
          <div className={`p-4 text-white relative overflow-hidden rounded-t-lg -m-6 mb-3 ${
            isApproval ? 'bg-green-600' : 'bg-red-600'
          }`}>
            <div className="relative z-10 flex items-center gap-3">
              {isApproval ? (
                <CheckCircle className="h-6 w-6" />
              ) : (
                <XCircle className="h-6 w-6" />
              )}
              <DialogDescription className="text-white text-2xl">
                {isApproval ? 'Approve Milestone' : 'Reject Milestone'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-4 sm:space-y-5">
          {errorMsg && (
            <div className="p-3 sm:p-4 rounded-lg border-2 border-red-300 bg-red-50 text-sm text-red-700 flex items-start gap-2">
              <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold mb-1">Error</p>
                <p>{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Milestone Info */}
          {milestone && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
              <div>
                <h3 className="font-bold text-gray-900 text-base sm:text-lg mb-1">{milestone.title}</h3>
                <p className="text-sm text-gray-600 line-clamp-2">{milestone.description}</p>
              </div>
              
              {milestone.requirements && (
                <div className="p-3 bg-white rounded border border-gray-200">
                  <p className="text-xs font-semibold text-gray-700 mb-1">Requirements:</p>
                  <p className="text-xs text-gray-600">{milestone.requirements}</p>
                </div>
              )}
              
              {milestone.evidenceHash && (
                <div className="pt-2 border-t border-gray-200">
                  <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    Evidence Submitted
                  </p>
                  <a
                    href={`https://ipfs.io/ipfs/${milestone.evidenceHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 hover:underline font-mono break-all bg-blue-50 px-2 py-1 rounded"
                  >
                    {milestone.evidenceHash.slice(0, 20)}...
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
              
              {isApproval && (
                <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-600" />
                    <span className="text-xs text-gray-600">
                      Required approvals: <span className="font-semibold">{approvalCount}</span>
                    </span>
                  </div>
                  {milestone.deadline > 0n && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
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
            <label className="text-sm font-semibold text-gray-800">
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
              className="min-h-[120px]"
            />
            <p className="text-xs text-gray-500">
              {isApproval
                ? 'This message will be visible to the milestone assignee and other approvers.'
                : 'This message will help the assignee understand what needs to be fixed.'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={onClose} 
              className="h-11 w-full sm:w-auto" 
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!message.trim() || isPending}
              className={`h-11 w-full sm:w-auto ${
                isApproval
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isApproval ? 'Approving...' : 'Rejecting...'}
                </>
              ) : (
                <>
                  {isApproval ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve Milestone
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject Milestone
                    </>
                  )}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

