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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white p-0 [&>button]:hidden">
        <DialogHeader className="p-6 pb-3 sticky top-0 bg-white z-10 border-b">
          <div className="bg-gray-500 p-4 text-white relative overflow-hidden rounded-t-lg -m-6 mb-3">
            <div className="relative z-10">
              <DialogDescription className="text-white text-2xl">
                Submit Evidence
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-4 sm:space-y-5">
          {errorMsg && (
            <div className="p-3 sm:p-4 rounded-lg border-2 border-red-300 bg-red-50 text-sm text-red-700 flex items-start gap-2">
              <X className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold mb-1">Error</p>
                <p>{errorMsg}</p>
              </div>
            </div>
          )}

          {/* File Upload Section */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-800">Upload File (Optional)</label>
            <div className={`border-2 border-dashed rounded-lg p-4 sm:p-6 text-center transition-colors ${
              isUploading 
                ? 'border-blue-400 bg-blue-50' 
                : file 
                  ? 'border-green-300 bg-green-50' 
                  : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
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
                <div className="mt-4 flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
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
                  <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
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
            <label className="text-sm font-semibold text-gray-800">
              IPFS Hash (CID) *
            </label>
            <Textarea
              value={evidenceHash}
              onChange={(e) => handleManualHash(e.target.value)}
              placeholder="QmXxxxxx... or paste IPFS URL"
              className="min-h-[100px] font-mono text-sm"
              disabled={isUploading || isPending}
            />
            <p className="text-xs text-gray-500">
              Enter an IPFS hash (CID) directly, or upload a file above to generate one automatically.
            </p>
          </div>

          {/* Preview */}
          {evidenceUrl && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <p className="text-xs font-semibold text-green-800">IPFS Upload Successful</p>
                  </div>
                  <p className="text-xs text-gray-600 font-mono break-all mb-2">{evidenceUrl}</p>
                  <p className="text-xs text-gray-500">CID: {evidenceHash}</p>
                </div>
                <a
                  href={evidenceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0"
                  title="View on IPFS"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={onClose} 
              className="h-11 w-full sm:w-auto" 
              disabled={isPending || isUploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!evidenceHash.trim() || isPending || isUploading}
              className="h-11 w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Submit Evidence
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

