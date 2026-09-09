import { defineChain, getAddress, http, createPublicClient } from 'viem';

export const liteForge = defineChain({
  id: 4441,
  name: 'LitVM LiteForge',
  nativeCurrency: { name: 'zkLTC', symbol: 'zkLTC', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://liteforge.rpc.caldera.xyz/http'] },
  },
  blockExplorers: {
    default: { name: 'LiteForge Explorer', url: 'https://liteforge.explorer.caldera.xyz' },
  },
  testnet: true,
});

export const liteVoiceAbi = [
  {
    type: 'function',
    name: 'proposalCount',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'hasVoted',
    stateMutability: 'view',
    inputs: [
      { name: '', type: 'uint256' },
      { name: '', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'getProposal',
    stateMutability: 'view',
    inputs: [{ name: 'proposalId', type: 'uint256' }],
    outputs: [
      { name: 'proposer', type: 'address' },
      { name: 'title', type: 'string' },
      { name: 'summary', type: 'string' },
      { name: 'category', type: 'string' },
      { name: 'createdAt', type: 'uint64' },
      { name: 'deadline', type: 'uint64' },
      { name: 'forVotes', type: 'uint64' },
      { name: 'againstVotes', type: 'uint64' },
      { name: 'abstainVotes', type: 'uint64' },
    ],
  },
  {
    type: 'function',
    name: 'createProposal',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'title', type: 'string' },
      { name: 'summary', type: 'string' },
      { name: 'category', type: 'string' },
    ],
    outputs: [{ name: 'proposalId', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'vote',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'proposalId', type: 'uint256' },
      { name: 'choice', type: 'uint8' },
    ],
    outputs: [],
  },
  {
    type: 'event',
    name: 'ProposalCreated',
    anonymous: false,
    inputs: [
      { indexed: true, name: 'proposalId', type: 'uint256' },
      { indexed: true, name: 'proposer', type: 'address' },
      { indexed: false, name: 'title', type: 'string' },
      { indexed: false, name: 'category', type: 'string' },
      { indexed: false, name: 'deadline', type: 'uint64' },
    ],
  },
  {
    type: 'event',
    name: 'VoteCast',
    anonymous: false,
    inputs: [
      { indexed: true, name: 'proposalId', type: 'uint256' },
      { indexed: true, name: 'voter', type: 'address' },
      { indexed: false, name: 'choice', type: 'uint8' },
    ],
  },
] as const;

const configuredAddress = import.meta.env.VITE_LITEVOICE_ADDRESS?.trim();

export const liteVoiceAddress = configuredAddress
  ? getAddress(configuredAddress)
  : undefined;

export const publicClient = createPublicClient({
  chain: liteForge,
  transport: http(),
});
