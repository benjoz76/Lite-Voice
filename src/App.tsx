import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createWalletClient, custom } from 'viem';
import { liteForge, liteVoiceAbi, liteVoiceAddress, publicClient } from './contracts/liteVoice';

type VoteChoice = 'for' | 'against' | 'abstain';
type ProposalStatus = 'active' | 'passed' | 'rejected';
type Filter = 'all' | ProposalStatus;

type Proposal = {
  id: string;
  number: number;
  title: string;
  summary: string;
  body: string;
  author: string;
  category: string;
  createdAt: number;
  closesAt: number;
  status: ProposalStatus;
  votes: Record<VoteChoice, number>;
};

const HOUR = 60 * 60 * 1000;

const seedProposals = (): Proposal[] => [
  {
    id: 'LV-004',
    number: 4,
    title: 'Publish a monthly public testnet health report',
    summary: 'Create a recurring, community-readable record of uptime, RPC quality, and builder friction.',
    body: 'This signal asks LitVM builders whether a compact monthly report should document network availability, RPC response quality, recurring developer issues, and resolved incidents. The report would be informational and maintained by volunteer contributors.',
    author: '0x71A8…90D2',
    category: 'ECOSYSTEM',
    createdAt: Date.now() - 8 * HOUR,
    closesAt: Date.now() + 64 * HOUR,
    status: 'active',
    votes: { for: 184, against: 23, abstain: 16 },
  },
  {
    id: 'LV-003',
    number: 3,
    title: 'Standardize testnet dApp status labels',
    summary: 'Use a shared vocabulary for experimental, live, paused, and archived community applications.',
    body: 'Builders currently describe project status in different ways. This proposal measures support for four shared public labels: Experimental, Live Testnet, Paused, and Archived. It does not impose requirements on independent projects.',
    author: '0xB840…118A',
    category: 'BUILDERS',
    createdAt: Date.now() - 31 * HOUR,
    closesAt: Date.now() + 41 * HOUR,
    status: 'active',
    votes: { for: 121, against: 48, abstain: 9 },
  },
  {
    id: 'LV-002',
    number: 2,
    title: 'Create a public directory for non-DeFi experiments',
    summary: 'Make storage, identity, gaming, governance, and public-goods projects easier to discover.',
    body: 'This temperature check asked whether the ecosystem should maintain a curated directory focused on experiments outside swaps and lending. The directory would remain open-source and accept community submissions.',
    author: '0x09CC…F317',
    category: 'DISCOVERY',
    createdAt: Date.now() - 120 * HOUR,
    closesAt: Date.now() - 48 * HOUR,
    status: 'passed',
    votes: { for: 302, against: 41, abstain: 28 },
  },
  {
    id: 'LV-001',
    number: 1,
    title: 'Extend the community faucet cooldown',
    summary: 'A rejected signal proposing a longer cooldown during periods of high testnet demand.',
    body: 'The proposal suggested extending the community faucet cooldown to reduce repeat requests during peak demand. Voters preferred retaining the existing behavior.',
    author: '0xD310…A4C2',
    category: 'TESTNET',
    createdAt: Date.now() - 168 * HOUR,
    closesAt: Date.now() - 96 * HOUR,
    status: 'rejected',
    votes: { for: 73, against: 119, abstain: 14 },
  },
];

const chain = {
  id: '0x1159',
  name: 'LitVM LiteForge',
  rpcUrl: 'https://liteforge.rpc.caldera.xyz/http',
  explorer: 'https://liteforge.explorer.caldera.xyz',
};

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function formatRemaining(closesAt: number, now: number) {
  const remaining = closesAt - now;
  if (remaining <= 0) return 'CLOSED';
  const hours = Math.floor(remaining / HOUR);
  const minutes = Math.floor((remaining % HOUR) / 60000);
  return `${hours}H ${minutes}M LEFT`;
}

function totalVotes(proposal: Proposal) {
  return proposal.votes.for + proposal.votes.against + proposal.votes.abstain;
}

