import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { WalletContext } from '../context/WalletContext';
import { ethers } from 'ethers';


function Proposals() {
  const { state, account } = useContext(WalletContext);
  const { contract } = state;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [timeRequired, setTimeRequired] = useState('');
  const [researchDocs, setResearchDocs] = useState(null);
  const [goal, setGoal] = useState('');
  const [isModalOpen, setModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [proposals, setProposals] = useState([]);
  const [votedProposals, setVotedProposals] = useState([]); // Track voted proposals

  // Handle file upload to IPFS
  const handleUploadToIpfs = async (e) => {
    e.preventDefault();
    const file = e.target.files[0];
    if (file) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await axios({
          method: 'post',
          url: 'https://api.pinata.cloud/pinning/pinFileToIPFS',
          data: formData,
          headers: {
            pinata_api_key: `35cb1bf7be19d2a8fa0d`,
            pinata_secret_api_key: `2c2e9e43bca7a619154cb48e8b060c5643ea6220d0b7c9deb565fa491b3b3a50`,
            'Content-Type': 'application/json',
          },
        });
        const resData = await res.data;
        setResearchDocs(`https://ipfs.io/ipfs/${resData.IpfsHash}`);
      } catch (error) {
        console.error('Error uploading file to IPFS', error);
      }
    }
  };

  // Create a proposal
  const createProposal = async (e) => {
    e.preventDefault();
    try {
      const data = JSON.stringify({ title, description, timeRequired, researchDocs });
      const res = await axios({
        method: 'post',
        url: 'https://api.pinata.cloud/pinning/pinJSONToIPFS',
        data: data,
        headers: {
          pinata_api_key: `35cb1bf7be19d2a8fa0d`,
          pinata_secret_api_key: `2c2e9e43bca7a619154cb48e8b060c5643ea6220d0b7c9deb565fa491b3b3a50`,
          'Content-Type': 'application/json',
        },
      });

      const resData = await res.data;
      const metadataUrl = `https://ipfs.io/ipfs/${resData.IpfsHash}`;
      const goalInWei = ethers.parseEther(goal.toString());

      // Call the smart contract to propose content
      await contract.proposeContent(metadataUrl, goalInWei);
      setModalOpen(false); // Close the modal after submission
    } catch (error) {
      console.error('Error creating proposal:', error);
    } finally {
      setUploading(false);
    }
  };

  // Fetch all proposals from the smart contract
  const fetchProposals = async () => {
    try {
      const proposalsData = await contract.getProposals();
      const parsedProposals = await Promise.all(
        proposalsData.map(async (proposal) => {
          const id = proposal[0].toString();
          const metadataUri = proposal[1];
          const votes = proposal[2].toString();
          const fundsRaised = ethers.formatEther(proposal[3]);
          const goal = ethers.formatEther(proposal[4]);
          const proposer = proposal[5];
          const approved = proposal[6];
          const fundingCompleted = proposal[7];

          let title = '';
          let details = '';
          let hours = '';
          let docs = '';

          try {
            const response = await fetch(metadataUri);
            const metadata = await response.json(); 
            title = metadata.title || 'No Title';
            details = metadata.description || 'No Details';
            hours = metadata.timeRequired || '0';
            docs = metadata.researchDocs || 'No Docs';
          } catch (error) {
            console.error(`Error fetching metadata for proposal ${id}:`, error);
          }

          return {
            id,
            metadataUri,
            votes,
            fundsRaised,
            goal,
            proposer,
            approved,
            fundingCompleted,
            title,
            details,
            hours,
            docs,
          };
        })
      );

      setProposals(parsedProposals);
      console.log(parsedProposals)
    } catch (error) {
      console.error('Error fetching proposals:', error);
    }
  };



  // Vote for a proposal
  const voteForProposal = async (id) => {
    try {
      await contract.voteForProposal(id);
      setVotedProposals((prevVoted) => [...prevVoted, id]); // Add to voted proposals
    } catch (error) {
      console.error('Error voting for proposal:', error);
    }
  };

  // Fetch proposals when contract is available
  useEffect(() => {
    if (contract) {
      fetchProposals();
    }
  }, []);

  return (
    <div className="p-4">
      {/* Button to open modal for creating proposals */}
      <button onClick={() => setModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded">
        Raise a Proposal
      </button>

      {/* Modal for creating a proposal */}
      {isModalOpen && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
    <div className="modal bg-white p-8 rounded-lg shadow-lg w-full max-w-lg mx-4">
      <div className="modal-content space-y-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Create Proposal</h2>
        <form onSubmit={createProposal} className="space-y-4">
          <div className="form-group">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Enter proposal title"
            />
          </div>
          <div className="form-group">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Provide a detailed description"
            />
          </div>
          <div className="form-group">
            <label htmlFor="timeRequired" className="block text-sm font-medium text-gray-700">Time Required (in hours)</label>
            <input
              type="number"
              id="timeRequired"
              value={timeRequired}
              onChange={(e) => setTimeRequired(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Enter time required"
            />
          </div>
          <div className="form-group">
            <label htmlFor="researchDocs" className="block text-sm font-medium text-gray-700">Upload Research Docs</label>
            <input
              type="file"
              id="researchDocs"
              accept="application/pdf"
              onChange={handleUploadToIpfs}
              className="mt-1 block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:border file:border-gray-300 file:rounded-md file:bg-green-600 file:text-white"
            />
          </div>
          <div className="form-group">
            <label htmlFor="goal" className="block text-sm font-medium text-gray-700">Goal (in ETH)</label>
            <input
              type="number"
              id="goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Enter proposal goal"
            />
          </div>
          <button
            type="submit"
            disabled={uploading}
            className="w-full mt-4 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Submit Proposal'}
          </button>
        </form>
      </div>
    </div>
  </div>
)}


<div className="proposals mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {proposals.length === 0 ? (
    <p className="text-gray-600 text-center col-span-full">No proposals available</p>
  ) : (
    proposals.map((proposal) => (
      <div
        key={proposal.id}
        className={`relative shadow-md rounded-lg p-6 transition-transform duration-200 hover:scale-105 hover:shadow-lg ${
          proposal.approved ? 'grayscale opacity-80' : ''
        }`}
        style={{ backgroundColor: proposal.approved ? '#f0f0f0' : '#fff' }}
      >
        {/* Watermark for approved proposals */}
        {proposal.approved && (
          <div className="absolute inset-0 flex justify-center items-center text-gray-500 text-2xl font-bold uppercase opacity-20 pointer-events-none">
            Approved
          </div>
        )}

        <h3 className="text-lg font-semibold text-gray-800 mb-2">{proposal.title}</h3>
        <p className="text-sm text-gray-600 mb-4">
          <strong>Description:</strong> {proposal.details}
        </p>
        <p className="text-sm text-gray-600">
          <strong>Time Required:</strong> {proposal.hours} hours
        </p>
        <p className="text-sm text-gray-600">
          <strong>Goal:</strong> {proposal.goal} ETH
        </p>
        <p className="text-sm text-gray-600">
          <strong>Funds Raised:</strong> {proposal.fundsRaised} ETH
        </p>
        <p className="text-sm text-gray-600">
          <strong>Proposer:</strong> {proposal.proposer}
        </p>
        <p className="text-sm text-gray-600 flex items-center">
          <strong>Research Documents:</strong>
          <a
            href={proposal.docs}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 text-blue-600 hover:text-blue-800"
            title="View Research Document"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 9V3.75a.75.75 0 00-.75-.75h-6a.75.75 0 00-.75.75V9M12 15v6m0 0l-3-3m3 3l3-3"
              />
            </svg>
          </a>
        </p>
        <p className="text-sm text-gray-600">
          <strong>Votes:</strong> {proposal.votes}
        </p>
        <div className="mt-4">
          {votedProposals.includes(proposal.id) ? (
            <button
              disabled
              className="w-full bg-gray-500 text-white px-4 py-2 rounded shadow-sm"
            >
              Already Voted
            </button>
          ) : (
            <button
              onClick={() => voteForProposal(proposal.id)}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded shadow-sm hover:bg-blue-700"
            >
              Vote
            </button>
          )}
        </div>
      </div>
    ))
  )}
</div>


    </div>
  );
}

export default Proposals;
