[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/ln129402-mcp-csdn-publisher-badge.png)](https://mseep.ai/app/ln129402-mcp-csdn-publisher)

# 🚀 mcp-csdn-publisher

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-Compatible-blue.svg)](https://modelcontextprotocol.io/)

> 🤖 一个基于 MCP (Model Context Protocol) 的 CSDN 博客自动发布服务器，让 AI 助手帮你写博客并一键发布到 CSDN！

## ✨ 功能特性

- 📝 **AI 写博客** - 给一个主题，AI 自动生成高质量博客文章
- 🚀 **一键发布** - 直接发布到 CSDN，无需手动操作
- 📋 **草稿保存** - 支持保存为草稿，稍后编辑
- 🏷️ **分类标签** - 自动设置文章分类和标签
- 🖼️ **图文并茂** - 支持 Markdown 格式，包括图片、代码块、表格等
- 🔐 **安全认证** - 基于 Cookie 的安全认证机制

## 📦 安装

```bash
git clone https://github.com/Ln129402/mcp-csdn-publisher.git
cd mcp-csdn-publisher
npm install
npm run build
```

## 🔧 配置

### Claude Desktop 配置

编辑配置文件：

- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "csdn-publisher": {
      "command": "node",
      "args": ["/path/to/mcp-csdn-publisher/dist/index.js"]
    }
  }
}
```

### Claude Code 配置

在项目根目录创建 `.mcp.json`：

```json
{
  "mcpServers": {
    "csdn-publisher": {
      "command": "node",
      "args": ["/path/to/mcp-csdn-publisher/dist/index.js"]
    }
  }
}
```

## 🎯 使用方法

### 1. 获取 CSDN Cookie

1. 浏览器打开 [CSDN](https://www.csdn.net/) 并登录
2. 按 `F12` → **Network** 标签
3. 刷新页面，点击任意请求
4. 复制 **Request Headers** 中的 **Cookie**（确保包含 `UserToken`）

### 2. 登录

```
设置 CSDN Cookie: 你的cookie内容
```

### 3. 发布博客

```
帮我写一篇关于 React Hooks 的博客发布到 CSDN
```

## 🛠️ MCP 工具

| 工具 | 说明 |
|------|------|
| `login` | 设置 CSDN Cookie 认证 |
| `publish-blog` | 发布/保存博客文章 |
| `list-categories` | 获取文章分类 |
| `list-tags` | 获取常用标签 |

## 📄 许可证

MIT License
