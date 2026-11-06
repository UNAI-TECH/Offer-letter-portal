import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { getSupabaseAdmin } from '../_shared/supabaseAdmin.ts';

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_');
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const offerLetterId = url.searchParams.get('id') || (await req.json().catch(() => ({}))).offerLetterId;

    if (!offerLetterId) {
      return new Response(JSON.stringify({ error: 'Offer letter reference ID is required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = getSupabaseAdmin();

    const { data: offer, error: oError } = await supabase
      .from('offer_letters')
      .select('id, offer_letter_id, participant_id, generated_file_path, status, download_count, participants(full_name)')
      .eq('offer_letter_id', offerLetterId.trim())
      .eq('status', 'valid')
      .maybeSingle();

    if (oError || !offer) {
      return new Response(JSON.stringify({ error: 'Valid offer letter not found or revoked.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // STRICT 1-TIME DOWNLOAD RESTRICTION
    if ((offer.download_count || 0) >= 1) {
      return new Response(
        JSON.stringify({
          error: 'Download limit reached. In accordance with UNAI TECH policy, this offer letter can only be downloaded once per registered email.',
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update download count immediately
    await supabase
      .from('offer_letters')
      .update({
        download_count: (offer.download_count || 0) + 1,
        downloaded_at: new Date().toISOString(),
      })
      .eq('id', offer.id);

    const participantName = (offer.participants as any)?.full_name || 'Participant';
    const downloadFilename = `UNAI_TECH_Offer_Letter_${sanitizeFilename(participantName)}.pdf`;

    // Download the file binary from private storage
    const { data: fileData, error: fError } = await supabase.storage
      .from('generated-offer-letters')
      .download(offer.generated_file_path);

    if (fError || !fileData) {
      // Fallback: generate a signed URL
      const { data: signedData } = await supabase.storage
        .from('generated-offer-letters')
        .createSignedUrl(offer.generated_file_path, 3600, {
          download: downloadFilename,
        });

      if (signedData?.signedUrl) {
        return new Response(JSON.stringify({ downloadUrl: signedData.signedUrl, fileName: downloadFilename }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ error: 'Could not retrieve file.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log the download event
    await supabase.from('audit_logs').insert({
      participant_id: offer.participant_id,
      action: 'OFFER_LETTER_DOWNLOADED',
      metadata: {
        offer_letter_id: offer.offer_letter_id,
        filename: downloadFilename,
      },
    });

    const fileBytes = await fileData.arrayBuffer();

    return new Response(fileBytes, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${downloadFilename}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err: any) {
    console.error('Download error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Download failed.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

