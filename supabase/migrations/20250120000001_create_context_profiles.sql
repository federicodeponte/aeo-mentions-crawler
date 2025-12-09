-- Create Context Profiles Table
-- Enables users to save and reuse business context configurations as profiles
-- Essential for agencies managing multiple clients

CREATE TABLE IF NOT EXISTS context_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Profile metadata
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  -- Business Context Fields (matching business_contexts table structure)
  -- Core Business Info
  tone TEXT,
  value_proposition TEXT,
  product_description TEXT,
  company_name TEXT,
  company_website TEXT,
  
  -- Target Audience
  target_countries TEXT,
  target_industries TEXT,
  icp TEXT,
  countries TEXT[],
  products TEXT[],
  marketing_goals TEXT[],
  
  -- Competitive Intelligence  
  competitors TEXT,
  target_keywords TEXT[],
  competitor_keywords TEXT[],
  
  -- GTM Classification
  gtm_playbook TEXT,
  product_type TEXT,
  
  -- Compliance & Legal
  compliance_flags TEXT,
  legal_entity TEXT,
  vat_number TEXT,
  registration_number TEXT,
  
  -- Social & Contact
  contact_email TEXT,
  contact_phone TEXT,
  linkedin_url TEXT,
  twitter_url TEXT,
  github_url TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_context_profiles_user_id ON context_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_context_profiles_usage ON context_profiles(user_id, usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_context_profiles_recent ON context_profiles(user_id, last_used_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_context_profiles_name ON context_profiles(user_id, name);

-- RLS Policies
ALTER TABLE context_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own context profiles"
  ON context_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own context profiles"
  ON context_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own context profiles"
  ON context_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own context profiles"
  ON context_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_context_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_context_profiles_updated_at
  BEFORE UPDATE ON context_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_context_profiles_updated_at();

-- Function to ensure only one default profile per user
CREATE OR REPLACE FUNCTION ensure_single_default_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    -- Set all other profiles to non-default for this user
    UPDATE context_profiles 
    SET is_default = false 
    WHERE user_id = NEW.user_id AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to ensure only one default profile
CREATE TRIGGER ensure_single_default_profile
  BEFORE INSERT OR UPDATE ON context_profiles
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION ensure_single_default_profile();

-- Comments for documentation
COMMENT ON TABLE context_profiles IS 'User-created business context profiles for reuse across projects';
COMMENT ON COLUMN context_profiles.name IS 'Profile name (e.g., "SaaS Startup", "E-commerce Client")';
COMMENT ON COLUMN context_profiles.description IS 'Optional profile description';
COMMENT ON COLUMN context_profiles.is_default IS 'Whether this profile should auto-apply for new projects';
COMMENT ON COLUMN context_profiles.usage_count IS 'Number of times profile has been applied';
COMMENT ON COLUMN context_profiles.last_used_at IS 'Last time profile was applied to context';