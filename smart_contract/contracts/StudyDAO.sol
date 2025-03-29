// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract StudyDAO {
    struct Member {
        uint reputation;
        bool isTeacher;
        bool isStudent;
        uint256 tokensEarned;
    }

    struct Proposal {
        uint id;
        string description;
        uint256 votes;
        uint256 fundsRaised;
        uint256 goal;
        address proposer;
        bool approved;
        bool fundingCompleted;  // New flag to track if the funding is completed
    }

    struct Resource {
        uint id;
        string resourceURI;
    }

    mapping(address => Member) public members;
    Proposal[] public proposals;
    mapping(address => Resource[]) public studentResources;

    uint256 public courseCompletionReward = 10;
      uint256 public voteReward = 2; 
    uint256 public resourceContributionReward = 5;

    // Events
    event MemberRegistered(address indexed member, bool isTeacher);
    event ProposalCreated(uint indexed proposalId, address indexed proposer, string description, uint256 goal);
    event Voted(uint indexed proposalId, address indexed voter, uint256 votes);
    event ProposalFunded(uint indexed proposalId, address indexed funder, uint256 amount);
    event FundingCompleted(uint indexed proposalId, uint256 totalFundsRaised);
    event TokensAwarded(address indexed member, uint256 amount); 
    event ReputationBoosted(address indexed member, uint newReputation);

    // Register member as teacher or student
    function registerMember(bool isTeacher) public {
        require(members[msg.sender].reputation == 0, "Member is already registered.");

        members[msg.sender] = Member({
            reputation: 1,
            isTeacher: isTeacher,
            isStudent: !isTeacher,
            tokensEarned: 0
        });

        emit MemberRegistered(msg.sender, isTeacher);
    }

    // Propose content (only teachers can propose)
    function proposeContent(string memory _description, uint256 _goal) public {
        require(members[msg.sender].isTeacher, "Only teachers can propose content.");

        proposals.push(Proposal({
            id: proposals.length,
            description: _description,
            votes: 0,
            fundsRaised: 0,
            goal: _goal,
            proposer: msg.sender,
            approved: false,
            fundingCompleted: false // Initially, funding is not complete
        }));

        emit ProposalCreated(proposals.length - 1, msg.sender, _description, _goal);
    }

    // Vote for a proposal (students and teachers can vote)
    function voteForProposal(uint _proposalId) public {
        require(_proposalId < proposals.length, "Invalid proposal ID.");
        Proposal storage proposal = proposals[_proposalId];
        require(!proposal.approved, "Proposal already approved.");

        proposal.votes += members[msg.sender].reputation;
        emit Voted(_proposalId, msg.sender, members[msg.sender].reputation);
        
        members[msg.sender].tokensEarned += voteReward;
        if (proposal.votes > 3) proposal.approved = true;
    }

    // Fund an approved proposal
    function fundProposal(uint _proposalId) public payable {
        require(_proposalId < proposals.length, "Invalid proposal ID.");
        Proposal storage proposal = proposals[_proposalId];
        require(proposal.approved, "Proposal not approved yet.");
        require(!proposal.fundingCompleted, "Funding already completed for this proposal.");

        proposal.fundsRaised += msg.value;
        emit ProposalFunded(_proposalId, msg.sender, msg.value);

        // Check if funding goal has been met
        if (proposal.fundsRaised >= proposal.goal) {
            proposal.fundingCompleted = true;  // Mark funding as completed
            uint256 amount = proposal.fundsRaised;
            proposal.fundsRaised = 0;  // Optionally reset fundsRaised, or you can keep the amount for future reference
            payable(proposal.proposer).transfer(amount);
            emit FundingCompleted(_proposalId, amount);  // Emit event indicating funding is complete
        }
    }

    // Students save their resources (e.g., course documents)
    function saveResource(string memory _resourceURI) public {
        require(members[msg.sender].isStudent, "Only students can save resources.");

        studentResources[msg.sender].push(Resource({
            id: studentResources[msg.sender].length,
            resourceURI: _resourceURI
        }));

        members[msg.sender].tokensEarned += resourceContributionReward;
        emit TokensAwarded(msg.sender, resourceContributionReward);
    }

    // Get all resources saved by the student
    function getResources() public view returns (Resource[] memory) {
        return studentResources[msg.sender];
    }

    // Mark a course as completed for a student and reward tokens
    function completeCourse() public {
        require(members[msg.sender].isStudent, "Only students can complete courses.");
        members[msg.sender].tokensEarned += courseCompletionReward;
         emit TokensAwarded(msg.sender, courseCompletionReward);
    }

    // Get tokens earned by a student
    function getTokensEarned() public view returns (uint256) {
        return members[msg.sender].tokensEarned;
    }

    function boostReputation(address _member) public {
        require(members[_member].reputation > 0, "Member must be registered.");
        members[_member].reputation += 1; // Increase reputation
        emit ReputationBoosted(_member, members[_member].reputation);
    }

    // Get all proposals
    function getProposals() public view returns (Proposal[] memory) {
        return proposals;
    }
}
