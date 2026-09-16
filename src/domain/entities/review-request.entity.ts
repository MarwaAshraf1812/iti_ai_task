export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ESCALATED';

export interface HumanReviewRequest {
  id: string;
  sourceTicketId: string;
  reason: string;
  confidenceScore: number;
  proposedAction: string;
  status: ReviewStatus;
  reviewerNotes?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  createdAt: Date;
}
