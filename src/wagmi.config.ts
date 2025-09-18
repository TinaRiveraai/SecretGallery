import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'Secret Gallery',
  projectId: '2f05a5a76eeb95b8a5c4d1c8d456c4f3', // 临时项目ID，实际项目中需要从WalletConnect获取
  chains: [sepolia],
  ssr: false,
});