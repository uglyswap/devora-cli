/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Sisyphus Hooks - Multi-agent orchestration hooks for Devora CLI
 *
 * This module exports all Sisyphus-related hooks:
 * - createMegaworkKeywordDetectorHook: Detects megawork keywords and activates Sisyphus mode
 * - createTodoContinuationHook: Enforces todo completion before session end
 */

export {
  createMegaworkKeywordDetectorHook,
  detectMegaworkKeywords,
  getMegaworkSystemMessage,
  createMegaworkDetectionResult,
} from './keyword-detector.js';

export {
  createTodoContinuationHook,
  createTodoContinuationReminder,
  hasIncompleteTodos,
  getNextTodo,
  validateTodosComplete,
} from './todo-continuation.js';

/**
 * Available Sisyphus hooks
 */
export const SISYPHUS_HOOKS = [
  'megawork-keyword-detector',
  'sisyphus-todo-continuation',
] as const;

export type SisyphusHookName = (typeof SISYPHUS_HOOKS)[number];

/**
 * Hook descriptions for display/help
 */
export const HOOK_DESCRIPTIONS: Record<SisyphusHookName, string> = {
  'megawork-keyword-detector':
    'Detects Megawork keywords (megawork, /megawork, etc.) and injects Sisyphus activation message',
  'sisyphus-todo-continuation':
    'Enforces todo completion before session end, preventing incomplete work',
} as const;
