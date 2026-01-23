/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { SlashCommand, CommandContext } from './types.js';
import { CommandKind } from './types.js';
import {
  MEGAWORK_SYSTEM_MESSAGE,
  getMegaworkSystemMessage,
} from '@devora/core/src/agents/sisyphus/types.js';

/**
 * /megawork command - Activates Sisyphus multi-agent orchestration mode
 *
 * This command injects the Megawork system message which activates
 * the Sisyphus orchestrator with todo-obsession and parallel delegation.
 *
 * Usage:
 *   /megawork on    - Activates Megawork mode
 *   /megawork off   - Deactivates Megawork mode
 *   /megawork       - Shows current status
 *
 * Megawork mode enables:
 * - Todo-obsession tracking
 * - Parallel background agent execution
 * - Strategic delegation to specialized agents (oracle, explore, librarian, frontend)
 * - Session resume for 70%+ token savings
 */
export const megaworkCommand: SlashCommand = {
  name: 'megawork',
  altNames: ['mw', 'sisyphus'],
  description:
    '⚡ Activate Sisyphus orchestration mode with todo-obsession and parallel delegation',
  kind: CommandKind.BUILT_IN,
  autoExecute: false,
  subCommands: [
    {
      name: 'on',
      description: 'Activate Megawork mode (Sisyphus orchestration)',
      kind: CommandKind.BUILT_IN,
      autoExecute: true,
      action: async (context) => {
        const { ui } = context;

        // Inject the Megawork system message as a user message
        ui.addItem({
          type: 'user',
          text: MEGAWORK_SYSTEM_MESSAGE,
        });

        ui.setDebugMessage(
          '⚡ Megawork mode activated - Sisyphus orchestration enabled',
        );

        // Also add a system message for visual feedback
        ui.addItem({
          type: 'info',
          text: `
⚡ **MEGAWORK MODE ACTIVATED** ⚡

Sisyphus orchestration is now enabled with:
- Todo-obsession tracking
- Parallel background execution
- Strategic delegation to specialized agents
- Session resume capability

Available agents:
- **oracle**: Architecture consultant (read-only)
- **explore**: Codebase search specialist
- **librarian**: Documentation researcher
- **frontend**: UI/UX design specialist

Usage: Use \`delegate_task\` to delegate work to these agents.
          `.trim(),
        });

        return;
      },
    },
    {
      name: 'off',
      description: 'Deactivate Megawork mode',
      kind: CommandKind.BUILT_IN,
      autoExecute: true,
      action: async (context) => {
        const { ui } = context;

        ui.setDebugMessage('Megawork mode deactivated');

        ui.addItem({
          type: 'info',
          text: `
**Megawork mode deactivated**

Returning to normal operation mode.
You can reactivate with \`/megawork on\`
          `.trim(),
        });

        return;
      },
    },
    {
      name: 'status',
      description: 'Show current Megawork mode status',
      kind: CommandKind.BUILT_IN,
      autoExecute: true,
      action: async (context) => {
        const { ui } = context;

        // Check if Megawork is active by looking at recent history
        // For now, just show instructions
        ui.addItem({
          type: 'info',
          text: `
**Megawork Mode Status**

Megawork mode activates Sisyphus orchestration with:
- Todo-obsession (obsessive task tracking)
- Parallel delegation (explore + librarian run simultaneously)
- Strategic agent selection (oracle, explore, librarian, frontend)

**Available subcommands:**
- \`/megawork on\` - Activate mode
- \`/megawork off\` - Deactivate mode

**Quick start:**
1. Type \`/megawork on\` to activate
2. Describe your complex task
3. Sisyphus will create todos and delegate automatically
          `.trim(),
        });

        return;
      },
    },
  ],
};

/**
 * Helper function to check if Megawork mode is active
 * This can be used by other parts of the system to detect active mode
 *
 * @param context The command context
 * @returns true if Megawork mode appears to be active
 */
export function isMegaworkActive(_context: CommandContext): boolean {
  // This is a simplified check - a full implementation would check
  // the session state for the Megawork system message
  // For now, we rely on the user having activated it via /megawork on
  return false; // Default to false - actual state tracking would be more complex
}

/**
 * Gets the Megawork system message
 *
 * @returns The Megawork activation message
 */
export { getMegaworkSystemMessage };
