// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Lite Voice
/// @notice Ownerless, non-executable community signaling for the LitVM testnet.
/// @dev Proposals are fixed to a 72-hour window. Results do not control funds or contracts.
contract LiteVoice {
    uint64 public constant VOTING_PERIOD = 3 days;
    uint256 public proposalCount;

    enum VoteChoice {
        For,
        Against,
        Abstain
    }

    struct Proposal {
        address proposer;
        string title;
        string summary;
        string category;
        uint64 createdAt;
        uint64 deadline;
        uint64 forVotes;
        uint64 againstVotes;
        uint64 abstainVotes;
    }

    mapping(uint256 => Proposal) private proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    error EmptyField();
    error InvalidLength();
    error ProposalNotFound();
    error VotingClosed();
    error AlreadyVoted();
    error InvalidChoice();

    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        string title,
        string category,
        uint64 deadline
    );
    event VoteCast(uint256 indexed proposalId, address indexed voter, VoteChoice choice);

    function createProposal(
        string calldata title,
        string calldata summary,
        string calldata category
    ) external returns (uint256 proposalId) {
        uint256 titleLength = bytes(title).length;
        uint256 summaryLength = bytes(summary).length;
        uint256 categoryLength = bytes(category).length;

        if (titleLength == 0 || summaryLength == 0 || categoryLength == 0) revert EmptyField();
        if (titleLength > 120 || summaryLength > 1_000 || categoryLength > 32) revert InvalidLength();

        proposalId = ++proposalCount;
        uint64 createdAt = uint64(block.timestamp);
        uint64 deadline = createdAt + VOTING_PERIOD;

        proposals[proposalId] = Proposal({
            proposer: msg.sender,
            title: title,
            summary: summary,
            category: category,
            createdAt: createdAt,
            deadline: deadline,
            forVotes: 0,
            againstVotes: 0,
            abstainVotes: 0
        });

        emit ProposalCreated(proposalId, msg.sender, title, category, deadline);
    }

    function vote(uint256 proposalId, uint8 choice) external {
        Proposal storage proposal = proposals[proposalId];
        if (proposal.proposer == address(0)) revert ProposalNotFound();
        if (block.timestamp >= proposal.deadline) revert VotingClosed();
        if (hasVoted[proposalId][msg.sender]) revert AlreadyVoted();
        if (choice > uint8(VoteChoice.Abstain)) revert InvalidChoice();

        hasVoted[proposalId][msg.sender] = true;

        if (choice == uint8(VoteChoice.For)) {
            ++proposal.forVotes;
        } else if (choice == uint8(VoteChoice.Against)) {
            ++proposal.againstVotes;
        } else {
            ++proposal.abstainVotes;
        }

        emit VoteCast(proposalId, msg.sender, VoteChoice(choice));
    }

    function getProposal(uint256 proposalId)
        external
        view
        returns (
            address proposer,
            string memory title,
            string memory summary,
            string memory category,
            uint64 createdAt,
            uint64 deadline,
            uint64 forVotes,
            uint64 againstVotes,
            uint64 abstainVotes
        )
    {
        Proposal storage proposal = proposals[proposalId];
        if (proposal.proposer == address(0)) revert ProposalNotFound();

        return (
            proposal.proposer,
            proposal.title,
            proposal.summary,
            proposal.category,
            proposal.createdAt,
            proposal.deadline,
            proposal.forVotes,
            proposal.againstVotes,
            proposal.abstainVotes
        );
    }
}
