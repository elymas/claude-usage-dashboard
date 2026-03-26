export interface DailyUsage {
  id: number;
  user_id: string;
  date: string;
  total_tokens: number;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_creation_tokens: number;
  model_breakdown: Record<string, number>;
  project_count: number;
  sessions: number;
  synced_at: string;
  source: string;
}

export interface Profile {
  id: string;
  name: string;
  api_key: string;
  created_at: string;
}

export interface UsageUploadPayload {
  date: string;
  total_tokens: number;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_creation_tokens: number;
  model_breakdown: Record<string, number>;
  project_count: number;
  sessions: number;
  source?: string;
}
