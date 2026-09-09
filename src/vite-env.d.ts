/// <reference types="vite/client" />

interface EthereumProvider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on?(event: string, listener: (...args: unknown[]) => void): void;
  removeListener?(event: string, listener: (...args: unknown[]) => void): void;
}

interface Window {
  ethereum?: EthereumProvider;
}

interface ImportMetaEnv {
  readonly VITE_LITEVOICE_ADDRESS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
