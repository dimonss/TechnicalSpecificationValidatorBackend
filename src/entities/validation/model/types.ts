export interface ValidationRequest {
  text: string;
}

export interface ValidationMeta {
  model: string;
  durationMs: number;
}

export interface UsageInfo {
  limit: number;
  used: number;
  remaining: number;
  resetsAt: string;
  unlimited?: boolean;
}

export interface ValidationResult {
  markdown: string;
  meta: ValidationMeta;
  usage: UsageInfo;
}

export type ValidationStreamEvent =
  | { type: 'chunk'; text: string }
  | { type: 'done'; meta: ValidationMeta; usage: UsageInfo };


