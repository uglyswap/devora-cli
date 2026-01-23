/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { HookDefinition } from '../types.js';
import { HookType } from '../types.js';
import {
  MEGAWORK_KEYWORDS,
  MEGAWORK_SYSTEM_MESSAGE,
} from '../../agents/sisyphus/types.js';

/**
 * Creates a hook definition for detecting Megawork keywords
 *
 * This hook detects when the user types megawork-related keywords
 * and injects the Megawork system message to activate Sisyphus mode.
 *
 * Keywords detected:
 * - "megawork"
 * - "megawork mode"
 * - "mega work"
 * - "/megawork"
 *
 * When detected, the MEGAWORK_SYSTEM_MESSAGE is injected as a system message.
 *
 * Usage: Load this hook in the hook system
 * ```typescript
 * import { createMegaworkKeywordDetectorHook } from './hooks/sisyphus/index.js';
 *
 * const hookDefinition = createMegaworkKeywordDetectorHook();
 * // Register hook with hookRegistry
 * ```
 */
export function createMegaworkKeywordDetectorHook(): HookDefinition {
  return {
    matcher: '.*', // Match all sessions
    sequential: false,
    hooks: [
      {
        type: HookType.Command,
        name: 'megawork-keyword-detector',
        description: 'Detects Megawork keywords and activates Sisyphus mode',
        command: 'node --eval "' + generateDetectionScript() + '"',
        timeout: 5000,
      },
    ],
  };
}

/**
 * Generates the detection script for the hook command
 * This script checks for megawork keywords in the user prompt
 */
function generateDetectionScript(): string {
  return `
const fs = require('fs');
const path = require('path');

// Read command line arguments
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error(JSON.stringify({ error: 'Missing transcript path argument' }));
  process.exit(1);
}

const transcriptPath = args[0];

// Read transcript to get last user message
try {
  if (!fs.existsSync(transcriptPath)) {
    console.error(JSON.stringify({ error: 'Transcript file not found' }));
    process.exit(1);
  }

  const transcriptContent = fs.readFileSync(transcriptPath, 'utf-8');
  const messages = JSON.parse(transcriptContent);

  // Get last user message
  const lastUserMessage = messages
    .filter((m: { role: string }) => m.role === 'user')
    .pop();

  if (!lastUserMessage) {
    console.error(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  const userPrompt = typeof lastUserMessage.content === 'string'
    ? lastUserMessage.content
    : JSON.stringify(lastUserMessage.content);

  const promptLower = userPrompt.toLowerCase();

  // Check for megawork keywords
  const keywords = ${JSON.stringify(MEGAWORK_KEYWORDS)};
  const detected = keywords.some((keyword: string) =>
    promptLower.includes(keyword.toLowerCase())
  );

  if (detected) {
    // Inject megawork system message
    const systemMessage = ${JSON.stringify(MEGAWORK_SYSTEM_MESSAGE)};
    console.error(JSON.stringify({
      continue: true,
      systemMessage: systemMessage
    }));
  } else {
    console.error(JSON.stringify({ continue: true }));
  }
} catch (error) {
  console.error(JSON.stringify({
    error: error instanceof Error ? error.message : String(error),
    continue: true
  }));
}
  `.replace(/\n/g, ' ');
}

/**
 * Alternative: Simple regex-based keyword detection
 * Can be used directly in code without spawning a process
 */
export function detectMegaworkKeywords(userPrompt: string): boolean {
  const promptLower = userPrompt.toLowerCase();
  return MEGAWORK_KEYWORDS.some((keyword) =>
    promptLower.includes(keyword.toLowerCase()),
  );
}

/**
 * Gets the Megawork system message to inject
 */
export function getMegaworkSystemMessage(): string {
  return MEGAWORK_SYSTEM_MESSAGE;
}

/**
 * Creates a simple keyword detector that can be called programmatically
 * This is a simpler version that doesn't require spawning a subprocess
 *
 * @param userPrompt The user's input prompt
 * @returns Hook output with system message if keywords detected, or continue=true
 */
export function createMegaworkDetectionResult(userPrompt: string): {
  continue: boolean;
  systemMessage?: string;
} {
  if (detectMegaworkKeywords(userPrompt)) {
    return {
      continue: true,
      systemMessage: getMegaworkSystemMessage(),
    };
  }

  return {
    continue: true,
  };
}
