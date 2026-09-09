# Lite Voice

A public proposal and on-chain community signaling interface for the LitVM LiteForge testnet.

## Testnet lifecycle notice

> **Lite Voice is a testnet-only project.** It was created solely for learning and contributing to the LitVM LiteForge testnet. When LitVM mainnet becomes active, the hosted application will be shut down and this repository will be archived as a historical testnet contribution. The current contract and its data will not be migrated to mainnet.

## Purpose

Lite Voice is an independent learning and ecosystem contribution. It is not official LitVM governance and does not control protocol upgrades, treasury funds, or production contracts.

The interface includes an ownerless Solidity signaling contract. Once the deployed address is configured, proposal creation and voting are real LitVM transactions; proposal lists and results are read directly from the contract.

## Features

- Browse active, passed, and rejected public proposals
- Inspect vote totals and proposal context
- Connect an EVM wallet and switch to LitVM LiteForge
- Publish proposals on-chain with a fixed 72-hour voting window
- Cast For, Against, and Abstain transactions
- Enforce one vote per wallet per proposal in the contract
- Responsive brutalist-editorial interface
- Accessible focus states and reduced-motion support
- Vercel SPA rewrite configuration

## Network

- Network: LitVM LiteForge
- Chain ID: 4441
- Native asset: zkLTC
- RPC: https://liteforge.rpc.caldera.xyz/http
- Explorer: https://liteforge.explorer.caldera.xyz
- LiteVoice contract: https://liteforge.explorer.caldera.xyz/address/0x09ff4b456ffe359c005e536aef4a9343a0198395

## Deploy the contract

1. Open `contracts/LiteVoice.sol` in Remix.
2. Compile with Solidity `0.8.24` or a compatible `0.8.x` compiler.
3. Connect the injected wallet to LitVM LiteForge.
4. Deploy `LiteVoice` (the constructor requires no arguments).
5. The current testnet deployment is configured by default. To override it after a redeploy, place the new address in `.env.local`:

```bash
VITE_LITEVOICE_ADDRESS=0xYourDeployedContract
```

Never commit a private key. The frontend only needs the public contract address.

## Run locally

```bash
npm install
npm run dev
```

Open the URL shown by Vite, normally `http://localhost:5173`.

## Verify

```bash
npm run check
npm run build
```

## Roadmap

1. Verify the deployed signaling contract on the LiteForge explorer.
2. Add event indexing and direct transaction links.
3. Add pagination for large proposal histories.
4. Add snapshot-safe eligibility rules if token-weighted voting is introduced.

## AI-assisted disclosure

This project is built with AI-assisted development under human direction, testing, and product decisions.
