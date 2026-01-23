/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ToolResult } from './tools.js';
import { BaseDeclarativeTool, BaseToolInvocation, Kind } from './tools.js';
import { ToolErrorType } from './tool-error.js';
import { SEQUENTIAL_THINKING_TOOL_NAME } from './tool-names.js';
import type { MessageBus } from '../confirmation-bus/message-bus.js';

/**
 * Parameters for the Sequential Thinking tool
 */
interface SequentialThinkingParams {
  thought: string;
  nextThoughtNeeded: boolean;
  thoughtNumber: number;
  totalThoughts: number;
  isRevision?: boolean;
  revisesThought?: number;
  branchFromThought?: number;
  branchId?: string;
  needsMoreThoughts?: boolean;
}

/**
 * Internal representation of a thought in the history
 */
interface ThoughtData {
  thought: string;
  thoughtNumber: number;
  totalThoughts: number;
  isRevision?: boolean;
  revisesThought?: number;
  branchFromThought?: number;
  branchId?: string;
  needsMoreThoughts?: boolean;
  nextThoughtNeeded: boolean;
  timestamp: number;
}

/**
 * Response format for Sequential Thinking
 */
interface SequentialThinkingResponse {
  thoughtNumber: number;
  totalThoughts: number;
  nextThoughtNeeded: boolean;
  branches: string[];
  thoughtHistoryLength: number;
  currentThought: string;
  isRevision?: boolean;
  revisesThought?: number;
  branchId?: string;
}

/**
 * Sequential Thinking Server - Manages thought history and branching
 * This class contains the core business logic for the sequential thinking process.
 */
class SequentialThinkingServer {
  private thoughtHistory: ThoughtData[] = [];
  private branches: Record<string, ThoughtData[]> = {};

  /**
   * Process a thought and update the internal state
   */
  processThought(input: SequentialThinkingParams): SequentialThinkingResponse {
    // Adjust totalThoughts if thoughtNumber exceeds it
    if (input.thoughtNumber > input.totalThoughts) {
      input.totalThoughts = input.thoughtNumber;
    }

    // Create thought data with timestamp
    const thoughtData: ThoughtData = {
      thought: input.thought,
      thoughtNumber: input.thoughtNumber,
      totalThoughts: input.totalThoughts,
      isRevision: input.isRevision,
      revisesThought: input.revisesThought,
      branchFromThought: input.branchFromThought,
      branchId: input.branchId,
      needsMoreThoughts: input.needsMoreThoughts,
      nextThoughtNeeded: input.nextThoughtNeeded,
      timestamp: Date.now(),
    };

    // Add to main history
    this.thoughtHistory.push(thoughtData);

    // Handle branching
    if (input.branchFromThought && input.branchId) {
      if (!this.branches[input.branchId]) {
        this.branches[input.branchId] = [];
      }
      this.branches[input.branchId].push(thoughtData);
    }

    // Build response
    return {
      thoughtNumber: input.thoughtNumber,
      totalThoughts: input.totalThoughts,
      nextThoughtNeeded: input.nextThoughtNeeded,
      branches: Object.keys(this.branches),
      thoughtHistoryLength: this.thoughtHistory.length,
      currentThought: input.thought,
      isRevision: input.isRevision,
      revisesThought: input.revisesThought,
      branchId: input.branchId,
    };
  }

  /**
   * Get the current thought history
   */
  getThoughtHistory(): ThoughtData[] {
    return [...this.thoughtHistory];
  }

  /**
   * Get thoughts for a specific branch
   */
  getBranchThoughts(branchId: string): ThoughtData[] {
    return this.branches[branchId] ? [...this.branches[branchId]] : [];
  }

  /**
   * Get all active branch IDs
   */
  getBranches(): string[] {
    return Object.keys(this.branches);
  }

  /**
   * Reset the thinking process (clear history and branches)
   */
  reset(): void {
    this.thoughtHistory = [];
    this.branches = {};
  }

