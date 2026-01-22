/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  CommandContext,
  SlashCommand
} from './types.js';
import { CommandKind } from './types.js';
import * as readline from 'node:readline';
import {
  loadDevoraSettings,
  saveDevoraSettings,
  type DevoraSettings,
} from '@google/gemini-cli-core';

// Latest Zai models (updated 2025)
const ZAI_MODELS = [
  { id: 'glm-4.7', name: 'GLM-4.7', description: 'Default - Best for coding' },
  {
    id: 'glm-4.7-plus',
    name: 'GLM-4.7 Plus',
    description: 'Enhanced capabilities',
  },
  { id: 'glm-4.7-flash', name: 'GLM-4.7 Flash', description: 'Fast responses' },
  { id: 'glm-4-air', name: 'GLM-4 Air', description: 'Lightweight & fast' },
] as const;

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
  return /^[a-zA-Z0-9_-]+$/.test(apiKey);
}

function updateMcpServersWithApiKey(
  settings: DevoraSettings,
  apiKey: string,
): DevoraSettings {
  if (!settings.mcpServers) {
    settings.mcpServers = {};
  }

  // Update each MCP server with the new API key
  // Vision MCP (stdio - uses env)
  if (settings.mcpServers['zai-vision']) {
    if (!settings.mcpServers['zai-vision'].env) {
      settings.mcpServers['zai-vision'].env = {};
    }
    settings.mcpServers['zai-vision'].env['Z_AI_API_KEY'] = apiKey;
  } else {
    settings.mcpServers['zai-vision'] = {
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
    };
  }

  // Web Reader MCP (http - uses headers)
  if (settings.mcpServers['zai-web-reader']) {
    if (!settings.mcpServers['zai-web-reader'].headers) {
      settings.mcpServers['zai-web-reader'].headers = {};
    }
    settings.mcpServers['zai-web-reader'].headers['Authorization'] =
      `Bearer ${apiKey}`;
  } else {
    settings.mcpServers['zai-web-reader'] = {
      description:
        'Zai Web Reader MCP Server - Fetch and convert web pages to markdown',
      url: 'https://api.z.ai/api/mcp/web_reader/mcp',
      type: 'http',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      timeout: 30000,
      trust: false,
    };
  }

  // Zread MCP (http - uses headers)
  if (settings.mcpServers['zai-zread']) {
    if (!settings.mcpServers['zai-zread'].headers) {
      settings.mcpServers['zai-zread'].headers = {};
    }
    settings.mcpServers['zai-zread'].headers['Authorization'] =
      `Bearer ${apiKey}`;
  } else {
    settings.mcpServers['zai-zread'] = {
      description: 'Zai Zread MCP Server - GitHub repository analysis',
      url: 'https://api.z.ai/api/mcp/zread/mcp',
      type: 'http',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      timeout: 30000,
      trust: false,
    };
  }

  // Web Search MCP (http - uses headers)
  if (settings.mcpServers['zai-web-search']) {
    if (!settings.mcpServers['zai-web-search'].headers) {
      settings.mcpServers['zai-web-search'].headers = {};
    }
    settings.mcpServers['zai-web-search'].headers['Authorization'] =
      `Bearer ${apiKey}`;
  } else {
    settings.mcpServers['zai-web-search'] = {
      description: 'Zai Web Search MCP Server - Web search with results',
      url: 'https://api.z.ai/api/mcp/web_search_prime/mcp',
      type: 'http',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      timeout: 30000,
      trust: false,
    };
  }

  return settings;
}

