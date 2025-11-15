export interface JobStats {
  count: number;
  avgSkill: number;
}

export type JobStatMap = Record<string, JobStats>;
