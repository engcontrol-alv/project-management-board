export type Brand<T, B> = T & { __brand: B };

export type ProjectId = Brand<string, 'ProjectId'>;
export type PartyId = Brand<string, 'PartyId'>;
export type RequirementId = Brand<string, 'RequirementId'>;
export type WorkPackageId = Brand<string, 'WorkPackageId'>;
export type DeliverableId = Brand<string, 'DeliverableId'>;
export type ChangeRequestId = Brand<string, 'ChangeRequestId'>;
export type MilestoneId = Brand<string, 'MilestoneId'>;
export type NormId = Brand<string, 'NormId'>;
export type MeetingId = Brand<string, 'MeetingId'>;
export type LessonId = Brand<string, 'LessonId'>;
export type BudgetLineId = Brand<string, 'BudgetLineId'>;
export type ProcurementId = Brand<string, 'ProcurementId'>;
export type RiskId = Brand<string, 'RiskId'>;
export type ResourceId = Brand<string, 'ResourceId'>;
export type AllocationId = Brand<string, 'AllocationId'>;
export type CommunicationId = Brand<string, 'CommunicationId'>;
