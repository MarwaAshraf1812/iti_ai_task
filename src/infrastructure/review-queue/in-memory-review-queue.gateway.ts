import { HumanReviewRequest } from '../../domain/entities/review-request.entity.js';
import { IReviewQueueGateway } from '../../application/ports/review-queue.port.js';

export class InMemoryReviewQueueGateway implements IReviewQueueGateway {
  private readonly queue: Map<string, HumanReviewRequest> = new Map();

  async enqueueReview(request: HumanReviewRequest): Promise<void> {
    this.queue.set(request.id, { ...request });
  }

  async getPendingReviews(): Promise<HumanReviewRequest[]> {
    return Array.from(this.queue.values()).filter((r) => r.status === 'PENDING');
  }

  async updateReviewStatus(
    id: string,
    status: HumanReviewRequest['status'],
    reviewerNotes?: string,
    reviewedBy?: string
  ): Promise<void> {
    const item = this.queue.get(id);
    if (item) {
      item.status = status;
      item.reviewerNotes = reviewerNotes;
      item.reviewedBy = reviewedBy;
      item.reviewedAt = new Date();
    }
  }
}
