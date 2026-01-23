/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import OpenAI from 'openai';
import type {
  OpenRouterChatRequest,
  OpenRouterChatResponse,
  OpenRouterModelsResponse,
} from './types.js';

/**
 * OpenRouter API client wrapper using OpenAI SDK with custom base URL
 * Documentation: https://openrouter.ai/docs
 */
export class OpenRouterClient {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
    });
  }

  /**
   * Get list of available models from OpenRouter
   */
  async getModels(): Promise<OpenRouterModelsResponse> {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        Authorization: `Bearer ${this.client.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.statusText}`);
    }

    return (await response.json()) as OpenRouterModelsResponse;
  }

  /**
   * Send a chat completion request to OpenRouter
   */
  async chat(request: OpenRouterChatRequest): Promise<OpenRouterChatResponse> {
    const response = await this.client.chat.completions.create({
      model: request.model,
      messages: request.messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.max_tokens ?? 4096,
      top_p: request.top_p,
      stream: false,
    });

    return response as OpenRouterChatResponse;
  }

  /**
   * Send a streaming chat completion request to OpenRouter
   */
  async *streamChat(request: OpenRouterChatRequest): AsyncGenerator<unknown> {
    const stream = await this.client.chat.completions.create({
      model: request.model,
      messages: request.messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.max_tokens ?? 4096,
      top_p: request.top_p,
      stream: true,
    });

    for await (const chunk of stream) {
      yield chunk;
    }
  }

  /**
   * Generate embeddings using OpenRouter
   * Note: Not all models support embeddings
   */
  async embeddings(
    text: string,
    model: string = 'openai/text-embedding-ada-002',
  ): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model,
      input: text,
    });

    return response.data[0].embedding;
  }
}
