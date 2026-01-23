/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Sisyphus Tools - Multi-agent orchestration tools for Devora CLI
 *
 * This module exports all Sisyphus-related tools:
 * - delegate_task: Enhanced agent delegation with categories
 * - background_task: Launches asynchronous agent tasks
 * - background_output: Retrieves results from background tasks
 * - background_cancel: Cancels running background tasks
 */

export { DelegateTaskTool, BackgroundTaskManager } from './delegate-task.js';
export { BackgroundTaskTool } from './background-task.js';
export { BackgroundOutputTool } from './background-output.js';
export { BackgroundCancelTool } from './background-cancel.js';

// Re-export types from each file
export type { BackgroundTaskParams } from './background-task.js';
export type { BackgroundOutputParams } from './background-output.js';
export type { BackgroundCancelParams } from './background-cancel.js';

// DelegateTaskArgs is defined in agents/sisyphus/types.ts, re-export it for convenience
export type {
  DelegateTaskArgs,
  BackgroundTaskArgs,
  BackgroundOutputArgs,
  BackgroundCancelArgs,
  BackgroundTaskStatus,
  BackgroundTask,
} from '../../agents/sisyphus/types.js';

/**
 * Available Sisyphus tools registry
 */
export const SISYPHUS_TOOLS = [
  'delegate_task',
  'background_task',
  'background_output',
  'background_cancel',
] as const;

export type SisyphusToolName = (typeof SISYPHUS_TOOLS)[number];