function VoteBar({ proposal }: { proposal: Proposal }) {
  const total = totalVotes(proposal);
  const value = total ? (proposal.votes.for / total) * 100 : 0;
  return (
    <div className="vote-meter" aria-label={`${value.toFixed(0)} percent voting for`}>
      <span style={{ width: `${value}%` }} />
    </div>
  );
}

function App() {
  const [proposals, setProposals] = useState(seedProposals);
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedId, setSelectedId] = useState('LV-004');
  const [account, setAccount] = useState('');
  const [now, setNow] = useState(Date.now());
  const [createOpen, setCreateOpen] = useState(false);
  const [pendingVote, setPendingVote] = useState<VoteChoice | null>(null);
  const [voted, setVoted] = useState<Record<string, VoteChoice>>(() => {
    try {
      return JSON.parse(localStorage.getItem('litevoice-demo-votes') ?? '{}') as Record<string, VoteChoice>;
    } catch {
      return {};
    }
  });
  const [notice, setNotice] = useState<{ tone: 'info' | 'success' | 'error'; text: string } | null>(null);
  const [txPending, setTxPending] = useState(false);

  async function refreshOnchainProposals() {
    if (!liteVoiceAddress) return;
    try {
      const count = await publicClient.readContract({
        address: liteVoiceAddress,
        abi: liteVoiceAbi,
        functionName: 'proposalCount',
      });
      const ids = Array.from({ length: Number(count) }, (_, index) => BigInt(index + 1)).reverse();
      const records = await Promise.all(ids.map(async (proposalId): Promise<Proposal> => {
        const result = await publicClient.readContract({
          address: liteVoiceAddress,
          abi: liteVoiceAbi,
          functionName: 'getProposal',
          args: [proposalId],
        });
        const [proposer, title, summary, category, createdAt, deadline, forVotes, againstVotes, abstainVotes] = result;
        const closesAt = Number(deadline) * 1000;
        const status: ProposalStatus = Date.now() < closesAt
          ? 'active'
          : forVotes > againstVotes ? 'passed' : 'rejected';
        const number = Number(proposalId);
        return {
          id: `LV-${String(number).padStart(3, '0')}`,
          number,
          title,
          summary,
          body: summary,
          author: shortAddress(proposer),
          category,
          createdAt: Number(createdAt) * 1000,
          closesAt,
          status,
          votes: {
            for: Number(forVotes),
            against: Number(againstVotes),
            abstain: Number(abstainVotes),
          },
        };
      }));
      setProposals(records);
      setSelectedId((current) => records.some((proposal) => proposal.id === current)
        ? current
        : records[0]?.id ?? '');
    } catch (error) {
      setNotice({
        tone: 'error',
        text: error instanceof Error ? `Contract read failed: ${error.message}` : 'Contract read failed.',
      });
    }
  }

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    if (liteVoiceAddress) void refreshOnchainProposals();
    return () => window.clearInterval(timer);
  }, []);

  const visible = useMemo(
    () => proposals.filter((proposal) => filter === 'all' || proposal.status === filter),
    [filter, proposals],
  );
  const selected = proposals.find((proposal) => proposal.id === selectedId) ?? proposals[0];

  async function connectWallet() {
    if (!window.ethereum) {
      setNotice({ tone: 'error', text: 'No EVM wallet found. Install MetaMask, Rabby, or another compatible wallet.' });
      return;
    }
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }) as string[];
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: chain.id }],
        });
      } catch (switchError) {
        const errorCode = (switchError as { code?: number }).code;
        if (errorCode !== 4902) throw switchError;
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: chain.id,
            chainName: chain.name,
            nativeCurrency: { name: 'zkLTC', symbol: 'zkLTC', decimals: 18 },
            rpcUrls: [chain.rpcUrl],
            blockExplorerUrls: [chain.explorer],
          }],
        });
      }
      setAccount(accounts[0] ?? '');
      setNotice({ tone: 'success', text: 'Wallet connected to LitVM LiteForge.' });
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Wallet connection was rejected.' });
    }
  }

  function chooseVote(choice: VoteChoice) {
    if (!account) {
      setNotice({ tone: 'info', text: 'Connect a wallet before casting a public signal.' });
      return;
    }
    if (!selected || selected.status !== 'active') return;
    if (voted[selected.id]) {
      setNotice({ tone: 'error', text: 'This wallet already voted on the selected proposal in this prototype.' });
      return;
    }
    setPendingVote(choice);
  }

  async function confirmVote() {
    if (!selected || !pendingVote || !account) return;
    if (!liteVoiceAddress || !window.ethereum) {
      setPendingVote(null);
      setNotice({ tone: 'error', text: 'Contract address is not configured. Set VITE_LITEVOICE_ADDRESS after deployment.' });
      return;
    }

    const choice = pendingVote;
    const choiceCode: Record<VoteChoice, number> = { for: 0, against: 1, abstain: 2 };
    setTxPending(true);
    try {
      const walletClient = createWalletClient({ chain: liteForge, transport: custom(window.ethereum as never) });
      const hash = await walletClient.writeContract({
        account: account as `0x${string}`,
        address: liteVoiceAddress,
        abi: liteVoiceAbi,
        functionName: 'vote',
        args: [BigInt(selected.number), choiceCode[choice]],
      });
      setNotice({ tone: 'info', text: `Vote submitted: ${hash.slice(0, 10)}… Waiting for confirmation.` });
      await publicClient.waitForTransactionReceipt({ hash });
      const next = { ...voted, [selected.id]: choice };
      setVoted(next);
      localStorage.setItem('litevoice-demo-votes', JSON.stringify(next));
      setPendingVote(null);
      await refreshOnchainProposals();
      setNotice({ tone: 'success', text: `Vote confirmed on LitVM: ${hash.slice(0, 10)}…` });
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Vote transaction failed.' });
    } finally {
      setTxPending(false);
    }
  }

  async function createProposal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!account) {
      setNotice({ tone: 'info', text: 'Connect a wallet before creating a proposal.' });
      return;
    }
    if (!liteVoiceAddress || !window.ethereum) {
      setNotice({ tone: 'error', text: 'Contract address is not configured. Set VITE_LITEVOICE_ADDRESS after deployment.' });
      return;
    }

    const data = new FormData(event.currentTarget);
    const title = String(data.get('title') ?? '').trim();
    const summary = String(data.get('summary') ?? '').trim();
    const category = String(data.get('category') ?? 'COMMUNITY').trim().toUpperCase();
    if (title.length < 12 || summary.length < 30) {
      setNotice({ tone: 'error', text: 'Use at least 12 characters for the title and 30 for the context.' });
      return;
    }

    setTxPending(true);
    try {
      const walletClient = createWalletClient({ chain: liteForge, transport: custom(window.ethereum as never) });
      const hash = await walletClient.writeContract({
        account: account as `0x${string}`,
        address: liteVoiceAddress,
        abi: liteVoiceAbi,
        functionName: 'createProposal',
        args: [title, summary, category],
      });
      setNotice({ tone: 'info', text: `Proposal submitted: ${hash.slice(0, 10)}… Waiting for confirmation.` });
      await publicClient.waitForTransactionReceipt({ hash });
      setCreateOpen(false);
      await refreshOnchainProposals();
      setNotice({ tone: 'success', text: `Proposal confirmed on LitVM: ${hash.slice(0, 10)}…` });
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Proposal transaction failed.' });
    } finally {
      setTxPending(false);
    }
  }

  return (
    <div className="site-shell">
      <a className="skip-link" href="#proposal-ledger">Skip to proposals</a>

      <header className="topbar">
        <a className="brand" href="#" aria-label="Lite Voice home">
          <span className="brand-mark">LV/</span>
          <span>
            <b>LITE VOICE</b>
            <small>PUBLIC SIGNAL ON LITVM</small>
          </span>
        </a>
        <div className="network-stamp">
          <i aria-hidden="true" />
          LITEFORGE / 4441
        </div>
        <button className="wallet-button" type="button" onClick={connectWallet}>
          {account ? shortAddress(account) : 'CONNECT WALLET'}
          <span aria-hidden="true">↗</span>
        </button>
      </header>

      <main>
        <section className="masthead" aria-labelledby="page-title">
          <div className="issue-label">
            <span>VOL. 01</span>
            <span>TESTNET EDITION</span>
          </div>
          <div className="masthead-copy">
            <p className="eyebrow">OPEN PROPOSALS. PUBLIC RESULTS.</p>
            <h1 id="page-title">A public record of what the community supports.</h1>
            <p className="intro">
              Create a signal, vote once, and leave a transparent result. Lite Voice is an independent
              testnet experiment—not official LitVM governance.
            </p>
          </div>
          <div className="masthead-action">
            <button className="primary-action" type="button" onClick={() => setCreateOpen(true)}>
              CREATE PROPOSAL <span>+</span>
            </button>
            <p>Every proposal remains open for exactly 72 hours.</p>
          </div>
        </section>

        <section className="ledger-summary" aria-label="Governance summary">
          <div><b>{proposals.length.toString().padStart(2, '0')}</b><span>PUBLIC PROPOSALS</span></div>
          <div><b>{proposals.filter((p) => p.status === 'active').length.toString().padStart(2, '0')}</b><span>OPEN NOW</span></div>
          <div><b>{proposals.reduce((sum, p) => sum + totalVotes(p), 0)}</b><span>SIGNALS CAST</span></div>
          <div className="summary-note"><span>RULE 01</span><b>ONE WALLET<br />ONE VOTE</b></div>
        </section>

        {notice && (
          <div className={`notice notice--${notice.tone}`} role="status">
            <span>{notice.text}</span>
            <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss notice">×</button>
          </div>
        )}

        <section className="governance-grid">
          <aside className="index-rail" aria-label="Proposal filters">
            <p className="rail-title">INDEX</p>
            {(['all', 'active', 'passed', 'rejected'] as Filter[]).map((item, index) => (
              <button
                key={item}
                type="button"
                className={filter === item ? 'active' : ''}
                onClick={() => setFilter(item)}
              >
                <span>0{index + 1}</span>{item}
                <b>{item === 'all' ? proposals.length : proposals.filter((p) => p.status === item).length}</b>
              </button>
            ))}
            <div className="rail-rule">
              <span>WINDOW</span>
              <b>72 HOURS</b>
              <span>NON-EXECUTABLE<br />TEMPERATURE CHECK</span>
            </div>
          </aside>

          <div className="proposal-ledger" id="proposal-ledger">
            <div className="ledger-head">
              <span>PROPOSAL / SUBJECT</span>
              <span>RESULT</span>
              <span>STATE</span>
            </div>
            {visible.length ? visible.map((proposal) => {
              const total = totalVotes(proposal);
              const approval = total ? Math.round((proposal.votes.for / total) * 100) : 0;
              return (
                <button
                  className={`proposal-row ${selected?.id === proposal.id ? 'selected' : ''}`}
                  type="button"
                  key={proposal.id}
                  onClick={() => { setSelectedId(proposal.id); setPendingVote(null); }}
                >
                  <span className="proposal-number">{String(proposal.number).padStart(2, '0')}</span>
                  <span className="proposal-copy">
                    <small>{proposal.category} / {proposal.id}</small>
                    <strong>{proposal.title}</strong>
                    <em>{proposal.summary}</em>
                  </span>
                  <span className="proposal-result">
                    <b>{approval}%</b>
                    <VoteBar proposal={proposal} />
                    <small>{total} VOTES</small>
                  </span>
                  <span className={`status status--${proposal.status}`}>
                    {proposal.status === 'active' ? formatRemaining(proposal.closesAt, now) : proposal.status}
                  </span>
                </button>
              );
            }) : (
              <div className="empty-state">
                <b>NO PROPOSALS IN THIS INDEX.</b>
                <span>Choose another state or create a new public signal.</span>
              </div>
            )}
          </div>

          {selected && (
            <aside className="ballot-panel" aria-label="Selected proposal">
              <div className="ballot-heading">
                <span>SELECTED BALLOT</span>
                <b>{selected.id}</b>
              </div>
              <p className="ballot-category">{selected.category}</p>
              <h2>{selected.title}</h2>
              <p className="ballot-body">{selected.body}</p>
              <dl>
                <div><dt>PROPOSED BY</dt><dd>{selected.author}</dd></div>
                <div><dt>VOTING WINDOW</dt><dd>{selected.status === 'active' ? formatRemaining(selected.closesAt, now) : 'CLOSED'}</dd></div>
                <div><dt>TOTAL SIGNALS</dt><dd>{totalVotes(selected)}</dd></div>
              </dl>

              <div className="tally">
                {(['for', 'against', 'abstain'] as VoteChoice[]).map((choice) => (
                  <div key={choice}>
                    <span>{choice}</span>
                    <b>{selected.votes[choice]}</b>
                  </div>
                ))}
              </div>

              {selected.status === 'active' ? (
                <div className="vote-actions">
                  <p>CAST YOUR SIGNAL</p>
                  <button type="button" onClick={() => chooseVote('for')}>FOR</button>
                  <button type="button" onClick={() => chooseVote('against')}>AGAINST</button>
                  <button type="button" onClick={() => chooseVote('abstain')}>ABSTAIN</button>
                  {voted[selected.id] && <small>RECORDED LOCALLY: {voted[selected.id].toUpperCase()}</small>}
                </div>
              ) : (
                <div className={`final-result final-result--${selected.status}`}>
                  FINAL RESULT / {selected.status.toUpperCase()}
                </div>
              )}
            </aside>
          )}
        </section>
      </main>

      <footer>
        <span>LITE VOICE / TESTNET CONTRIBUTION</span>
        <span>{liteVoiceAddress ? 'ON-CHAIN CONTRACT CONNECTED' : 'CONTRACT ADDRESS REQUIRED'}</span>
        <a href="https://docs.litvm.com/" target="_blank" rel="noreferrer">LITVM DOCS ↗</a>
      </footer>

      {createOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setCreateOpen(false)}>
          <section className="proposal-modal" role="dialog" aria-modal="true" aria-labelledby="create-title" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div><span>NEW PUBLIC SIGNAL</span><h2 id="create-title">Create proposal</h2></div>
              <button type="button" onClick={() => setCreateOpen(false)} aria-label="Close dialog">×</button>
            </div>
            <form onSubmit={createProposal}>
              <label>
                <span>01 / TITLE</span>
                <input name="title" minLength={12} maxLength={100} placeholder="State one clear decision" required />
                <small>12–100 characters. Avoid promotional language.</small>
              </label>
              <label>
                <span>02 / CONTEXT</span>
                <textarea name="summary" minLength={30} maxLength={560} rows={6} placeholder="Explain what the community is deciding and why it matters." required />
                <small>Public and permanent once a contract is connected.</small>
              </label>
              <label>
                <span>03 / CATEGORY</span>
                <select name="category" defaultValue="ECOSYSTEM">
                  <option>ECOSYSTEM</option>
                  <option>BUILDERS</option>
                  <option>TESTNET</option>
                  <option>PUBLIC GOODS</option>
                  <option>OTHER</option>
                </select>
              </label>
              <div className="fixed-rule"><span>VOTING PERIOD</span><b>72 HOURS / FIXED</b></div>
              <button className="primary-action" type="submit" disabled={txPending}>{txPending ? 'WAITING FOR WALLET…' : 'PUBLISH ON-CHAIN'} <span>↗</span></button>
              <p className="form-note">Publishing creates a LitVM transaction and requires zkLTC for gas.</p>
            </form>
          </section>
        </div>
      )}

      {pendingVote && selected && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setPendingVote(null)}>
          <section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title" onMouseDown={(e) => e.stopPropagation()}>
            <span className="eyebrow">FINAL CHECK / {selected.id}</span>
            <h2 id="confirm-title">Signal “{pendingVote.toUpperCase()}”?</h2>
            <p>A wallet can only vote once. Confirming will request a LitVM transaction and requires zkLTC for gas.</p>
            <div>
              <button type="button" onClick={() => setPendingVote(null)}>CANCEL</button>
              <button className="primary-action" type="button" onClick={confirmVote} disabled={txPending}>{txPending ? 'CONFIRMING…' : 'CONFIRM SIGNAL'} <span>↗</span></button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
