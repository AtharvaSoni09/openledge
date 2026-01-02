-- WARNING: This will delete existing data. 
-- If you want to keep data, manually add missing columns instead.
DROP TABLE IF EXISTS legislation;

CREATE TABLE legislation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    url_slug TEXT UNIQUE NOT NULL,
    markdown_body TEXT NOT NULL,
    tldr TEXT,
    seo_title TEXT,
    meta_description TEXT,
    origin_chamber TEXT,
    type TEXT,
    congress INTEGER,
    update_date TEXT,
    sponsor_data JSONB DEFAULT '{}'::jsonb,
    news_context JSONB DEFAULT '[]'::jsonb,
    policy_research JSONB DEFAULT '[]'::jsonb,
    congress_gov_url TEXT,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indices for performance
CREATE INDEX idx_legislation_bill_id ON legislation(bill_id);
CREATE INDEX idx_legislation_url_slug ON legislation(url_slug);
CREATE INDEX idx_legislation_created_at ON legislation(created_at DESC);
