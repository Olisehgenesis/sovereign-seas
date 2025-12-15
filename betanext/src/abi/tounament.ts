export const tournamentABI = [
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_sovseas",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "_baseToken",
          "type": "address"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "inputs": [],
      "name": "EnforcedPause",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "ExpectedPause",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "ReentrancyGuardReentrantCall",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "token",
          "type": "address"
        }
      ],
      "name": "SafeERC20FailedOperation",
      "type": "error"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "tournamentId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "stageNumber",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "voter",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "voteCount",
          "type": "uint256"
        }
      ],
      "name": "BatchVoteCast",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "Paused",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "tournamentId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "projectId",
          "type": "uint256"
        }
      ],
      "name": "ProjectAdded",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "tournamentId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "projectId",
          "type": "uint256"
        }
      ],
      "name": "ProjectApproved",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "tournamentId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "projectId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "reason",
          "type": "string"
        }
      ],
      "name": "ProjectDisqualified",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "tournamentId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "stageNumber",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "projectId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "finalPower",
          "type": "uint256"
        }
      ],
      "name": "ProjectEliminated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "tournamentId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "projectId",
          "type": "uint256"
        }
      ],
      "name": "ProjectRemoved",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "tournamentId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "stageNumber",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "projectRewards",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "voterRewards",
          "type": "uint256"
        }
      ],
      "name": "RewardsDistributed",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "tournamentId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "stageNumber",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "eliminatedCount",
          "type": "uint256"
        }
      ],
      "name": "StageFinalized",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "tournamentId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "stageNumber",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "token",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "celoEquivalent",
          "type": "uint256"
        }
      ],
      "name": "StageFunded",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "tournamentId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "stageNumber",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "scheduledStart",
          "type": "uint256"
        }
      ],
      "name": "StageScheduled",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "tournamentId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "stageNumber",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "eliminationPercentage",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "bool",
          "name": "autoStarted",
          "type": "bool"
        }
      ],
      "name": "StageStarted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "tournamentId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "stageNumber",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "fromToken",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "reason",
          "type": "string"
        }
      ],
      "name": "TokenConversionFailed",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "tournamentId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "stageNumber",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "fromToken",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "toToken",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "fromAmount",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "toAmount",
          "type": "uint256"
        }
      ],
      "name": "TokenConverted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "tournamentId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "admin",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "sovseasCampaignId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "stageDuration",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "payoutToken",
          "type": "address"
        }
      ],
      "name": "TournamentCreated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "tournamentId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "winnerId",
          "type": "uint256"
        }
      ],
      "name": "TournamentEnded",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "tournamentId",
          "type": "uint256"
        }
      ],
      "name": "TournamentPaused",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "tournamentId",
          "type": "uint256"
        }
      ],
      "name": "TournamentStarted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "tournamentId",
          "type": "uint256"
        }
      ],
      "name": "TournamentUnpaused",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "Unpaused",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "tournamentId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "stageNumber",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "projectId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "voter",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "power",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "token",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "VoteCast",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "tournamentId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "stageNumber",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "voter",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "VoterRewardClaimed",
      "type": "event"
    },
    {
      "inputs": [],
      "name": "DEFAULT_AMOUNT_WEIGHT",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "DEFAULT_MIN_VOTE_AMOUNT",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "DEFAULT_QF_PRECISION",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "DEFAULT_TIME_WEIGHT",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "DEFAULT_UNIQUENESS_WEIGHT",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "DEFAULT_VOTER_REWARD_BPS",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_tournamentId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_campaignId",
          "type": "uint256"
        }
      ],
      "name": "addCampaignProjects",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_tournamentId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_projectId",
          "type": "uint256"
        }
      ],
      "name": "addProject",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_tournamentId",
          "type": "uint256"
        },
        {
          "internalType": "uint256[]",
          "name": "_projectIds",
          "type": "uint256[]"
        }
      ],
      "name": "addProjectsBatch",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_tournamentId",
          "type": "uint256"
        },
        {
          "internalType": "uint256[]",
          "name": "_projectIds",
          "type": "uint256[]"
        }
      ],
      "name": "approveMultipleProjects",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_tournamentId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_projectId",
          "type": "uint256"
        }
      ],
      "name": "approveProject",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "baseToken",
      "outputs": [
        {
          "internalType": "contract IERC20",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_tournamentId",
          "type": "uint256"
        },
        {
          "internalType": "uint256[]",
          "name": "_projectIds",
          "type": "uint256[]"
        }
      ],
      "name": "batchApproveProjects",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_tournamentId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_projectId",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "_token",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "_amount",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "_voter",
          "type": "address"
        }
      ],
      "name": "batchVoteInternal",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_tournamentId",
          "type": "uint256"
        },
        {
          "internalType": "uint256[]",
          "name": "_projectIds",
          "type": "uint256[]"
        }
      ],
      "name": "batchVoteWithCelo",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_tournamentId",
          "type": "uint256"
        },
        {
          "internalType": "uint256[]",
          "name": "_projectIds",
          "type": "uint256[]"
        },
        {
          "internalType": "address",
          "name": "_token",
          "type": "address"
        },
        {
          "internalType": "uint256[]",
          "name": "_amounts",
          "type": "uint256[]"
        }
      ],
      "name": "batchVoteWithToken",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_tournamentId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_stageNumber",
          "type": "uint256"
        }
      ],
      "name": "canFinalizeStage",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_tournamentId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_stageNumber",
          "type": "uint256"
        }
      ],
      "name": "claimVoterReward",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_fromToken",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "_toToken",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "_amount",
          "type": "uint256"
        }
      ],
      "name": "convertTokensExternal",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_sovseasCampaignId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_stageDuration",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "_payoutToken",
          "type": "address"
        },
        {
          "internalType": "bool",
          "name": "_autoProgress",
          "type": "bool"
        },
        {
          "internalType": "bool",
          "name": "_disqualifyEnabled",
          "type": "bool"
        }
      ],
      "name": "createTournament",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_sovseasCampaignId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_stageDuration",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "_payoutToken",
          "type": "address"
        },
        {
          "internalType": "bool",
          "name": "_autoProgress",
          "type": "bool"
        },
        {
          "internalType": "bool",
          "name": "_disqualifyEnabled",
          "type": "bool"
        },
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "amountWeight",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "timeWeight",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "uniquenessWeight",
              "type": "uint256"
            }
          ],
          "internalType": "struct TournamentCore.PowerWeights",
          "name": "_powerWeights",
          "type": "tuple"
        },
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "firstVote",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "secondVote",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "thirdVote",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "fourthVote",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "floorVote",
              "type": "uint256"
            }
          ],
          "internalType": "struct TournamentCore.DiminishingConfig",
          "name": "_diminishing",
          "type": "tuple"
        },
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "earlyBonus",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "midEarlyBonus",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "midLateBonus",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "lateBonus",
              "type": "uint256"
            }
          ],
          "internalType": "struct TournamentCore.TimeDecayConfig",
          "name": "_timeDecay",
          "type": "tuple"
        },
        {
          "internalType": "uint256",
          "name": "_voterRewardBps",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_minVoteAmount",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_qfPrecision",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_maxVotesPerVoter",
          "type": "uint256"
        },
        {
          "internalType": "bool",
          "name": "_allowSameProjectVote",
          "type": "bool"
        }
      ],
      "name": "createTournamentAdvanced",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_tournamentId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_projectId",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "_reason",
          "type": "string"
        }
      ],
      "name": "disqualifyProject",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_tournamentId",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "_voter",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "_amount",
          "type": "uint256"
        }
      ],
      "name": "estimateVotePower",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_tournamentId",
          "type": "uint256"
        }
      ],
      "name": "finalizeStage",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_tournamentId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_stageNumber",
          "type": "uint256"
        }
      ],
      "name": "fundStageWithCelo",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_tournamentId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_stageNumber",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "_token",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "_amount",
          "type": "uint256"
        }
      ],
      "name": "fundStageWithToken",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_tournamentId",
          "type": "uint256"
        }
      ],
      "name": "getApprovedProjects",
      "outputs": [
        {
          "internalType": "uint256[]",
          "name": "",
          "type": "uint256[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_tournamentId",
          "type": "uint256"
        }
      ],
      "name": "getCurrentStageNumber",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_tournamentId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_stageNumber",
          "type": "uint256"
        }
      ],
      "name": "getLeaderboard",
      "outputs": [
        {
          "internalType": "uint256[]",
          "name": "projectIds",
          "type": "uint256[]"
        },
        {
          "internalType": "uint256[]",
          "name": "powers",
          "type": "uint256[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_tournamentId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_stageNumber",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "_voter",
          "type": "address"
        }
      ],
      "name": "getNextVoteDiminishingFactor",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_tournamentId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_stageNumber",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_projectId",
          "type": "uint256"
        }
      ],
      "name": "getProjectExpectedReward",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_tournamentId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_stageNumber",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_projectId",
          "type": "uint256"
        }
      ],
      "name": "getProjectPower",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_tournamentId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_projectId",
          "type": "uint256"
        }
      ],
      "name": "getProjectStatus",
      "outputs": [
        {
          "internalType": "bool",
          "name": "approved",
          "type": "bool"
        },
        {
          "internalType": "bool",
          "name": "disqualified",
          "type": "bool"
        },
        {
          "internalType": "bool",
          "name": "eliminated",
          "type": "bool"
        },
        {
          "internalType": "uint256",
          "name": "approvedAt",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "eliminatedAt",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "eliminatedInStage",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "disqualificationReason",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_tournamentId",
          "type": "uint256"
        }
      ],
      "name": "getStageCount",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_tournamentId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_stageNumber",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "_token",
          "type": "address"
        }
      ],
      "name": "getStageFailedConversions",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_tournamentId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_stageNumber",
          "type": "uint256"
        }
      ],
      "name": "getStageInfo",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "stageNumber",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "start",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "end",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "scheduledStart",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "rewardPool",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "eliminationPercentage",
          "type": "uint256"
        },
        {
          "internalType": "bool",
          "name": "finalized",
          "type": "bool"
        },
        {
          "internalType": "bool",
          "name": "started",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_tournamentId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_stageNumber",
          "type": "uint256"
        }
      ],
      "name": "getStageStatus",
      "outputs": [
        {
          "internalType": "bool",
          "name": "active",
          "type": "bool"
        },
        {
          "internalType": "bool",
          "name": "ended",
          "type": "bool"
        },
        {
          "internalType": "bool",
          "name": "finalized",
          "type": "bool"
        },
        {
          "internalType": "uint256",
          "name": "timeRemaining",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_tournamentId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_stageNumber",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "_token",
          "type": "address"
        }
      ],
      "name": "getStageTokenAmount",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_tournamentId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_stageNumber",
          "type": "uint256"
        }
      ],
      "name": "getStageUsedTokens",
      "outputs": [
        {
          "internalType": "address[]",
          "name": "",
          "type": "address[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_tournamentId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_stageNumber",
          "type": "uint256"
        }
      ],
      "name": "getStageVoters",
      "outputs": [
        {
          "internalType": "address[]",
          "name": "",
          "type": "address[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_tournamentId",
          "type": "uint256"
        }
      ],
      "name": "getTournamentConfig",
      "outputs": [
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "amountWeight",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "timeWeight",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "uniquenessWeight",
              "type": "uint256"
            }
          ],
          "internalType": "struct TournamentCore.PowerWeights",
          "name": "powerWeights",
          "type": "tuple"
        },
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "firstVote",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "secondVote",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "thirdVote",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "fourthVote",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "floorVote",
              "type": "uint256"
            }
          ],
          "internalType": "struct TournamentCore.DiminishingConfig",
          "name": "diminishing",
          "type": "tuple"
        },
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "earlyBonus",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "midEarlyBonus",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "midLateBonus",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "lateBonus",
              "type": "uint256"
            }
          ],
          "internalType": "struct TournamentCore.TimeDecayConfig",
          "name": "timeDecay",
          "type": "tuple"
        },
        {
          "internalType": "uint256",
          "name": "voterRewardBps",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "minVoteAmount",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "qfPrecision",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "maxVotesPerVoter",
          "type": "uint256"
        },
        {
          "internalType": "bool",
          "name": "allowSameProjectVote",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_tournamentId",
          "type": "uint256"
        }
      ],
      "name": "getTournamentProjects",
      "outputs": [
        {
          "internalType": "uint256[]",
          "name": "",
          "type": "uint256[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_tournamentId",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "_voter",
          "type": "address"
        }
      ],
      "name": "getUnclaimedRewards",
      "outputs": [
        {
          "internalType": "uint256[]",
          "name": "stages",
          "type": "uint256[]"
        },
        {
          "internalType": "uint256[]",
          "name": "amounts",
          "type": "uint256[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_tournamentId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_stageNumber",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "_voter",
          "type": "address"
        }
      ],
      "name": "getVoterAllVotesInStage",
      "outputs": [
        {
          "internalType": "uint256[]",
          "name": "projectIds",
          "type": "uint256[]"
        },
        {
          "internalType": "uint256[]",
          "name": "powers",
          "type": "uint256[]"
        },
        {
          "internalType": "address[]",
          "name": "tokens",
          "type": "address[]"
        },
        {
          "internalType": "uint256[]",
          "name": "amounts",
          "type": "uint256[]"
        },
        {
          "internalType": "uint256[]",
          "name": "timestamps",
          "type": "uint256[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_tournamentId",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "_voter",
          "type": "address"
        }
      ],
      "name": "getVoterHistory",
      "outputs": [
        {
          "internalType": "uint256[]",
          "name": "stages",
          "type": "uint256[]"
        },
        {
          "internalType": "uint256[][]",
          "name": "projectIdsPerStage",
          "type": "uint256[][]"
        },
        {
          "internalType": "uint256[][]",
          "name": "powersPerStage",
          "type": "uint256[][]"
        },
        {
          "internalType": "uint256[]",
          "name": "totalPowerPerStage",
          "type": "uint256[]"
        },
        {
          "internalType": "uint256[]",
          "name": "voteCountsPerStage",
          "type": "uint256[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_tournamentId",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "_voter",
          "type": "address"
        }
      ],
      "name": "getVoterLoyaltyStages",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_tournamentId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_stageNumber",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "_voter",
          "type": "address"
        }
      ],
      "name": "getVoterPendingReward",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_tournamentId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_stageNumber",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "_voter",
          "type": "address"
        }
      ],
      "name": "getVoterVoteCount",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_tournamentId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_stageNumber",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_projectId",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "_voter",
          "type": "address"
        }
      ],
      "name": "getVoterVoteInStage",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "projectId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "power",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "token",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_tournamentId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_stageNumber",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_projectId",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "_voter",
          "type": "address"
        }
      ],
      "name": "hasVoted",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_tournamentId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_stageNumber",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "_voter",
          "type": "address"
        }
      ],
      "name": "hasVotedInStage",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "nextTournamentId",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_tournamentId",
          "type": "uint256"
        }
      ],
      "name": "pauseTournament",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "paused",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "projectPowerPerStage",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "projectStatus",
      "outputs": [
        {
          "internalType": "bool",
          "name": "approved",
          "type": "bool"
        },
        {
          "internalType": "bool",
          "name": "disqualified",
          "type": "bool"
        },
        {
          "internalType": "bool",
          "name": "eliminated",
          "type": "bool"
        },
        {
          "internalType": "uint256",
          "name": "approvedAt",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "eliminatedAt",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "eliminatedInStage",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "disqualificationReason",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_tournamentId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_projectId",
          "type": "uint256"
        }
      ],
      "name": "removeProject",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_tournamentId",
          "type": "uint256"
        },
        {
          "internalType": "uint256[]",
          "name": "_projectIds",
          "type": "uint256[]"
        }
      ],
      "name": "removeProjectsBatch",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_tournamentId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_scheduledStart",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_eliminationPercentage",
          "type": "uint256"
        }
      ],
      "name": "scheduleNextStage",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "sovseas",
      "outputs": [
        {
          "internalType": "contract ISovereignSeas",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_tournamentId",
          "type": "uint256"
        }
      ],
      "name": "startNextStageManually",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_tournamentId",
          "type": "uint256"
        }
      ],
      "name": "startScheduledStage",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_tournamentId",
          "type": "uint256"
        }
      ],
      "name": "startTournament",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "tournamentProjects",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "tournamentStages",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "stageNumber",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "start",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "end",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "scheduledStart",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "rewardPool",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "eliminationPercentage",
          "type": "uint256"
        },
        {
          "internalType": "bool",
          "name": "finalized",
          "type": "bool"
        },
        {
          "internalType": "bool",
          "name": "started",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "tournamentVoterStats",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "totalPowerUsed",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "totalVotes",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "uniqueProjectsVoted",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "tournaments",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "id",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "admin",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "sovseasCampaignId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "stageDuration",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "payoutToken",
          "type": "address"
        },
        {
          "internalType": "bool",
          "name": "autoProgress",
          "type": "bool"
        },
        {
          "internalType": "bool",
          "name": "active",
          "type": "bool"
        },
        {
          "internalType": "bool",
          "name": "disqualifyEnabled",
          "type": "bool"
        },
        {
          "internalType": "uint256",
          "name": "createdAt",
          "type": "uint256"
        },
        {
          "components": [
            {
              "components": [
                {
                  "internalType": "uint256",
                  "name": "amountWeight",
                  "type": "uint256"
                },
                {
                  "internalType": "uint256",
                  "name": "timeWeight",
                  "type": "uint256"
                },
                {
                  "internalType": "uint256",
                  "name": "uniquenessWeight",
                  "type": "uint256"
                }
              ],
              "internalType": "struct TournamentCore.PowerWeights",
              "name": "powerWeights",
              "type": "tuple"
            },
            {
              "components": [
                {
                  "internalType": "uint256",
                  "name": "firstVote",
                  "type": "uint256"
                },
                {
                  "internalType": "uint256",
                  "name": "secondVote",
                  "type": "uint256"
                },
                {
                  "internalType": "uint256",
                  "name": "thirdVote",
                  "type": "uint256"
                },
                {
                  "internalType": "uint256",
                  "name": "fourthVote",
                  "type": "uint256"
                },
                {
                  "internalType": "uint256",
                  "name": "floorVote",
                  "type": "uint256"
                }
              ],
              "internalType": "struct TournamentCore.DiminishingConfig",
              "name": "diminishing",
              "type": "tuple"
            },
            {
              "components": [
                {
                  "internalType": "uint256",
                  "name": "earlyBonus",
                  "type": "uint256"
                },
                {
                  "internalType": "uint256",
                  "name": "midEarlyBonus",
                  "type": "uint256"
                },
                {
                  "internalType": "uint256",
                  "name": "midLateBonus",
                  "type": "uint256"
                },
                {
                  "internalType": "uint256",
                  "name": "lateBonus",
                  "type": "uint256"
                }
              ],
              "internalType": "struct TournamentCore.TimeDecayConfig",
              "name": "timeDecay",
              "type": "tuple"
            },
            {
              "internalType": "uint256",
              "name": "voterRewardBps",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "minVoteAmount",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "qfPrecision",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "maxVotesPerVoter",
              "type": "uint256"
            },
            {
              "internalType": "bool",
              "name": "allowSameProjectVote",
              "type": "bool"
            }
          ],
          "internalType": "struct TournamentCore.TournamentConfig",
          "name": "config",
          "type": "tuple"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_tournamentId",
          "type": "uint256"
        }
      ],
      "name": "unpauseTournament",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_tournamentId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_projectId",
          "type": "uint256"
        }
      ],
      "name": "voteWithCelo",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_tournamentId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_projectId",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "_token",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "_amount",
          "type": "uint256"
        }
      ],
      "name": "voteWithToken",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "voterLoyaltyStages",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "voterRewardClaimed",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "voterStagePower",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "voterToProjectIds",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "voterVoteCount",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "votes",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "projectId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "power",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "token",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "stateMutability": "payable",
      "type": "receive"
    }
  ]