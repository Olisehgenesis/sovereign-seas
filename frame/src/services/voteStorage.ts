// Vote storage service
export interface VoteRecord {
  id: string;
  campaignId: number;
  projectId: number;
  voterAddress: string;
  amount: string;
  timestamp: string;
  status: 'pending' | 'confirmed' | 'failed';
  transactionHash?: string;
  blockNumber?: number;
}

class VoteStorageService {
  private storageKey = 'sovereign_seas_votes';
  private votes: VoteRecord[] = [];

  constructor() {
    this.loadVotes();
  }

  private loadVotes() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      this.votes = stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load votes from storage:', error);
      this.votes = [];
    }
  }

  private saveVotes() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.votes));
    } catch (error) {
      console.error('Failed to save votes to storage:', error);
    }
  }

  // Store a new vote
  async storeVote(voteData: Omit<VoteRecord, 'id' | 'status'>): Promise<string> {
    const vote: VoteRecord = {
      ...voteData,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: 'pending'
    };

    this.votes.push(vote);
    this.saveVotes();

    console.log('🗳️ Vote stored:', vote);
    return vote.id;
  }

  // Update vote status
  async updateVoteStatus(voteId: string, status: VoteRecord['status'], transactionHash?: string, blockNumber?: number) {
    const vote = this.votes.find(v => v.id === voteId);
    if (vote) {
      vote.status = status;
      if (transactionHash) vote.transactionHash = transactionHash;
      if (blockNumber) vote.blockNumber = blockNumber;
      this.saveVotes();
      console.log('🗳️ Vote status updated:', vote);
    }
  }

  // Get all votes for a campaign
  getCampaignVotes(campaignId: number): VoteRecord[] {
    return this.votes.filter(vote => vote.campaignId === campaignId);
  }

  // Get all votes for a project
  getProjectVotes(campaignId: number, projectId: number): VoteRecord[] {
    return this.votes.filter(vote => 
      vote.campaignId === campaignId && vote.projectId === projectId
    );
  }

  // Get user's votes
  getUserVotes(voterAddress: string): VoteRecord[] {
    return this.votes.filter(vote => vote.voterAddress.toLowerCase() === voterAddress.toLowerCase());
  }

  // Get user's votes for a specific campaign
  getUserCampaignVotes(voterAddress: string, campaignId: number): VoteRecord[] {
    return this.votes.filter(vote => 
      vote.voterAddress.toLowerCase() === voterAddress.toLowerCase() && 
      vote.campaignId === campaignId
    );
  }

  // Get vote statistics
  getVoteStats(campaignId: number) {
    const campaignVotes = this.getCampaignVotes(campaignId);
    const totalVotes = campaignVotes.length;
    const totalAmount = campaignVotes.reduce((sum, vote) => sum + parseFloat(vote.amount), 0);
    const confirmedVotes = campaignVotes.filter(vote => vote.status === 'confirmed').length;
    const pendingVotes = campaignVotes.filter(vote => vote.status === 'pending').length;

    return {
      totalVotes,
      totalAmount: totalAmount.toFixed(2),
      confirmedVotes,
      pendingVotes,
      successRate: totalVotes > 0 ? (confirmedVotes / totalVotes * 100).toFixed(1) : '0'
    };
  }

  // Clear all votes (for testing)
  clearAllVotes() {
    this.votes = [];
    this.saveVotes();
    console.log('🗳️ All votes cleared');
  }

  // Export votes (for backup)
  exportVotes(): string {
    return JSON.stringify(this.votes, null, 2);
  }

  // Import votes (for restore)
  importVotes(votesJson: string) {
    try {
      const votes = JSON.parse(votesJson);
      this.votes = votes;
      this.saveVotes();
      console.log('🗳️ Votes imported successfully');
    } catch (error) {
      console.error('Failed to import votes:', error);
      throw error;
    }
  }
}

// Create singleton instance
export const voteStorage = new VoteStorageService();

// Helper functions for easy access
export const storeVote = (voteData: Omit<VoteRecord, 'id' | 'status'>) => voteStorage.storeVote(voteData);
export const updateVoteStatus = (voteId: string, status: VoteRecord['status'], transactionHash?: string, blockNumber?: number) => 
  voteStorage.updateVoteStatus(voteId, status, transactionHash, blockNumber);
export const getCampaignVotes = (campaignId: number) => voteStorage.getCampaignVotes(campaignId);
export const getProjectVotes = (campaignId: number, projectId: number) => voteStorage.getProjectVotes(campaignId, projectId);
export const getUserVotes = (voterAddress: string) => voteStorage.getUserVotes(voterAddress);
export const getVoteStats = (campaignId: number) => voteStorage.getVoteStats(campaignId); 