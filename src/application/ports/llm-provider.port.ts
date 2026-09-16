export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface ToolCallResult {
  toolName: string | null;
  arguments: Record<string, unknown> | null;
  rawText: string;
}

export interface ILLMProvider {
  complete(prompt: string, systemPrompt?: string): Promise<string>;
  streamComplete(prompt: string, systemPrompt?: string): AsyncGenerator<string>;
  callWithTools(
    prompt: string,
    tools: ToolDefinition[],
    systemPrompt?: string
  ): Promise<ToolCallResult>;
  embed(texts: string[]): Promise<number[][]>;
}
