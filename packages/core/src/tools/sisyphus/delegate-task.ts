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
import type { AgentRegistry } from '../../agents/registry.js';
import type { Config } from '../../config/config.js';
import { SubagentToolWrapper } from '../../agents/subagent-tool-wrapper.js';
import { SchemaValidator } from '../../utils/schemaValidator.js';
import { debugLogger } from '../../utils/debugLogger.js';
import type { DelegateTaskArgs } from '../../agents/sisyphus/types.js';
import { DEFAULT_CATEGORIES } from '../../agents/sisyphus/types.js';

/**
 * Sisyphus delegate task tool - Enhanced agent delegation with categories and background support
 */
export class DelegateTaskTool extends BaseDeclarativeTool<
  DelegateTaskArgs,
  ToolResult
> {
  constructor(
    private readonly registry: AgentRegistry,
    private readonly config: Config,
    messageBus: MessageBus,
  ) {
    // Build dynamic schema based on available agents
    const definitions = registry.getAllDefinitions();
    const agentNames = definitions.map((d) => d.name);

    // Build schema with anyOf for subagent_type selection
    const agentSchemas = definitions.map((def) => ({
      type: 'object' as const,
      properties: {
        description: {
          type: 'string' as const,
          description:
            'Short description (3-5 words) of what this task will do',
        },
        prompt: {
          type: 'string' as const,
          description: 'Detailed prompt for the agent',
        },
        subagent_type: {
          const: def.name,
          description: def.description,
        },
        category: {
          type: 'string' as const,
          description: 'DEPRECATED - Use subagent_type directly',
          enum: Object.keys(DEFAULT_CATEGORIES),
        },
        run_in_background: {
          type: 'boolean' as const,
          description:
            'Execute task asynchronously (NOTE: Background execution requires additional infrastructure)',
        },
        skills: {
          type: 'array' as const,
          items: { type: 'string' as const },
          description: 'Skills to load for this task (empty array if none)',
        },
        resume: {
          type: 'string' as const,
          description:
            'Session ID to resume (for efficiency - 70%+ token savings)',
        },
      },
      required: ['description', 'prompt', 'run_in_background', 'skills'],
    }));

    const parameterSchema = {
      anyOf: agentSchemas,
    };

    const availableCategories = Object.entries(DEFAULT_CATEGORIES)
      .map(
        ([name, config]) =>
          `- **${name}** (${config.temperature}): ${config.description}`,
      )
      .join('\n');

    const toolDescription = `Delegates tasks to specialized Sisyphus agents with categories.

**Available Subagents:**
${agentNames.map((name) => `- **${name}**`).join('\n')}

**Available Categories:**
${availableCategories}

**Parameters:**
- **description**: Short task description (3-5 words)
- **prompt**: Detailed prompt for the agent
- **subagent_type**: Direct agent selection (oracle, explore, librarian, frontend)
- **run_in_background**: Execute asynchronously (requires background task infrastructure)
- **skills**: Skills to load (empty array if none)
- **resume**: Session ID to resume for efficiency

**Usage:**
\`\`\`
# Direct agent delegation
delegate_task(
  description="Analyze architecture",
  prompt="Review the authentication system...",
  subagent_type="oracle",
  run_in_background=false,
  skills=[]
)

# Category-based (spawns Sisyphus-Junior with adjusted temperature)
delegate_task(
  description="Create UI component",
  prompt="Build a login form with...",
  category="visual",
  run_in_background=false,
  skills=[]
)
\`\`\`
`;

    super(
      'delegate_task',
      'Delegate Task',
      toolDescription,
      Kind.Think,
      parameterSchema,
      messageBus,
      true,
      true,
    );
  }

  protected override validateToolParamValues(
    params: DelegateTaskArgs,
  ): string | null {
    // Validate mutually exclusive category and subagent_type
    if (params.category && params.subagent_type) {
      return 'Cannot specify both "category" and "subagent_type". Use one or the other.';
    }

    // Validate category exists
    if (params.category && !(params.category in DEFAULT_CATEGORIES)) {
      return `Unknown category: "${params.category}". Available categories: ${Object.keys(DEFAULT_CATEGORIES).join(', ')}`;
    }

    // Validate subagent_type exists
    if (params.subagent_type) {
      const definition = this.registry.getDefinition(params.subagent_type);
      if (!definition) {
        const availableAgents = this.registry
          .getAllDefinitions()
          .map((def) => def.name)
          .join(', ');
        return `Unknown agent: "${params.subagent_type}". Available agents: ${availableAgents}`;
      }
    }

    // Background execution requires infrastructure (not fully implemented yet)
    if (params.run_in_background) {
      debugLogger.log(
        'INFO',
        'Background task execution requested. This feature requires additional infrastructure and may not work fully yet.',
      );
    }

    return null;
  }

  protected createInvocation(
    params: DelegateTaskArgs,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ): ToolInvocation<DelegateTaskArgs, ToolResult> {
    return new DelegateTaskInvocation(
      params,
      this.registry,
      this.config,
      messageBus,
      _toolName,
      _toolDisplayName,
    );
  }
}

class DelegateTaskInvocation extends BaseToolInvocation<
  DelegateTaskArgs,
  ToolResult
