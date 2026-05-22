# BlogPublisher

> 一款简洁高效的博客文章发布工具，专为 Hugo + GitHub Pages 用户设计

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Platform: macOS](https://img.shields.io/badge/Platform-macOS-lightgrey.svg)](https://www.apple.com/macos)

## 📖 简介

BlogPublisher 是一个桌面应用程序，旨在简化博客文章的发布流程。只需将 Word 文档拖入应用，即可自动转换为 Markdown 格式，并一键发布到你的 Hugo 博客。

![Screenshot](docs/screenshot.png)

## ✨ 功能特性

### 📄 文章发布
- **拖拽上传** - 直接拖拽 Word 文档到应用窗口
- **自动转换** - 使用 Pandoc 将 Word 转换为 GitHub Flavored Markdown
- **图片处理** - 自动提取并保存图片到指定目录
- **实时预览** - 查看和编辑转换后的 Markdown 内容

### 🏷️ 元数据管理
- 文章标题设置
- 发布日期选择
- 分类管理（支持新建分类）
- 自定义文件名
- 目录显示开关

### 📂 文章管理
- 查看所有已发布文章
- 按分类浏览
- 编辑已发布文章
- 删除文章

### 🚀 一键发布
- 自动执行 Hugo 构建
- 自动推送到 GitHub Pages
- 支持 SSH 443 端口（解决网络限制）

### ⚙️ 自定义配置
- 博客路径配置
- GitHub 仓库设置
- 网站地址设置

## 🛠️ 技术栈

| 技术 | 说明 |
|------|------|
| Vue 3 | 前端框架 |
| Vite | 构建工具 |
| Electron | 桌面应用框架 |
| Pandoc | 文档转换引擎 |
| Hugo | 静态站点生成器 |

## 📋 系统要求

- **操作系统**: macOS 10.15 (Catalina) 或更高版本
- **Pandoc**: Word 转 Markdown
- **Hugo**: 静态站点生成
- **Git**: 版本控制

### 安装依赖

```bash
# 使用 Homebrew 安装
brew install pandoc
brew install hugo
brew install git
```

## 📥 安装

### 方式一：下载安装包

前往 [Releases](https://github.com/yuhengliuleo/BlogPublisher/releases) 页面下载最新版本：

- **Intel Mac**: 下载 `BlogPublisher-1.0.0-mac.zip`
- **M1/M2 Mac**: 下载 `BlogPublisher-1.0.0-arm64-mac.zip`

解压后将 `BlogPublisher.app` 拖入 Applications 文件夹。

### 方式二：从源码构建

```bash
# 克隆仓库
git clone https://github.com/yuhengliuleo/BlogPublisher.git
cd BlogPublisher

# 安装依赖
npm install

# 开发模式运行
npm run electron:dev

# 构建生产版本 (使用国内镜像)
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ npm run electron:build:mac
```

## 🎯 使用指南

### 首次使用

1. 打开 BlogPublisher
2. 点击「前往设置」或「设置」标签
3. 填写配置信息：
   - **博客路径**: Hugo 博客根目录（如 `/Users/yourname/myblog`）
   - **GitHub 仓库**: 格式 `username/repo`（如 `username/username.github.io`）
   - **网站地址**: 博客网址（如 `https://username.github.io`）
4. 点击「保存设置」

### 发布新文章

1. 切换到「发布文章」标签
2. 将 Word 文档拖入左侧上传区域
3. 填写文章标题、选择分类、设置日期
4. 预览并编辑 Markdown 内容
5. 点击「🚀 一键发布」

### 新建分类

1. 切换到「新建分类」标签
2. 输入分类名称
3. 点击「创建分类」

### 管理文章

1. 切换到「文章管理」标签
2. 查看所有已发布文章
3. 点击「编辑」修改文章内容
4. 点击「删除」移除文章

## ⚙️ 配置说明

应用支持自定义配置，所有用户都可以在「设置」页面配置：

| 配置项 | 说明 | 示例 |
|--------|------|------|
| 博客路径 | Hugo 博客根目录 | `/Users/yourname/myblog` |
| GitHub 仓库 | GitHub 仓库地址 | `username/username.github.io` |
| 网站地址 | 博客网站 URL | `https://username.github.io` |

**配置验证**：应用会自动验证博客路径是否为有效的 Hugo 项目（检查 `hugo.toml` 和 `content` 目录）。

**配置存储位置**：`~/Library/Application Support/BlogPublisher/config.json`

## 📁 项目结构

```
BlogPublisher/
├── electron/                 # Electron 主进程
│   ├── main.js              # 主进程入口
│   └── preload.js           # 预加载脚本
├── src/                      # Vue 前端源码
│   ├── App.vue              # 主组件
│   └── style.css            # 样式文件
├── dist/                     # Vite 构建输出
├── release/                  # Electron 构建输出
├── package.json             # 项目配置
├── vite.config.js           # Vite 配置
└── README.md                # 说明文档
```

## 🔧 开发命令

```bash
# 安装依赖
npm install

# 开发模式
npm run electron:dev

# 构建前端
npm run build

# 构建 macOS 应用
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ npm run electron:build:mac
```

## 📝 版本历史

### v1.0.0 (2025-05-22)

**首次发布**

- ✅ Word 文档拖拽上传
- ✅ Pandoc 自动转换 Markdown
- ✅ 图片自动提取和路径处理
- ✅ 文章元数据编辑
- ✅ Markdown 实时预览
- ✅ 分类管理
- ✅ 文章管理（查看、编辑、删除）
- ✅ Hugo 自动构建
- ✅ Git 自动推送（支持 443 端口）
- ✅ 自定义配置
- ✅ macOS 应用打包

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

[MIT License](LICENSE)

## 👤 作者

**yuhengliuleo**

- 博客: https://yuhengliuleo.github.io
- GitHub: https://github.com/yuhengliuleo

---

如果这个项目对你有帮助，欢迎 ⭐ Star 支持！