import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { getSupabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { generateSecureToken, sha256Hex } from '../_shared/crypto.ts';

const GENERIC_FAILURE_MESSAGE =
  "Sorry! We couldn't verify your registration. Please check your registered name and email address.";

function normalizeText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

function checkNameMatch(inputName: string, dbName: string): boolean {
  const normInput = normalizeText(inputName);
  const normDb = normalizeText(dbName);
  
  if (normInput === normDb) return true;
  
  // Also check if words match in any order (e.g., First Last vs Last First)
  const inputWords = normInput.split(' ').sort().join(' ');
  const dbWords = normDb.split(' ').sort().join(' ');
  return inputWords === dbWords;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // DEADLINE ENFORCEMENT: 09 November 2026 at 12:00 PM IST
    const DEADLINE_MS = new Date('2026-11-09T12:00:00+05:30').getTime();
    if (Date.now() > DEADLINE_MS) {
      return new Response(
        JSON.stringify({
          error:
            'Offer letter generation closed on 09 November 2026 at 12:00 PM IST. The deadline for this internship cohort has concluded.',
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { fullName, email } = await req.json();

    if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
      return new Response(JSON.stringify({ error: 'Please enter your full name.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!email || typeof email !== 'string' || !email.trim()) {
      return new Response(JSON.stringify({ error: 'Please enter your registered email address.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return new Response(JSON.stringify({ error: 'Please enter a valid email address.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = getSupabaseAdmin();

    // Query participant by normalized email
    const { data: participant, error: pError } = await supabase
      .from('participants')
      .select('id, full_name, normalized_name, email, registration_status')
      .eq('normalized_email', normalizedEmail)
      .eq('registration_status', 'active')
      .maybeSingle();

    if (pError) {
      console.error('Database query error:', pError);
      return new Response(JSON.stringify({ error: GENERIC_FAILURE_MESSAGE }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if participant exists and name matches
    if (!participant || !checkNameMatch(fullName, participant.full_name)) {
      // Record failed verification in audit logs
      await supabase.from('audit_logs').insert({
        participant_id: participant ? participant.id : null,
        action: 'PARTICIPANT_VERIFICATION_FAILED',
        metadata: {
          submitted_name: fullName.trim(),
          submitted_email: normalizedEmail,
        },
      });

      return new Response(JSON.stringify({ error: GENERIC_FAILURE_MESSAGE }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // STRICT GLOBAL SINGLE DOWNLOAD CHECK:
    // If participant has already downloaded ANY offer letter under ANY domain, forbid new verification!
    const { data: alreadyDownloaded } = await supabase
      .from('offer_letters')
      .select('id, offer_letter_id, download_count, downloaded_at')
      .eq('participant_id', participant.id)
      .eq('status', 'valid')
      .gte('download_count', 1)
      .maybeSingle();

    if (alreadyDownloaded) {
      await supabase.from('audit_logs').insert({
        participant_id: participant.id,
        action: 'DOWNLOAD_LIMIT_BLOCKED_GLOBAL',
        metadata: {
          offer_letter_id: alreadyDownloaded.offer_letter_id,
          downloaded_at: alreadyDownloaded.downloaded_at,
        },
      });

      return new Response(
        JSON.stringify({
          error:
            'You have already downloaded your official offer letter. Under UNAI TECH program policy, each participant is permitted only ONE offer letter download across all registered domains.',
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate random opaque session token
    const sessionToken = generateSecureToken(32);
    const tokenHash = await sha256Hex(sessionToken);

    // 15-minute expiration
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const { error: sessionError } = await supabase
      .from('verification_sessions')
      .insert({
        participant_id: participant.id,
        token_hash: tokenHash,
        expires_at: expiresAt,
      });

    if (sessionError) {
      console.error('Session creation error:', sessionError);
      return new Response(JSON.stringify({ error: 'Could not initialize verification session.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log success
    await supabase.from('audit_logs').insert({
      participant_id: participant.id,
      action: 'PARTICIPANT_VERIFIED_SUCCESS',
      metadata: {
        email: participant.email,
        expires_at: expiresAt,
      },
    });

    // Return session token and verified display details
    // CRITICAL: DO NOT return or reveal registered domains!
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Registration Verified Successfully!',
        sessionToken,
        verifiedName: participant.full_name,
        registeredEmail: participant.email,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('Unexpected error in verify-participant:', err);
    return new Response(JSON.stringify({ error: GENERIC_FAILURE_MESSAGE }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

