export interface CooQueryRequest {
  query: string;
  context_window_hours?: number;
  include_evidence?: boolean;
}

export interface CooDataPoint {
  label: string;
  value: string;
  source: string;
  confidence: "high" | "medium" | "low";
}

export interface CooQueryResponse {
  query: string;
  answer: string;
  executive_summary: string;
  data_points: CooDataPoint[];
  recommendations: string[];
  risks: string[];
  confidence: "high" | "medium" | "low";
  context_used: {
    semantic_hits: number;
    breadcrumbs_analyzed: number;
    pattern_cards_matched: number;
    used_hybrid_retrieval: boolean;
  };
  latency_ms: number;
}
