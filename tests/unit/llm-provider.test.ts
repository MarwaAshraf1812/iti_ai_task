import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ILLMProvider,
  ToolDefinition,
  ToolCallResult,
} from '../../src/application/ports/llm-provider.port.js';
import { ResilientLLMProvider } from '../../src/infrastructure/llm/resilient-llm.provider.js';

// -----------------------------------------------------------------------------
// Test Doubles (Zero Network Calls)
// -----------------------------------------------------------------------------

class FakeCloudLLMProvider implements ILLMProvider {
  public completeCalls = 0;
  public callWithToolsCalls = 0;
  public embedCalls = 0;
  public streamCalls = 0;

  async complete(prompt: string, systemPrompt?: string): Promise<string> {
    this.completeCalls++;
    return `Cloud response to: ${prompt} (system: ${systemPrompt || 'none'})`;
  }

  async *streamComplete(prompt: string, _systemPrompt?: string): AsyncGenerator<string> {
    this.streamCalls++;
    yield 'Cloud ';
    yield 'stream ';
    yield prompt;
  }

  async callWithTools(
    _prompt: string,
    tools: ToolDefinition[],
    _systemPrompt?: string
  ): Promise<ToolCallResult> {
    this.callWithToolsCalls++;
    return {
      toolName: tools[0]?.name || null,
      arguments: { param: 'cloud-val' },
      rawText: 'Tool called by cloud',
    };
  }

  async embed(texts: string[]): Promise<number[][]> {
    this.embedCalls++;
    return texts.map(() => [0.1, 0.2, 0.3]);
  }
}

class FakeLocalLLMProvider implements ILLMProvider {
  public completeCalls = 0;
  public callWithToolsCalls = 0;
  public embedCalls = 0;
  public streamCalls = 0;

  async complete(prompt: string, systemPrompt?: string): Promise<string> {
    this.completeCalls++;
    return `Local response to: ${prompt} (system: ${systemPrompt || 'none'})`;
  }

  async *streamComplete(prompt: string, _systemPrompt?: string): AsyncGenerator<string> {
    this.streamCalls++;
    yield 'Local ';
    yield 'stream ';
    yield prompt;
  }

  async callWithTools(
    _prompt: string,
    tools: ToolDefinition[],
    _systemPrompt?: string
  ): Promise<ToolCallResult> {
    this.callWithToolsCalls++;
    return {
      toolName: tools[0]?.name || null,
      arguments: { param: 'local-val' },
      rawText: 'Tool called by local',
    };
  }

  async embed(texts: string[]): Promise<number[][]> {
    this.embedCalls++;
    return texts.map(() => [0.4, 0.5, 0.6]);
  }
}

class AlwaysFailingProvider implements ILLMProvider {
  public completeCalls = 0;
  public streamCalls = 0;
  public callWithToolsCalls = 0;
  public embedCalls = 0;

  async complete(): Promise<string> {
    this.completeCalls++;
    throw new Error('Cloud API 429 Rate Limit Exceeded');
  }

  async *streamComplete(): AsyncGenerator<string> {
    this.streamCalls++;
    if (this.streamCalls > 0) {
      throw new Error('Cloud Streaming Socket Closed');
    }
    yield '';
  }

  async callWithTools(): Promise<ToolCallResult> {
    this.callWithToolsCalls++;
    throw new Error('Cloud Function Calling 503 Service Unavailable');
  }

  async embed(): Promise<number[][]> {
    this.embedCalls++;
    throw new Error('Cloud Embedding Quota Exhausted');
  }
}

// -----------------------------------------------------------------------------
// Test Suite
// -----------------------------------------------------------------------------

