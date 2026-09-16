import { HumanReviewRequest } from '../../domain/entities/review-request.entity.js';

export interface IReviewQueueGateway {
  enqueueReview(request: HumanReviewRequest): Promise<void>;
  getPendingReviews(): Promise<HumanReviewRequest[]>;
  updateReviewStatus(
    id: string,
    status: HumanReviewRequest['status'],
    reviewerNotes?: string,
    reviewedBy?: string
  ): Promise<void>;
}
