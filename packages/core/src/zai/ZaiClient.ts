/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import OpenAI from 'openai';
import type {
  ZaiChatRequest,
  ZaiChatResponse,
} from './types.js';

/**
 * Zai API client wrapper using OpenAI SDK with custom base URL
 * Documentation: https://docs.z.ai/devpack/tool/others
 */
export class ZaiClient {
  private client: OpenAI;
  private readonly model = 'GLM-4.7';

  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey: apiKey,
      baseURL: 'https://api.z.ai/api/coding/paas/v4',
    });
  }

  /**
   * Send a chat completion request to Zai GLM
   */
  async chat(request: ZaiChatRequest): Promise<ZaiChatResponse> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: request.messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.max_tokens ?? 4096,
      top_p: request.top_p,
      stream: false,
    });

    return response as ZaiChatResponse;
  }

  /**
   * Send a streaming chat completion request to Zai GLM
   */
  async *streamChat(request: ZaiChatRequest): AsyncGenerator<unknown> {
    const stream = await this.client.chat.completions.create({
      model: this.model,
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
   * Generate embeddings using Zai
   */
  async embeddings(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: 'embedding-2',
      input: text,
    });

    return response.data[0].embedding;
  }
}
