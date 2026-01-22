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
import { ZaiClient } from './ZaiClient.js';
import type { ZaiMessage } from './types.js';
import type { Config } from '../config/config.js';

/**
 * Zai GLM Content Generator implementing the Gemini ContentGenerator interface
 * Adapts Zai's OpenAI-compatible API to Gemini's response format
 */
export class ZaiContentGenerator {
  private zaiClient: ZaiClient;

  constructor(apiKey: string, _gcConfig: Config, _sessionId?: string) {
    this.zaiClient = new ZaiClient(apiKey);
  }

  /**
   * Generate content using Zai GLM
   */
  async generateContent(
    request: GenerateContentParameters,
    _userPromptId: string,
  ): Promise<GenerateContentResponse> {
    const zaiMessages = this.extractMessages(request);
    
    const zaiRequest = {
      model: 'glm-4.7',
      messages: zaiMessages,
      temperature: this.getTemperature(request),
      max_tokens: this.getMaxTokens(request),
    };

    const zaiResponse = await this.zaiClient.chat(zaiRequest);
    
    return this.adaptResponse(zaiResponse);
  }

  /**
   * Generate streaming content using Zai GLM
   */
  async generateContentStream(
    request: GenerateContentParameters,
    _userPromptId: string,
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    const zaiMessages = this.extractMessages(request);

    const zaiRequest = {
      model: 'glm-4.7',
      messages: zaiMessages,
      temperature: this.getTemperature(request),
      max_tokens: this.getMaxTokens(request),
    };

    const stream = this.zaiClient.streamChat(zaiRequest);

    return (async function* () {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
   * Count tokens (estimate for Zai)
   */
  async countTokens(request: CountTokensParameters): Promise<CountTokensResponse> {
    // Zai doesn't have a dedicated token counting endpoint
    // We estimate based on character count (rough approximation)
    const content = this.extractTextFromRequest(request);
    const estimatedTokens = Math.ceil(content.length / 4);
    
    return {
      totalTokens: estimatedTokens,
    };
  }

  /**
   * Generate embeddings using Zai
   */
  async embedContent(request: EmbedContentParameters): Promise<EmbedContentResponse> {
    const content = this.extractTextFromRequest(request);
    const embedding = await this.zaiClient.embeddings(content);

    return {
      embedding: {
        values: embedding,
      },
    } as EmbedContentResponse;
  }

  /**
   * Extract messages from Gemini request format
   */
  private extractMessages(request: GenerateContentParameters): ZaiMessage[] {
    const messages: ZaiMessage[] = [];

    if (request.contents) {
      // @ts-expect-error - ContentListUnion is iterable in practice
      for (const content of request.contents) {
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const systemText = this.extractTextFromParts((request as any).systemInstruction.parts);
      if (systemText) {
        messages.unshift({ role: 'system', content: systemText });
      }
    }

    return messages;
  }

  /**
   * Extract text content from parts array
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extractTextFromParts(parts: any): string {
    if (!parts) return '';
    return parts
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((p: any) => p.text || '')
      .filter((t: string) => t)
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
    return (request as any).generationConfig?.maxOutputTokens ?? 128000;
  }

  /**
   * Adapt Zai response to Gemini format
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private adaptResponse(zaiResponse: any): GenerateContentResponse {
    const text = zaiResponse.choices[0]?.message?.content || '';

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
        promptTokenCount: zaiResponse.usage?.prompt_tokens || 0,
        candidatesTokenCount: zaiResponse.usage?.completion_tokens || 0,
        totalTokenCount: zaiResponse.usage?.total_tokens || 0,
      },
    } as GenerateContentResponse;
  }
}
