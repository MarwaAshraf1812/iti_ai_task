import { GoogleGenAI } from '@google/genai';
import {
  ILLMProvider,
  ToolDefinition,
  ToolCallResult,
} from '../../application/ports/llm-provider.port.js';

export interface GeminiLLMProviderConfig {
  apiKey?: string;
  model?: string;
  embeddingModel?: string;
}

export class GeminiLLMProvider implements ILLMProvider {
  private readonly client: GoogleGenAI;
  private readonly model: string;
  private readonly embeddingModel: string;

  constructor(config: GeminiLLMProviderConfig = {}) {
    const apiKey = config.apiKey || process.env.GEMINI_API_KEY || 'placeholder-api-key';
    this.client = new GoogleGenAI({ apiKey });
    this.model = config.model || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    this.embeddingModel =
      config.embeddingModel || process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004';
  }

  async complete(prompt: string, systemPrompt?: string): Promise<string> {
    const response = await this.client.models.generateContent({
      model: this.model,
      contents: prompt,
      config: systemPrompt ? { systemInstruction: systemPrompt } : undefined,
    });

    return response.text ?? '';
  }

  async *streamComplete(prompt: string, systemPrompt?: string): AsyncGenerator<string> {
    const responseStream = await this.client.models.generateContentStream({
      model: this.model,
      contents: prompt,
      config: systemPrompt ? { systemInstruction: systemPrompt } : undefined,
    });

    for await (const chunk of responseStream) {
      if (chunk.text) {
        yield chunk.text;
      }
    }
  }

  async callWithTools(
    prompt: string,
    tools: ToolDefinition[],
    systemPrompt?: string
  ): Promise<ToolCallResult> {
    const functionDeclarations = tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
    }));

    const response = await this.client.models.generateContent({
      model: this.model,
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
        tools: [{ functionDeclarations }],
      },
    });

    const firstCall = response.functionCalls?.[0];
    if (firstCall) {
      return {
        toolName: firstCall.name ?? null,
        arguments: (firstCall.args as Record<string, unknown>) ?? null,
        rawText: response.text ?? '',
      };
    }

    return {
      toolName: null,
      arguments: null,
      rawText: response.text ?? '',
    };
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    const response = await this.client.models.embedContent({
      model: this.embeddingModel,
      contents: texts,
    });

    if (response.embeddings && response.embeddings.length > 0) {
      return response.embeddings.map((e) => e.values ?? []);
    }

    return [];
  }
}
