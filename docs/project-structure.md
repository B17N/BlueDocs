# BlueDocs 项目文件结构说明

本文档详细说明了 BlueDocs 项目中每个文件和目录的作用，帮助开发者快速理解项目架构。

## 📁 根目录文件

| 文件名 | 说明 |
|--------|------|
| `package.json` | 项目依赖配置文件，定义了所有npm包依赖和脚本命令 |
| `pnpm-lock.yaml` | pnpm包管理器的锁定文件，确保依赖版本一致性 |
| `next.config.mjs` | Next.js框架配置文件，定义构建和运行时设置 |
| `tailwind.config.ts` | Tailwind CSS配置文件，定义样式系统和主题 |
| `tsconfig.json` | TypeScript编译器配置文件 |
| `postcss.config.mjs` | PostCSS配置文件，用于CSS预处理 |
| `components.json` | shadcn/ui组件库配置文件 |
| `next-env.d.ts` | Next.js TypeScript类型定义文件 |
| `.gitignore` | Git忽略文件配置 |
| `README.md` | 项目说明文档 |

## 📁 app/ 目录（Next.js App Router）

### 核心页面
- **`page.tsx`** (21KB) - 主应用页面，包含文件管理、编辑器集成、钱包连接等核心功能
- **`layout.tsx`** - 应用根布局组件，定义全局HTML结构和主题提供者
- **`globals.css`** - 全局CSS样式文件

### 子页面
- **`test/`** - 测试功能页面目录
  - `page.tsx` - 主要测试页面
  - `metamask/page.tsx` - MetaMask连接测试
  - `nft-list/page.tsx` - NFT列表显示测试
  - `simple/page.tsx` - 简单功能测试
- **`view/[fileId]/page.tsx`** - 动态路由，用于查看特定文档的页面

## 📁 components/ 目录（React组件）

### 主要业务组件
- **`file-list.tsx`** - 文件列表组件，显示用户的所有加密文档
- **`editor-pane.tsx`** - Markdown编辑器面板，支持实时编辑和预览
- **`history-viewer.tsx`** - 版本历史查看器，显示文档的所有版本
- **`share-dialog.tsx`** - 分享对话框，生成文档分享链接
- **`connect-wallet-button.tsx`** - 钱包连接按钮组件
- **`wallet-provider.tsx`** - 钱包上下文提供者，管理钱包状态
- **`theme-provider.tsx`** - 主题提供者，支持暗色/亮色模式切换
- **`conditional-layout.tsx`** - 条件布局组件

### UI组件库 (components/ui/)
基于 shadcn/ui 的可复用UI组件：

#### 基础组件
- `button.tsx` - 按钮组件
- `input.tsx` - 输入框组件
- `textarea.tsx` - 文本域组件
- `label.tsx` - 标签组件
- `card.tsx` - 卡片容器组件
- `badge.tsx` - 徽章组件
- `avatar.tsx` - 头像组件
- `separator.tsx` - 分隔线组件
- `skeleton.tsx` - 骨架屏组件

#### 布局组件
- `accordion.tsx` - 手风琴折叠组件
- `tabs.tsx` - 标签页组件
- `sheet.tsx` - 侧边抽屉组件
- `sidebar.tsx` - 侧边栏组件
- `scroll-area.tsx` - 滚动区域组件
- `resizable.tsx` - 可调整大小组件
- `aspect-ratio.tsx` - 宽高比组件

#### 交互组件
- `dialog.tsx` - 对话框组件
- `drawer.tsx` - 抽屉组件
- `popover.tsx` - 弹出框组件
- `hover-card.tsx` - 悬停卡片组件
- `tooltip.tsx` - 工具提示组件
- `alert-dialog.tsx` - 警告对话框组件
- `alert.tsx` - 警告提示组件

#### 导航组件
- `dropdown-menu.tsx` - 下拉菜单组件
- `context-menu.tsx` - 右键菜单组件
- `menubar.tsx` - 菜单栏组件
- `navigation-menu.tsx` - 导航菜单组件
- `breadcrumb.tsx` - 面包屑导航组件
- `pagination.tsx` - 分页组件

#### 表单组件
- `form.tsx` - 表单组件
- `checkbox.tsx` - 复选框组件
- `radio-group.tsx` - 单选按钮组组件
- `select.tsx` - 选择器组件
- `switch.tsx` - 开关组件
- `slider.tsx` - 滑块组件
- `toggle.tsx` - 切换按钮组件
- `toggle-group.tsx` - 切换按钮组组件
- `input-otp.tsx` - OTP输入组件