  /**
   * Get the current state summary
   */
  getStateSummary(): {
    totalThoughts: number;
    activeBranches: number;
    currentThoughtNumber: number;
  } {
    return {
      totalThoughts: this.thoughtHistory.length,
      activeBranches: Object.keys(this.branches).length,
      currentThoughtNumber: this.thoughtHistory.length,
    };
  }
}

/**
 * Invocation for Sequential Thinking tool
 */
class SequentialThinkingInvocation extends BaseToolInvocation<
  SequentialThinkingParams,
  ToolResult
> {
  constructor(
    params: SequentialThinkingParams,
    messageBus: MessageBus,
    private readonly server: SequentialThinkingServer,
    toolName?: string,
    displayName?: string,
  ) {
    super(params, messageBus, toolName, displayName);
  }

  getDescription(): string {
    const revisionText = this.params.isRevision
      ? ` (revising thought ${this.params.revisesThought})`
      : '';
    const branchText = this.params.branchId
      ? ` (branch ${this.params.branchId})`
      : '';
    return `Sequential thinking step ${this.params.thoughtNumber}/${this.params.totalThoughts}${revisionText}${branchText}`;
  }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    try {
      const response = this.server.processThought(this.params);

      // Format the response for display
      const displayLines = [
        `Thought ${response.thoughtNumber}/${response.totalThoughts}`,
        response.isRevision
          ? `  (Revision of thought ${response.revisesThought})`
          : '',
        response.branchId ? `  Branch: ${response.branchId}` : '',
        '',
        response.currentThought,
        '',
        `Next thought needed: ${response.nextThoughtNeeded ? 'Yes' : 'No'}`,
        `History length: ${response.thoughtHistoryLength}`,
        response.branches.length > 0
          ? `Active branches: ${response.branches.join(', ')}`
          : '',
      ].filter(Boolean);

      const returnDisplay = displayLines.join('\n');

      return {
        llmContent: JSON.stringify(response),
        returnDisplay,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        llmContent: JSON.stringify({
          success: false,
          error: `Sequential thinking failed: ${errorMessage}`,
        }),
        returnDisplay: `Error: ${errorMessage}`,
        error: {
          message: errorMessage,
          type: ToolErrorType.EXECUTION_FAILED,
        },
      };
    }
  }
}

/**
 * Sequential Thinking Tool
 *
 * A detailed tool for dynamic and reflective problem-solving through thoughts.
 * This tool enables multi-step reasoning with support for:
 * - Sequential thought progression
 * - Revision of previous thoughts
 * - Branching into alternative reasoning paths
 * - Dynamic adjustment of thought count
 *
 * Use this tool when:
 * - Breaking down complex problems into steps
 * - Analyzing problems requiring step-by-step breakdown
 * - Multi-step reasoning where each step builds on previous ones
 * - Planning and design decisions
 * - Debugging complex issues
 */
export class SequentialThinkingTool extends BaseDeclarativeTool<
  SequentialThinkingParams,
  ToolResult
