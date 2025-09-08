# 🔐 Secret Gallery

一个基于区块链的加密文件存储库，使用客户端加密 + IPFS存储 + Zama FHE合约。

## ✨ 项目特性

- 🔒 **客户端加密**: 使用AES-256对文件进行本地加密，密码采用EVM地址格式
- 🌐 **IPFS存储**: 加密后的文件上传到去中心化IPFS网络
- ⛓️ **FHE智能合约**: IPFS哈希转换为数字后与AES密码一起通过Zama FHE加密存储在链上
- 🤝 **权限控制**: 可以将加密的哈希和密码授权给其他地址

## 🛠️ 技术栈

### 合约部分
- **框架**: Hardhat
- **FHE**: Zama FHE v0.7.0 
- **测试网**: Sepolia
- **语言**: Solidity ^0.8.24

### 前端部分  
- **框架**: React + Vite
- **钱包**: Rainbow Kit + Wagmi + Viem
- **加密**: CryptoJS (AES-256)
- **样式**: 原生CSS (不使用Tailwind)

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 编译合约

```bash
npm run compile
```

### 3. 运行测试

```bash
npm run test
```

### 4. 部署合约 (Sepolia)

```bash
npm run test:sepolia
```

### 5. 启动前端

```bash
npm run dev
```

或者直接打开演示页面:
```bash
open demo.html
```

## 📁 项目结构

```
SecretGallery/
├── contracts/                 # 智能合约
│   ├── SecretGallery.sol     # 主合约
│   ├── SecretGalleryFactory.sol
│   └── ISecretGallery.sol    # 接口
├── deploy/                   # 部署脚本
├── test/                     # 合约测试
├── tasks/                    # Hardhat任务
├── src/                      # 前端源码
│   ├── components/           # React组件
│   │   ├── FileUpload.tsx   # 文件上传组件
│   │   ├── FileGallery.tsx  # 文件展示组件
│   │   └── AccessControl.tsx # 权限管理组件
│   ├── hooks/               # React Hooks
│   │   ├── useFHE.ts       # FHE实例Hook
│   │   └── useSecretGallery.ts # 合约交互Hook
│   ├── utils/               # 工具函数
│   │   ├── crypto.ts        # 加密工具
│   │   └── ipfs.ts          # IPFS伪处理
│   ├── types/               # TypeScript类型
│   └── contracts/           # 合约ABI
├── demo.html                # 演示页面
└── docs/                    # 文档
    ├── zama_llm.md         # Zama FHE开发文档  
    └── zama_doc_relayer.md # Relayer SDK文档
```

## 🔐 工作流程

### 1. 文件上传流程
1. **生成AES密码**: 随机生成32位密码并格式化为EVM地址格式
2. **客户端加密**: 使用AES-256加密文件内容
3. **IPFS上传**: 将加密数据上传到IPFS获得哈希
4. **哈希转换**: 将IPFS哈希转换为数字格式
5. **链上存储**: 通过FHE将数字哈希和密码加密存储到合约

### 2. 文件访问流程  
1. **获取加密数据**: 从合约读取加密的哈希和密码
2. **FHE解密**: 使用用户私钥解密链上数据
3. **IPFS下载**: 根据哈希从IPFS下载加密文件
4. **本地解密**: 使用解密后的密码解密文件内容

### 3. 权限授权流程
1. **授权调用**: 文件所有者调用grantFileAccess
2. **FHE权限**: 合约为被授权地址设置FHE访问权限
3. **访问验证**: 被授权用户可以解密和访问文件

## 📋 合约接口

### 主要函数

```solidity
// 上传文件
function uploadFile(
    externalEuint256 encryptedIpfsHash,
    externalEaddress encryptedPassword, 
    bytes calldata inputProof
) external returns (uint256 fileId)

// 授权访问
function grantFileAccess(uint256 fileId, address grantee) external

// 撤销访问  
function revokeFileAccess(uint256 fileId, address grantee) external

// 获取文件数据
function getFileData(uint256 fileId) external view 
    returns (euint256 ipfsHash, eaddress aesPassword)

// 获取用户文件
function getOwnerFiles(address owner) external view 
    returns (uint256[] memory)
```

### 事件

```solidity
event FileUploaded(uint256 indexed fileId, address indexed owner, uint256 timestamp);
event FileGranted(uint256 indexed fileId, address indexed owner, address indexed grantee);
event FileGrantRevoked(uint256 indexed fileId, address indexed owner, address indexed grantee);
```

## 🌐 演示功能

打开 `demo.html` 可以体验:

- 📤 **上传演示**: 模拟文件加密上传流程
- 📂 **文件库演示**: 展示加密文件列表和预览
- 🔐 **权限控制演示**: 授权和撤销文件访问权限
- 📖 **功能概览**: 详细的技术说明

## 📜 脚本命令

| Script             | Description              |
| ------------------ | ------------------------ |
| `npm run compile`  | 编译智能合约    |
| `npm run test`     | 运行合约测试            |
| `npm run test:sepolia` | 在Sepolia测试网测试 |
| `npm run lint`     | 代码检查       |
| `npm run clean`    | 清理构建文件    |
| `npm run dev`      | 启动前端开发服务器 |
| `npm run build`    | 构建生产版本 |

## 📚 文档

- [Zama FHE文档](docs/zama_llm.md)
- [Relayer SDK文档](docs/zama_doc_relayer.md) 
- [FHEVM官方文档](https://docs.zama.ai/fhevm)
- [Hardhat插件文档](https://docs.zama.ai/protocol/solidity-guides/development-guide/hardhat)

## 📄 许可证

BSD-3-Clause-Clear

## 🤝 贡献

欢迎提交Issue和Pull Request!

---

**注意**: 这是一个演示项目，IPFS和一些FHE功能使用了模拟实现。在生产环境中需要集成真实的IPFS节点和完整的Zama FHE基础设施。
