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
        uint256 milestonesCompleted;
        uint256 totalMilestones;
        mapping(uint256 => bool) milestoneVerified;
    }

    struct Resource {
        uint id;
        string resourceURI;
    }

    mapping(address => Member) public members;
    Proposal[] public proposals;
    mapping(address => Resource[]) public studentResources;

    uint256 public courseCompletionReward = 10;

    // Events
    event MemberRegistered(address indexed member, bool isTeacher);
    event ProposalCreated(uint indexed proposalId, address indexed proposer, string description, uint256 goal);
    event Voted(uint indexed proposalId, address indexed voter, uint256 votes);
    event ProposalFunded(uint indexed proposalId, address indexed funder, uint256 amount);
    event FundingCompleted(uint indexed proposalId, uint256 totalFundsRaised);
    event MilestoneVerified(uint indexed proposalId, uint256 milestoneNumber);
     event FundsWithdrawn(uint indexed proposalId, uint256 milestoneNumber, uint256 amount);
    event Refunded(uint indexed proposalId, address indexed funder, uint256 amount);

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
    function proposeContent(string memory _description, uint256 _goal,uint256 _totalMilestones) public {
        require(members[msg.sender].isTeacher, "Only teachers can propose content.");
        require(_totalMilestones > 0, "Milestones must be greater than zero.");

         uint256 proposalId = proposals.length;
        proposals.push();
        Proposal storage newProposal = proposals[proposalId];
        
        newProposal.id = proposalId;
        newProposal.description = _description;
        newProposal.goal = _goal;
        newProposal.proposer = msg.sender;
        newProposal.totalMilestones = _totalMilestones;

        emit ProposalCreated(proposals.length - 1, msg.sender, _description, _goal);
    }

    // Vote for a proposal (students and teachers can vote)
    function voteForProposal(uint _proposalId) public {
        require(_proposalId < proposals.length, "Invalid proposal ID.");
        Proposal storage proposal = proposals[_proposalId];
        require(!proposal.approved, "Proposal already approved.");

        proposal.votes += members[msg.sender].reputation;
        emit Voted(_proposalId, msg.sender, members[msg.sender].reputation);

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

     function verifyMilestone(uint _proposalId, uint256 _milestoneNumber) public {
        require(_proposalId < proposals.length, "Invalid proposal ID.");
        Proposal storage proposal = proposals[_proposalId];
        require(msg.sender == proposal.proposer || members[msg.sender].reputation > 1, "Not authorized");
        require(_milestoneNumber <= proposal.totalMilestones, "Invalid milestone number");
        require(_milestoneNumber == proposal.milestonesCompleted + 1, "Can only verify next milestone");
         proposal.milestoneVerified[_milestoneNumber] = true;
        emit MilestoneVerified(_proposalId, _milestoneNumber);
    }

     function withdrawMilestoneFunds(uint _proposalId) public {
        require(_proposalId < proposals.length, "Invalid proposal ID.");
        Proposal storage proposal = proposals[_proposalId];
        require(msg.sender == proposal.proposer, "Only proposer can withdraw funds");
        require(proposal.fundingCompleted, "Funding not completed");
        require(proposal.milestonesCompleted < proposal.totalMilestones, "All milestones completed");
        
        uint256 nextMilestone = proposal.milestonesCompleted + 1;
        require(proposal.milestoneVerified[nextMilestone], "Milestone not verified");
        
        uint256 amountPerMilestone = proposal.goal / proposal.totalMilestones;
        require(proposal.fundsRaised >= amountPerMilestone, "Insufficient funds");
        
        proposal.milestonesCompleted = nextMilestone;
        proposal.fundsRaised -= amountPerMilestone;
        payable(proposal.proposer).transfer(amountPerMilestone);
        
        emit FundsWithdrawn(_proposalId, nextMilestone, amountPerMilestone);
    }

     function refundFunds(uint _proposalId) public {
        require(_proposalId < proposals.length, "Invalid proposal ID.");
        Proposal storage proposal = proposals[_proposalId];
        require(proposal.fundingCompleted, "Funding not completed");
        uint256 remainingFunds = proposal.fundsRaised;
        proposal.fundsRaised = 0;
        payable(msg.sender).transfer(remainingFunds);
        
        emit Refunded(_proposalId, msg.sender, remainingFunds);
    }


     function isProposalFullyFunded(uint _proposalId) public view returns (bool) {
        require(_proposalId < proposals.length, "Invalid proposal ID.");
        return proposals[_proposalId].milestonesCompleted >= proposals[_proposalId].totalMilestones 
        && proposals[_proposalId].fundsRaised >= proposals[_proposalId].goal;
    }

    // Students save their resources (e.g., course documents)
    function saveResource(string memory _resourceURI) public {
        require(members[msg.sender].isStudent, "Only students can save resources.");

        studentResources[msg.sender].push(Resource({
            id: studentResources[msg.sender].length,
            resourceURI: _resourceURI
        }));
    }

    // Get all resources saved by the student
    function getResources() public view returns (Resource[] memory) {
        return studentResources[msg.sender];
    }

    // Mark a course as completed for a student and reward tokens
    function completeCourse() public {
        require(members[msg.sender].isStudent, "Only students can complete courses.");
        members[msg.sender].tokensEarned += courseCompletionReward;
    }

    // Get tokens earned by a student
    function getTokensEarned() public view returns (uint256) {
        return members[msg.sender].tokensEarned;
    }

    // Get all proposals
    function getProposals() public view returns (Proposal[] memory) {
        return proposals;
    }
}
