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
import { Loader2, Upload, File, X, ExternalLink, CheckCircle } from 'lucide-react';
import { useSubmitMilestoneEvidence } from '@/hooks/useProjectMilestones';
import { uploadToIPFS, formatIpfsUrl } from '@/utils/imageUtils';

type SubmitEvidenceModalProps = {
  isOpen: boolean;
  onClose: () => void;
  milestoneId: bigint;
  onSuccess?: () => void;
};

export default function SubmitEvidenceModal({
  isOpen,
  onClose,
  milestoneId,
  onSuccess
}: SubmitEvidenceModalProps) {
  const { address } = useAccount();
  const { submitMilestoneEvidence, isPending } = useSubmitMilestoneEvidence();
  const [evidenceHash, setEvidenceHash] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setEvidenceHash('');
      setEvidenceUrl('');
      setFile(null);
      setIsUploading(false);
      setUploadProgress(0);
      setErrorMsg('');
    }
  }, [isOpen]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setEvidenceHash('');
    setEvidenceUrl('');
    setErrorMsg('');

    // Auto-upload on file select (like project creation)
    try {
      setIsUploading(true);
      setUploadProgress(10);
      
      setUploadProgress(30);
      const ipfsUrl = await uploadToIPFS(selectedFile);
      setUploadProgress(100);
      
      // Extract CID from IPFS URL
      const cid = ipfsUrl.split('/ipfs/')[1]?.split('/')[0] || ipfsUrl;
      setEvidenceHash(cid);
      setEvidenceUrl(ipfsUrl);
      
      setIsUploading(false);
    } catch (error: any) {
      setIsUploading(false);
      setErrorMsg(`Failed to upload file: ${error?.message || 'Unknown error'}`);
      setFile(null);
    }
  };

  const handleManualHash = (hash: string) => {
    setEvidenceHash(hash);
    setEvidenceUrl(hash ? formatIpfsUrl(hash) : '');
    setFile(null);
  };

  const handleSubmit = async () => {
    if (!evidenceHash.trim()) {
      setErrorMsg('Please provide an evidence hash or upload a file');
      return;
    }

    if (!address) {
      setErrorMsg('Please connect your wallet');
      return;
    }

    try {
      setErrorMsg('');
      await submitMilestoneEvidence(milestoneId, evidenceHash.trim());
      onSuccess?.();
      onClose();
    } catch (e: any) {
      const msg = e?.shortMessage || e?.message || 'Failed to submit evidence';
      setErrorMsg(msg);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
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
          <DialogDescription className="text-white text-2xl font-extrabold uppercase tracking-[0.05em]">
            Submit Evidence
          </DialogDescription>
        </DialogHeader>

        <div className="relative px-[1.5em] pb-[1.5em] pt-4 space-y-4 sm:space-y-5 z-[2]">
          {errorMsg && (
            <div className="p-3 sm:p-4 border-[0.2em] border-[#ef4444] bg-[#fee2e2] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] text-sm text-[#050505] flex items-start gap-2">
              <X className="h-5 w-5 text-[#ef4444] flex-shrink-0 mt-0.5" />
              <p className="font-extrabold uppercase tracking-[0.05em]">{errorMsg}</p>
            </div>
          )}

          {/* File Upload Section */}
          <div className="space-y-3">
            <label className="text-sm font-extrabold text-[#050505] uppercase tracking-[0.05em]">
              Upload File (Optional)
            </label>
            <div className={`border-[0.2em] border-dashed rounded-[0.6em] p-4 sm:p-6 text-center transition-colors shadow-[0.2em_0.2em_0_#000000] ${
              isUploading 
                ? 'border-[#2563eb] bg-[#dbeafe]' 
                : file 
                  ? 'border-[#10b981] bg-[#d1fae5]' 
                  : 'border-[#050505] bg-white hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em]'
            }`}>
              <input
                type="file"
                id="evidence-file"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isUploading || isPending}
                accept="image/*,video/*,.pdf,.doc,.docx,.txt"
              />
              <label
                htmlFor="evidence-file"
                className={`cursor-pointer flex flex-col items-center gap-2 ${
                  (isUploading || isPending) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                    <span className="text-sm text-gray-700 font-medium">Uploading to IPFS...</span>
                  </>
                ) : file ? (
                  <>
                    <File className="h-8 w-8 text-green-600" />
                    <span className="text-sm text-gray-700 font-medium">{file.name}</span>
                    <span className="text-xs text-gray-500">Click to change file</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-gray-400" />
                    <span className="text-sm text-gray-600">Click to select a file</span>
                    <span className="text-xs text-gray-500">Images, videos, PDFs, documents</span>
                  </>
                )}
              </label>
              
              {file && !isUploading && (
                <div className="mt-4 flex items-center justify-between p-3 bg-white rounded-[0.4em] border-[0.15em] border-[#050505] shadow-[0.2em_0.2em_0_#000000]">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <File className="h-5 w-5 text-gray-600 flex-shrink-0" />
                    <span className="text-sm text-gray-700 truncate">{file.name}</span>
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setFile(null);
                      setEvidenceHash('');
                      setEvidenceUrl('');
                    }}
                    className="p-1 text-red-600 hover:text-red-700 flex-shrink-0 ml-2"
                    disabled={isPending}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              
              {isUploading && uploadProgress > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden border-[0.1em] border-[#050505] shadow-[0.1em_0.1em_0_#000000]">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-600">{uploadProgress}% uploaded</p>
                </div>
              )}
            </div>
          </div>

          {/* Manual Hash Input */}
          <div className="space-y-2">
            <label className="text-sm font-extrabold text-[#050505] uppercase tracking-[0.05em]">
              IPFS Hash (CID) *
            </label>
            <Textarea
              value={evidenceHash}
              onChange={(e) => handleManualHash(e.target.value)}
              placeholder="QmXxxxxx... or paste IPFS URL"
              className="min-h-[100px] font-mono text-sm border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] focus:outline-none"
              disabled={isUploading || isPending}
            />
            <p className="text-xs text-[#050505] font-semibold">
              Enter an IPFS hash (CID) directly, or upload a file above to generate one automatically.
            </p>
          </div>

          {/* Preview */}
          {evidenceUrl && (
            <div className="p-4 bg-[#d1fae5] border-[0.2em] border-[#10b981] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-[#10b981] flex-shrink-0" />
                    <p className="text-xs font-extrabold text-[#065f46] uppercase tracking-[0.05em]">
                      IPFS Upload Successful
                    </p>
                  </div>
                  <p className="text-xs text-[#065f46] font-mono break-all mb-2">{evidenceUrl}</p>
                  <p className="text-xs text-[#047857] font-semibold">CID: {evidenceHash}</p>
                </div>
                <a
                  href={evidenceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-[#2563eb] hover:text-[#1d4ed8] hover:bg-[#dbeafe] rounded-[0.4em] border-[0.15em] border-[#2563eb] shadow-[0.1em_0.1em_0_#000000] transition-colors flex-shrink-0"
                  title="View on IPFS"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          )}

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
            />
            <ButtonCool
              onClick={handleSubmit}
              text={isPending ? 'Submitting...' : 'Submit Evidence'}
              bgColor="#2563eb"
              hoverBgColor="#1d4ed8"
              textColor="#ffffff"
              borderColor="#050505"
              size="md"
              disabled={!evidenceHash.trim() || isPending || isUploading}
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            </ButtonCool>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

