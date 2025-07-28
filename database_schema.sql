-- PEEC AI Database Schema for Supabase
-- Run this in your Supabase SQL editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Companies table
CREATE TABLE companies (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    search_terms TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Prompts table
CREATE TABLE prompts (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT REFERENCES companies(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    category VARCHAR(100) DEFAULT 'general',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Monitoring runs table
CREATE TABLE monitoring_runs (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT REFERENCES companies(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- LLM results table
CREATE TABLE llm_results (
    id BIGSERIAL PRIMARY KEY,
    run_id BIGINT REFERENCES monitoring_runs(id) ON DELETE CASCADE,
    model VARCHAR(50) NOT NULL,
    prompt_id BIGINT REFERENCES prompts(id) ON DELETE CASCADE,
    response TEXT,
    links JSONB DEFAULT '[]',
    ai_mentions INTEGER DEFAULT 0,
    source_mentions INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_companies_name ON companies(name);
CREATE INDEX idx_prompts_company_id ON prompts(company_id);
CREATE INDEX idx_prompts_active ON prompts(active);
CREATE INDEX idx_monitoring_runs_company_id ON monitoring_runs(company_id);
CREATE INDEX idx_monitoring_runs_date ON monitoring_runs(date);
CREATE INDEX idx_monitoring_runs_status ON monitoring_runs(status);
CREATE INDEX idx_llm_results_run_id ON llm_results(run_id);
CREATE INDEX idx_llm_results_model ON llm_results(model);
CREATE INDEX idx_llm_results_prompt_id ON llm_results(prompt_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prompts_updated_at BEFORE UPDATE ON prompts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_monitoring_runs_updated_at BEFORE UPDATE ON monitoring_runs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_results ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust based on your authentication needs)
-- For now, allow all operations (you can restrict this later)
CREATE POLICY "Allow all operations on companies" ON companies FOR ALL USING (true);
CREATE POLICY "Allow all operations on prompts" ON prompts FOR ALL USING (true);
CREATE POLICY "Allow all operations on monitoring_runs" ON monitoring_runs FOR ALL USING (true);
CREATE POLICY "Allow all operations on llm_results" ON llm_results FOR ALL USING (true);

-- Insert sample data for testing
INSERT INTO companies (name, search_terms) VALUES 
('Planeco Building', ARRAY['planeco', 'planeco building', 'sustainable construction']),
('TechCorp', ARRAY['techcorp', 'technology', 'software']),
('GreenEnergy Inc', ARRAY['greenenergy', 'renewable energy', 'solar']);

-- Insert sample prompts
INSERT INTO prompts (company_id, text, category) VALUES 
(1, 'What are the latest developments in sustainable building materials?', 'industry_trends'),
(1, 'Who are the main competitors in the green construction industry?', 'competitive_analysis'),
(1, 'What are the current regulations for sustainable building in Europe?', 'regulatory'),
(2, 'What are the emerging trends in AI and machine learning?', 'technology_trends'),
(2, 'Who are the top software companies in the enterprise space?', 'competitive_analysis'),
(3, 'What are the latest innovations in solar panel technology?', 'technology_trends'),
(3, 'What government incentives exist for renewable energy projects?', 'regulatory');

-- Create a view for easy querying of results
CREATE VIEW company_results_summary AS
SELECT 
    c.id as company_id,
    c.name as company_name,
    mr.date as run_date,
    mr.status as run_status,
    lr.model,
    COUNT(lr.id) as total_results,
    SUM(lr.ai_mentions) as total_ai_mentions,
    SUM(lr.source_mentions) as total_source_mentions,
    AVG(jsonb_array_length(lr.links)) as avg_links_per_result
FROM companies c
LEFT JOIN monitoring_runs mr ON c.id = mr.company_id
LEFT JOIN llm_results lr ON mr.id = lr.run_id
GROUP BY c.id, c.name, mr.date, mr.status, lr.model
ORDER BY c.name, mr.date DESC, lr.model; 