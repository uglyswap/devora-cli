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

export interface BackgroundCancelParams {
  taskId?: string;
  all?: boolean;
}

/**
 * Background cancel tool - Cancels running background tasks
 */
export class BackgroundCancelTool extends BaseDeclarativeTool<
  BackgroundCancelParams,
  ToolResult
> {
  constructor(messageBus: MessageBus) {
    super(
      'background_cancel',
      'Background Cancel',
      'Cancels background tasks.\n\n**Parameters:**\n- **taskId**: Specific task ID to cancel (optional)\n- **all**: Cancel all running tasks (default: false)\n\n**Usage:**\n- Cancel one task: background_cancel(taskId="task_abc123")\n- Cancel all: background_cancel(all=true)',
      Kind.Delete,
      {
        type: 'object',
        properties: {
          taskId: {
            type: 'string',
            description: 'Specific task ID to cancel',
          },
          all: {
            type: 'boolean',
            description: 'Cancel all running background tasks',
          },
        },
        required: [],
      },
      messageBus,
      true,
      false,
    );
  }

  protected override validateToolParamValues(
    params: BackgroundCancelParams,
  ): string | null {
    if (params.taskId && params.all) {
      return 'Cannot specify both taskId and all. Use one or the other.';
    }
    if (!params.taskId && !params.all) {
      return 'Must specify either taskId or all=true';
    }
    return null;
  }

  protected createInvocation(
    params: BackgroundCancelParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ): ToolInvocation<BackgroundCancelParams, ToolResult> {
    return new BackgroundCancelInvocation(
      params,
      messageBus,
      _toolName,
      _toolDisplayName,
    );
  }
}

class BackgroundCancelInvocation extends BaseToolInvocation<
  BackgroundCancelParams,
  ToolResult
> {
  constructor(
    params: BackgroundCancelParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ) {
    super(
      params,
      messageBus,
      _toolName ?? 'background_cancel',
      _toolDisplayName ?? 'Background Cancel',
    );
  }

  getDescription(): string {
    if (this.params.all) {
      return 'Cancelling all background tasks';
    }
    return `Cancelling task ${this.params.taskId}`;
  }

  async execute(
    _signal: AbortSignal,
    _updateOutput?: (output: string | AnsiOutput) => void,
  ): Promise<ToolResult> {
    const manager = BackgroundTaskManager.getInstance();

    if (this.params.all) {
      manager.cancelAll();
      return {
        llmContent: 'All background tasks have been cancelled.',
        returnDisplay: 'All running background tasks have been cancelled.',
      };
    }

    if (this.params.taskId) {
      const cancelled = manager.cancelTask(this.params.taskId);
      if (cancelled) {
        return {
          llmContent: `Task ${this.params.taskId} has been cancelled.`,
          returnDisplay: `Task \`${this.params.taskId}\` has been cancelled.`,
        };
      } else {
        return {
          llmContent: `Task ${this.params.taskId} not found or already completed.`,
          returnDisplay: `Task \`${this.params.taskId}\` not found or already completed.`,
        };
      }
    }

    return {
      llmContent: 'No action taken - specify taskId or all=true',
      returnDisplay: 'No action taken. Specify either taskId or all=true.',
    };
  }
}
