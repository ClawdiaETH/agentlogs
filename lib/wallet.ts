type ConnectorLike = {
  type?: string;
};

export function pickPreferredConnector<T extends ConnectorLike>(
  connectors: readonly T[],
): T | undefined {
  const hasInjectedProvider =
    typeof window !== 'undefined' &&
    Boolean((window as Window & { ethereum?: unknown }).ethereum);

  // Prefer injected (MetaMask, Rabby, etc.) when a provider exists
  const injected = connectors.find(
    (connector) => connector.type === 'injected' && hasInjectedProvider,
  );
  if (injected) return injected;

  // Coinbase Wallet works on mobile via deep link — good default for Base
  const coinbase = connectors.find(
    (connector) => connector.type === 'coinbaseWallet',
  );
  if (coinbase) return coinbase;

  // WalletConnect as last resort
  const walletConnect = connectors.find(
    (connector) => connector.type === 'walletConnect',
  );
  return walletConnect;
}
