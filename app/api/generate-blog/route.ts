import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

export const maxDuration = 300 // 5 minutes for comprehensive blog generation

interface BusinessContext {
  companyName: string | null
  companyWebsite: string | null
  targetIndustries: string | null
  productDescription: string | null
  products: string | null
  targetAudience: string | null
  competitors: string | null
  brandTone: string | null
  painPoints: string | null
  valuePropositions: string | null
  useCases: string | null
  contentThemes: string | null
}

interface BlogRequest {
  keyword: string
  word_count: number
  tone?: string
  system_prompts?: string[]
  additional_instructions?: string
  company_name: string
  company_url: string
  apiKey: string
  business_context: BusinessContext
  language?: string
  country?: string
  batch_mode?: boolean
  batch_keywords?: Array<{ 
    keyword: string
    word_count?: number
    instructions?: string
  }>
}

interface ExistingBlogSlug {
  slug: string
  title: string
  keyword: string
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body: BlogRequest = await request.json()
    const { 
      keyword, 
      word_count,
      tone = 'professional',
      system_prompts = [],
      additional_instructions, 
      company_name, 
      company_url, 
      apiKey: clientApiKey, 
      business_context,
      language = 'en',
      country = 'US',
      batch_mode = false,
      batch_keywords = []
    } = body

    if (!keyword || !company_name || !company_url) {
      return NextResponse.json(
        { error: 'Keyword, company name, and URL are required' },
        { status: 400 }
      )
    }

    const apiKey = clientApiKey || process.env.GEMINI_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key is required. Please set it in Settings or GEMINI_API_KEY environment variable.' },
        { status: 400 }
      )
    }

    const startTime = Date.now()

    try {
      // Local dev: Direct Python script (subprocess)
      // Production: Vercel serverless function
      const isDev = process.env.NODE_ENV === 'development'
      
      if (isDev) {
        // Local: Call Python script directly
        const scriptPath = path.join(process.cwd(), 'scripts', 'generate-blog.py')
        
        return new Promise((resolve) => {
          const python = spawn('python3', [scriptPath])
          let stdout = ''
          let stderr = ''
          
          python.stdout.on('data', (data) => {
            stdout += data.toString()
          })
          
          python.stderr.on('data', (data) => {
            stderr += data.toString()
            console.error('[BLOG:Python]', data.toString().trim())
          })
          
          python.on('close', (code) => {
            if (code !== 0) {
              console.error('[BLOG] Python error:', stderr)
              resolve(NextResponse.json(
                { error: 'Blog generation failed', details: stderr },
                { status: 500 }
              ))
              return
            }
            
            try {
              const result = JSON.parse(stdout)
              const generationTime = (Date.now() - startTime) / 1000
              console.log('[BLOG] Generated in', generationTime, 's')
              resolve(NextResponse.json(result))
            } catch (e) {
              console.error('[BLOG] Failed to parse output:', e)
              resolve(NextResponse.json(
                { error: 'Failed to parse output' },
                { status: 500 }
              ))
            }
          })
          
          // Send input to Python via stdin
          const requestData = batch_mode ? {
            keyword: 'batch',
            word_count: wordCount,
            tone: tone,
            system_prompts: system_prompts || [],
            additional_instructions: additionalInstructions,
            company_name: companyName,
            company_url: companyUrl,
            apiKey: geminiApiKey,
            business_context: businessContext,
            batch_mode: true,
            batch_keywords: batchKeywords,
          } : {
            keyword: keyword,
            word_count: wordCount,
            tone: tone,
            system_prompts: system_prompts || [],
            additional_instructions: additionalInstructions,
            company_name: companyName,
            company_url: companyUrl,
            apiKey: geminiApiKey,
            business_context: businessContext,
          }
          
          python.stdin.write(JSON.stringify(requestData))
          python.stdin.end()
        })
      }
      
      // Production: Call Vercel serverless function
      const response = await fetch(`/api/python/generate-blog`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primary_keyword: keyword,
          company_url: company_url,
          company_name: company_name,
          language: language,
          country: country,
          word_count: word_count,
          tone: tone,
          system_prompts: system_prompts || [],
          content_generation_instruction: additional_instructions,
          company_data: {
            description: business_context.productDescription || business_context.companyName,
            industry: business_context.targetIndustries,
            target_audience: business_context.targetAudience ? [business_context.targetAudience] : [],
            competitors: business_context.competitors ? business_context.competitors.split(',').map((c: string) => c.trim()) : [],
          },
          batch_mode: batch_mode,
          batch_keywords: batch_mode ? batch_keywords : undefined,
          index: true,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Serverless function error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      const generationTime = (Date.now() - startTime) / 1000
      
      return NextResponse.json(batch_mode ? data : {
        title: data.headline || data.meta_title || keyword,
        content: data.html_content || '',
        metadata: {
          keyword: keyword,
          word_count: data.word_count || 0,
          generation_time: generationTime,
          company_name: company_name,
          company_url: company_url,
          aeo_score: data.aeo_score || 0,
          job_id: data.job_id,
          slug: data.slug,
          meta_title: data.meta_title,
          meta_description: data.meta_description,
          read_time: data.read_time,
        },
      })
    } catch (error) {
      if (error instanceof Error) {
        console.error('Blog generation error:', error)
        return NextResponse.json(
          {
            error: 'Failed to generate blog',
            message: error.message,
          },
          { status: 500 }
        )
      }

      console.error('Blog generation error:', error)
      return NextResponse.json(
        {
          error: 'Failed to generate blog',
          message: 'Unknown error',
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Blog generation error:', error)

    return NextResponse.json(
      {
        error: 'Failed to generate blog',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
