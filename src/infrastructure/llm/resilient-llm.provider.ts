import {
  ILLMProvider,
  ToolDefinition,
  ToolCallResult,
} from '../../application/ports/llm-provider.port.js';

export interface ResilientLLMProviderOptions {
  primary: ILLMProvider;
  fallback: ILLMProvider;
  primaryName?: string;
  fallbackName?: string;
  timeoutMs?: number;
}

export class ResilientLLMProvider implements ILLMProvider {
  public readonly primary: ILLMProvider;
  public readonly fallback: ILLMProvider;
  public readonly primaryName: string;
  public readonly fallbackName: string;
  public readonly timeoutMs: number;

  constructor(options: ResilientLLMProviderOptions) {
    this.primary = options.primary;
    this.fallback = options.fallback;
    this.primaryName = options.primaryName || 'primary';
    this.fallbackName = options.fallbackName || 'fallback';
    this.timeoutMs = options.timeoutMs || 10000;
  }

  private logWarning(methodName: string, error: unknown): void {
    const errorType = error instanceof Error ? error.constructor.name || error.name : 'UnknownError';
    const errorMessage = error instanceof Error ? error.message : String(error);

    const logPayload = {
      level: 'WARN',
      timestamp: new Date().toISOString(),
      component: 'ResilientLLMProvider',
      provider: this.primaryName,
      fallbackProvider: this.fallbackName,
      method: methodName,
      errorType,
      message: errorMessage,
    };

    console.warn(`[ResilientLLMProvider] Primary failed, routing to fallback:`, JSON.stringify(logPayload));
  }

  private async withTimeout<T>(promise: Promise<T>, methodName: string): Promise<T> {
    let timer: NodeJS.Timeout | undefined;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        const timeoutError = new Error(
          `Primary provider '${this.primaryName}' timed out after ${this.timeoutMs}ms on '${methodName}'`
        );
        timeoutError.name = 'TimeoutError';
        reject(timeoutError);
      }, this.timeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  }

  private async executeWithFallback<T>(
    methodName: string,
    operation: (provider: ILLMProvider) => Promise<T>
  ): Promise<T> {
    try {
      return await this.withTimeout(operation(this.primary), methodName);
    } catch (primaryError) {
      this.logWarning(methodName, primaryError);
      return await operation(this.fallback);
    }
  }

  async complete(prompt: string, systemPrompt?: string): Promise<string> {
    return this.executeWithFallback('complete', (provider) =>
      provider.complete(prompt, systemPrompt)
    );
  }

  async *streamComplete(prompt: string, systemPrompt?: string): AsyncGenerator<string> {
    try {
      const stream = this.primary.streamComplete(prompt, systemPrompt);
      for await (const chunk of stream) {
        yield chunk;
      }
    } catch (primaryError) {
      this.logWarning('streamComplete', primaryError);
      yield* this.fallback.streamComplete(prompt, systemPrompt);
    }
  }

  async callWithTools(
    prompt: string,
    tools: ToolDefinition[],
    systemPrompt?: string
  ): Promise<ToolCallResult> {
    return this.executeWithFallback('callWithTools', (provider) =>
      provider.callWithTools(prompt, tools, systemPrompt)
    );
  }

  async embed(texts: string[]): Promise<number[][]> {
    return this.executeWithFallback('embed', (provider) => provider.embed(texts));
  }
}
