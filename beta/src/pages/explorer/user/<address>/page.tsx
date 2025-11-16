import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import type { Address } from 'viem';
import { formatEther } from 'viem';
import {
  ArrowLeft,
  User,
  Briefcase,
  Award,
  Coins,
  Calendar,
  CheckCircle,
  ExternalLink,
  Copy,
  Loader2,
  Users,
} from 'lucide-react';
import { useAllProjects } from '@/hooks/useProjectMethods';
import { useUserClaimedMilestones, ProjectMilestoneStatus } from '@/hooks/useProjectMilestones';
import { getMainContractAddress, getTippingContractAddress } from '@/utils/contractConfig';
import { getProjectRoute } from '@/utils/hashids';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DynamicHelmet from '@/components/DynamicHelmet';
import ProjectCard from '@/components/cards/ProjectCard';
import { formatIpfsUrl } from '@/utils/imageUtils';
import { useReadContracts } from 'wagmi';

const CONTRACT_ADDRESS = getMainContractAddress();
const TIPS_CONTRACT_ADDRESS = getTippingContractAddress();

export default function UserProfilePage() {
  const { address: walletAddress } = useParams<{ address: string }>();
  const navigate = useNavigate();
  const { address: connectedAddress } = useAccount();
  const [copied, setCopied] = useState(false);

  // Validate address
  const isValidAddress = useMemo(() => {
    if (!walletAddress) return false;
    return /^0x[a-fA-F0-9]{40}$/.test(walletAddress);
  }, [walletAddress]);

  const userAddress = isValidAddress ? (walletAddress as Address) : undefined;

  // Fetch all projects
  const { projects: allProjects, isLoading: projectsLoading } = useAllProjects(CONTRACT_ADDRESS);

  // Filter user's projects
  const userProjects = useMemo(() => {
    if (!allProjects || !userAddress) return [];
    return allProjects.filter(
      (project) => project.project.owner?.toLowerCase() === userAddress.toLowerCase()
    );
  }, [allProjects, userAddress]);

  // Fetch user's claimed milestones
  const { milestones, isLoading: milestonesLoading } = useUserClaimedMilestones(
    userAddress,
    !!userAddress
  );

  // Fetch tips received - get tip summaries for all user's projects
  const tipSummariesContracts = useMemo(() => {
    if (!userProjects || userProjects.length === 0) return [];
    return userProjects.map((project) => ({
      address: TIPS_CONTRACT_ADDRESS,
      abi: [
        {
          inputs: [{ internalType: 'uint256', name: '_projectId', type: 'uint256' }],
          name: 'getProjectTipSummary',
          outputs: [
            { internalType: 'uint256', name: 'projectId', type: 'uint256' },
            { internalType: 'address', name: 'projectOwner', type: 'address' },
            { internalType: 'string', name: 'projectName', type: 'string' },
            { internalType: 'uint256', name: 'totalTipsInCelo', type: 'uint256' },
            { internalType: 'uint256', name: 'tipperCount', type: 'uint256' },
            { internalType: 'address[]', name: 'tippedTokens', type: 'address[]' },
            { internalType: 'uint256[]', name: 'tokenAmounts', type: 'uint256[]' },
            { internalType: 'bool', name: 'isActive', type: 'bool' },
          ],
          stateMutability: 'view',
          type: 'function',
        },
      ] as const,
      functionName: 'getProjectTipSummary' as const,
      args: [project.project.id] as const,
    }));
  }, [userProjects]);

  const { data: tipSummariesData, isLoading: tipsLoading } = useReadContracts({
    contracts: tipSummariesContracts,
    query: { enabled: tipSummariesContracts.length > 0 },
  });

  // Process tip summaries
  const tipsReceived = useMemo(() => {
    if (!tipSummariesData || !userProjects) return [];
    return tipSummariesData
      .map((data: any, index: number) => {
        if (!data?.result) return null;
        const result = data.result;
        const project = userProjects[index];
        return {
          projectId: result[0] as bigint,
          projectName: project?.project.name || 'Unknown Project',
          totalTipsInCelo: result[3] as bigint,
          tipperCount: result[4] as bigint,
          tippedTokens: result[5] as Address[],
          tokenAmounts: result[6] as bigint[],
        };
      })
      .filter((tip): tip is NonNullable<typeof tip> => tip !== null && tip.totalTipsInCelo > 0n);
  }, [tipSummariesData, userProjects]);

  const totalTipsReceived = useMemo(() => {
    return tipsReceived.reduce((sum, tip) => sum + tip.totalTipsInCelo, 0n);
  }, [tipsReceived]);

  // Copy address to clipboard
  const copyAddress = () => {
    if (userAddress) {
      navigator.clipboard.writeText(userAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Format address for display
  const formatAddress = (addr: Address) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Check if viewing own profile
  const isOwnProfile = useMemo(() => {
    return (
      connectedAddress &&
      userAddress &&
      connectedAddress.toLowerCase() === userAddress.toLowerCase()
    );
  }, [connectedAddress, userAddress]);

  if (!isValidAddress) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="mb-6"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  Invalid wallet address
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const isLoading = projectsLoading || milestonesLoading || tipsLoading;

  return (
    <>
      <DynamicHelmet
        config={{
          title: `User Profile - ${formatAddress(userAddress!)}`,
          description: `View profile, projects, milestones, and tips for ${formatAddress(userAddress!)}`,
        }}
      />
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <Button
                variant="ghost"
                onClick={() => navigate(-1)}
                className="mb-4"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>

              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-8 w-8 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-2xl">
                          {isOwnProfile ? 'Your Profile' : 'User Profile'}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-2">
                          <code className="text-sm">{formatAddress(userAddress!)}</code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={copyAddress}
                            className="h-6 px-2"
                          >
                            {copied ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Projects</p>
                        <p className="text-2xl font-bold">
                          {isLoading ? (
                            <Loader2 className="h-5 w-5 animate-spin inline" />
                          ) : (
                            userProjects.length
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Milestones</p>
                        <p className="text-2xl font-bold">
                          {isLoading ? (
                            <Loader2 className="h-5 w-5 animate-spin inline" />
                          ) : (
                            milestones.length
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Coins className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Tips Received</p>
                        <p className="text-2xl font-bold">
                          {isLoading ? (
                            <Loader2 className="h-5 w-5 animate-spin inline" />
                          ) : (
                            formatEther(totalTipsReceived)
                          )}{' '}
                          CELO
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="projects" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="projects">Projects</TabsTrigger>
                <TabsTrigger value="milestones">Milestones</TabsTrigger>
                <TabsTrigger value="tips">Tips Received</TabsTrigger>
              </TabsList>

              {/* Projects Tab */}
              <TabsContent value="projects" className="mt-6">
                {isLoading ? (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                ) : userProjects.length === 0 ? (
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-center text-muted-foreground py-12">
                        No projects found
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {userProjects.map((projectDetails) => {
                      let logo;
                      try {
                        const additionalData = JSON.parse(
                          projectDetails.metadata?.additionalData || '{}'
                        );
                        logo = additionalData.media?.logo || additionalData.logo;
                        if (logo) logo = formatIpfsUrl(logo);
                      } catch {
                        logo = undefined;
                      }

                      return (
                        <ProjectCard
                          key={projectDetails.project.id.toString()}
                          title={projectDetails.project.name}
                          description={projectDetails.project.description}
                          logo={logo}
                          campaignCount={projectDetails.project.campaignIds?.length || 0}
                          projectId={projectDetails.project.id.toString()}
                          projectOwner={projectDetails.project.owner}
                          contractAddress={CONTRACT_ADDRESS}
                        />
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* Milestones Tab */}
              <TabsContent value="milestones" className="mt-6">
                {isLoading ? (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                ) : milestones.length === 0 ? (
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-center text-muted-foreground py-12">
                        No milestones found
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {milestones.map((milestone) => (
                      <Card key={milestone.id.toString()}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-lg">{milestone.title}</CardTitle>
                              <CardDescription className="mt-1">
                                {milestone.description}
                              </CardDescription>
                            </div>
                            <Badge
                              variant={
                                milestone.status === ProjectMilestoneStatus.PAID
                                  ? 'default'
                                  : milestone.status === ProjectMilestoneStatus.APPROVED
                                    ? 'secondary'
                                    : 'outline'
                              }
                            >
                              {milestone.status === ProjectMilestoneStatus.PAID
                                ? 'Completed'
                                : milestone.status === ProjectMilestoneStatus.APPROVED
                                  ? 'Approved'
                                  : milestone.status === ProjectMilestoneStatus.SUBMITTED
                                    ? 'Submitted'
                                    : 'In Progress'}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>
                                {new Date(Number(milestone.createdAt) * 1000).toLocaleDateString()}
                              </span>
                            </div>
                            {milestone.submittedAt > 0n && (
                              <div className="flex items-center gap-1">
                                <CheckCircle className="h-4 w-4" />
                                <span>
                                  Submitted:{' '}
                                  {new Date(
                                    Number(milestone.submittedAt) * 1000
                                  ).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                            {milestone.approvedAt > 0n && (
                              <div className="flex items-center gap-1">
                                <Award className="h-4 w-4" />
                                <span>
                                  Approved:{' '}
                                  {new Date(
                                    Number(milestone.approvedAt) * 1000
                                  ).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-4"
                            onClick={() =>
                              navigate(getProjectRoute(milestone.projectId))
                            }
                          >
                            View Project
                            <ExternalLink className="ml-2 h-4 w-4" />
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Tips Received Tab */}
              <TabsContent value="tips" className="mt-6">
                {isLoading ? (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                ) : tipsReceived.length === 0 ? (
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-center text-muted-foreground py-12">
                        No tips received yet
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {tipsReceived.map((tip) => (
                      <Card key={tip.projectId.toString()}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg">{tip.projectName}</CardTitle>
                              <CardDescription>
                                Project ID: {tip.projectId.toString()}
                              </CardDescription>
                            </div>
                            <Badge variant="default" className="text-lg">
                              {formatEther(tip.totalTipsInCelo)} CELO
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              <span>{tip.tipperCount.toString()} tippers</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Coins className="h-4 w-4" />
                              <span>{tip.tippedTokens.length} tokens</span>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-4"
                            onClick={() => navigate(getProjectRoute(tip.projectId))}
                          >
                            View Project
                            <ExternalLink className="ml-2 h-4 w-4" />
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </>
  );
}

