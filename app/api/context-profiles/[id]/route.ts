/**
 * API Route: Individual Context Profile
 * GET /api/context-profiles/[id] - Get specific profile
 * PUT /api/context-profiles/[id] - Update profile
 * DELETE /api/context-profiles/[id] - Delete profile
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface ContextProfileData {
  name?: string;
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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error } = await supabase
      .from('context_profiles')
      .select('*')
      .eq('user_id', user.id)
      .eq('id', params.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
      }
      console.error('Error fetching context profile:', error);
      return NextResponse.json({ error: 'Failed to fetch context profile' }, { status: 500 });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Error fetching context profile:', error);
    return NextResponse.json({ error: 'Failed to fetch context profile' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: ContextProfileData = await request.json();

    // Validate required fields if provided
    if (body.name !== undefined && (!body.name || body.name.trim().length === 0)) {
      return NextResponse.json({ error: 'Profile name is required' }, { status: 400 });
    }

    if (body.name && body.name.trim().length > 100) {
      return NextResponse.json({ error: 'Profile name must be 100 characters or less' }, { status: 400 });
    }

    // Check if profile name already exists for this user (if name is being changed)
    if (body.name) {
      const { data: existingProfile } = await supabase
        .from('context_profiles')
        .select('id')
        .eq('user_id', user.id)
        .eq('name', body.name.trim())
        .neq('id', params.id)
        .single();

      if (existingProfile) {
        return NextResponse.json({ error: 'A profile with this name already exists' }, { status: 409 });
      }
    }

    // Build update data - only include provided fields
    const updateData: Record<string, unknown> = {};
    
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.description !== undefined) updateData.description = body.description?.trim() || null;
    if (body.is_default !== undefined) updateData.is_default = body.is_default;
    
    // Business context fields
    if (body.tone !== undefined) updateData.tone = body.tone?.trim() || null;
    if (body.value_proposition !== undefined) updateData.value_proposition = body.value_proposition?.trim() || null;
    if (body.product_description !== undefined) updateData.product_description = body.product_description?.trim() || null;
    if (body.company_name !== undefined) updateData.company_name = body.company_name?.trim() || null;
    if (body.company_website !== undefined) updateData.company_website = body.company_website?.trim() || null;
    if (body.target_countries !== undefined) updateData.target_countries = body.target_countries?.trim() || null;
    if (body.target_industries !== undefined) updateData.target_industries = body.target_industries?.trim() || null;
    if (body.icp !== undefined) updateData.icp = body.icp?.trim() || null;
    if (body.countries !== undefined) updateData.countries = body.countries || [];
    if (body.products !== undefined) updateData.products = body.products || [];
    if (body.marketing_goals !== undefined) updateData.marketing_goals = body.marketing_goals || [];
    if (body.competitors !== undefined) updateData.competitors = body.competitors?.trim() || null;
    if (body.target_keywords !== undefined) updateData.target_keywords = body.target_keywords || [];
    if (body.competitor_keywords !== undefined) updateData.competitor_keywords = body.competitor_keywords || [];
    if (body.gtm_playbook !== undefined) updateData.gtm_playbook = body.gtm_playbook?.trim() || null;
    if (body.product_type !== undefined) updateData.product_type = body.product_type?.trim() || null;
    if (body.compliance_flags !== undefined) updateData.compliance_flags = body.compliance_flags?.trim() || null;
    if (body.legal_entity !== undefined) updateData.legal_entity = body.legal_entity?.trim() || null;
    if (body.vat_number !== undefined) updateData.vat_number = body.vat_number?.trim() || null;
    if (body.registration_number !== undefined) updateData.registration_number = body.registration_number?.trim() || null;
    if (body.contact_email !== undefined) updateData.contact_email = body.contact_email?.trim() || null;
    if (body.contact_phone !== undefined) updateData.contact_phone = body.contact_phone?.trim() || null;
    if (body.linkedin_url !== undefined) updateData.linkedin_url = body.linkedin_url?.trim() || null;
    if (body.twitter_url !== undefined) updateData.twitter_url = body.twitter_url?.trim() || null;
    if (body.github_url !== undefined) updateData.github_url = body.github_url?.trim() || null;

    const { data: profile, error } = await supabase
      .from('context_profiles')
      .update(updateData)
      .eq('user_id', user.id)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
      }
      console.error('Error updating context profile:', error);
      return NextResponse.json({ error: 'Failed to update context profile' }, { status: 500 });
    }

    return NextResponse.json({ success: true, profile });
  } catch (error) {
    console.error('Error updating context profile:', error);
    return NextResponse.json({ error: 'Failed to update context profile' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('context_profiles')
      .delete()
      .eq('user_id', user.id)
      .eq('id', params.id);

    if (error) {
      console.error('Error deleting context profile:', error);
      return NextResponse.json({ error: 'Failed to delete context profile' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting context profile:', error);
    return NextResponse.json({ error: 'Failed to delete context profile' }, { status: 500 });
  }
}