> {
  constructor(
    params: DelegateTaskArgs,
    private readonly registry: AgentRegistry,
    private readonly config: Config,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ) {
    super(
      params,
      messageBus,
      _toolName ?? 'delegate_task',
      _toolDisplayName ?? 'Delegate Task',
    );
  }

  getDescription(): string {
    const target =
      this.params.subagent_type || this.params.category || 'sisyphus';
    const mode = this.params.run_in_background ? ' (background)' : '';
    return `Delegating "${this.params.description}" to ${target}${mode}`;
  }

  async execute(
    signal: AbortSignal,
    updateOutput?: (output: string | AnsiOutput) => void,
  ): Promise<ToolResult> {
    // Determine target agent
    let agentName: string;
    let temperature: number | undefined;

    if (this.params.subagent_type) {
      // Direct agent delegation
      agentName = this.params.subagent_type;
    } else if (this.params.category) {
      // Category-based delegation - use Sisyphus with adjusted temperature
      agentName = 'sisyphus';
      const categoryConfig =
        DEFAULT_CATEGORIES[
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
          this.params.category as keyof typeof DEFAULT_CATEGORIES
        ];
      temperature = categoryConfig.temperature;
    } else {
      // Default to sisyphus
      agentName = 'sisyphus';
    }

    // Get agent definition
    const definition = this.registry.getDefinition(agentName);
    if (!definition) {
      throw new Error(`Agent '${agentName}' not found in registry`);
    }

    // Build agent arguments
    const agentArgs: Record<string, unknown> = {
      task: this.params.prompt,
      ...(this.params.resume ? { resume_session: this.params.resume } : {}),
    };

    // Handle temperature override for category-based delegation
    // Note: This would need to be integrated with model config service
    if (temperature !== undefined) {
      debugLogger.log(
        'INFO',
        `Category '${this.params.category}' requested temperature ${temperature}`,
      );
      // TODO: Apply temperature override via model config service
    }

    // Validate agent arguments
    const validationError = SchemaValidator.validate(
      definition.inputConfig.inputSchema,
      agentArgs,
    );

    if (validationError) {
      throw new Error(
        `Invalid arguments for agent '${definition.name}': ${validationError}`,
      );
    }

    // Build subagent invocation
    const wrapper = new SubagentToolWrapper(
      definition,
      this.config,
      this.messageBus,
    );
    const invocation = wrapper.build(agentArgs);

    // Check for cancellation
    if (signal.aborted) {
      throw new Error('Task cancelled');
    }

    // Execute the task
    // NOTE: Background execution is not fully implemented
    // For now, all tasks execute synchronously
    const result = await invocation.execute(signal, updateOutput);

    // Return result with metadata
    return {
      ...result,
      llmContent: Array.isArray(result.llmContent)
        ? result.llmContent
        : [result.llmContent],
      returnDisplay: `Task "${this.params.description}" delegated to ${agentName} completed.`,
    };
  }
}

/**
 * Background task manager for Sisyphus
 *
 * This would manage background task execution, polling, and result collection.
 * For now, this is a placeholder for future implementation.
 *
 * Full implementation would require:
 * - Task queue management
 * - Polling mechanism for task completion
 * - Result storage and retrieval
 * - Stability detection for async operations
 */
export class BackgroundTaskManager {
  private static instance: BackgroundTaskManager | null = null;
  private tasks: Map<
    string,
    {
      id: string;
      description: string;
      agent: string;
      status: 'pending' | 'running' | 'completed' | 'error' | 'cancelled';
      result?: ToolResult;
      error?: Error;
    }
  > = new Map();

  static getInstance(): BackgroundTaskManager {
    if (!BackgroundTaskManager.instance) {
      BackgroundTaskManager.instance = new BackgroundTaskManager();
    }
    return BackgroundTaskManager.instance;
  }

  /**
   * Start a background task
   * NOTE: This is a placeholder. Full implementation requires async task execution.
   */
  async startBackgroundTask(
    description: string,
    agent: string,
    _prompt: string,
  ): Promise<string> {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.tasks.set(taskId, {
      id: taskId,
      description,
      agent,
      status: 'pending',
    });

    debugLogger.log('INFO', `Background task ${taskId} queued for ${agent}`);

    // TODO: Implement actual background execution
    // For now, mark as completed immediately
    this.tasks.set(taskId, {
      id: taskId,
      description,
      agent,
      status: 'completed',
    });

    return taskId;
  }

  /**
   * Get background task result
   */
  getTaskResult(taskId: string): ToolResult | Error | null {
    const task = this.tasks.get(taskId);
    if (!task) {
      return new Error(`Task ${taskId} not found`);
    }

    if (task.status === 'error' && task.error) {
      return task.error;
    }

    if (task.status === 'completed' && task.result) {
      return task.result;
    }

    return null; // Task not complete yet
  }

  /**
   * Cancel a background task
   */
  cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) {
      return false;
    }

    if (task.status === 'pending' || task.status === 'running') {
      this.tasks.set(taskId, {
        ...task,
        status: 'cancelled',
      });
      return true;
    }

    return false;
  }

  /**
   * Cancel all background tasks
   */
  cancelAll(): void {
    for (const [taskId, task] of this.tasks.entries()) {
      if (task.status === 'pending' || task.status === 'running') {
        this.tasks.set(taskId, {
          ...task,
          status: 'cancelled',
        });
      }
    }
  }

  /**
   * Clean up completed tasks
   */
  cleanup(olderThanMs: number = 3600000): void {
    const cutoff = Date.now() - olderThanMs;
    for (const [taskId, task] of this.tasks.entries()) {
      if (
        (task.status === 'completed' || task.status === 'cancelled') &&
        taskId.split('_')[1] &&
        parseInt(taskId.split('_')[1], 10) < cutoff
      ) {
        this.tasks.delete(taskId);
      }
    }
  }
}
