'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  MobileDialog as Dialog,
  MobileDialogContent as DialogContent,
  MobileDialogHeader as DialogHeader,
  MobileDialogDescription as DialogDescription,
} from '@/components/ui/mobile-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, X, User, Globe, Lock } from 'lucide-react';
import { useCreateProjectMilestone, ProjectMilestoneType } from '@/hooks/useProjectMilestones';
import type { Address } from 'viem';

type CreateProjectMilestoneModalProps = {
  isOpen: boolean;
  onClose: () => void;
  projectId: bigint;
  onSuccess?: () => void;
};

export default function CreateProjectMilestoneModal({
  isOpen,
  onClose,
  projectId,
  onSuccess
}: CreateProjectMilestoneModalProps) {
  const { createProjectMilestone, isPending, error, isSuccess } = useCreateProjectMilestone();

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [milestoneType, setMilestoneType] = useState<ProjectMilestoneType>(ProjectMilestoneType.INTERNAL);
  const [assignedTo, setAssignedTo] = useState<Address>('0x0000000000000000000000000000000000000000' as Address);
  const [deadline, setDeadline] = useState('');
  const [requiredApprovals, setRequiredApprovals] = useState('1');
  const [allowSiteAdminApproval, setAllowSiteAdminApproval] = useState(false);
  const [stewards, setStewards] = useState<string[]>(['']);
  const [errorMsg, setErrorMsg] = useState('');

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setRequirements('');
      setMilestoneType(ProjectMilestoneType.INTERNAL);
      setAssignedTo('0x0000000000000000000000000000000000000000' as Address);
      setDeadline('');
      setRequiredApprovals('1');
      setAllowSiteAdminApproval(false);
      setStewards(['']);
      setErrorMsg('');
    }
  }, [isOpen]);

  // Handle success
  useEffect(() => {
    if (isSuccess) {
      onSuccess?.();
      onClose();
    }
  }, [isSuccess, onSuccess, onClose]);

  // Handle errors
  useEffect(() => {
    if (error) {
      const msg = (error as any)?.shortMessage || (error as any)?.message || 'Failed to create milestone';
      setErrorMsg(msg);
    }
  }, [error]);

  const handleAddSteward = () => {
    setStewards([...stewards, '']);
  };

  const handleRemoveSteward = (index: number) => {
    setStewards(stewards.filter((_, i) => i !== index));
  };

  const handleStewardChange = (index: number, value: string) => {
    const newStewards = [...stewards];
    newStewards[index] = value;
    setStewards(newStewards);
  };

  const handleSubmit = async () => {
    setErrorMsg('');

    // Validation
    if (!title.trim()) {
      setErrorMsg('Title is required');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('Description is required');
      return;
    }
    if (!requirements.trim()) {
      setErrorMsg('Requirements are required');
      return;
    }
    if (milestoneType === ProjectMilestoneType.ASSIGNED && !assignedTo || assignedTo === '0x0000000000000000000000000000000000000000') {
      setErrorMsg('Assigned address is required for assigned milestones');
      return;
    }
    const approvals = parseInt(requiredApprovals);
    if (isNaN(approvals) || approvals < 1) {
      setErrorMsg('Required approvals must be at least 1');
      return;
    }

    // Parse deadline (if provided)
    let deadlineTimestamp = BigInt(0);
    if (deadline) {
      const deadlineDate = new Date(deadline);
      if (isNaN(deadlineDate.getTime())) {
        setErrorMsg('Invalid deadline date');
        return;
      }
      deadlineTimestamp = BigInt(Math.floor(deadlineDate.getTime() / 1000));
    }

    // Filter out empty stewards and validate addresses
    const validStewards = stewards
      .filter(s => s.trim() !== '')
      .map(s => s.trim() as Address)
      .filter((addr): addr is Address => {
        if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) {
          setErrorMsg(`Invalid steward address: ${addr}`);
          return false;
        }
        return true;
      });

    try {
      await createProjectMilestone({
        projectId,
        milestoneType,
        assignedTo: milestoneType === ProjectMilestoneType.ASSIGNED ? assignedTo : '0x0000000000000000000000000000000000000000' as Address,
        title: title.trim(),
        description: description.trim(),
        requirements: requirements.trim(),
        deadline: deadlineTimestamp,
        requiredApprovals: BigInt(approvals),
        allowSiteAdminApproval,
        stewards: validStewards
      });
    } catch (err: any) {
      const msg = err?.shortMessage || err?.message || 'Failed to create milestone';
      setErrorMsg(msg);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white p-0 [&>button]:hidden">
        <DialogHeader className="p-6 pb-3 sticky top-0 bg-white z-10 border-b">
          <div className="bg-gray-500 p-4 text-white relative overflow-hidden rounded-t-lg -m-6 mb-3">
            <div className="relative z-10">
              <DialogDescription className="text-white text-2xl">
                Create Project Milestone
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-5">
          {errorMsg && (
            <div className="p-3 rounded border border-red-200 bg-red-50 text-sm text-red-700">
              {errorMsg}
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-800">Title *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Complete API Integration"
              className="h-11"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-800">Description *</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this milestone is about..."
              className="min-h-[100px]"
            />
          </div>

          {/* Requirements */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-800">Requirements *</label>
            <Textarea
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              placeholder="What needs to be done to complete this milestone..."
              className="min-h-[100px]"
            />
          </div>

          {/* Milestone Type */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-800">Milestone Type *</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setMilestoneType(ProjectMilestoneType.INTERNAL)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  milestoneType === ProjectMilestoneType.INTERNAL
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Lock className="h-5 w-5 mx-auto mb-2" />
                <div className="font-semibold text-sm">Internal</div>
                <div className="text-xs text-gray-500 mt-1">Project owner</div>
              </button>
              <button
                type="button"
                onClick={() => setMilestoneType(ProjectMilestoneType.ASSIGNED)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  milestoneType === ProjectMilestoneType.ASSIGNED
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <User className="h-5 w-5 mx-auto mb-2" />
                <div className="font-semibold text-sm">Assigned</div>
                <div className="text-xs text-gray-500 mt-1">Specific wallet</div>
              </button>
              <button
                type="button"
                onClick={() => setMilestoneType(ProjectMilestoneType.OPEN)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  milestoneType === ProjectMilestoneType.OPEN
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Globe className="h-5 w-5 mx-auto mb-2" />
                <div className="font-semibold text-sm">Open</div>
                <div className="text-xs text-gray-500 mt-1">Anyone can claim</div>
              </button>
            </div>
          </div>

          {/* Assigned To (only for ASSIGNED type) */}
          {milestoneType === ProjectMilestoneType.ASSIGNED && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-800">Assigned To (Wallet Address) *</label>
              <Input
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value as Address)}
                placeholder="0x..."
                className="h-11 font-mono text-sm"
              />
            </div>
          )}

          {/* Deadline */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-800">Deadline (Optional)</label>
            <Input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="h-11"
            />
          </div>

          {/* Required Approvals */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-800">Required Approvals *</label>
            <Input
              type="number"
              value={requiredApprovals}
              onChange={(e) => setRequiredApprovals(e.target.value)}
              min="1"
              className="h-11"
            />
            <p className="text-xs text-gray-500">Number of approvals needed to approve this milestone</p>
          </div>

          {/* Allow Site Admin Approval */}
          <div className="flex items-start space-x-2">
            <input
              id="allow-site-admin"
              type="checkbox"
              checked={allowSiteAdminApproval}
              onChange={(e) => setAllowSiteAdminApproval(e.target.checked)}
              className="mt-1"
            />
            <label htmlFor="allow-site-admin" className="text-sm text-gray-600">
              Allow site administrators to approve this milestone
            </label>
          </div>

          {/* Stewards */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-800">Stewards (Optional)</label>
              <button
                type="button"
                onClick={handleAddSteward}
                className="text-xs text-blue-600 hover:text-blue-700 underline"
              >
                + Add Steward
              </button>
            </div>
            {stewards.map((steward, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={steward}
                  onChange={(e) => handleStewardChange(index, e.target.value)}
                  placeholder="0x... (steward wallet address)"
                  className="h-11 font-mono text-sm flex-1"
                />
                {stewards.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveSteward(index)}
                    className="p-2 text-red-600 hover:text-red-700"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
            ))}
            <p className="text-xs text-gray-500">Stewards can approve milestones in addition to the project owner</p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} className="h-11" disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isPending} className="h-11">
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Milestone'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

