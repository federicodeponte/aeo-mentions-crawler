# Fast MVP Implementation Guide

## Week 1: Foundation Setup

### Day 1-2: Environment & Database Setup

#### 1. Database Setup (PostgreSQL)
```sql
-- Create database schema
CREATE TABLE companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    search_terms TEXT[],
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE prompts (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    text TEXT NOT NULL,
    category VARCHAR(100),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE monitoring_runs (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE llm_results (
    id SERIAL PRIMARY KEY,
    run_id INTEGER REFERENCES monitoring_runs(id),
    model VARCHAR(50) NOT NULL,
    prompt_id INTEGER REFERENCES prompts(id),
    response TEXT,
    links JSONB,
    ai_mentions INTEGER DEFAULT 0,
    source_mentions INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### 2. Backend API Setup (Node.js + Express)
```bash
# Initialize project
mkdir peec-ai-mvp
cd peec-ai-mvp
npm init -y
npm install express pg cors dotenv bcryptjs jsonwebtoken

# Create basic server structure
mkdir src
mkdir src/routes
mkdir src/controllers
mkdir src/models
```

```javascript
// src/server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/companies', require('./routes/companies'));
app.use('/api/prompts', require('./routes/prompts'));
app.use('/api/monitoring', require('./routes/monitoring'));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
```

#### 3. Basic API Endpoints
```javascript
// src/routes/companies.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

// Get all companies
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM companies ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create company
router.post('/', async (req, res) => {
    const { name, search_terms } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO companies (name, search_terms) VALUES ($1, $2) RETURNING *',
            [name, search_terms]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
```

### Day 3-4: Frontend Foundation

#### 1. React App Setup
```bash
npx create-react-app peec-ai-frontend --template typescript
cd peec-ai-frontend
npm install axios react-router-dom @types/react-router-dom
```

#### 2. Basic Components
```typescript
// src/components/CompanyList.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Company {
    id: number;
    name: string;
    search_terms: string[];
    created_at: string;
}

const CompanyList: React.FC = () => {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCompanies();
    }, []);

    const fetchCompanies = async () => {
        try {
            const response = await axios.get('http://localhost:3001/api/companies');
            setCompanies(response.data);
        } catch (error) {
            console.error('Error fetching companies:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="company-list">
            <h2>Companies</h2>
            {companies.map(company => (
                <div key={company.id} className="company-item">
                    <h3>{company.name}</h3>
                    <p>Search terms: {company.search_terms?.join(', ')}</p>
                </div>
            ))}
        </div>
    );
};

export default CompanyList;
```

### Day 5-7: n8n Workflow Modification

#### 1. Clone and Modify Existing Workflow
```json
// Modified workflow structure
{
  "name": "peec-ai-mvp-workflow",
  "nodes": [
    {
      "name": "Daily Trigger",
      "type": "n8n-nodes-base.cron",
      "parameters": {
        "rule": {
          "hour": 9,
          "minute": 0
        }
      }
    },
    {
      "name": "Get Companies",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "method": "GET",
        "url": "http://localhost:3001/api/companies"
      }
    },
    {
      "name": "Get Prompts",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "method": "GET",
        "url": "http://localhost:3001/api/prompts"
      }
    }
  ]
}
```

## Week 2: LLM Integration

### Day 1-3: ChatGPT Integration

#### 1. OpenAI API Integration
```javascript
// src/services/openai.js
const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function processPromptWithChatGPT(prompt, companyName) {
    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: `You are a helpful assistant. When responding, include relevant sources and links when possible.`
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: 2000,
        });

        return {
            response: completion.choices[0].message.content,
            model: 'chatgpt',
            timestamp: new Date()
        };
    } catch (error) {
        console.error('ChatGPT API error:', error);
        throw error;
    }
}

module.exports = { processPromptWithChatGPT };
```

#### 2. Serper Search Integration
```javascript
// src/services/serper.js
const axios = require('axios');

