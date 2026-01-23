/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Sisyphus Agents - Multi-agent orchestration system for Devora CLI
 *
 * This module exports all Sisyphus-related agents:
 * - Sisyphus: Main orchestrator with todo-obsession
 * - Oracle: Read-only architecture consultant
 * - Explore: Accelerated codebase search specialist
 * - Librarian: Documentation research specialist
 * - Frontend: UI/UX design specialist
 */

export { SisyphusAgent } from './sisyphus.js';
export { OracleAgent } from './oracle.js';
export { ExploreAgent } from './explore.js';
export { LibrarianAgent } from './librarian.js';
export { FrontendAgent } from './frontend.js';

// Re-export types for convenience
export type {
  CategoryConfig,
  SisyphusConfig,
  DelegateTaskArgs,
  BackgroundTaskArgs,
  BackgroundOutputArgs,
  BackgroundCancelArgs,
  BackgroundTaskStatus,
  BackgroundTask,
  SisyphusTodo,
  AvailableAgent,
  AvailableTool,
  AvailableSkill,
} from './types.js';

export {
  DEFAULT_CATEGORIES,
  SISYPHUS_DEFAULTS,
  MEGAWORK_KEYWORDS,
  MEGAWORK_SYSTEM_MESSAGE,
  getMegaworkSystemMessage,
} from './types.js';

/**
 * Available Sisyphus agents registry
 *
 * This can be used for introspection or dynamic agent selection
 */
export const SISYPHUS_AGENTS = [
  'sisyphus',
  'oracle',
  'explore',
  'librarian',
  'frontend',
] as const;

export type SisyphusAgentName = (typeof SISYPHUS_AGENTS)[number];

/**
 * Agent descriptions for display/help
 */
export const AGENT_DESCRIPTIONS: Record<SisyphusAgentName, string> = {
  sisyphus:
    'Main orchestrator with todo-obsession. Delegates strategically, executes with parallel background tasks.',
  oracle:
    'Read-only architecture consultant. Analyzes decisions, identifies problems, proposes alternatives.',
  explore:
    'Accelerated codebase search specialist. Uses glob/grep in parallel for rapid discovery.',
  librarian:
    'Documentation research specialist. Searches web for official docs, GitHub examples, best practices.',
  frontend:
    'UI/UX design specialist. Creates distinctive, production-grade interfaces with smooth animations.',
} as const;
