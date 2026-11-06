import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { getSupabaseAdmin } from '../_shared/supabaseAdmin.ts';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = getSupabaseAdmin();

    // Verify Admin Authorization
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Admin authentication required.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid admin token.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || (await req.json().catch(() => ({}))).action;

    // 1. STATS OVERVIEW
    if (action === 'get-stats') {
      const { count: totalParticipants } = await supabase
        .from('participants')
        .select('*', { count: 'exact', head: true });

      const { count: totalDomainRegistrations } = await supabase
        .from('participant_domains')
        .select('*', { count: 'exact', head: true });

      const { count: totalOfferLetters } = await supabase
        .from('offer_letters')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'valid');

      // Domain breakdown
      const { data: domains } = await supabase.from('internship_domains').select('id, domain_code, domain_name');
      const domainStats: Record<string, number> = {};

      if (domains) {
        for (const d of domains) {
          const { count } = await supabase
            .from('participant_domains')
            .select('*', { count: 'exact', head: true })
            .eq('domain_id', d.id);
          domainStats[d.domain_code] = count || 0;
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          stats: {
            totalParticipants: totalParticipants || 0,
            totalDomainRegistrations: totalDomainRegistrations || 0,
            totalOfferLetters: totalOfferLetters || 0,
            pendingOfferLetters: Math.max(0, (totalDomainRegistrations || 0) - (totalOfferLetters || 0)),
            fullStackRegistrations: domainStats['FULL_STACK'] || 0,
            aiAutomationRegistrations: domainStats['AI_AUTOMATION'] || 0,
            appDevelopmentRegistrations: domainStats['APP_DEVELOPMENT'] || 0,
            webDevelopmentRegistrations: domainStats['WEB_DEVELOPMENT'] || 0,
          },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. REVOKE OFFER LETTER
    if (action === 'revoke-offer-letter') {
      const { offerLetterId, reason } = await req.json();
      if (!offerLetterId) {
        return new Response(JSON.stringify({ error: 'offerLetterId is required.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error: updateError } = await supabase
        .from('offer_letters')
        .update({ status: 'revoked', revoked_at: new Date().toISOString() })
        .eq('offer_letter_id', offerLetterId);

      if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      await supabase.from('audit_logs').insert({
        action: 'OFFER_LETTER_REVOKED',
        metadata: { offerLetterId, reason, revoked_by: user.email },
      });

      return new Response(JSON.stringify({ success: true, message: 'Offer letter revoked successfully.' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. REISSUE OFFER LETTER
    if (action === 'reissue-offer-letter') {
      const { offerLetterId } = await req.json();
      if (!offerLetterId) {
        return new Response(JSON.stringify({ error: 'offerLetterId is required.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error: updateError } = await supabase
        .from('offer_letters')
        .update({ status: 'valid', revoked_at: null })
        .eq('offer_letter_id', offerLetterId);

      if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      await supabase.from('audit_logs').insert({
        action: 'OFFER_LETTER_REISSUED',
        metadata: { offerLetterId, reissued_by: user.email },
      });

      return new Response(JSON.stringify({ success: true, message: 'Offer letter reinstated successfully.' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Server error.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

