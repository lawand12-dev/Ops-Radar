-- Create coming_soon_signups table
CREATE TABLE IF NOT EXISTS coming_soon_signups (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  signed_up_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for fast lookups
CREATE INDEX IF NOT EXISTS idx_coming_soon_signups_email ON coming_soon_signups(email);
CREATE INDEX IF NOT EXISTS idx_coming_soon_signups_created_at ON coming_soon_signups(created_at DESC);

-- Enable RLS (optional - for security)
ALTER TABLE coming_soon_signups ENABLE ROW LEVEL SECURITY;

-- Allow service role to insert
CREATE POLICY "Service role can insert signups" 
  ON coming_soon_signups 
  FOR INSERT 
  WITH CHECK (true);
