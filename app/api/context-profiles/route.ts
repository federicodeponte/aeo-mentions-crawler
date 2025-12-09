/**
 * API Route: Context Profiles
 * GET /api/context-profiles - List user's context profiles
 * POST /api/context-profiles - Create new context profile
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface ContextProfileData {
  name: string;
  description?: string;
  is_default?: boolean;
  
  // Business context fields
  tone?: string;
  value_proposition?: string;
  product_description?: string;
  company_name?: string;
  company_website?: string;
  target_countries?: string;
  target_industries?: string;
  icp?: string;
  countries?: string[];
  products?: string[];
  marketing_goals?: string[];
  competitors?: string;
  target_keywords?: string[];
  competitor_keywords?: string[];
  gtm_playbook?: string;
  product_type?: string;
  compliance_flags?: string;
  legal_entity?: string;
  vat_number?: string;
  registration_number?: string;
  contact_email?: string;
  contact_phone?: string;
  linkedin_url?: string;
  twitter_url?: string;
  github_url?: string;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profiles, error } = await supabase
      .from('context_profiles')
      .select('*')
      .eq('user_id', user.id)
      .order('last_used_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching context profiles:', error);
      return NextResponse.json({ error: 'Failed to fetch context profiles' }, { status: 500 });
    }

    return NextResponse.json({ profiles: profiles || [] });
  } catch (error) {
    console.error('Error fetching context profiles:', error);
    return NextResponse.json({ error: 'Failed to fetch context profiles' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: ContextProfileData = await request.json();

    // Validate required fields
    if (!body.name || body.name.trim().length === 0) {
      return NextResponse.json({ error: 'Profile name is required' }, { status: 400 });
    }

    if (body.name.trim().length > 100) {
      return NextResponse.json({ error: 'Profile name must be 100 characters or less' }, { status: 400 });
    }

    // Check if profile name already exists for this user
    const { data: existingProfile } = await supabase
      .from('context_profiles')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', body.name.trim())
      .single();

    if (existingProfile) {
      return NextResponse.json({ error: 'A profile with this name already exists' }, { status: 409 });
    }

    // Create new profile
    const profileData = {
      user_id: user.id,
      name: body.name.trim(),
      description: body.description?.trim() || null,
      is_default: body.is_default || false,
      
      // Business context fields - use null for empty/undefined values
      tone: body.tone?.trim() || null,
      value_proposition: body.value_proposition?.trim() || null,
      product_description: body.product_description?.trim() || null,
      company_name: body.company_name?.trim() || null,
      company_website: body.company_website?.trim() || null,
      target_countries: body.target_countries?.trim() || null,
      target_industries: body.target_industries?.trim() || null,
      icp: body.icp?.trim() || null,
      countries: body.countries || [],
      products: body.products || [],
      marketing_goals: body.marketing_goals || [],
      competitors: body.competitors?.trim() || null,
      target_keywords: body.target_keywords || [],
      competitor_keywords: body.competitor_keywords || [],
      gtm_playbook: body.gtm_playbook?.trim() || null,
      product_type: body.product_type?.trim() || null,
      compliance_flags: body.compliance_flags?.trim() || null,
      legal_entity: body.legal_entity?.trim() || null,
      vat_number: body.vat_number?.trim() || null,
      registration_number: body.registration_number?.trim() || null,
      contact_email: body.contact_email?.trim() || null,
      contact_phone: body.contact_phone?.trim() || null,
      linkedin_url: body.linkedin_url?.trim() || null,
      twitter_url: body.twitter_url?.trim() || null,
      github_url: body.github_url?.trim() || null,
    };

    const { data: profile, error } = await supabase
      .from('context_profiles')
      .insert(profileData)
      .select()
      .single();

    if (error) {
      console.error('Error creating context profile:', error);
      return NextResponse.json({ error: 'Failed to create context profile' }, { status: 500 });
    }

    return NextResponse.json({ success: true, profile }, { status: 201 });
  } catch (error) {
    console.error('Error creating context profile:', error);
    return NextResponse.json({ error: 'Failed to create context profile' }, { status: 500 });
  }
}