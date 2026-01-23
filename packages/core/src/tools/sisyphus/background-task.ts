/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  BaseDeclarativeTool,
  Kind,
  type ToolInvocation,
  type ToolResult,
  BaseToolInvocation,
} from '../tools.js';
import type { AnsiOutput } from '../../utils/terminalSerializer.js';
import type { MessageBus } from '../../confirmation-bus/message-bus.js';
import { BackgroundTaskManager } from './delegate-task.js';

export interface BackgroundTaskParams {
  description: string;
  prompt: string;
  agent: string;
}

/**
 * Background task tool - Launches asynchronous agent tasks
 *
 * NOTE: This is a simplified implementation. Full background task execution
 * requires significant infrastructure including async job queues, polling mechanisms,
 * and proper result storage. This version demonstrates the API and structure.
 */
export class BackgroundTaskTool extends BaseDeclarativeTool<
  BackgroundTaskParams,
  ToolResult
> {
  constructor(messageBus: MessageBus) {
    super(
      'background_task',
      'Background Task',
      'Launches an agent task to run asynchronously in the background.\n\n**Parameters:**\n- **description**: Short description of the task\n- **prompt**: Detailed prompt for the agent\n- **agent**: Which agent to use (sisyphus, oracle, explore, librarian, frontend)\n\n**Returns:** A task_id that can be used with background_output to retrieve results.',
      Kind.Think,
      {
        type: 'object',
        properties: {
          description: {
            type: 'string',
            description:
              'Short description (3-5 words) of what the task will do',
          },
          prompt: {
            type: 'string',
            description: 'Detailed prompt for the agent',
          },
          agent: {
            type: 'string',
            description:
              'Agent to execute the task (sisyphus, oracle, explore, librarian, frontend)',
            enum: ['sisyphus', 'oracle', 'explore', 'librarian', 'frontend'],
          },
        },
        required: ['description', 'prompt', 'agent'],
      },
      messageBus,
      true,
      false,
    );
  }

  protected override validateToolParamValues(
    params: BackgroundTaskParams,
  ): string | null {
    if (!params.description || params.description.trim().length === 0) {
      return 'Description must not be empty';
    }
    if (!params.prompt || params.prompt.trim().length === 0) {
      return 'Prompt must not be empty';
    }
    if (!params.agent || params.agent.trim().length === 0) {
      return 'Agent must be specified';
    }
    return null;
  }

  protected createInvocation(
    params: BackgroundTaskParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ): ToolInvocation<BackgroundTaskParams, ToolResult> {
    return new BackgroundTaskInvocation(
      params,
      messageBus,
      _toolName,
      _toolDisplayName,
    );
  }
}

class BackgroundTaskInvocation extends BaseToolInvocation<
  BackgroundTaskParams,
  ToolResult
> {
  constructor(
    params: BackgroundTaskParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ) {
    super(
      params,
      messageBus,
      _toolName ?? 'background_task',
      _toolDisplayName ?? 'Background Task',
    );
  }

  getDescription(): string {
    return `Starting background task "${this.params.description}" with ${this.params.agent} agent`;
  }

  async execute(
    _signal: AbortSignal,
    _updateOutput?: (output: string | AnsiOutput) => void,
  ): Promise<ToolResult> {
    const manager = BackgroundTaskManager.getInstance();
    const taskId = await manager.startBackgroundTask(
      this.params.description,
      this.params.agent,
      this.params.prompt,
    );

    return {
      llmContent: `Background task started with ID: ${taskId}\n\nUse background_output(task_id="${taskId}") to retrieve results.`,
      returnDisplay: `Background task "${this.params.description}" started.\n\nTask ID: \`${taskId}\`\n\nUse \`background_output(task_id="${taskId}")\` to retrieve results.`,
    };
  }
}
