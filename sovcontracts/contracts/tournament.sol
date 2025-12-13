// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./TournamentVoting.sol";

/*//////////////////////////////////////////////////////////////
                    TOURNAMENT CONTRACT
                    (Main entry point - inherits from TournamentVoting)
//////////////////////////////////////////////////////////////*/

contract SovereignTournament is TournamentVoting {
    constructor(address _sovseas, address _baseToken) TournamentVoting(_sovseas, _baseToken) {}
}