async function searchWithSerper(query) {
    try {
        const response = await axios.post('https://google.serper.dev/search', {
            q: query
        }, {
            headers: {
                'X-API-KEY': process.env.SERPER_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        return response.data;
    } catch (error) {
        console.error('Serper API error:', error);
        throw error;
    }
}

module.exports = { searchWithSerper };
```

### Day 4-5: Gemini Integration

#### 1. Google Gemini API
```javascript
// src/services/gemini.js
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function processPromptWithGemini(prompt) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return {
            response: text,
            model: 'gemini',
            timestamp: new Date()
        };
    } catch (error) {
        console.error('Gemini API error:', error);
        throw error;
    }
}

module.exports = { processPromptWithGemini };
```

### Day 6-7: Perplexity Integration

#### 1. Perplexity API
```javascript
// src/services/perplexity.js
const axios = require('axios');

async function processPromptWithPerplexity(prompt) {
    try {
        const response = await axios.post('https://api.perplexity.ai/chat/completions', {
            model: 'sonar',
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ]
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        return {
            response: response.data.choices[0].message.content,
            model: 'perplexity',
            timestamp: new Date()
        };
    } catch (error) {
        console.error('Perplexity API error:', error);
        throw error;
    }
}

module.exports = { processPromptWithPerplexity };
```

## Week 3: Data Processing & Storage

### Day 1-3: Link Extraction & Analysis

#### 1. Link Extraction Function
```javascript
// src/utils/linkExtractor.js
function extractLinks(text) {
    const urlRegex = /(https?:\/\/[^\s"']+)/g;
    const links = Array.from(new Set(text.match(urlRegex) || []));
    
    return links.map(link => ({
        url: link,
        domain: new URL(link).hostname,
        type: categorizeLink(link)
    }));
}

function categorizeLink(url) {
    const domain = new URL(url).hostname.toLowerCase();
    
    if (domain.includes('wikipedia.org')) return 'wikipedia';
    if (domain.includes('youtube.com')) return 'youtube';
    if (domain.includes('twitter.com') || domain.includes('x.com')) return 'twitter';
    if (domain.includes('linkedin.com')) return 'linkedin';
    
    return 'other';
}

module.exports = { extractLinks, categorizeLink };
```

#### 2. Mention Detection
```javascript
// src/utils/mentionDetector.js
function countMentions(text, companyName) {
    const regex = new RegExp(companyName, 'gi');
    const matches = text.match(regex);
    return matches ? matches.length : 0;
}

function analyzeSourceContent(html, companyName) {
    // Remove HTML tags
    const text = html.replace(/<[^>]*>/g, ' ');
    
    return {
        mentions: countMentions(text, companyName),
        wordCount: text.split(/\s+/).length,
        hasMentions: countMentions(text, companyName) > 0
    };
}

module.exports = { countMentions, analyzeSourceContent };
```

### Day 4-7: Results Storage & API

#### 1. Results Storage API
```javascript
// src/routes/results.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

// Store LLM result
router.post('/llm', async (req, res) => {
    const { run_id, model, prompt_id, response, links, ai_mentions, source_mentions } = req.body;
    
    try {
        const result = await pool.query(
            `INSERT INTO llm_results 
             (run_id, model, prompt_id, response, links, ai_mentions, source_mentions) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) 
             RETURNING *`,
            [run_id, model, prompt_id, response, JSON.stringify(links), ai_mentions, source_mentions]
        );
        
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get results for company
router.get('/company/:companyId', async (req, res) => {
    const { companyId } = req.params;
    const { date } = req.query;
    
    try {
        const result = await pool.query(
            `SELECT lr.*, p.text as prompt_text, c.name as company_name
             FROM llm_results lr
             JOIN prompts p ON lr.prompt_id = p.id
             JOIN monitoring_runs mr ON lr.run_id = mr.id
             JOIN companies c ON mr.company_id = c.id
             WHERE c.id = $1 AND mr.date = $2
             ORDER BY lr.created_at DESC`,
            [companyId, date || new Date().toISOString().split('T')[0]]
        );
        
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
```

## Week 4: Dashboard & Analytics

### Day 1-3: Results Display

#### 1. Results Component
```typescript
// src/components/ResultsViewer.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface LLMResult {
    id: number;
    model: string;
    prompt_text: string;
    response: string;
    links: any[];
    ai_mentions: number;
    source_mentions: number;
    created_at: string;
}

interface ResultsViewerProps {
    companyId: number;
    date?: string;
}

const ResultsViewer: React.FC<ResultsViewerProps> = ({ companyId, date }) => {
    const [results, setResults] = useState<LLMResult[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchResults();
    }, [companyId, date]);

    const fetchResults = async () => {
        try {
            const response = await axios.get(
                `http://localhost:3001/api/results/company/${companyId}?date=${date || new Date().toISOString().split('T')[0]}`
            );
            setResults(response.data);
        } catch (error) {
            console.error('Error fetching results:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div>Loading results...</div>;

    return (
        <div className="results-viewer">
            <h3>Results for {date || 'Today'}</h3>
            {results.map(result => (
                <div key={result.id} className="result-item">
                    <div className="result-header">
                        <span className="model">{result.model}</span>
                        <span className="mentions">
                            AI: {result.ai_mentions} | Sources: {result.source_mentions}
                        </span>
                    </div>
                    <div className="prompt">{result.prompt_text}</div>
                    <div className="response">{result.response}</div>
                    {result.links && result.links.length > 0 && (
                        <div className="links">
                            <strong>Sources:</strong>
                            <ul>
                                {result.links.map((link, index) => (
                                    <li key={index}>
                                        <a href={link.url} target="_blank" rel="noopener">
                                            {link.domain}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default ResultsViewer;
```

### Day 4-7: Analytics & Charts

#### 1. Analytics API
```javascript
// src/routes/analytics.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

// Get mention trends
router.get('/mentions/:companyId', async (req, res) => {
    const { companyId } = req.params;
    const { days = 30 } = req.query;
    
    try {
        const result = await pool.query(
            `SELECT 
                DATE(mr.date) as date,
                lr.model,
                SUM(lr.ai_mentions) as total_ai_mentions,
                SUM(lr.source_mentions) as total_source_mentions
             FROM llm_results lr
             JOIN monitoring_runs mr ON lr.run_id = mr.id
             WHERE mr.company_id = $1 
             AND mr.date >= NOW() - INTERVAL '${days} days'
             GROUP BY DATE(mr.date), lr.model
             ORDER BY date DESC, lr.model`,
            [companyId]
        );
        
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get source distribution
router.get('/sources/:companyId', async (req, res) => {
    const { companyId } = req.params;
    
    try {
        const result = await pool.query(
            `SELECT 
                jsonb_array_elements(lr.links)->>'type' as source_type,
                COUNT(*) as count
             FROM llm_results lr
             JOIN monitoring_runs mr ON lr.run_id = mr.id
             WHERE mr.company_id = $1 
             AND mr.date = CURRENT_DATE
             GROUP BY jsonb_array_elements(lr.links)->>'type'`,
            [companyId]
        );
        
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
```

#### 2. Charts Component
```typescript
// src/components/AnalyticsCharts.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface AnalyticsChartsProps {
    companyId: number;
}

const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ companyId }) => {
    const [mentionTrends, setMentionTrends] = useState([]);
    const [sourceDistribution, setSourceDistribution] = useState([]);

    useEffect(() => {
        fetchAnalytics();
    }, [companyId]);

    const fetchAnalytics = async () => {
        try {
            const [trendsRes, sourcesRes] = await Promise.all([
                axios.get(`http://localhost:3001/api/analytics/mentions/${companyId}`),
                axios.get(`http://localhost:3001/api/analytics/sources/${companyId}`)
            ]);
            
            setMentionTrends(trendsRes.data);
            setSourceDistribution(sourcesRes.data);
        } catch (error) {
            console.error('Error fetching analytics:', error);
        }
    };

    return (
        <div className="analytics-charts">
            <div className="chart-section">
                <h3>Mention Trends</h3>
                {/* Add Chart.js or similar charting library */}
                <div className="chart-placeholder">
                    {mentionTrends.map((trend: any) => (
                        <div key={`${trend.date}-${trend.model}`}>
                            {trend.date}: {trend.model} - AI: {trend.total_ai_mentions}, Sources: {trend.total_source_mentions}
                        </div>
                    ))}
                </div>
            </div>
            
            <div className="chart-section">
                <h3>Source Distribution</h3>
                <div className="chart-placeholder">
                    {sourceDistribution.map((source: any) => (
                        <div key={source.source_type}>
                            {source.source_type}: {source.count}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AnalyticsCharts;
```

## Deployment & Testing

### Day 1-2: Environment Setup
```bash
# Production environment variables
OPENAI_API_KEY=your_openai_key
GEMINI_API_KEY=your_gemini_key
PERPLEXITY_API_KEY=your_perplexity_key
SERPER_API_KEY=your_serper_key
DATABASE_URL=your_postgres_url
JWT_SECRET=your_jwt_secret
```

### Day 3-4: n8n Cloud Setup
1. **Deploy workflow to n8n Cloud**
2. **Set up webhook endpoints**
3. **Configure daily scheduling**
4. **Test end-to-end execution**

### Day 5-7: Testing & Optimization
1. **Load testing** with multiple companies
2. **Error handling** and retry logic
3. **Performance optimization**
4. **User acceptance testing**

## Quick Start Commands

```bash
# Backend setup
cd peec-ai-mvp
npm install
npm run dev

# Frontend setup
cd peec-ai-frontend
npm install
npm start

# Database setup
psql -d your_database -f schema.sql

# n8n workflow import
# Import the modified workflow JSON to n8n Cloud
```

This implementation guide provides a practical path to build your MVP in 4 weeks, leveraging your existing n8n workflow while adding the necessary infrastructure for a scalable SaaS platform. 