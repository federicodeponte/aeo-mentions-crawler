# AI Visibility Monitor MVP - Multi-LLM Prompt Monitoring System

## Product Overview
A scalable SaaS platform that monitors 10 prompts per company across 3 LLM models (ChatGPT + Search, Gemini + Search, Perplexity) daily to track brand mentions, source citations, and competitive intelligence.

## Current Workflow Analysis

### Existing Architecture
- **Data Source**: Google Sheets with prompts (Column A)
- **LLM Models**: 
  - ChatGPT (OpenAI GPT-4)
  - Google Gemini 2.0 Flash
  - Perplexity AI
- **Search Integration**: Serper API for web search
- **Processing**: Link extraction, source fetching, mention counting
- **Output**: Company mention tracking and source analysis

### Key Components Identified
1. **Prompt Management**: Google Sheets integration
2. **Multi-LLM Processing**: Parallel processing across 3 models
3. **Link Extraction**: Regex-based URL parsing
4. **Source Analysis**: HTML fetching and content analysis
5. **Mention Counting**: Company name detection in AI responses and sources
6. **Data Aggregation**: Results compilation and reporting

## MVP Product Specification

### Core Features

#### 1. **Prompt Management System**
- **10 prompts per company** stored in structured format
- **Company profiles** with customizable search terms
- **Prompt categories**: Brand mentions, competitive analysis, industry trends
- **Scheduling**: Daily automated execution

#### 2. **Multi-LLM Processing Engine**
- **ChatGPT + Search**: OpenAI API + Serper integration
- **Gemini + Search**: Google Gemini API + native search
- **Perplexity**: Perplexity API with built-in search
- **Parallel processing** for efficiency
- **Rate limiting** and error handling

#### 3. **Source Intelligence**
- **Link extraction** from AI responses
- **Source categorization**: Wikipedia, YouTube, Twitter, news sites
- **Content fetching** and analysis
- **Mention tracking** in source content

#### 4. **Analytics Dashboard**
- **Daily reports** per company
- **Mention trends** across LLM platforms
- **Source impact analysis**
- **Competitive benchmarking**

### Technical Architecture

#### Frontend (React/Next.js)
```typescript
// Core Components
- CompanyDashboard
- PromptManager
- ResultsViewer
- AnalyticsCharts
- AlertSystem
```

#### Backend (Node.js/Express)
```typescript
// API Endpoints
- /api/companies - CRUD operations
- /api/prompts - Prompt management
- /api/monitoring - Daily execution
- /api/results - Data retrieval
- /api/analytics - Reporting
```

#### Database Schema (PostgreSQL)
```sql
-- Core Tables
companies (id, name, search_terms, created_at)
prompts (id, company_id, text, category, active)
monitoring_runs (id, company_id, date, status)
llm_results (id, run_id, model, prompt_id, response, links)
source_analysis (id, result_id, url, content, mentions)
```

#### Workflow Engine (n8n)
- **Scheduled triggers** for daily execution
- **Parallel processing** across LLM models
- **Error handling** and retry logic
- **Data transformation** and storage

### MVP Development Plan

#### Phase 1: Core Infrastructure (Week 1-2)
1. **Database Setup**
   - PostgreSQL schema design
   - Migration scripts
   - Basic CRUD operations

2. **API Development**
   - Express.js server setup
   - Authentication system
   - Core endpoints

3. **Frontend Foundation**
   - React app with TypeScript
   - Basic routing and layout
   - Company management interface

#### Phase 2: LLM Integration (Week 3-4)
1. **API Credentials Management**
   - Secure credential storage
   - API key rotation
   - Rate limiting

2. **Multi-LLM Processing**
   - ChatGPT integration
   - Gemini integration
   - Perplexity integration
   - Parallel execution logic

3. **Search Integration**
   - Serper API setup
   - Search result processing
   - Link extraction

#### Phase 3: Data Processing (Week 5-6)
1. **Content Analysis**
   - HTML fetching and parsing
   - Markdown conversion
   - Mention detection algorithms

