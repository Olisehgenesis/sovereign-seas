'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, 
  XCircle, 
  Upload, 
  Coins, 
  Loader2,
  Eye
} from 'lucide-react';
import { 
  ProjectMilestoneStatus, 
  ProjectMilestoneType,
  useCanSubmitMilestone,
  useCanApproveMilestone,
  useCanClaimMilestone,
  useClaimCompletionRewards
} from '@/hooks/useProjectMilestones';
import type { ProjectMilestone } from '@/hooks/useProjectMilestones';
import FundMilestoneModal from '@/components/modals/FundMilestoneModal';
import SubmitEvidenceModal from '@/components/modals/SubmitEvidenceModal';
import ApproveRejectMilestoneModal from '@/components/modals/ApproveRejectMilestoneModal';
import type { Address } from 'viem';

type MilestoneActionsProps = {
  milestone: ProjectMilestone;
  projectOwner: Address;
  onActionComplete?: () => void;
  showViewButton?: boolean;
  onView?: () => void;
};

export default function MilestoneActions({
  milestone,
  projectOwner,
  onActionComplete,
  showViewButton = false,
  onView
}: MilestoneActionsProps) {
  const { address } = useAccount();
  const [showFundModal, setShowFundModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const { claimCompletionRewards, isPending: isClaiming } = useClaimCompletionRewards();

  const { canSubmit } = useCanSubmitMilestone(
    milestone.id,
    address,
    !!address
  );
  const { canApprove } = useCanApproveMilestone(
    milestone.id,
    address,
    !!address
  );
  const { canClaim } = useCanClaimMilestone(
    milestone.id,
    !!milestone.id
  );

  const isOwner = address?.toLowerCase() === projectOwner.toLowerCase();
  const isAssignee = milestone.assignedTo?.toLowerCase() === address?.toLowerCase() ||
                     milestone.claimedBy?.toLowerCase() === address?.toLowerCase();

  const handleClaimRewards = async () => {
    try {
      await claimCompletionRewards(milestone.id);
      onActionComplete?.();
    } catch (error) {
      console.error('Failed to claim rewards:', error);
    }
  };

  const handleActionComplete = () => {
    onActionComplete?.();
    setShowFundModal(false);
    setShowSubmitModal(false);
    setShowApproveModal(false);
    setShowRejectModal(false);
  };

  // Determine which actions to show based on status and user role
  const getActions = () => {
    const actions: JSX.Element[] = [];

    // View button (if requested)
    if (showViewButton && onView) {
      actions.push(
        <Button
          key="view"
          variant="outline"
          onClick={onView}
          className="flex-1"
        >
          <Eye className="h-4 w-4 mr-2" />
          View
        </Button>
      );
    }

    // Funding (anyone can fund, but only show if not fully funded/paid)
    if (milestone.status !== ProjectMilestoneStatus.PAID && 
        milestone.status !== ProjectMilestoneStatus.CANCELLED) {
      actions.push(
        <Button
          key="fund"
          variant="outline"
          onClick={() => setShowFundModal(true)}
          className="flex-1"
        >
          <Coins className="h-4 w-4 mr-2" />
          Fund
        </Button>
      );
    }

    // Claim milestone (for open milestones)
    if (milestone.milestoneType === ProjectMilestoneType.OPEN && 
        milestone.status === ProjectMilestoneStatus.ACTIVE && 
        canClaim) {
      // This is handled in the parent component, but we can show it here too
    }

    // Submit evidence (for assignee/claimer)
    if (isAssignee && 
        (milestone.status === ProjectMilestoneStatus.CLAIMED || 
         milestone.status === ProjectMilestoneStatus.ACTIVE ||
         milestone.status === ProjectMilestoneStatus.REJECTED) &&
        canSubmit) {
      actions.push(
        <Button
          key="submit"
          onClick={() => setShowSubmitModal(true)}
          className="flex-1 bg-blue-600 hover:bg-blue-700"
        >
          <Upload className="h-4 w-4 mr-2" />
          Submit Evidence
        </Button>
      );
    }

    // Approve/Reject (for owners and stewards)
    if ((isOwner || canApprove) && 
        milestone.status === ProjectMilestoneStatus.SUBMITTED) {
      actions.push(
        <Button
          key="approve"
          onClick={() => setShowApproveModal(true)}
          className="flex-1 bg-green-600 hover:bg-green-700"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Approve
        </Button>
      );
      actions.push(
        <Button
          key="reject"
          onClick={() => setShowRejectModal(true)}
          variant="outline"
          className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
        >
          <XCircle className="h-4 w-4 mr-2" />
          Reject
        </Button>
      );
    }

    // Claim rewards (for approved milestones)
    if (milestone.status === ProjectMilestoneStatus.APPROVED && isAssignee) {
      actions.push(
        <Button
          key="claim-rewards"
          onClick={handleClaimRewards}
          disabled={isClaiming}
          className="flex-1 bg-green-600 hover:bg-green-700"
        >
          {isClaiming ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Claiming...
            </>
          ) : (
            <>
              <Coins className="h-4 w-4 mr-2" />
              Claim Rewards
            </>
          )}
        </Button>
      );
    }

    return actions;
  };

  const actions = getActions();

  if (actions.length === 0) {
    return null;
  }

  return (
    <>
      <div className="flex gap-2 flex-wrap">
        {actions}
      </div>

      {/* Modals */}
      <FundMilestoneModal
        isOpen={showFundModal}
        onClose={() => setShowFundModal(false)}
        milestoneId={milestone.id}
        onSuccess={handleActionComplete}
      />

      <SubmitEvidenceModal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        milestoneId={milestone.id}
        onSuccess={handleActionComplete}
      />

      <ApproveRejectMilestoneModal
        isOpen={showApproveModal}
        onClose={() => setShowApproveModal(false)}
        milestoneId={milestone.id}
        action="approve"
        onSuccess={handleActionComplete}
      />

      <ApproveRejectMilestoneModal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        milestoneId={milestone.id}
        action="reject"
        onSuccess={handleActionComplete}
      />
    </>
  );
}

