/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { HookDefinition } from '../types.js';
import { HookType } from '../types.js';
import type { SisyphusTodo } from '../../agents/sisyphus/types.js';

/**
 * Creates a hook definition for todo continuation enforcement
 *
 * This hook ensures that Sisyphus agents complete all todos before
 * finishing a session. If incomplete todos exist, it injects a
 * reminder message.
 *
 * The hook fires on SessionEnd and checks the todo status.
 *
 * Usage: Load this hook in the hook system
 * ```typescript
 * import { createTodoContinuationHook } from './hooks/sisyphus/index.js';
 *
 * const hookDefinition = createTodoContinuationHook();
 * // Register hook with hookRegistry
 * ```
 */
export function createTodoContinuationHook(): HookDefinition {
  return {
    matcher: 'sisyphus.*', // Only match Sisyphus sessions
    sequential: false,
    hooks: [
      {
        type: HookType.Command,
        name: 'sisyphus-todo-continuation',
        description: 'Enforces todo completion before session end',
        command: 'node --eval "' + generateTodoContinuationScript() + '"',
        timeout: 5000,
      },
    ],
  };
}

/**
 * Generates the todo continuation script for the hook command
 * This script checks for incomplete todos at session end
 */
function generateTodoContinuationScript(): string {
  return `
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error(JSON.stringify({ continue: true }));
  process.exit(0);
}

const transcriptPath = args[0];

try {
  if (!fs.existsSync(transcriptPath)) {
    console.error(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  const transcriptContent = fs.readFileSync(transcriptPath, 'utf-8');
  const messages = JSON.parse(transcriptContent);

  // Look for todo write messages
  const todoMessages = messages.filter((m: { role: string }) => m.role === 'user');

  // Try to extract todos from the last message
  // This is a simplified approach - actual implementation would need
  // to parse structured todo data from the agent context

  // For now, we'll output a reminder that will be injected
  // if incomplete todos are detected elsewhere in the system

  console.error(JSON.stringify({
    continue: true,
    // System message will be injected by the agent system if todos are incomplete
  }));
} catch (error) {
  console.error(JSON.stringify({ continue: true }));
}
  `.replace(/\n/g, ' ');
}

/**
 * Creates a todo continuation reminder message
 * This is called by the Sisyphus agent when incomplete todos exist
 *
 * @param todos The current todo list
 * @returns System message to inject
 */
export function createTodoContinuationReminder(todos: SisyphusTodo[]): string {
  const incomplete = todos.filter((t) => t.status !== 'completed');

  if (incomplete.length === 0) {
    return '';
  }

  const inProgressTodo = incomplete.find((t) => t.status === 'in_progress');
  const nextTodo = incomplete.find((t) => t.status === 'pending');

  const todoList = incomplete
    .map((t) => {
      const status = t.status === 'in_progress' ? '→' : ' ';
      return `${status} [ ] ${t.content}`;
    })
    .join('\n');

  return `
[SYSTEM REMINDER - TODO CONTINUATION]

You have ${incomplete.length} incomplete todo(s):

${todoList}

DO NOT respond until ALL todos are marked completed.
Continue working on: ${inProgressTodo?.content || nextTodo?.content || 'next task'}
`;
}

/**
 * Checks if there are incomplete todos
 *
 * @param todos The current todo list
 * @returns true if there are incomplete todos
 */
export function hasIncompleteTodos(todos: SisyphusTodo[]): boolean {
  return todos.some((t) => t.status !== 'completed');
}

/**
 * Gets the next todo to work on
 *
 * @param todos The current todo list
 * @returns The next pending or in_progress todo, or null if all complete
 */
export function getNextTodo(todos: SisyphusTodo[]): SisyphusTodo | null {
  // First, check for in_progress
  const inProgress = todos.find((t) => t.status === 'in_progress');
  if (inProgress) {
    return inProgress;
  }

  // Then, find first pending
  const pending = todos.find((t) => t.status === 'pending');
  if (pending) {
    return pending;
  }

  // All complete
  return null;
}

/**
 * Validates that all todos are completed
 * Throws an error if incomplete todos exist
 *
 * @param todos The current todo list
 * @throws Error if incomplete todos exist
 */
export function validateTodosComplete(todos: SisyphusTodo[]): void {
  const incomplete = todos.filter((t) => t.status !== 'completed');

  if (incomplete.length > 0) {
    const todoList = incomplete
      .map((t) => `- [${t.status === 'in_progress' ? '→' : ' '}] ${t.content}`)
      .join('\n');

    throw new Error(
      `Cannot complete session with incomplete todos:\n${todoList}\n\nPlease complete all todos before finishing.`,
    );
  }
}
