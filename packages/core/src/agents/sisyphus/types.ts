/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Categories for task delegation
 */
export interface CategoryConfig {
  model?: string;
  temperature?: number;
  description?: string;
  prompt_append?: string;
}

/**
 * Sisyphus-specific configuration
 */
export interface SisyphusConfig {
  thinkingBudget?: number;
  maxTurns?: number;
  maxTimeMinutes?: number;
  enableTodoContinuation?: boolean;
  enableKeywordDetection?: boolean;
}

/**
 * Task delegation arguments
 */
export interface DelegateTaskArgs {
  description: string;
  prompt: string;
  category?: string;
  subagent_type?: string;
  run_in_background: boolean;
  skills: string[];
  resume?: string;
}

/**
 * Background task arguments
 */
export interface BackgroundTaskArgs {
  description: string;
  prompt: string;
  agent: string;
}

/**
 * Background output arguments
 */
export interface BackgroundOutputArgs {
  task_id: string;
  block?: boolean;
  timeout?: number;
}

/**
 * Background cancel arguments
 */
export interface BackgroundCancelArgs {
  taskId?: string;
  all?: boolean;
}

/**
 * Background task status
 */
export type BackgroundTaskStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'error'
  | 'cancelled';

/**
 * Background task
 */
export interface BackgroundTask {
  id: string;
  description: string;
  agent: string;
  status: BackgroundTaskStatus;
  sessionID: string;
  queuedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  progress?: {
    lastTool?: string;
    lastMessage?: string;
    lastMessageAt?: Date;
  };
}

/**
 * Todo item for Sisyphus tracking
 */
export interface SisyphusTodo {
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  activeForm: string;
}

/**
 * Agent availability info
 */
export interface AvailableAgent {
  name: string;
  displayName: string;
  description: string;
  category?: string;
}

/**
 * Tool availability info
 */
export interface AvailableTool {
  name: string;
  description: string;
  category?: string;
}

/**
 * Skill availability info
 */
export interface AvailableSkill {
  name: string;
  description: string;
  trigger?: string[];
}

/**
 * Constants for Sisyphus defaults
 */
export const SISYPHUS_DEFAULTS = {
  THINKING_BUDGET: 32000,
  MAX_TURNS: 50,
  MAX_TIME_MINUTES: 60,
  PARALLEL_AGENTS: 3,
  POLL_INTERVAL_MS: 500,
  STABILITY_POLLS_REQUIRED: 3,
  MIN_STABILITY_TIME_MS: 10000,
} as const;

/**
 * Default categories for task delegation
 */
export const DEFAULT_CATEGORIES: Record<string, CategoryConfig> = {
  visual: {
    description: 'Tâches visuelles, frontend, UI/UX, design',
    temperature: 0.8,
  },
  'business-logic': {
    description: 'Logique métier, backend, architecture',
    temperature: 0.2,
  },
  writing: {
    description: 'Documentation, rédaction, prose',
    temperature: 0.7,
  },
  quick: {
    description: 'Tâches triviales, rapides',
    temperature: 0.1,
  },
  architecture: {
    description: "Décisions d'architecture (via Oracle)",
    temperature: 0.0,
  },
} as const;

/**
 * Megawork keywords for detection
 */
export const MEGAWORK_KEYWORDS = [
  'megawork',
  'megawork mode',
  'mega work',
  '/megawork',
] as const;

/**
 * Megawork system message
 */
export const MEGAWORK_SYSTEM_MESSAGE = `
⚡ MEGAWORK MODE ACTIVÉ ⚡

**DIRECTIVES ABSOLUES**:
1. TODO-OBSESSION: Crée des todos pour TOUTE tâche >2 étapes
2. DÉLÉGATION PAR DÉFAUT: Utilise delegate_task pour travail spécialisé
3. PARALLÉLISME: explore/librarian TOUJOURS en background
4. VÉRIFICATION OBLIGATOIRE: Après délégation, vérifie avec tes outils
5. EVIDENCE SEULEMENT: "Je pense" est interdit. Montre le code + ligne.

**RÈGLES D'OR**:
- Un seul todo "in_progress" à la fois
- Marque "completed" IMMÉDIATEMENT après fin (jamais de batch)
- Présente la délégation AVANT d'appeler (4 sections: Task, Outcome, Tools, Context)
- Reprends session (resume=session_id) pour corrections (70%+ économie tokens)

**AGENTS DISPONIBLES**:
- oracle: Architecture, décisions complexes (read-only)
- explore: Recherche interne (parallel-friendly)
- librarian: Documentation externe (parallel-friendly)
- frontend: UI/UX, design, animations

**CATÉGORIES DE DÉLÉGATION**:
- visual: Frontend, UI/UX (temp=0.8)
- business-logic: Backend, logique (temp=0.2)
- writing: Documentation (temp=0.7)
- quick: Tâches triviales (temp=0.1)

**EXÉCUTION**:
Reformule la demande de l'utilisateur en termes de:
1. Objectif principal
2. Sous-tâches identifiées
3. Agents à consulter
4. Ordre d'exécution

Puis commence avec todowrite().
`;

/**
 * Gets the Megawork system message
 *
 * @returns The Megawork activation message
 */
export function getMegaworkSystemMessage(): string {
  return MEGAWORK_SYSTEM_MESSAGE;
}
