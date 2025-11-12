import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  ArrowLeft,
  Award,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  ExternalLink,
} from 'lucide-react';
import {
  useSingleGrant,
  useGrantMilestones,
  useMultipleMilestones,
  useGrantTokenAmounts,
  useGrantAdmins,
  useMilestoneFunding,
  type GrantStatus,
  type MilestoneStatus,
} from '@/hooks/useMilestoneFunding';
import { type Address } from 'viem';
import { formatEther } from 'viem';
import DynamicHelmet from '@/components/DynamicHelmet';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const MILESTONE_CONTRACT_ADDRESS = (import.meta.env.VITE_MILESTONE_CONTRACT || import.meta.env.VITE_CONTRACT_V4) as Address;

export default function GrantView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const grantId = id ? BigInt(id) : 0n;

  const { grant, isLoading: grantLoading, error: grantError } = useSingleGrant(MILESTONE_CONTRACT_ADDRESS, grantId);
  const { milestoneIds } = useGrantMilestones(MILESTONE_CONTRACT_ADDRESS, grantId);
  const { milestones, isLoading: milestonesLoading } = useMultipleMilestones(MILESTONE_CONTRACT_ADDRESS, milestoneIds);
  const { admins } = useGrantAdmins(MILESTONE_CONTRACT_ADDRESS, grantId);
  const { getMilestoneStatusLabel } = useMilestoneFunding(MILESTONE_CONTRACT_ADDRESS);

  const [activeTab, setActiveTab] = useState('overview');

  if (grantLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-blue-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading grant...</p>
        </div>
      </div>
    );
  }

  if (grantError || !grant) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-blue-50 to-cyan-50 flex items-center justify-center p-4">
        <div className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-xl max-w-md mx-auto border border-red-200">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-red-600 mb-4">Grant Not Found</h2>
            <p className="text-gray-600 mb-6">The grant you're looking for doesn't exist or couldn't be loaded.</p>
            <Button onClick={() => navigate('/explorer/grants')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Grants
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: GrantStatus) => {
    switch (status) {
      case 0: // ACTIVE
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <Clock className="w-3 h-3 mr-1" />
            Active
          </span>
        );
      case 1: // COMPLETED
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </span>
        );
      case 2: // CANCELLED
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  const getMilestoneStatusBadge = (status: MilestoneStatus) => {
    const label = getMilestoneStatusLabel(status);
    const colors: Record<string, { bg: string; text: string; icon: any }> = {
      pending: { bg: 'bg-gray-100', text: 'text-gray-800', icon: Clock },
      submitted: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: FileText },
      approved: { bg: 'bg-blue-100', text: 'text-blue-800', icon: CheckCircle },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle },
      paid: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
      locked: { bg: 'bg-gray-200', text: 'text-gray-900', icon: AlertCircle },
    };

    const color = colors[label] || colors.pending;
    const Icon = color.icon;

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${color.bg} ${color.text}`}>
        <Icon className="w-3 h-3 mr-1" />
        {label.charAt(0).toUpperCase() + label.slice(1)}
      </span>
    );
  };

  const completedMilestones = milestones.filter(m => m.status === 4).length;
  const totalPercentage = milestones.reduce((sum, m) => sum + Number(m.percentage), 0);

  return (
    <>
      <DynamicHelmet 
        config={{
          title: `Grant #${grant.id.toString()}`,
          description: `Milestone-based grant for ${grant.entityType === 0 ? 'Project' : 'Campaign'} #${grant.linkedEntityId.toString()}`,
          image: '/og-image.png',
          url: window.location.href,
          type: 'website'
        }}
      />

      <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-blue-50 to-cyan-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => navigate('/explorer/grants')}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Grants
          </Button>

          {/* Grant Header */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900">Grant #{grant.id.toString()}</h1>
                  {getStatusBadge(grant.status)}
                </div>
                <p className="text-gray-600">
                  Linked to {grant.entityType === 0 ? 'Project' : 'Campaign'} #{grant.linkedEntityId.toString()}
                </p>
              </div>
            </div>

            {/* Grant Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-200">
              <div>
                <div className="text-sm text-gray-600 mb-1">Grantee</div>
                <div className="font-mono text-sm text-gray-900">
                  {grant.grantee.slice(0, 6)}...{grant.grantee.slice(-4)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Milestones</div>
                <div className="text-lg font-semibold text-gray-900">
                  {completedMilestones}/{milestones.length}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Progress</div>
                <div className="text-lg font-semibold text-gray-900">
                  {totalPercentage}%
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Tokens</div>
                <div className="text-lg font-semibold text-gray-900">
                  {grant.supportedTokens.length}
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
            <TabsList className="bg-white/80 backdrop-blur-sm">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="milestones">Milestones ({milestones.length})</TabsTrigger>
              <TabsTrigger value="funding">Funding</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-6">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Grant Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Site Fee</div>
                    <div className="text-lg font-semibold text-gray-900">{Number(grant.siteFeePercentage)}%</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Review Time Lock</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {Number(grant.reviewTimeLock) / 86400} days
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Created</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {new Date(Number(grant.createdAt) * 1000).toLocaleString()}
                    </div>
                  </div>
                  {grant.completedAt > 0n && (
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Completed</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {new Date(Number(grant.completedAt) * 1000).toLocaleString()}
                      </div>
                    </div>
                  )}
                  {grant.milestoneDeadline > 0n && (
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Milestone Deadline</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {new Date(Number(grant.milestoneDeadline) * 1000).toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>

                {admins.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="text-sm text-gray-600 mb-2">Grant Admins</div>
                    <div className="flex flex-wrap gap-2">
                      {admins.map((admin, idx) => (
                        <span key={idx} className="font-mono text-sm px-3 py-1 bg-gray-100 rounded-lg">
                          {admin.slice(0, 6)}...{admin.slice(-4)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Milestones Tab */}
            <TabsContent value="milestones" className="mt-6">
              <div className="space-y-4">
                {milestonesLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading milestones...</p>
                  </div>
                ) : milestones.length > 0 ? (
                  milestones.map((milestone) => (
                    <div
                      key={milestone.id.toString()}
                      className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 p-6"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{milestone.title}</h3>
                            {getMilestoneStatusBadge(milestone.status)}
                          </div>
                          <p className="text-gray-600 text-sm mb-2">{milestone.description}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>{Number(milestone.percentage)}% of grant</span>
                            {milestone.submittedAt > 0n && (
                              <span>Submitted {new Date(Number(milestone.submittedAt) * 1000).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {milestone.evidenceHash && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="text-sm text-gray-600 mb-1">Evidence</div>
                          <a
                            href={`https://ipfs.io/ipfs/${milestone.evidenceHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center"
                          >
                            View on IPFS <ExternalLink className="w-3 h-3 ml-1" />
                          </a>
                        </div>
                      )}

                      {milestone.approvalMessage && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="text-sm text-gray-600 mb-1">Approval Message</div>
                          <p className="text-sm text-gray-900">{milestone.approvalMessage}</p>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 p-8 text-center">
                    <Award className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No milestones have been submitted yet.</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Funding Tab */}
            <TabsContent value="funding" className="mt-6">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Funding Details</h2>
                <div className="space-y-4">
                  {grant.supportedTokens.map((token, idx) => (
                    <TokenAmountsCard
                      key={idx}
                      contractAddress={MILESTONE_CONTRACT_ADDRESS}
                      grantId={grantId}
                      token={token}
                    />
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}

function TokenAmountsCard({
  contractAddress,
  grantId,
  token,
}: {
  contractAddress: Address;
  grantId: bigint;
  token: Address;
}) {
  const { tokenAmounts, isLoading } = useGrantTokenAmounts(contractAddress, grantId, token);

  if (isLoading || !tokenAmounts) {
    return (
      <div className="border border-gray-200 rounded-lg p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
        <div className="h-6 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="text-sm text-gray-600 mb-3 font-mono">{token.slice(0, 6)}...{token.slice(-4)}</div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <div className="text-xs text-gray-500 mb-1">Total</div>
          <div className="text-lg font-semibold text-gray-900">
            {formatEther(tokenAmounts.totalAmount)}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">Released</div>
          <div className="text-lg font-semibold text-green-600">
            {formatEther(tokenAmounts.releasedAmount)}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">Escrowed</div>
          <div className="text-lg font-semibold text-blue-600">
            {formatEther(tokenAmounts.escrowedAmount)}
          </div>
        </div>
      </div>
    </div>
  );
}