const apiKeySubCommand: SlashCommand = {
  name: 'apikey',
  kind: CommandKind.BUILT_IN,
  description:
    'Update your ZAI_API_KEY (automatically updates all MCP servers)',
  action: async (context: CommandContext, _args: string) => {
    context.ui.addItem(
      {
        type: 'info',
        text: '🔑 ZAI_API_KEY Update\n\nEnter your new ZAI_API_KEY (get it at https://docs.zai):',
      },
      Date.now(),
    );

    const apiKey = await promptUser('New ZAI_API_KEY: ');

    if (!(await validateApiKey(apiKey))) {
      context.ui.addItem(
        {
          type: 'error',
          text: '❌ Invalid API key format. Please try again.',
        },
        Date.now(),
      );
      return {
        type: 'message',
        messageType: 'error',
        content: 'Invalid API key format',
      };
    }

    // Load settings, update API key and MCP servers
    const settings = loadDevoraSettings();
    settings.zaiApiKey = apiKey;
    const updatedSettings = updateMcpServersWithApiKey(settings, apiKey);
    saveDevoraSettings(updatedSettings);

    context.ui.addItem(
      {
        type: 'info',
        text:
          '✅ ZAI_API_KEY updated!\n\n' +
          'All 4 MCP servers have been automatically updated with your new key:\n' +
          '  • zai-vision (Image analysis)\n' +
          '  • zai-web-reader (Web to markdown)\n' +
          '  • zai-zread (GitHub analysis)\n' +
          '  • zai-web-search (Web search)',
      },
      Date.now(),
    );

    return {
      type: 'message',
      messageType: 'info',
      content: 'ZAI_API_KEY updated successfully',
    };
  },
};

const modelSubCommand: SlashCommand = {
  name: 'model',
  kind: CommandKind.BUILT_IN,
  description: 'Change your Zai model',
  action: async (context: CommandContext, _args: string) => {
    const settings = loadDevoraSettings();
    const currentModel = settings.model?.name || 'glm-4.7';

    let modelList = '🤖 Available Zai Models:\n\n';
    ZAI_MODELS.forEach((model, index) => {
      const isCurrent = model.id === currentModel;
      modelList += `  ${index + 1}. ${model.name}${isCurrent ? ' (current)' : ''}\n`;
      modelList += `     ${model.description}\n\n`;
    });

    context.ui.addItem(
      {
        type: 'info',
        text: modelList + 'Enter the number of the model you want to use:',
      },
      Date.now(),
    );

    const choice = await promptUser('Model number (1-4): ');
    const modelIndex = parseInt(choice, 10) - 1;

    if (
      isNaN(modelIndex) ||
      modelIndex < 0 ||
      modelIndex >= ZAI_MODELS.length
    ) {
      context.ui.addItem(
        {
          type: 'error',
          text: '❌ Invalid choice. Please enter a number between 1 and 4.',
        },
        Date.now(),
      );
      return {
        type: 'message',
        messageType: 'error',
        content: 'Invalid model choice',
      };
    }

    const selectedModel = ZAI_MODELS[modelIndex];
    settings.model = settings.model || {};
    settings.model.name = selectedModel.id;
    saveDevoraSettings(settings);

    context.ui.addItem(
      {
        type: 'info',
        text: `✅ Model changed to ${selectedModel.name}\n\n${selectedModel.description}`,
      },
      Date.now(),
    );

    return {
      type: 'message',
      messageType: 'info',
      content: `Model changed to ${selectedModel.name}`,
    };
  },
};

const statusSubCommand: SlashCommand = {
  name: 'status',
  kind: CommandKind.BUILT_IN,
  description: 'Show current Zai configuration',
  action: async (context: CommandContext, _args: string) => {
    const settings = loadDevoraSettings();
    const currentModel = settings.model?.name || 'glm-4.7';
    const hasApiKey = !!settings.zaiApiKey;

    let status = '📊 Zai Configuration Status\n\n';
    status += `Model: ${currentModel}\n`;
    status += `API Key: ${hasApiKey ? '✅ Configured' : '❌ Not configured'}\n\n`;

    if (hasApiKey) {
      status += 'MCP Servers:\n';
      const mcpServers = settings.mcpServers || {};
      const zaiServers = [
        'zai-vision',
        'zai-web-reader',
        'zai-zread',
        'zai-web-search',
      ];
      zaiServers.forEach((serverName) => {
        const isConfigured = !!mcpServers[serverName];
        status += `  ${isConfigured ? '✅' : '❌'} ${serverName}\n`;
      });
    }

    context.ui.addItem(
      {
        type: 'info',
        text: status,
      },
      Date.now(),
    );

    return {
      type: 'message',
      messageType: 'info',
      content: 'Zai configuration status',
    };
  },
};

export const zaiCommand: SlashCommand = {
  name: 'zai',
  description: 'Configure Zai API key and model',
  kind: CommandKind.BUILT_IN,
  subCommands: [apiKeySubCommand, modelSubCommand, statusSubCommand],
  autoExecute: false,
  action: async (context: CommandContext, _args: string) =>
    // If no subcommand is provided, show status
     statusSubCommand.action!(context, _args)
  ,
};
