import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { getSupabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { sha256Hex } from '../_shared/crypto.ts';
import { overlayOfferLetterPdf } from '../_shared/pdfOverlay.ts';

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_');
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

    const { sessionToken, collegeName, selectedDomain } = await req.json();

    if (!sessionToken || typeof sessionToken !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Verification session token missing. Please verify your registration.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!collegeName || typeof collegeName !== 'string' || !collegeName.trim()) {
      return new Response(
        JSON.stringify({ error: 'Please enter your college name.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!selectedDomain || typeof selectedDomain !== 'string' || !selectedDomain.trim()) {
      return new Response(
        JSON.stringify({ error: 'Please select your internship domain.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = getSupabaseAdmin();

    // 1. Validate session token hash and expiration
    const tokenHash = await sha256Hex(sessionToken.trim());
    const { data: session, error: sError } = await supabase
      .from('verification_sessions')
      .select('id, participant_id, expires_at, revoked_at')
      .eq('token_hash', tokenHash)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (sError || !session) {
      return new Response(
        JSON.stringify({ error: 'Verification session has expired or is invalid. Please verify again.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Retrieve verified participant
    const { data: participant, error: pError } = await supabase
      .from('participants')
      .select('id, full_name, email, registration_status')
      .eq('id', session.participant_id)
      .eq('registration_status', 'active')
      .maybeSingle();

    if (pError || !participant) {
      return new Response(
        JSON.stringify({ error: 'Participant record is not active or could not be found.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Find domain record matching selected domain
    const trimmedDomain = selectedDomain.trim();
    const { data: domainRecord, error: dError } = await supabase
      .from('internship_domains')
      .select('id, domain_name, domain_code, status')
      .or(`domain_name.eq."${trimmedDomain}",domain_code.eq."${trimmedDomain}"`)
      .eq('status', 'active')
      .maybeSingle();

    if (dError || !domainRecord) {
      return new Response(
        JSON.stringify({ error: 'Invalid internship domain selected.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. CRITICAL SECURITY VALIDATION: Validate participant registration in the selected domain
    const { data: domainReg, error: regError } = await supabase
      .from('participant_domains')
      .select('id, registration_status')
      .eq('participant_id', participant.id)
      .eq('domain_id', domainRecord.id)
      .eq('registration_status', 'active')
      .maybeSingle();

    if (regError || !domainReg) {
      // Record unauthorized domain attempt in audit logs
      await supabase.from('audit_logs').insert({
        participant_id: participant.id,
        action: 'DOMAIN_VERIFICATION_FAILED',
        metadata: {
          attempted_domain: domainRecord.domain_name,
          email: participant.email,
        },
      });

      return new Response(
        JSON.stringify({
          error: 'Your registered email is not associated with the selected internship domain. Please select the correct domain.',
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. STRICT GLOBAL 1-DOWNLOAD LIMIT ACROSS ALL REGISTERED DOMAINS
    const { data: globalConsumedOffer } = await supabase
      .from('offer_letters')
      .select('id, offer_letter_id, domain_id, download_count, downloaded_at')
      .eq('participant_id', participant.id)
      .eq('status', 'valid')
      .gte('download_count', 1)
      .maybeSingle();

    if (globalConsumedOffer) {
      await supabase.from('audit_logs').insert({
        participant_id: participant.id,
        action: 'DOWNLOAD_LIMIT_BLOCKED_GLOBAL',
        metadata: {
          offer_letter_id: globalConsumedOffer.offer_letter_id,
          attempted_domain: domainRecord.domain_name,
          downloaded_at: globalConsumedOffer.downloaded_at,
        },
      });

      return new Response(
        JSON.stringify({
          error:
            'You have already downloaded an official offer letter. Under UNAI TECH program policy, each participant is permitted only ONE offer letter download in total across all registered domains. Multi-domain downloads are strictly disallowed.',
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Idempotency Check for Selected Domain
    const { data: existingOffer } = await supabase
      .from('offer_letters')
      .select('id, offer_letter_id, college_name, generated_file_path, issue_date, status, download_count')
      .eq('participant_id', participant.id)
      .eq('domain_id', domainRecord.id)
      .eq('status', 'valid')
      .maybeSingle();

    const cleanCollegeName = collegeName.trim();
    const downloadFilename = `UNAI_TECH_Offer_Letter_${sanitizeFilename(participant.full_name)}.pdf`;

    if (existingOffer) {
      if ((existingOffer.download_count || 0) >= 1) {
        return new Response(
          JSON.stringify({
            error: `You have already downloaded your official offer letter for ${domainRecord.domain_name}. In accordance with UNAI TECH security policy, each participant is permitted only ONE download per registered domain. Please contact administration if you require assistance.`,
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create short-lived signed URL for existing file
      const { data: signedData, error: signError } = await supabase.storage
        .from('generated-offer-letters')
        .createSignedUrl(existingOffer.generated_file_path, 3600, {
          download: downloadFilename,
        });

      if (!signError && signedData?.signedUrl) {
        return new Response(
          JSON.stringify({
            success: true,
            isExisting: true,
            offerLetterId: existingOffer.offer_letter_id,
            participantName: participant.full_name,
            collegeName: existingOffer.college_name,
            domainName: domainRecord.domain_name,
            issueDate: '01 November 2026',
            downloadUrl: signedData.signedUrl,
            fileName: downloadFilename,
            downloadCount: existingOffer.download_count || 0,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 6. Retrieve PDF template from Storage or fallback
    let templateBytes: Uint8Array;
    const { data: templateFile, error: tFileError } = await supabase.storage
      .from('offer-letter-templates')
      .download('ammu.pdf');

    if (!tFileError && templateFile) {
      templateBytes = new Uint8Array(await templateFile.arrayBuffer());
    } else {
      // Check offer_letter_templates table for any registered template path
      const { data: dbTemplate } = await supabase
        .from('offer_letter_templates')
        .select('storage_path')
        .eq('status', 'active')
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (dbTemplate?.storage_path) {
        const { data: customFile } = await supabase.storage
          .from('offer-letter-templates')
          .download(dbTemplate.storage_path);
        if (customFile) {
          templateBytes = new Uint8Array(await customFile.arrayBuffer());
        } else {
          throw new Error('PDF template could not be loaded from storage.');
        }
      } else {
        throw new Error('PDF template is not available in storage. Please contact administrator.');
      }
    }

    // 7. Apply pixel-perfect dynamic replacements
    const generatedPdfBytes = await overlayOfferLetterPdf({
      templateBuffer: templateBytes,
      participantName: participant.full_name,
      collegeName: cleanCollegeName,
      domainName: domainRecord.domain_name,
      issueDate: '01 November 2026',
    });

    // 8. Generate Unique Reference ID
    // Format: UNAI-2026-<DOMAIN_PREFIX>-<RANDOM_HEX>
    const domainPrefix = domainRecord.domain_code.split('_').map((w: string) => w[0]).join('');
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    const offerLetterId = `UNAI-2026-${domainPrefix}-${randomHex}`;

    // 9. Save PDF to private Supabase Storage
    const storagePath = `offers/${participant.id}/${domainRecord.domain_code}_${offerLetterId}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('generated-offer-letters')
      .upload(storagePath, generatedPdfBytes, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw new Error('Failed to securely save generated offer letter.');
    }

    // 10. Record offer letter in database
    const { error: insertError } = await supabase.from('offer_letters').insert({
      offer_letter_id: offerLetterId,
      participant_id: participant.id,
      domain_id: domainRecord.id,
      college_name: cleanCollegeName,
      generated_file_path: storagePath,
      issue_date: '2026-11-01',
      status: 'valid',
    });

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw new Error('Failed to record offer letter issuance.');
    }

    // 11. Record generation in audit logs
    await supabase.from('audit_logs').insert({
      participant_id: participant.id,
      action: 'OFFER_LETTER_GENERATED',
      metadata: {
        offer_letter_id: offerLetterId,
        domain: domainRecord.domain_name,
        college_name: cleanCollegeName,
      },
    });

    // 12. Create short-lived signed URL for direct download
    const { data: signedData, error: signError } = await supabase.storage
      .from('generated-offer-letters')
      .createSignedUrl(storagePath, 3600, {
        download: downloadFilename,
      });

    if (signError || !signedData?.signedUrl) {
      throw new Error('Failed to create secure download URL.');
    }

    return new Response(
      JSON.stringify({
        success: true,
        offerLetterId,
        participantName: participant.full_name,
        collegeName: cleanCollegeName,
        domainName: domainRecord.domain_name,
        issueDate: '01 November 2026',
        downloadUrl: signedData.signedUrl,
        fileName: downloadFilename,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Error generating offer letter:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'An error occurred while generating your offer letter.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

