import { ILLMProvider } from '../../application/ports/llm-provider.port.js';
import { GeminiLLMProvider } from './gemini-llm.provider.js';
import { OllamaLLMProvider } from './ollama-llm.provider.js';

export type SupportedLLMProvider = 'gemini' | 'ollama';

export interface LLMFactoryOptions {
  provider?: SupportedLLMProvider;
  geminiApiKey?: string;
  geminiModel?: string;
  ollamaBaseUrl?: string;
  ollamaModel?: string;
}

export function createLLMProvider(options: LLMFactoryOptions = {}): ILLMProvider {
  const selectedProvider: SupportedLLMProvider =
    options.provider ||
    ((process.env.LLM_PROVIDER as SupportedLLMProvider) || 'gemini').toLowerCase() === 'ollama'
      ? 'ollama'
      : 'gemini';

  if (selectedProvider === 'ollama') {
    return new OllamaLLMProvider({
      baseUrl: options.ollamaBaseUrl,
      model: options.ollamaModel,
    });
  }

  return new GeminiLLMProvider({
    apiKey: options.geminiApiKey,
    model: options.geminiModel,
  });
}
