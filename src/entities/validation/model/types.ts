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
}

export interface ValidationResult {
  markdown: string;
  meta: ValidationMeta;
  usage: UsageInfo;
}

