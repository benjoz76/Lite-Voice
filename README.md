# Lite Voice

A public proposal and on-chain community signaling interface for the LitVM LiteForge testnet.

## Purpose

Lite Voice is an independent learning and ecosystem contribution. It is not official LitVM governance and does not control protocol upgrades, treasury funds, or production contracts.

The current build is an interactive frontend prototype. Wallet connection and LitVM network switching are functional; proposal creation and voting are intentionally stored only in the browser until an audited contract address and ABI are configured.

## Features

- Browse active, passed, and rejected public proposals
- Inspect vote totals and proposal context
- Connect an EVM wallet and switch to LitVM LiteForge
- Draft proposals with a fixed 72-hour voting window
- Test For, Against, and Abstain voting states
- Responsive brutalist-editorial interface
- Accessible focus states and reduced-motion support
- Vercel SPA rewrite configuration

## Network

- Network: LitVM LiteForge
- Chain ID: 4441
- Native asset: zkLTC
- RPC: https://liteforge.rpc.caldera.xyz/http
- Explorer: https://liteforge.explorer.caldera.xyz

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

1. Deploy and verify a minimal signaling contract.
2. Replace local demo writes with contract reads and wallet transactions.
3. Add event indexing and transaction links.
4. Add snapshot-safe eligibility rules if token-weighted voting is introduced.

## AI-assisted disclosure

This project is built with AI-assisted development under human direction, testing, and product decisions.
