#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { createHmac, randomUUID } from "crypto";

// ─── CSDN Cookie 存储 ───
let csdnCookie: string = process.env.CSDN_COOKIE || "";

// ─── CSDN API 配置 ───
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const APP_KEY = "203803574";
const APP_SECRET = "9znpamsyl2c7cdrr9sas0le9vbc3r6ba";

interface CsdnResponse {
  code: number;
  msg: string;
  data?: any;
}

// 从 Cookie 中提取 csrfToken
function getCsrfToken(): string {
  const match = csdnCookie.match(/csrfToken=([^;]+)/);
  return match ? match[1] : "";
}

// 生成 HMAC 签名
function generateSignature(method: string, uri: string, accept: string, contentType: string): string {
  const stringToSign = `${method}\n${accept}\n\n${contentType}\n\n${uri}`;
  return createHmac("sha256", APP_SECRET).update(stringToSign).digest("base64");
}

async function csdnFetch(path: string, body: Record<string, any>): Promise<CsdnResponse> {
  if (!csdnCookie) {
    return { code: -1, msg: "未登录，请先调用 login 工具设置 CSDN Cookie" };
  }

  // 检查是否包含 UserToken
  if (!csdnCookie.includes("UserToken=")) {
    return { code: -1, msg: "Cookie 中缺少 UserToken，请从浏览器 Network 标签获取完整 Cookie（包含 UserToken）" };
  }

  const timestamp = Date.now().toString();
  const nonce = randomUUID();
  const accept = "*/*";
  const contentType = "application/json; charset=UTF-8";
  const signature = generateSignature("POST", path, accept, contentType);

  try {
    const res = await fetch(`https://bizapi.csdn.net${path}`, {
      method: "POST",
      headers: {
        "Content-Type": contentType,
        "Cookie": csdnCookie,
        "User-Agent": UA,
        "Referer": "https://editor.csdn.net/md/",
        "Origin": "https://editor.csdn.net",
        "Accept": accept,
        "X-Ca-Key": APP_KEY,
        "X-Ca-Nonce": nonce,
        "X-Ca-Timestamp": timestamp,
        "X-Ca-Signature": signature,
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (text.trim().startsWith("{")) {
      return JSON.parse(text) as CsdnResponse;
    }
    return { code: -1, msg: `API 返回非JSON响应 (${res.status}): ${text.slice(0, 200)}` };
  } catch (e: any) {
    return { code: -1, msg: `请求失败: ${e.message}` };
  }
}

// ─── 创建 MCP Server ───
const server = new McpServer({
  name: "csdn-publisher",
  version: "1.0.0",
});

// ─── Tool: login ───
server.tool(
  "login",
  "设置 CSDN Cookie 以完成认证。从浏览器开发者工具复制 Cookie 字符串。",
  { cookie: z.string().describe("从浏览器复制的 CSDN Cookie 字符串") },
  async ({ cookie }) => {
    csdnCookie = cookie;
    // 验证 Cookie 是否有效
    try {
      const username = csdnCookie.match(/UserName=([^;]+)/)?.[1] || "";
      if (!username) {
        return { content: [{ type: "text", text: "❌ Cookie 中未找到 UserName，请确认已登录 CSDN 后重新复制 Cookie。" }] };
      }

      // 检查 UserToken
      if (!csdnCookie.includes("UserToken=")) {
        return { content: [{ type: "text", text: "⚠️ Cookie 中缺少 UserToken。请从浏览器 Network 标签获取完整 Cookie（UserToken 是 HTTP-only cookie，document.cookie 无法获取）。\n\n步骤：F12 → Network → 刷新页面 → 点击第一个请求 → 复制 Request Headers 中的 Cookie" }] };
      }

      // 使用 HMAC 签名验证
      const uri = "/blog-console-api/v3/blog/list";
      const timestamp = Date.now().toString();
      const nonce = randomUUID();
      const accept = "*/*";
      const contentType = "";
      const signature = generateSignature("GET", uri, accept, contentType);

      const res = await fetch(`https://bizapi.csdn.net${uri}?page=1&size=1`, {
        method: "GET",
        headers: {
          "Cookie": csdnCookie,
          "User-Agent": UA,
          "Referer": "https://editor.csdn.net/",
          "Accept": accept,
          "X-Ca-Key": APP_KEY,
          "X-Ca-Nonce": nonce,
          "X-Ca-Timestamp": timestamp,
          "X-Ca-Signature": signature,
        },
      });
      const text = await res.text();
      if (text.trim().startsWith("{")) {
        const data = JSON.parse(text);
        if (data.code === 200 || data.data) {
          return { content: [{ type: "text", text: `✅ 登录成功！用户: ${username}，Cookie 已保存，可以开始发布博客了。` }] };
        }
      }
      // 备用：访问博客主页验证
      const res2 = await fetch(`https://blog.csdn.net/${username}`, {
        method: "GET",
        headers: { "Cookie": csdnCookie, "User-Agent": UA },
        redirect: "manual",
      });
      const text2 = await res2.text();
      if (text2.includes(username) && res2.status === 200) {
        return { content: [{ type: "text", text: `✅ 登录成功！用户: ${username}，Cookie 已保存，可以开始发布博客了。` }] };
      }
      return { content: [{ type: "text", text: `⚠️ Cookie 可能已失效，请重新从浏览器获取。\n调试: ${text.slice(0, 200)}` }] };
    } catch (e: any) {
      return { content: [{ type: "text", text: `❌ 验证失败: ${e.message}` }] };
    }
  }
);

// ─── Tool: publish-blog ───
server.tool(
  "publish-blog",
  "发布博客文章到 CSDN。支持 Markdown 格式，可选择直接发布或保存为草稿。",
  {
    title: z.string().describe("文章标题"),
    content: z.string().describe("Markdown 格式的文章内容"),
    description: z.string().optional().describe("文章摘要（不填则自动截取内容前100字）"),
    tags: z.string().optional().describe("文章标签，逗号分隔，如: 'JavaScript,前端,Vue'"),
    categories: z.string().optional().describe("文章分类，如: '前端开发'"),
    publish: z.boolean().optional().describe("true=直接发布, false=保存草稿。默认 true"),
  },
  async ({ title, content, description, tags, categories, publish }) => {
    // 自动生成摘要
    const desc = description || content.replace(/[#*`\[\]()!>\-]/g, "").trim().slice(0, 100) + "...";

    // 解析标签
    const tagList = tags
      ? tags.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

    const body: Record<string, any> = {
      title,
      content: content,
      markdowncontent: content,
      description: desc,
      categories: categories || "blog",
      tags: tagList.join(",") || "blog",
      type: "original",
      status: publish === false ? 0 : 1,
      id: "",
      authorized_status: 0,
    };

    const result = await csdnFetch("/blog-console-api/v3/mdeditor/saveArticle", body);

    if (result.code === 200 && result.data) {
      const articleId = result.data.id || result.data.article_id || "";
      const url = result.data.url || `https://blog.csdn.net/article/details/${articleId}`;
      const action = publish === false ? "保存草稿" : "发布";
      return {
        content: [{
          type: "text",
          text: `✅ 文章${action}成功！\n\n标题: ${title}\n文章ID: ${articleId}\n链接: ${url}`,
        }],
      };
    } else {
      return {
        content: [{
          type: "text",
          text: `❌ 发布失败: ${JSON.stringify(result)}`,
        }],
      };
    }
  }
);

// ─── Tool: list-categories ───
server.tool(
  "list-categories",
  "获取当前 CSDN 账号的文章分类列表。",
  {},
  async () => {
    const result = await csdnFetch("/blog-console-api/v3/blog/list", {});
    if (result.code === 200 && result.data) {
      const cats = result.data.categories || result.data || [];
      const list = Array.isArray(cats) ? cats.map((c: any) => `- ${c.name || c}`).join("\n") : JSON.stringify(cats);
      return { content: [{ type: "text", text: `📂 分类列表:\n${list}` }] };
    }
    return { content: [{ type: "text", text: `获取失败: ${JSON.stringify(result)}` }] };
  }
);

// ─── Tool: list-tags ───
server.tool(
  "list-tags",
  "获取当前 CSDN 账号常用的文章标签列表。",
  {},
  async () => {
    const result = await csdnFetch("/blog-console-api/v3/blog/list", {});
    if (result.code === 200 && result.data) {
      const tags = result.data.tags || result.data || [];
      const list = Array.isArray(tags) ? tags.map((t: any) => `- ${t.name || t}`).join("\n") : JSON.stringify(tags);
      return { content: [{ type: "text", text: `🏷️ 标签列表:\n${list}` }] };
    }
    return { content: [{ type: "text", text: `获取失败: ${JSON.stringify(result)}` }] };
  }
);

// ─── 启动 Server ───
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((e) => {
  console.error("Server error:", e);
  process.exit(1);
});
