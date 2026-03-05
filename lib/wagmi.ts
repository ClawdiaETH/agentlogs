import { createConfig, http } from 'wagmi';
import { base } from 'wagmi/chains';
import { injected, coinbaseWallet, walletConnect } from 'wagmi/connectors';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? '';

export const config = createConfig({
  chains: [base],
  connectors: [
    injected(),
    coinbaseWallet({ appName: 'agentsea' }),
    ...(projectId
      ? [walletConnect({ projectId, showQrModal: true })]
      : []),
  ],
  transports: {
    [base.id]: http(
      process.env.NEXT_PUBLIC_BASE_RPC || 'https://mainnet.base.org',
    ),
  },
});
