import {
  ILLMProvider,
  LLMDiagnosisRequest,
  LLMDiagnosisResponse,
} from '../../application/ports/llm-provider.port.js';

export interface LLMProviderConfig {
  apiKey?: string;
  model?: string;
}

export class GeminiLLMProvider implements ILLMProvider {
  constructor(private readonly config: LLMProviderConfig) {}

  async generateDiagnosis(_request: LLMDiagnosisRequest): Promise<LLMDiagnosisResponse> {
    // Stub implementation - will call LLM SDK in future tasks
    return {
      assessment: 'Preliminary automated assessment stub',
      recommendedAction: 'Inspect component bearing and verify sensor reading',
      confidenceScore: 0.85,
    };
  }
}
