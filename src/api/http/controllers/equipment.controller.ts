import {
  DiagnoseEquipmentUseCase,
  DiagnoseEquipmentInput,
} from '../../../application/usecases/diagnose-equipment.usecase.js';

export interface HttpRequest {
  body: unknown;
  params: Record<string, string>;
  query: Record<string, string>;
}

export interface HttpResponse {
  statusCode: number;
  data: unknown;
}

export class EquipmentController {
  constructor(private readonly diagnoseUseCase: DiagnoseEquipmentUseCase) {}

  async diagnose(req: HttpRequest): Promise<HttpResponse> {
    const body = req.body as Partial<DiagnoseEquipmentInput>;

    if (!body?.equipmentId || !body?.symptoms) {
      return {
        statusCode: 400,
        data: { error: 'Missing required fields: equipmentId and symptoms' },
      };
    }

    const result = await this.diagnoseUseCase.execute({
      equipmentId: body.equipmentId,
      symptoms: body.symptoms,
    });

    return {
      statusCode: 200,
      data: result,
    };
  }
}
