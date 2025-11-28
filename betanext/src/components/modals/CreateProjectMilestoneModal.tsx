'use client';

import { useState, useEffect } from 'react';
import { ButtonCool } from '@/components/ui/button-cool';
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white border-[0.35em] border-[#2563eb] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] p-0 [&>button]:hidden relative">
        {/* Pattern Grid Overlay */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-30 z-[1]"
          style={{
            backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
            backgroundSize: '0.5em 0.5em'
          }}
        />

        {/* Accent Corner */}
        <div className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#2563eb] rotate-45 z-[1]" />
        <div className="absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">★</div>

        <DialogHeader className="relative px-[1.5em] pt-[1.4em] pb-[1em] text-white font-extrabold border-b-[0.35em] border-[#050505] uppercase tracking-[0.05em] z-[2] overflow-hidden"
          style={{ 
            background: '#2563eb',
            backgroundImage: 'repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1) 0.5em, transparent 0.5em, transparent 1em)',
            backgroundBlendMode: 'overlay'
          }}
        >
          <DialogDescription className="text-white text-2xl font-extrabold uppercase tracking-[0.05em]">
            Create Project Milestone
          </DialogDescription>
        </DialogHeader>

        <div className="relative px-[1.5em] pb-[1.5em] space-y-5 z-[2]">
          {errorMsg && (
            <div className="p-3 border-[0.15em] border-[#ef4444] bg-[#fee2e2] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] text-sm text-[#050505] font-semibold">
              {errorMsg}
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <label className="text-sm font-extrabold text-[#050505] uppercase tracking-[0.05em]">Title *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Complete API Integration"
              className="h-11 border-[0.2em] border-[#050505] rounded-[0.4em] font-semibold shadow-[0.2em_0.2em_0_#000000] focus:outline-none"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-extrabold text-[#050505] uppercase tracking-[0.05em]">Description *</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this milestone is about..."
              className="min-h-[100px] border-[0.2em] border-[#050505] rounded-[0.4em] font-semibold shadow-[0.2em_0.2em_0_#000000] focus:outline-none"
            />
          </div>

          {/* Requirements */}
          <div className="space-y-2">
            <label className="text-sm font-extrabold text-[#050505] uppercase tracking-[0.05em]">Requirements *</label>
            <Textarea
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              placeholder="What needs to be done to complete this milestone..."
              className="min-h-[100px] border-[0.2em] border-[#050505] rounded-[0.4em] font-semibold shadow-[0.2em_0.2em_0_#000000] focus:outline-none"
            />
          </div>

          {/* Milestone Type */}
          <div className="space-y-2">
            <label className="text-sm font-extrabold text-[#050505] uppercase tracking-[0.05em]">Milestone Type *</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setMilestoneType(ProjectMilestoneType.INTERNAL)}
                className={`p-4 rounded-[0.4em] border-[0.2em] transition-all font-extrabold shadow-[0.2em_0.2em_0_#000000] hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] uppercase tracking-[0.05em] ${
                  milestoneType === ProjectMilestoneType.INTERNAL
                    ? 'border-[#2563eb] bg-[#dbeafe] text-[#050505]'
                    : 'border-[#050505] bg-white text-[#050505]'
                }`}
              >
                <Lock className="h-5 w-5 mx-auto mb-2" />
                <div className="font-extrabold text-sm">Internal</div>
                <div className="text-xs font-semibold mt-1">Project owner</div>
              </button>
              <button
                type="button"
                onClick={() => setMilestoneType(ProjectMilestoneType.ASSIGNED)}
                className={`p-4 rounded-[0.4em] border-[0.2em] transition-all font-extrabold shadow-[0.2em_0.2em_0_#000000] hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] uppercase tracking-[0.05em] ${
                  milestoneType === ProjectMilestoneType.ASSIGNED
                    ? 'border-[#2563eb] bg-[#dbeafe] text-[#050505]'
                    : 'border-[#050505] bg-white text-[#050505]'
                }`}
              >
                <User className="h-5 w-5 mx-auto mb-2" />
                <div className="font-extrabold text-sm">Assigned</div>
                <div className="text-xs font-semibold mt-1">Specific wallet</div>
              </button>
              <button
                type="button"
                onClick={() => setMilestoneType(ProjectMilestoneType.OPEN)}
                className={`p-4 rounded-[0.4em] border-[0.2em] transition-all font-extrabold shadow-[0.2em_0.2em_0_#000000] hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] uppercase tracking-[0.05em] ${
                  milestoneType === ProjectMilestoneType.OPEN
                    ? 'border-[#2563eb] bg-[#dbeafe] text-[#050505]'
                    : 'border-[#050505] bg-white text-[#050505]'
                }`}
              >
                <Globe className="h-5 w-5 mx-auto mb-2" />
                <div className="font-extrabold text-sm">Open</div>
                <div className="text-xs font-semibold mt-1">Anyone can claim</div>
              </button>
            </div>
          </div>

          {/* Assigned To (only for ASSIGNED type) */}
          {milestoneType === ProjectMilestoneType.ASSIGNED && (
            <div className="space-y-2">
              <label className="text-sm font-extrabold text-[#050505] uppercase tracking-[0.05em]">Assigned To (Wallet Address) *</label>
              <Input
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value as Address)}
                placeholder="0x..."
                className="h-11 font-mono text-sm border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] focus:outline-none"
              />
            </div>
          )}

          {/* Deadline */}
          <div className="space-y-2">
            <label className="text-sm font-extrabold text-[#050505] uppercase tracking-[0.05em]">Deadline (Optional)</label>
            <Input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="h-11 border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] focus:outline-none"
            />
          </div>

          {/* Required Approvals */}
          <div className="space-y-2">
            <label className="text-sm font-extrabold text-[#050505] uppercase tracking-[0.05em]">Required Approvals *</label>
            <Input
              type="number"
              value={requiredApprovals}
              onChange={(e) => setRequiredApprovals(e.target.value)}
              min="1"
              className="h-11 border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] focus:outline-none"
            />
            <p className="text-xs text-[#050505] font-semibold">Number of approvals needed to approve this milestone</p>
          </div>

          {/* Allow Site Admin Approval */}
          <div className="flex items-start space-x-2">
            <input
              id="allow-site-admin"
              type="checkbox"
              checked={allowSiteAdminApproval}
              onChange={(e) => setAllowSiteAdminApproval(e.target.checked)}
              className="mt-1 w-5 h-5 border-[0.15em] border-[#050505] rounded-[0.2em] accent-[#2563eb]"
            />
            <label htmlFor="allow-site-admin" className="text-sm text-[#050505] font-semibold">
              Allow site administrators to approve this milestone
            </label>
          </div>

          {/* Stewards */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-extrabold text-[#050505] uppercase tracking-[0.05em]">Stewards (Optional)</label>
              <button
                type="button"
                onClick={handleAddSteward}
                className="text-xs text-[#2563eb] font-extrabold border-[0.15em] border-[#2563eb] px-2 py-1 rounded-[0.3em] shadow-[0.1em_0.1em_0_#000000] hover:shadow-[0.2em_0.2em_0_#000000] hover:-translate-x-[0.05em] hover:-translate-y-[0.05em] transition-all uppercase tracking-[0.05em]"
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
                  className="h-11 font-mono text-sm flex-1 border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] focus:outline-none"
                />
                {stewards.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveSteward(index)}
                    className="p-2 text-[#ef4444] border-[0.15em] border-[#ef4444] rounded-[0.3em] shadow-[0.1em_0.1em_0_#000000] hover:shadow-[0.2em_0.2em_0_#000000] hover:-translate-x-[0.05em] hover:-translate-y-[0.05em] transition-all"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
            ))}
            <p className="text-xs text-[#050505] font-semibold">Stewards can approve milestones in addition to the project owner</p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t-[0.35em] border-[#050505]">
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
              text={isPending ? "Creating..." : "Create Milestone"}
              bgColor="#2563eb"
              hoverBgColor="#1d4ed8"
              textColor="#ffffff"
              borderColor="#050505"
              size="md"
              disabled={isPending}
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            </ButtonCool>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

