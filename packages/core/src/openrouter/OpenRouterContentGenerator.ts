/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  CountTokensResponse,
  GenerateContentResponse,
  GenerateContentParameters,
  CountTokensParameters,
  EmbedContentResponse,
  EmbedContentParameters,
} from '@google/genai';
import { FinishReason } from '@google/genai';
import { OpenRouterClient } from './OpenRouterClient.js';
import type { OpenRouterMessage } from './types.js';
import type { Config } from '../config/config.js';

/**
 * Default model for OpenRouter
 */
const DEFAULT_OPENROUTER_MODEL = 'anthropic/claude-3.5-sonnet';

/**
 * OpenRouter Content Generator implementing the Gemini ContentGenerator interface
 * Adapts OpenRouter's OpenAI-compatible API to Gemini's response format
 */
export class OpenRouterContentGenerator {
  private openRouterClient: OpenRouterClient;
  private defaultModel: string;

  constructor(
    apiKey: string,
    _gcConfig: Config,
    _sessionId?: string,
    model?: string,
  ) {
    this.openRouterClient = new OpenRouterClient(apiKey);
    this.defaultModel = model ?? DEFAULT_OPENROUTER_MODEL;
  }

  /**
   * Get the model to use for requests
   */
  private getModel(request: GenerateContentParameters): string {
    // Extract model from request if specified, otherwise use default
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const requestModel = (request as any).model;
    return requestModel || this.defaultModel;
  }

  /**
   * Generate content using OpenRouter
   */
  async generateContent(
    request: GenerateContentParameters,
    _userPromptId: string,
  ): Promise<GenerateContentResponse> {
    const openRouterMessages = this.extractMessages(request);
    const model = this.getModel(request);

    const openRouterRequest = {
      model,
      messages: openRouterMessages,
      temperature: this.getTemperature(request),
      max_tokens: this.getMaxTokens(request),
    };

    const openRouterResponse =
      await this.openRouterClient.chat(openRouterRequest);

    return this.adaptResponse(openRouterResponse);
  }

  /**
   * Generate streaming content using OpenRouter
   */
  async generateContentStream(
    request: GenerateContentParameters,
    _userPromptId: string,
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    const openRouterMessages = this.extractMessages(request);
    const model = this.getModel(request);

    const openRouterRequest = {
      model,
      messages: openRouterMessages,
      temperature: this.getTemperature(request),
      max_tokens: this.getMaxTokens(request),
    };

    const stream = this.openRouterClient.streamChat(openRouterRequest);

    return (async function* () {
      for await (const chunk of stream) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const content = (chunk as any).choices[0]?.delta?.content || '';
        yield {
          candidates: [
            {
              content: {
                parts: [{ text: content }],
                role: 'model',
              },
              finishReason: content ? undefined : FinishReason.STOP,
              index: 0,
            },
          ],
        } as GenerateContentResponse;
      }
    })();
  }

  /**
   * Count tokens (estimate for OpenRouter)
   */
  async countTokens(
    request: CountTokensParameters,
  ): Promise<CountTokensResponse> {
    // OpenRouter doesn't have a dedicated token counting endpoint
    // We estimate based on character count (rough approximation)
    const content = this.extractTextFromRequest(request);
    const estimatedTokens = Math.ceil(content.length / 4);

    return {
      totalTokens: estimatedTokens,
    };
  }

  /**
   * Generate embeddings using OpenRouter
   */
  async embedContent(
    request: EmbedContentParameters,
  ): Promise<EmbedContentResponse> {
    const content = this.extractTextFromRequest(request);
    const embedding = await this.openRouterClient.embeddings(content);

    return {
      embedding: {
        values: embedding,
      },
    } as EmbedContentResponse;
  }

  /**
   * Extract messages from Gemini request format
   */
  private extractMessages(
    request: GenerateContentParameters,
  ): OpenRouterMessage[] {
    const messages: OpenRouterMessage[] = [];

    if (request.contents) {
      for (const content of request.contents as unknown as Array<{
        role?: string;
        parts?: unknown[];
      }>) {
        const role = content.role === 'model' ? 'assistant' : 'user';
        const text = this.extractTextFromParts(content.parts);
        if (text) {
          messages.push({ role, content: text });
        }
      }
    }

    // Add system instruction if present
    if (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (request as any).systemInstruction
    ) {
      const systemText = this.extractTextFromParts(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (request as any).systemInstruction.parts,
      );
      if (systemText) {
        messages.unshift({ role: 'system', content: systemText });
      }
    }

    return messages;
  }

  /**
   * Extract text content from parts array
   */
  private extractTextFromParts(parts: unknown): string {
    if (!parts) return '';
    return (parts as Array<{ text?: string }>)
      .map((p: { text?: string }) => p.text || '')
      .filter((t) => t)
      .join('\n');
  }

  /**
   * Extract text from various request types
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extractTextFromRequest(request: any): string {
    if (request.contents) {
      return this.extractTextFromParts(request.contents[0]?.parts || []);
    }
    if (request.content) {
      return request.content;
    }
    return '';
  }

  /**
   * Get temperature from generation config
   */
  private getTemperature(request: GenerateContentParameters): number {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (request as any).generationConfig?.temperature ?? 0.7;
  }

  /**
   * Get max tokens from generation config
   */
  private getMaxTokens(request: GenerateContentParameters): number {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (request as any).generationConfig?.maxOutputTokens ?? 4096;
  }

  /**
   * Adapt OpenRouter response to Gemini format
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private adaptResponse(openRouterResponse: any): GenerateContentResponse {
    const text = openRouterResponse.choices[0]?.message?.content || '';

    return {
      candidates: [
        {
          content: {
            parts: [{ text }],
            role: 'model',
          },
          finishReason: FinishReason.STOP,
          index: 0,
        },
      ],
      usageMetadata: {
        promptTokenCount: openRouterResponse.usage?.prompt_tokens || 0,
        candidatesTokenCount: openRouterResponse.usage?.completion_tokens || 0,
        totalTokenCount: openRouterResponse.usage?.total_tokens || 0,
      },
    } as GenerateContentResponse;
  }
}
