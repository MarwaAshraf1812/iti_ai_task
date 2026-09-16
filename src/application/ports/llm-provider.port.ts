export interface LLMDiagnosisRequest {
  equipmentModel: string;
  telemetrySummary: string;
  reportedSymptoms: string;
}

export interface LLMDiagnosisResponse {
  assessment: string;
  recommendedAction: string;
  confidenceScore: number;
}

export interface ILLMProvider {
  generateDiagnosis(request: LLMDiagnosisRequest): Promise<LLMDiagnosisResponse>;
}
