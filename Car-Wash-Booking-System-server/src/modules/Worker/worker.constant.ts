
export const WORKER_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;

export const WorkerSearchableFields = [
  'name',
  'email',
  'phone',
  'status',
];
