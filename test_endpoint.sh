#!/bin/bash
curl -X POST http://localhost:3000/api/generate-keywords-stream \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Test Company",
    "company_url": "https://example.com",
    "description": "Project management software",
    "industry": "SaaS",
    "products": ["Project Management"],
    "num_keywords": 3,
    "enable_research": false,
    "enable_serp_analysis": false
  }' \
  --no-buffer \
  -m 10 \
  2>&1 | head -20