describe('ILLMProvider Contract & Resilient Provider', () => {
  const sampleTools: ToolDefinition[] = [
    {
      name: 'lookup_manual',
      description: 'Finds technical procedures for equipment',
      inputSchema: { type: 'object', properties: { query: { type: 'string' } } },
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Contract Adherence', () => {
    it('both FakeCloud and FakeLocal honor the ILLMProvider contract consistently', async () => {
      const providers: ILLMProvider[] = [new FakeCloudLLMProvider(), new FakeLocalLLMProvider()];

      for (const provider of providers) {
        // complete
        const text = await provider.complete('Hello', 'System');
        expect(typeof text).toBe('string');
        expect(text).toContain('Hello');

        // streamComplete
        const chunks: string[] = [];
        for await (const chunk of provider.streamComplete('StreamPrompt')) {
          chunks.push(chunk);
        }
        expect(chunks.length).toBeGreaterThan(0);

        // callWithTools
        const toolResult = await provider.callWithTools('Run tool', sampleTools);
        expect(toolResult.toolName).toBe('lookup_manual');
        expect(toolResult.arguments).toBeDefined();

        // embed
        const embeddings = await provider.embed(['doc1', 'doc2']);
        expect(embeddings.length).toBe(2);
        expect(embeddings[0].length).toBe(3);
      }
    });
  });

  describe('ResilientLLMProvider Fallback Behavior', () => {
    it('should route to fallback and log structured warning when primary throws an error', async () => {
      const failingPrimary = new AlwaysFailingProvider();
      const fallback = new FakeLocalLLMProvider();

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const resilient = new ResilientLLMProvider({
        primary: failingPrimary,
        fallback,
        primaryName: 'gemini',
        fallbackName: 'ollama',
        timeoutMs: 1000,
      });

      // 1. complete failover
      const completeResult = await resilient.complete('Analyze motor vibration');
      expect(failingPrimary.completeCalls).toBe(1);
      expect(fallback.completeCalls).toBe(1);
      expect(completeResult).toContain('Local response to: Analyze motor vibration');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ResilientLLMProvider] Primary failed, routing to fallback:'),
        expect.stringContaining('"provider":"gemini"')
      );

      // 2. callWithTools failover
      const toolResult = await resilient.callWithTools('Inspect bearings', sampleTools);
      expect(failingPrimary.callWithToolsCalls).toBe(1);
      expect(fallback.callWithToolsCalls).toBe(1);
      expect(toolResult.toolName).toBe('lookup_manual');

      // 3. embed failover
      const embedResult = await resilient.embed(['bearing spec']);
      expect(failingPrimary.embedCalls).toBe(1);
      expect(fallback.embedCalls).toBe(1);
      expect(embedResult[0]).toEqual([0.4, 0.5, 0.6]);

      // 4. streamComplete failover
      const streamChunks: string[] = [];
      for await (const chunk of resilient.streamComplete('Telemetry data')) {
        streamChunks.push(chunk);
      }
      expect(failingPrimary.streamCalls).toBe(1);
      expect(fallback.streamCalls).toBe(1);
      expect(streamChunks.join('')).toContain('Local stream Telemetry data');
    });

    it('should NEVER call fallback when primary succeeds', async () => {
      const successfulPrimary = new FakeCloudLLMProvider();
      const fallback = new FakeLocalLLMProvider();

      const resilient = new ResilientLLMProvider({
        primary: successfulPrimary,
        fallback,
        primaryName: 'gemini',
        fallbackName: 'ollama',
      });

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // complete
      const text = await resilient.complete('Test prompt');
      expect(text).toContain('Cloud response');
      expect(successfulPrimary.completeCalls).toBe(1);
      expect(fallback.completeCalls).toBe(0);

      // callWithTools
      const toolResult = await resilient.callWithTools('Test tools', sampleTools);
      expect(toolResult.toolName).toBe('lookup_manual');
      expect(successfulPrimary.callWithToolsCalls).toBe(1);
      expect(fallback.callWithToolsCalls).toBe(0);

      // embed
      const embeddings = await resilient.embed(['doc']);
      expect(embeddings[0]).toEqual([0.1, 0.2, 0.3]);
      expect(successfulPrimary.embedCalls).toBe(1);
      expect(fallback.embedCalls).toBe(0);

      // streamComplete
      const chunks: string[] = [];
      for await (const chunk of resilient.streamComplete('Test stream')) {
        chunks.push(chunk);
      }
      expect(chunks.join('')).toContain('Cloud stream');
      expect(successfulPrimary.streamCalls).toBe(1);
      expect(fallback.streamCalls).toBe(0);

      // No fallback warning logged
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('should trigger fallback if primary exceeds timeoutMs', async () => {
      class SlowPrimaryProvider implements ILLMProvider {
        async complete(): Promise<string> {
          await new Promise((resolve) => setTimeout(resolve, 200));
          return 'Slow Cloud Result';
        }
        async *streamComplete(): AsyncGenerator<string> {
          await new Promise((resolve) => setTimeout(resolve, 200));
          yield 'Slow';
        }
        async callWithTools(): Promise<ToolCallResult> {
          await new Promise((resolve) => setTimeout(resolve, 200));
          return { toolName: null, arguments: null, rawText: '' };
        }
        async embed(): Promise<number[][]> {
          await new Promise((resolve) => setTimeout(resolve, 200));
          return [];
        }
      }

      const slowPrimary = new SlowPrimaryProvider();
      const fastFallback = new FakeLocalLLMProvider();

      vi.spyOn(console, 'warn').mockImplementation(() => {});

      const resilient = new ResilientLLMProvider({
        primary: slowPrimary,
        fallback: fastFallback,
        primaryName: 'slow-cloud',
        fallbackName: 'fast-local',
        timeoutMs: 50, // Short timeout for test
      });

      const result = await resilient.complete('Timeout test');
      expect(result).toContain('Local response to: Timeout test');
      expect(fastFallback.completeCalls).toBe(1);
    });
  });
});