#### 数据展示组件
- `table.tsx` - 表格组件
- `calendar.tsx` - 日历组件
- `chart.tsx` - 图表组件
- `carousel.tsx` - 轮播图组件
- `progress.tsx` - 进度条组件
- `collapsible.tsx` - 可折叠组件

#### 反馈组件
- `toast.tsx` - 消息提示组件
- `toaster.tsx` - 消息提示容器组件
- `sonner.tsx` - 声音通知组件
- `command.tsx` - 命令面板组件

#### 工具Hook
- `use-mobile.tsx` - 移动端检测Hook
- `use-toast.ts` - 消息提示Hook

## 📁 lib/ 目录（工具库）

### 核心工具模块
- **`contract.ts`** (17KB) - 智能合约交互模块，处理NFT创建、查询、更新等操作
- **`encryption.ts`** - 加密解密模块，使用TweetNaCl实现端到端加密
- **`metamask-crypto.ts`** - MetaMask加密模块，利用MetaMask进行密钥加密
- **`share-encryption.ts`** - 分享加密模块，处理文档分享时的加密逻辑
- **`ipfs.ts`** - IPFS存储模块，处理文件上传下载到IPFS网络
- **`document-utils.ts`** - 文档工具模块，处理文档元数据、类型检测等
- **`infura-provider.ts`** - Infura服务提供者，配置以太坊网络连接
- **`utils.ts`** - 通用工具函数
- **`index.ts`** - 模块导出入口文件

## 📁 hooks/ 目录（React Hooks）

- **`use-document-manager.ts`** (33KB) - 文档管理主Hook，封装所有文档相关操作
- **`use-wallet.ts`** - 钱包管理Hook，处理钱包连接和状态
- **`use-media-query.ts`** - 媒体查询Hook，响应式设计支持
- **`use-mobile.tsx`** - 移动端检测Hook
- **`use-toast.ts`** - 消息提示管理Hook

## 📁 docs/ 目录（文档）

- **`api-reference.md`** - API参考文档，详细说明各模块的接口
- **`ipfs-setup.md`** - IPFS设置说明文档
- **`new-file-implementation.md`** - 新文件功能实现文档
- **`version-control-implementation.md`** - 版本控制功能实现文档
- **`Share-feature-implementation-plan.md`** - 分享功能实现计划文档
- **`project-structure.md`** - 本文档，项目结构说明

## 📁 Contracts/ 目录（智能合约）

- **`DocumentNFT.sol`** - 主要智能合约文件，基于ERC1155实现的文档NFT合约

## 📁 public/ 目录（静态资源）

- `placeholder-logo.png/svg` - 占位符Logo图片
- `placeholder-user.jpg` - 占位符用户头像
- `placeholder.jpg/svg` - 通用占位符图片

## 📁 styles/ 目录（样式文件）

- **`globals.css`** - 全局CSS样式，包含Tailwind CSS导入和自定义样式

## 📁 PRD/ 目录（产品需求）

- **`BlueDocsPRD`** - BlueDocs产品需求文档

## 🔧 构建输出目录

- **`.next/`** - Next.js构建输出目录（自动生成）
- **`node_modules/`** - npm依赖包目录（自动生成）
- **`.git/`** - Git版本控制目录

## 📋 项目架构特点

### 技术栈
- **前端框架**: Next.js 15 + React 19
- **UI组件库**: shadcn/ui + Tailwind CSS
- **区块链**: Ethereum + Optimism网络
- **存储**: IPFS去中心化存储
- **加密**: TweetNaCl + MetaMask加密
- **开发语言**: TypeScript
- **包管理器**: pnpm

### 核心功能模块
1. **文档管理** - 创建、编辑、删除、版本控制
2. **加密存储** - 端到端加密 + IPFS存储
3. **NFT集成** - 文档与NFT关联，链上所有权证明
4. **分享功能** - 安全的文档分享机制
5. **钱包集成** - MetaMask钱包连接和加密
6. **版本控制** - 文档历史版本管理

### 设计模式
- **模块化设计** - 功能明确分离，易于维护
- **组件化架构** - 可复用的React组件
- **Hook模式** - 业务逻辑与UI分离
- **类型安全** - 完整的TypeScript类型定义

这个文档将帮助新开发者快速了解项目结构，找到需要修改的文件位置。 