export interface ValidationRequest {
  text: string;
}

export interface ValidationMeta {
  model: string;
  durationMs: number;
}

export interface ValidationResult {
  markdown: string;
  meta: ValidationMeta;
}
