import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'Secret Gallery',
  projectId: 'SECRET_GALLERY_PROJECT_ID', // 实际项目中需要从WalletConnect获取
  chains: [sepolia],
  ssr: false,
});