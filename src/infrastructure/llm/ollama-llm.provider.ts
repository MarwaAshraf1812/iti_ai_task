import {
  ILLMProvider,
  ToolDefinition,
  ToolCallResult,
} from '../../application/ports/llm-provider.port.js';

export interface OllamaLLMProviderConfig {
  baseUrl?: string;
  model?: string;
  embeddingModel?: string;
}

export class OllamaLLMProvider implements ILLMProvider {
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly embeddingModel: string;

  constructor(config: OllamaLLMProviderConfig = {}) {
    this.baseUrl = (
      config.baseUrl ||
      process.env.OLLAMA_BASE_URL ||
      'http://localhost:11434'
    ).replace(/\/+$/, '');
    this.model = config.model || process.env.OLLAMA_MODEL || 'qwen2.5:3b';
    this.embeddingModel =
      config.embeddingModel ||
      process.env.OLLAMA_EMBEDDING_MODEL ||
      'nomic-embed-text';
  }

  async complete(prompt: string, systemPrompt?: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        prompt,
        system: systemPrompt,
        stream: false,
      }),
    });

    if (!res.ok) {
      throw new Error(`Ollama complete failed with status ${res.status}: ${await res.text()}`);
    }

    const data = (await res.json()) as { response?: string };
    return data.response ?? '';
  }

  async *streamComplete(prompt: string, systemPrompt?: string): AsyncGenerator<string> {
    const res = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        prompt,
        system: systemPrompt,
        stream: true,
      }),
    });

    if (!res.ok || !res.body) {
      throw new Error(`Ollama stream failed with status ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const parsed = JSON.parse(trimmed) as { response?: string; done?: boolean };
          if (parsed.response) {
            yield parsed.response;
          }
        } catch {
          // Ignore partial or unparseable stream chunks
        }
      }
    }
  }

  /**
   * Tool calling implementation for Ollama.
   *
   * KNOWN LIMITATION & ARCHITECTURAL NOTE:
   * Small quantized local models (such as qwen2.5:3b or llama3.2:3b) can be inconsistent
   * with native function calling schemas. Therefore, this provider attempts native Ollama
   * /api/chat tool-calling first. If native tool calling fails or returns no function calls,
   * it falls back to a structured-prompt extraction schema asking the model for JSON output.
   */
  async callWithTools(
    prompt: string,
    tools: ToolDefinition[],
    systemPrompt?: string
  ): Promise<ToolCallResult> {
    const ollamaTools = tools.map((t) => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.inputSchema,
      },
    }));

    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    try {
      const res = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages,
          tools: ollamaTools,
          stream: false,
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as {
          message?: {
            content?: string;
            tool_calls?: Array<{
              function: {
                name: string;
                arguments: Record<string, unknown>;
              };
            }>;
          };
        };

        const firstToolCall = data.message?.tool_calls?.[0];
        if (firstToolCall?.function) {
          return {
            toolName: firstToolCall.function.name,
            arguments: firstToolCall.function.arguments || {},
            rawText: data.message?.content || '',
          };
        }

        // If native tool calling responded without tool_calls, inspect if prompt fallback is needed
        if (data.message?.content) {
          const fallbackParsed = this.extractJsonToolCall(data.message.content, tools);
          if (fallbackParsed) {
            return fallbackParsed;
          }
        }
      }
    } catch {
      // Proceed to prompt-based fallback on native tool calling errors
    }

    // Prompt-based fallback for small models
    return this.promptBasedToolFallback(prompt, tools, systemPrompt);
  }

  private async promptBasedToolFallback(
    prompt: string,
    tools: ToolDefinition[],
    systemPrompt?: string
  ): Promise<ToolCallResult> {
    const toolDescriptions = tools
      .map(
        (t) =>
          `- Tool: ${t.name}\n  Description: ${t.description}\n  Parameters: ${JSON.stringify(t.inputSchema)}`
      )
      .join('\n\n');

    const fallbackSystemPrompt = `${systemPrompt || ''}
You have access to the following tools:
${toolDescriptions}

If you need to call a tool to answer the user request, respond ONLY with a JSON object in the following format:
{
  "toolName": "<name of tool>",
  "arguments": { <parameters matching tool schema> }
}

If no tool is needed, respond with standard text.`;

    const rawResponse = await this.complete(prompt, fallbackSystemPrompt);
    const parsed = this.extractJsonToolCall(rawResponse, tools);
    if (parsed) {
      return parsed;
    }

    return {
      toolName: null,
      arguments: null,
      rawText: rawResponse,
    };
  }

  private extractJsonToolCall(text: string, tools: ToolDefinition[]): ToolCallResult | null {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    try {
      const parsed = JSON.parse(jsonMatch[0]) as {
        toolName?: string;
        arguments?: Record<string, unknown>;
      };
      if (parsed.toolName && tools.some((t) => t.name === parsed.toolName)) {
        return {
          toolName: parsed.toolName,
          arguments: parsed.arguments || {},
          rawText: text,
        };
      }
    } catch {
      // Not valid tool call JSON
    }
    return null;
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    // Modern Ollama batch embed API (/api/embed)
    try {
      const res = await fetch(`${this.baseUrl}/api/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.embeddingModel,
          input: texts,
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as { embeddings?: number[][] };
        if (data.embeddings) {
          return data.embeddings;
        }
      }
    } catch {
      // Fallback to sequential /api/embeddings for legacy Ollama versions
    }

    // Sequential fallback
    const results: number[][] = [];
    for (const text of texts) {
      const res = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.embeddingModel,
          prompt: text,
        }),
      });

      if (!res.ok) {
        throw new Error(`Ollama embedding failed with status ${res.status}`);
      }

      const data = (await res.json()) as { embedding?: number[] };
      results.push(data.embedding || []);
    }

    return results;
  }
}
