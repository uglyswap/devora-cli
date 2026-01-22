/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Devora CLI - First Run Setup
 *
 * This module handles the first-run setup experience when:
 * 1. Devora CLI is launched for the first time
 * 2. No ZAI_API_KEY is configured in settings.json
 *
 * The setup:
 * - Prompts for ZAI_API_KEY
 * - Saves it to settings.json
 * - Configures all MCP servers with the saved key
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import * as readline from 'node:readline';

const PLATFORM = os.platform();
const HOME_DIR = os.homedir();

export function getDevoraSettingsPath(): string {
  if (PLATFORM === 'win32') {
    return path.join(
      HOME_DIR,
      'AppData',
      'Roaming',
      'devora-cli',
      'settings.json',
    );
  } else if (PLATFORM === 'darwin') {
    return path.join(
      HOME_DIR,
      'Library',
      'Application Support',
      'devora-cli',
      'settings.json',
    );
  } else {
    return path.join(HOME_DIR, '.config', 'devora-cli', 'settings.json');
  }
}

export function getDevoraSettingsDir(): string {
  return path.dirname(getDevoraSettingsPath());
}

interface DevoraSettings {
  zaiApiKey?: string;
  model?: {
    name?: string;
  };
  mcpServers?: Record<string, MCPServerConfig>;
  mcp?: {
    allowed?: string[];
  };
}

interface MCPServerConfig {
  description?: string;
  command?: string;
  args?: string[];
  type?: 'stdio' | 'http' | 'sse';
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
  timeout?: number;
  trust?: boolean;
}

export function loadDevoraSettings(): DevoraSettings {
  const settingsPath = getDevoraSettingsPath();

  if (!fs.existsSync(settingsPath)) {
    return {};
  }

  try {
    const content = fs.readFileSync(settingsPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

export function saveDevoraSettings(settings: DevoraSettings): void {
  const settingsDir = getDevoraSettingsDir();
  const settingsPath = getDevoraSettingsPath();

  // Create directory if it doesn't exist
  if (!fs.existsSync(settingsDir)) {
    fs.mkdirSync(settingsDir, { recursive: true });
  }

  // Write settings with pretty formatting
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
}

function createSettingsWithApiKey(apiKey: string): DevoraSettings {
  return {
    zaiApiKey: apiKey,
    model: {
      name: 'glm-4.7',
    },
    mcpServers: {
      'zai-vision': {
        description: 'Zai Vision MCP Server - Image analysis with GLM-4.7',
        command: 'npx',
        args: ['-y', '@z_ai/mcp-server'],
        type: 'stdio',
        env: {
          Z_AI_API_KEY: apiKey,
          Z_AI_MODE: 'ZAI',
        },
        timeout: 60000,
        trust: false,
      },
      'zai-web-reader': {
        description:
          'Zai Web Reader MCP Server - Fetch and convert web pages to markdown',
        url: 'https://api.z.ai/api/mcp/web_reader/mcp',
        type: 'http',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        timeout: 30000,
        trust: false,
      },
      'zai-zread': {
        description: 'Zai Zread MCP Server - GitHub repository analysis',
        url: 'https://api.z.ai/api/mcp/zread/mcp',
        type: 'http',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        timeout: 30000,
        trust: false,
      },
      'zai-web-search': {
        description: 'Zai Web Search MCP Server - Web search with results',
        url: 'https://api.z.ai/api/mcp/web_search_prime/mcp',
        type: 'http',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        timeout: 30000,
        trust: false,
      },
    },
    mcp: {
      allowed: ['zai-vision', 'zai-web-reader', 'zai-zread', 'zai-web-search'],
    },
  };
}

function promptUser(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function validateApiKey(apiKey: string): Promise<boolean> {
  if (!apiKey || apiKey.length < 10) {
    return false;
  }
  // Basic validation: should look like an API key
  return /^[a-zA-Z0-9_-]+$/.test(apiKey);
}

export async function runFirstRunSetupIfNeeded(): Promise<boolean> {
  const settings = loadDevoraSettings();

  // Check if ZAI_API_KEY is already configured
  if (settings.zaiApiKey) {
    return false; // Already configured, no setup needed
  }

  // Check environment variable as fallback
  if (process.env.ZAI_API_KEY && process.env.ZAI_API_KEY.length > 10) {
    const envKey = process.env.ZAI_API_KEY;
    const newSettings = createSettingsWithApiKey(envKey);
    saveDevoraSettings(newSettings);
    console.log(
      '✅ ZAI_API_KEY imported from environment and saved to settings.',
    );
    return true;
  }

  // Run interactive setup
  await runInteractiveSetup();
  return true;
}

async function runInteractiveSetup(): Promise<void> {
  console.clear();

  console.log('');
  console.log('██████╗ ███████╗██╗   ██╗ ██████╗ ██████╗  █████╗');
  console.log('██╔══██╗██╔════╝██║   ██║██╔═══██╗██╔══██╗██╔══██╗');
  console.log('██║  ██║█████╗  ██║   ██║██║   ██║██████╔╝███████║');
  console.log('██║  ██║██╔══╝  ╚██╗ ██╔╝██║   ██║██╔══██╗██╔══██║');
  console.log('██████╔╝███████╗ ╚████╔╝ ╚██████╔╝██║  ██║██║  ██║');
  console.log('╚═════╝ ╚══════╝  ╚═══╝   ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝');
  console.log('');
  console.log('                ⚡ Agentic Coding ⚡');
  console.log('');

  console.log('═══════════════════════════════════════════════════════════');
  console.log('              🔧 FIRST-TIME SETUP');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log("Welcome to Devora CLI! Let's get you set up.");
  console.log('');
  console.log(
    '📝 To use Devora CLI with Zai GLM-4.7 and MCP servers, you need an API key.',
  );
  console.log('');
  console.log('   Get your key at: https://docs.z.ai');
  console.log('');

  let apiKey: string;
  let attempts = 0;
  const maxAttempts = 3;

  do {
    apiKey = await promptUser('   Enter your ZAI_API_KEY: ');

    if (!(await validateApiKey(apiKey))) {
      attempts++;
      if (attempts < maxAttempts) {
        console.log(
          `   ❌ Invalid API key format. Please try again. (${maxAttempts - attempts} attempts left)`,
        );
        console.log('');
      } else {
        console.log(
          '   ❌ Too many failed attempts. Please restart Devora CLI.',
        );
        process.exit(1);
      }
    }
  } while (!(await validateApiKey(apiKey)));

  console.log('   ✅ API key accepted!');
  console.log('');

  // Create and save settings
  const newSettings = createSettingsWithApiKey(apiKey);
  saveDevoraSettings(newSettings);

  console.log('✅ Configuration complete!');
  console.log('');
  console.log('🔧 MCP servers configured:');
  console.log('   • zai-vision (Image analysis)');
  console.log('   • zai-web-reader (Web to markdown)');
  console.log('   • zai-zread (GitHub analysis)');
  console.log('   • zai-web-search (Web search)');
  console.log('');

  console.log('═══════════════════════════════════════════════════════════');
  console.log('                  🚀 READY TO GO!');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log("Your API key has been saved. You won't need to enter it again.");
  console.log('');
  console.log('Starting Devora CLI...');
  console.log('');
}

export function getZaiApiKey(): string | undefined {
  const settings = loadDevoraSettings();
  return settings.zaiApiKey || process.env.ZAI_API_KEY;
}
