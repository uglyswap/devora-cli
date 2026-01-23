/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { CommandContext, SlashCommand } from './types.js';
import { CommandKind } from './types.js';
import * as readline from 'node:readline';
import {
  loadDevoraSettings,
  saveDevoraSettings,
  OpenRouterClient,
} from '@google/gemini-cli-core';

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
  // OpenRouter API keys typically start with 'sk-or-v1-'
  return apiKey.startsWith('sk-or-v1-') || /^[a-zA-Z0-9_-]+$/.test(apiKey);
}

function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 8) return '***';
  return `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}`;
}

const apiKeySubCommand: SlashCommand = {
  name: 'apikey',
  kind: CommandKind.BUILT_IN,
  description: 'Set or update your OpenRouter API key',
  action: async (context: CommandContext, _args: string) => {
    const settings = loadDevoraSettings();

    if (settings.openrouterApiKey) {
      context.ui.addItem(
        {
          type: 'info',
          text: `Current OpenRouter API key: ${maskApiKey(settings.openrouterApiKey)}`,
        },
        Date.now(),
      );
    }

    const newKey = await promptUser(
      'Enter your OpenRouter API key (get it from https://openrouter.ai/keys): ',
    );

    if (!(await validateApiKey(newKey))) {
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

    // Update settings - NOTE: This does NOT affect MCP servers
    // MCP servers continue to use ZAI_API_KEY independently
    settings.openrouterApiKey = newKey;
    saveDevoraSettings(settings);

    context.ui.addItem(
      {
        type: 'info',
        text:
          `✅ OpenRouter API key saved: ${maskApiKey(newKey)}\n\n` +
          'Note: MCP servers continue to use ZAI_API_KEY independently.',
      },
      Date.now(),
    );

    return {
      type: 'message',
      messageType: 'info',
      content: 'API key updated',
    };
  },
};

const modelSubCommand: SlashCommand = {
  name: 'model',
  kind: CommandKind.BUILT_IN,
  description: 'List available models or select a model',
  action: async (context: CommandContext, _args: string) => {
    const settings = loadDevoraSettings();

    if (!settings.openrouterApiKey) {
      context.ui.addItem(
        {
          type: 'error',
          text: '❌ OpenRouter API key not configured. Use /openrouter apikey first.',
        },
        Date.now(),
      );
      return {
        type: 'message',
        messageType: 'error',
        content: 'API key not configured',
      };
    }

    try {
      const client = new OpenRouterClient(settings.openrouterApiKey);
      const modelsResponse = await client.getModels();

      context.ui.addItem(
        {
          type: 'info',
          text: `\nAvailable OpenRouter models (${modelsResponse.data.length} total):\n`,
        },
        Date.now(),
      );

      // Sort models alphabetically by name and display ALL models
      const sortedModels = modelsResponse.data.sort(
        (a: { name: string }, b: { name: string }) =>
          a.name.localeCompare(b.name),
      );

      for (const [index, model] of sortedModels.entries()) {
        const currentMarker =
          settings.model?.name === model.id ? ' [CURRENT]' : '';
        context.ui.addItem(
          {
            type: 'info',
            text: `${(index + 1).toString().padStart(2)}. ${model.name}${currentMarker}`,
          },
          Date.now(),
        );
        context.ui.addItem(
          {
            type: 'info',
            text: `    ID: ${model.id}`,
          },
          Date.now(),
        );
        if (model.description) {
          context.ui.addItem(
            {
              type: 'info',
              text: `    ${model.description}`,
            },
            Date.now(),
          );
        }
        context.ui.addItem(
          {
            type: 'info',
            text: `    Context: ${model.context_length.toLocaleString()} tokens\n`,
          },
          Date.now(),
        );
      }

      const currentModel =
        settings.model?.name || 'anthropic/claude-3.5-sonnet';
      context.ui.addItem(
        {
          type: 'info',
          text: `Current model: ${currentModel}`,
        },
        Date.now(),
      );

      const changeModel = await promptUser(
        '\nEnter model ID to change (or press Enter to keep current): ',
      );

      if (changeModel) {
        const selectedModel = modelsResponse.data.find(
          (m: { id: string; name: string }) =>
            m.id === changeModel || m.name === changeModel,
        );

        if (selectedModel) {
          settings.model = { name: selectedModel.id };
          saveDevoraSettings(settings);
          context.ui.addItem(
            {
              type: 'info',
              text: `✅ Model changed to: ${selectedModel.name}`,
            },
            Date.now(),
          );
        } else {
          context.ui.addItem(
            {
              type: 'error',
              text: `❌ Model "${changeModel}" not found. Please try again.`,
            },
            Date.now(),
          );
        }
      }

      return {
        type: 'message',
        messageType: 'info',
        content: 'Model operation complete',
      };
    } catch (error) {
      context.ui.addItem(
        {
          type: 'error',
          text: `❌ Failed to fetch models: ${error instanceof Error ? error.message : String(error)}`,
        },
        Date.now(),
      );

      return {
        type: 'message',
        messageType: 'error',
        content: 'Failed to fetch models',
      };
    }
  },
};

const statusSubCommand: SlashCommand = {
  name: 'status',
  kind: CommandKind.BUILT_IN,
  description: 'Show current OpenRouter configuration',
  action: async (context: CommandContext, _args: string) => {
    const settings = loadDevoraSettings();

    context.ui.addItem(
      {
        type: 'info',
        text: '\n=== OpenRouter Configuration ===\n',
      },
      Date.now(),
    );

    if (settings.openrouterApiKey) {
      context.ui.addItem(
        {
          type: 'info',
          text: `API Key: ${maskApiKey(settings.openrouterApiKey)}`,
        },
        Date.now(),
      );
      context.ui.addItem(
        {
          type: 'info',
          text: `Model: ${settings.model?.name || 'anthropic/claude-3.5-sonnet (default)'}`,
        },
        Date.now(),
      );
      context.ui.addItem(
        {
          type: 'info',
          text: '\nStatus: ✅ Configured',
        },
        Date.now(),
      );
    } else {
      context.ui.addItem(
        {
          type: 'info',
          text: 'API Key: Not configured',
        },
        Date.now(),
      );
      context.ui.addItem(
        {
          type: 'info',
          text: '\nStatus: ❌ Not configured',
        },
        Date.now(),
      );
      context.ui.addItem(
        {
          type: 'info',
          text: 'To get started:',
        },
        Date.now(),
      );
      context.ui.addItem(
        {
          type: 'info',
          text: '1. Get an API key from https://openrouter.ai/keys',
        },
        Date.now(),
      );
      context.ui.addItem(
        {
          type: 'info',
          text: '2. Run /openrouter apikey to configure it',
        },
        Date.now(),
      );
    }

    context.ui.addItem(
      {
        type: 'info',
        text: '\nNote: MCP servers use ZAI_API_KEY independently.',
      },
      Date.now(),
    );
    context.ui.addItem(
      {
        type: 'info',
        text: '',
      },
      Date.now(),
    );
  },
};

export const openrouterCommand: SlashCommand = {
  name: 'openrouter',
  description: 'Configure OpenRouter API key and model',
  kind: CommandKind.BUILT_IN,
  subCommands: [apiKeySubCommand, modelSubCommand, statusSubCommand],
  autoExecute: false,
  action: async (context: CommandContext, _args: string) =>
    statusSubCommand.action!(context, _args),
};
