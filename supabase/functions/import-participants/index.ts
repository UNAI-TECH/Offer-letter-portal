import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { getSupabaseAdmin } from '../_shared/supabaseAdmin.ts';
import * as XLSX from 'https://esm.sh/xlsx@0.18.5';

function normalizeText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
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

    const { base64Data, domainCode, fileName } = await req.json();

    if (!base64Data || !domainCode) {
      return new Response(
        JSON.stringify({ error: 'base64Data and domainCode are required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify domain exists
    const { data: domainRecord, error: dError } = await supabase
      .from('internship_domains')
      .select('id, domain_name, domain_code')
      .eq('domain_code', domainCode)
      .single();

    if (dError || !domainRecord) {
      return new Response(
        JSON.stringify({ error: `Domain not found for code: ${domainCode}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Decode base64 to binary buffer
    const binaryStr = atob(base64Data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    // Parse workbook
    const workbook = XLSX.read(bytes, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    let totalRows = 0;
    let validRows = 0;
    let invalidRows = 0;
    let duplicateRows = 0;

    const seenInBatch = new Set<string>();
    const validRecords: Array<{
      full_name: string;
      normalized_name: string;
      email: string;
      normalized_email: string;
    }> = [];

    // Rows start at index 5 (row 6 in Excel)
    for (let r = 5; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || row.length === 0) continue;

      const col1 = String(row[0] || '').trim(); // Last name
      const col2 = String(row[1] || '').trim(); // First name
      let col3 = String(row[2] || '').trim();   // Email

      if (!col1 && !col2 && !col3) continue;

      totalRows++;

      // Email detection fallback across row cells
      if (!emailRegex.test(col3)) {
        let found = '';
        for (const cell of row) {
          const s = String(cell || '').trim();
          if (emailRegex.test(s)) {
            found = s;
            break;
          }
        }
        if (found) col3 = found;
        else {
          invalidRows++;
          continue;
        }
      }

      const email = col3;
      const normalizedEmail = email.toLowerCase().trim();

      // Duplicate in this sheet check
      if (seenInBatch.has(normalizedEmail)) {
        duplicateRows++;
        continue;
      }
      seenInBatch.add(normalizedEmail);

      // Form full name: First name + Last name
      let fullName = '';
      if (col2 && col1) fullName = `${col2} ${col1}`;
      else if (col2) fullName = col2;
      else if (col1) fullName = col1;
      else {
        invalidRows++;
        continue;
      }

      validRows++;
      validRecords.push({
        full_name: fullName,
        normalized_name: normalizeText(fullName),
        email,
        normalized_email: normalizedEmail,
      });
    }

    let importedCount = 0;

    // Upsert participants and insert domain relationships
    for (const rec of validRecords) {
      // Upsert participant
      const { data: pData, error: pErr } = await supabase
        .from('participants')
        .upsert(
          {
            full_name: rec.full_name,
            normalized_name: rec.normalized_name,
            email: rec.email,
            normalized_email: rec.normalized_email,
            registration_status: 'active',
          },
          { onConflict: 'normalized_email' }
        )
        .select('id')
        .single();

      if (pErr || !pData) {
        console.error('Error upserting participant:', rec.normalized_email, pErr);
        continue;
      }

      // Upsert participant domain
      const { error: pdErr } = await supabase
        .from('participant_domains')
        .upsert(
          {
            participant_id: pData.id,
            domain_id: domainRecord.id,
            source_file: fileName || `Imported_${domainCode}.xlsx`,
            registration_status: 'active',
          },
          { onConflict: 'participant_id,domain_id' }
        );

      if (!pdErr) importedCount++;
    }

    // Save batch record
    await supabase.from('import_batches').insert({
      file_name: fileName || `Batch_${domainCode}.xlsx`,
      domain_id: domainRecord.id,
      total_rows: totalRows,
      valid_rows: validRows,
      invalid_rows: invalidRows,
      duplicate_rows: duplicateRows,
      imported_rows: importedCount,
      status: 'completed',
    });

    // Record audit log
    await supabase.from('audit_logs').insert({
      action: 'EXCEL_BATCH_IMPORTED',
      metadata: {
        domain: domainRecord.domain_name,
        domain_code: domainCode,
        file_name: fileName,
        total_rows: totalRows,
        imported_rows: importedCount,
        imported_by: user.email,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        domain: domainRecord.domain_name,
        domainCode,
        totalRows,
        validRows,
        invalidRows,
        duplicateRows,
        importedCount,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Import error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Failed to process Excel import.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

