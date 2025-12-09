/**
 * API Route: Apply Context Profile
 * POST /api/context-profiles/[id]/apply - Apply profile to current business context
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the profile to apply
    const { data: profile, error: profileError } = await supabase
      .from('context_profiles')
      .select('*')
      .eq('user_id', user.id)
      .eq('id', params.id)
      .single();

    if (profileError) {
      if (profileError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
      }
      console.error('Error fetching context profile:', profileError);
      return NextResponse.json({ error: 'Failed to fetch context profile' }, { status: 500 });
    }

    // Map profile fields to business_contexts table format
    const contextData = {
      user_id: user.id,
      
      // Context Variables  
      tone: profile.tone,
      value_proposition: profile.value_proposition,
      target_countries: profile.target_countries,
      product_description: profile.product_description,
      competitors: profile.competitors,
      target_industries: profile.target_industries,
      compliance_flags: profile.compliance_flags,
      marketing_goals: profile.marketing_goals,
      
      // Company & Contact
      company_name: profile.company_name,
      company_website: profile.company_website,
      contact_email: profile.contact_email,
      contact_phone: profile.contact_phone,
      linkedin_url: profile.linkedin_url,
      twitter_url: profile.twitter_url,
      github_url: profile.github_url,
      
      // Business Context
      icp: profile.icp,
      countries: profile.countries,
      products: profile.products,
      target_keywords: profile.target_keywords,
      competitor_keywords: profile.competitor_keywords,
      
      // GTM Profile
      gtm_playbook: profile.gtm_playbook,
      product_type: profile.product_type,
      
      // Compliance & Legal (need to add these fields to business_contexts if not present)
      legal_entity: profile.legal_entity,
      vat_number: profile.vat_number,
      registration_number: profile.registration_number,
      
      updated_at: new Date().toISOString()
    };

    // Apply profile to business_contexts (upsert)
    const { data: context, error: contextError } = await supabase
      .from('business_contexts')
      .upsert(contextData, { onConflict: 'user_id' })
      .select()
      .single();

    if (contextError) {
      console.error('Error applying context profile:', contextError);
      return NextResponse.json({ error: 'Failed to apply context profile' }, { status: 500 });
    }

    // Update profile usage statistics
    const { error: updateError } = await supabase
      .from('context_profiles')
      .update({
        usage_count: (profile.usage_count || 0) + 1,
        last_used_at: new Date().toISOString()
      })
      .eq('id', params.id);

    if (updateError) {
      // Don't fail the request if usage tracking fails - just log it
      console.warn('Warning: Failed to update profile usage stats:', updateError);
    }

    // Transform back to frontend format (same as in context-variables route)
    const contextVariables = {
      tone: context.tone || undefined,
      valueProposition: context.value_proposition || undefined,
      targetCountries: context.target_countries || undefined,
      productDescription: context.product_description || undefined,
      competitors: context.competitors || undefined,
      targetIndustries: context.target_industries || undefined,
      complianceFlags: context.compliance_flags || undefined,
      marketingGoals: context.marketing_goals || undefined,
      companyName: context.company_name || undefined,
      companyWebsite: context.company_website || undefined,
      contactEmail: context.contact_email || undefined,
      contactPhone: context.contact_phone || undefined,
      linkedInUrl: context.linkedin_url || undefined,
      twitterUrl: context.twitter_url || undefined,
      githubUrl: context.github_url || undefined,
    };

    const businessContext = {
      icp: context.icp || undefined,
      countries: context.countries || [],
      products: context.products || [],
      targetKeywords: context.target_keywords || [],
      competitorKeywords: context.competitor_keywords || [],
    };

    const gtmProfile = {
      gtmPlaybook: context.gtm_playbook || undefined,
      productType: context.product_type || undefined,
    };

    return NextResponse.json({ 
      success: true,
      profile: {
        id: profile.id,
        name: profile.name,
        description: profile.description,
        usage_count: (profile.usage_count || 0) + 1,
        last_used_at: new Date().toISOString()
      },
      contextVariables,
      businessContext,
      gtmProfile
    });
  } catch (error) {
    console.error('Error applying context profile:', error);
    return NextResponse.json({ error: 'Failed to apply context profile' }, { status: 500 });
  }
}