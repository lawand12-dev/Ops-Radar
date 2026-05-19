export type BenchmarkMetric =
  | 'median_client_margin_pct'
  | 'median_invoice_days_overdue'
  | 'hours_per_10k_revenue'
  | 'active_client_count'

export type TeamSizeBucket = 'solo' | '2-5' | '6-15' | '16-30' | '31+'

export const TEAM_SIZE_BUCKETS: TeamSizeBucket[] = ['solo', '2-5', '6-15', '16-30', '31+']

export type ServiceMixBucket =
  | 'all'
  | 'paid_media'
  | 'seo_content'
  | 'creative_branding'
  | 'social_media'
  | 'full_service'
  | 'other'

export const SERVICE_MIX_BUCKETS: ServiceMixBucket[] = [
  'all',
  'paid_media',
  'seo_content',
  'creative_branding',
  'social_media',
  'full_service',
  'other',
]

export const SERVICE_MIX_LABELS: Record<ServiceMixBucket, string> = {
  all:               'All service mixes',
  paid_media:        'Paid Media',
  seo_content:       'SEO & Content',
  creative_branding: 'Creative & Branding',
  social_media:      'Social Media',
  full_service:      'Full Service',
  other:             'Other',
}

export const METRIC_LABELS: Record<BenchmarkMetric, string> = {
  median_client_margin_pct:    'Client margin (median %)',
  median_invoice_days_overdue: 'Invoice collection time (days)',
  hours_per_10k_revenue:       'Hours per $10K revenue',
  active_client_count:         'Active clients',
}

export const METRIC_DIRECTION: Record<BenchmarkMetric, 'higher_better' | 'lower_better' | 'neutral'> = {
  median_client_margin_pct:    'higher_better',
  median_invoice_days_overdue: 'lower_better',
  hours_per_10k_revenue:       'lower_better',
  active_client_count:         'neutral',
}

export type BenchmarkRow = {
  metric: BenchmarkMetric
  team_size_bucket: TeamSizeBucket
  service_mix_bucket: ServiceMixBucket
  p25: number
  p50: number
  p75: number
  sample_size: number
  computed_at: string
}

export type UserComparison = {
  metric: BenchmarkMetric
  user_value: number | null
  bucket: TeamSizeBucket | null
  benchmark: BenchmarkRow | null
  position: 'top_25' | 'above' | 'below' | 'bottom_25' | 'no_data'
}
