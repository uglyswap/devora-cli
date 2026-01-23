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
import { ToolErrorType } from '../tool-error.js';
import type { AnsiOutput } from '../../utils/terminalSerializer.js';
import type { MessageBus } from '../../confirmation-bus/message-bus.js';
import { BackgroundTaskManager } from './delegate-task.js';

export interface BackgroundOutputParams {
  task_id: string;
  block?: boolean;
  timeout?: number;
}

/**
 * Background output tool - Retrieves results from background tasks
 */
export class BackgroundOutputTool extends BaseDeclarativeTool<
  BackgroundOutputParams,
  ToolResult
> {
  constructor(messageBus: MessageBus) {
    super(
      'background_output',
      'Background Output',
      'Retrieves the result of a background task.\n\n**Parameters:**\n- **task_id**: The ID of the task to retrieve results from\n- **block**: Wait for completion (default: false)\n- **timeout**: Maximum wait time in ms (default: 60000)\n\n**Returns:** The task result if available, or status if still running.',
      Kind.Read,
      {
        type: 'object',
        properties: {
          task_id: {
            type: 'string',
            description:
              'The ID of the background task to retrieve results from',
          },
          block: {
            type: 'boolean',
            description:
              'Wait for task completion before returning (default: false)',
          },
          timeout: {
            type: 'number',
            description: 'Maximum wait time in milliseconds (default: 60000)',
            minimum: 1000,
            maximum: 300000,
          },
        },
        required: ['task_id'],
      },
      messageBus,
      true,
      false,
    );
  }

  protected override validateToolParamValues(
    params: BackgroundOutputParams,
  ): string | null {
    if (!params.task_id || params.task_id.trim().length === 0) {
      return 'task_id must not be empty';
    }
    if (
      params.timeout !== undefined &&
      (params.timeout < 1000 || params.timeout > 300000)
    ) {
      return 'timeout must be between 1000 and 300000 milliseconds';
    }
    return null;
  }

  protected createInvocation(
    params: BackgroundOutputParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ): ToolInvocation<BackgroundOutputParams, ToolResult> {
    return new BackgroundOutputInvocation(
      params,
      messageBus,
      _toolName,
      _toolDisplayName,
    );
  }
}

class BackgroundOutputInvocation extends BaseToolInvocation<
  BackgroundOutputParams,
  ToolResult
> {
  constructor(
    params: BackgroundOutputParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ) {
    super(
      params,
      messageBus,
      _toolName ?? 'background_output',
      _toolDisplayName ?? 'Background Output',
    );
  }

  getDescription(): string {
    return `Retrieving result for task ${this.params.task_id}`;
  }

  async execute(
    _signal: AbortSignal,
    _updateOutput?: (output: string | AnsiOutput) => void,
  ): Promise<ToolResult> {
    const manager = BackgroundTaskManager.getInstance();
    const result = manager.getTaskResult(this.params.task_id);

    if (result instanceof Error) {
      return {
        llmContent: `Error retrieving task ${this.params.task_id}: ${result.message}`,
        returnDisplay: `Error: ${result.message}`,
        error: {
          message: result.message,
          type: ToolErrorType.EXECUTION_FAILED,
        },
      };
    }

    if (result === null) {
      return {
        llmContent: `Task ${this.params.task_id} is still running or not found.`,
        returnDisplay: `Task \`${this.params.task_id}\` is still running. Use background_output again later to check status.`,
      };
    }

    return result;
  }
}