> {
  static readonly Name = SEQUENTIAL_THINKING_TOOL_NAME;

  private readonly server: SequentialThinkingServer;

  constructor(messageBus: MessageBus) {
    const parameterSchema = {
      type: 'object' as const,
      properties: {
        thought: {
          type: 'string' as const,
          description: 'Your current thinking step',
        },
        nextThoughtNeeded: {
          type: 'boolean' as const,
          description: 'Whether another thought step is needed after this one',
        },
        thoughtNumber: {
          type: 'number' as const,
          description: 'Current thought number (starts at 1)',
          minimum: 1,
        },
        totalThoughts: {
          type: 'number' as const,
          description: 'Estimated total number of thoughts (can be adjusted)',
          minimum: 1,
        },
        isRevision: {
          type: 'boolean' as const,
          description: 'Whether this thought revises a previous thought',
        },
        revisesThought: {
          type: 'number' as const,
          description:
            'The thought number being revised (required if isRevision is true)',
          minimum: 1,
        },
        branchFromThought: {
          type: 'number' as const,
          description:
            'The thought number to branch from (for alternative reasoning paths)',
          minimum: 1,
        },
        branchId: {
          type: 'string' as const,
          description: 'Identifier for this branch (required when branching)',
        },
        needsMoreThoughts: {
          type: 'boolean' as const,
          description:
            'Whether more thoughts are needed beyond the current total',
        },
      },
      required: [
        'thought',
        'nextThoughtNeeded',
        'thoughtNumber',
        'totalThoughts',
      ],
    };

    const toolDescription = `A detailed tool for dynamic and reflective problem-solving through thoughts.

This tool enables structured multi-step reasoning with the following features:

**Core Parameters:**
- \`thought\`: Your current thinking step (text)
- \`thoughtNumber\`: Current step number (1, 2, 3, ...)
- \`totalThoughts\`: Estimated total thoughts (auto-adjusts if exceeded)
- \`nextThoughtNeeded\`: Set to true until reaching your final conclusion

**Advanced Features:**
- \`isRevision\` + \`revisesThought\`: Revise a previous thought
- \`branchFromThought\` + \`branchId\`: Create alternative reasoning paths
- \`needsMoreThoughts\`: Signal that more thoughts are needed

**When to Use:**
- Complex problems requiring step-by-step breakdown
- Multi-step reasoning where each step builds on previous ones
- Planning and design decisions
- Debugging complex issues
- Architectural decisions requiring deep analysis

**Example:**
\`\`\`
Thought 1/5: "I need to analyze the authentication flow..."
nextThoughtNeeded: true

Thought 2/5: "The current flow uses JWT tokens stored in cookies..."
nextThoughtNeeded: true

Thought 3/5: "I notice a potential security issue with X..."
nextThoughtNeeded: true

Thought 4/5: "To fix this, I should implement Y..."
nextThoughtNeeded: true

Thought 5/5: "Final solution: Implement Z with proper validation..."
nextThoughtNeeded: false
\`\`\``;

    super(
      SequentialThinkingTool.Name,
      'Sequential Thinking',
      toolDescription,
      Kind.Think,
      parameterSchema,
      messageBus,
      true,
      false,
    );

    // Create a new server instance for this tool
    this.server = new SequentialThinkingServer();
  }

  protected override validateToolParamValues(
    params: SequentialThinkingParams,
  ): string | null {
    // Validate thought is not empty
    if (!params.thought || params.thought.trim().length === 0) {
      return 'Parameter "thought" must be a non-empty string.';
    }

    // Validate thoughtNumber is positive
    if (params.thoughtNumber < 1) {
      return 'Parameter "thoughtNumber" must be at least 1.';
    }

    // Validate totalThoughts is positive
    if (params.totalThoughts < 1) {
      return 'Parameter "totalThoughts" must be at least 1.';
    }

    // Validate revision consistency
    if (params.isRevision && !params.revisesThought) {
      return 'Parameter "revisesThought" is required when "isRevision" is true.';
    }

    if (!params.isRevision && params.revisesThought) {
      return 'Parameter "isRevision" must be true when "revisesThought" is provided.';
    }

    // Validate branching consistency
    if (params.branchFromThought && !params.branchId) {
      return 'Parameter "branchId" is required when "branchFromThought" is provided.';
    }

    if (params.branchId && !params.branchFromThought) {
      return 'Parameter "branchFromThought" is required when "branchId" is provided.';
    }

    return null;
  }

  protected createInvocation(
    params: SequentialThinkingParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ) {
    return new SequentialThinkingInvocation(
      params,
      messageBus,
      this.server,
      _toolName ?? this.name,
      _toolDisplayName ?? this.displayName,
    );
  }

  /**
   * Get the underlying server instance (for testing/inspection)
   */
  getServer(): SequentialThinkingServer {
    return this.server;
  }
}