2. **Data Storage**
   - Results aggregation
   - Historical data management
   - Performance optimization

3. **Error Handling**
   - Retry mechanisms
   - Fallback strategies
   - Monitoring and alerting

#### Phase 4: Analytics & UI (Week 7-8)
1. **Dashboard Development**
   - Real-time data visualization
   - Trend analysis charts
   - Export functionality

2. **Reporting System**
   - Daily summary reports
   - Custom date ranges
   - Email notifications

3. **User Experience**
   - Responsive design
   - Intuitive navigation
   - Performance optimization

### Fast MVP Implementation Strategy

#### 1. **Leverage Existing Workflow**
- **Copy and modify** the current n8n workflow
- **Parameterize** company names and prompts
- **Add scheduling** for daily execution
- **Implement data storage** for results

#### 2. **Minimal Viable Frontend**
- **Simple React dashboard** with basic CRUD
- **Results display** in table format
- **Basic charts** using Chart.js or similar
- **Export to CSV/Excel** functionality

#### 3. **Database-First Approach**
- **Start with PostgreSQL** for data storage
- **Use Prisma ORM** for type safety
- **Implement basic API** endpoints
- **Focus on data integrity**

#### 4. **Incremental Feature Rollout**
- **Week 1**: Basic company/prompt management
- **Week 2**: Single LLM integration (start with ChatGPT)
- **Week 3**: Add remaining LLM models
- **Week 4**: Analytics and reporting

### Technical Stack Recommendations

#### Backend
- **Node.js + Express** (familiar, fast development)
- **PostgreSQL** (reliable, good for analytics)
- **Prisma ORM** (type safety, migrations)
- **JWT Authentication** (simple, secure)

#### Frontend
- **Next.js + React** (SEO-friendly, fast)
- **TypeScript** (type safety, better DX)
- **Tailwind CSS** (rapid styling)
- **Chart.js** (simple charts)

#### Infrastructure
- **Vercel** (frontend hosting)
- **Railway/Render** (backend hosting)
- **Supabase** (database + auth)
- **n8n Cloud** (workflow automation)

#### Monitoring
- **Sentry** (error tracking)
- **LogRocket** (user analytics)
- **Cronitor** (uptime monitoring)

### Cost Estimation

#### Development (8 weeks)
- **Backend Developer**: $8,000-12,000
- **Frontend Developer**: $6,000-10,000
- **DevOps/Infrastructure**: $2,000-4,000

#### Monthly Operational Costs
- **Hosting**: $50-100/month
- **API Calls**: $200-500/month (depending on usage)
- **Database**: $20-50/month
- **Monitoring**: $50-100/month

### Success Metrics

#### Technical Metrics
- **Uptime**: >99.5%
- **Response Time**: <2 seconds
- **Data Accuracy**: >95%
- **Error Rate**: <1%

#### Business Metrics
- **User Adoption**: 10 companies in first month
- **Data Quality**: 90% successful daily runs
- **User Engagement**: 80% weekly active users
- **Customer Satisfaction**: >4.5/5 rating

### Risk Mitigation

#### Technical Risks
- **API Rate Limits**: Implement queuing and retry logic
- **Data Quality**: Multiple validation layers
- **Scalability**: Start with single-tenant, plan for multi-tenant

#### Business Risks
- **Market Competition**: Focus on unique multi-LLM approach
- **Customer Acquisition**: Leverage existing AI Visibility Monitor network
- **Pricing Strategy**: Start with freemium model

### Next Steps

1. **Immediate Actions** (This Week)
   - Set up development environment
   - Create database schema
   - Clone and modify existing n8n workflow
   - Set up basic React frontend

2. **Week 1 Deliverables**
   - Working database with sample data
   - Basic API endpoints
   - Simple frontend for company management
   - Modified n8n workflow for one company

3. **Week 2 Deliverables**
   - Multi-company support
   - ChatGPT integration working
   - Basic results display
   - Daily scheduling implemented

This MVP approach leverages your existing workflow while building a scalable, user-friendly platform that can quickly demonstrate value to potential customers. 