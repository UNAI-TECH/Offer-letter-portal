// UNAI TECH - Official Excel Import & SQL Seed Generator
const fs = require('fs');
const path = require('path');
const XLSX = require('./frontend/node_modules/xlsx');

const DOMAIN_FILES = [
  {
    code: 'FULL_STACK',
    name: 'FULL STACK DEVELOPMENT',
    file: 'Marks UNAI TECH VIRTUAL INTERNSHIP PROGRAM FULL STACK DEVELOPMENT 05-11-2026.xlsx',
  },
  {
    code: 'AI_AUTOMATION',
    name: 'AI & AUTOMATION',
    file: 'Marks UNAI TECH VIRTUAL INTERNSHIP PROGRAM AI & AUTOMATION 05-11-2026.xlsx',
  },
  {
    code: 'APP_DEVELOPMENT',
    name: 'APP DEVELOPMENT',
    file: 'Marks UNAI TECH VIRTUAL INTERNSHIP PROGRAM APP DEVELOPMENT 05-11-2026.xlsx',
  },
  {
    code: 'WEB_DEVELOPMENT',
    name: 'WEB DEVELOPMENT',
    file: 'Marks UNAI TECH VIRTUAL INTERNSHIP PROGRAM WEB DEVELOPMENT 05-11-2026.xlsx',
  },
];

function normalizeText(text) {
  return (text || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function escapeSql(str) {
  return (str || '').replace(/'/g, "''");
}

function processAllFiles() {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const sourceDir = path.join(__dirname, 'source-files');

  const participantsMap = new Map(); // normalized_email -> { fullName, email, domains: [] }
  const domainSummaries = [];

  for (const item of DOMAIN_FILES) {
    const filePath = path.join(sourceDir, item.file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Source file missing: ${item.file}`);
    }

    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    let fileTotalRows = 0;
    let fileValidRows = 0;
    let fileInvalidRows = 0;
    let fileDuplicateRows = 0;
    const seenInFile = new Set();

    // Data rows start at index 5 (row 6 in Excel)
    for (let r = 5; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || row.length === 0) continue;

      const col1 = String(row[0] || '').trim(); // Last Name
      const col2 = String(row[1] || '').trim(); // First Name
      let col3 = String(row[2] || '').trim();   // Email

      if (!col1 && !col2 && !col3) continue;
      fileTotalRows++;

      // Email fallback across row cells
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
          fileInvalidRows++;
          continue;
        }
      }

      const email = col3;
      const normalizedEmail = email.toLowerCase().trim();

      if (seenInFile.has(normalizedEmail)) {
        fileDuplicateRows++;
        continue;
      }
      seenInFile.add(normalizedEmail);

      let fullName = '';
      if (col2 && col1) fullName = `${col2} ${col1}`;
      else if (col2) fullName = col2;
      else if (col1) fullName = col1;
      else {
        fileInvalidRows++;
        continue;
      }

      fileValidRows++;

      if (!participantsMap.has(normalizedEmail)) {
        participantsMap.set(normalizedEmail, {
          fullName,
          email,
          normalizedEmail,
          domains: [],
        });
      }

      participantsMap.get(normalizedEmail).domains.push({
        domainCode: item.code,
        domainName: item.name,
        sourceFile: item.file,
      });
    }

    domainSummaries.push({
      code: item.code,
      name: item.name,
      file: item.file,
      totalRows: fileTotalRows,
      validRows: fileValidRows,
      invalidRows: fileInvalidRows,
      duplicateRows: fileDuplicateRows,
    });
  }

  // Generate SQL Migration with seed data
  const sqlLines = [];
  sqlLines.push('-- UNAI TECH Virtual Internship Official Participants Seed');
  sqlLines.push('-- Generated from 4 authoritative domain Excel workbooks\n');
  sqlLines.push('BEGIN;\n');

  // Insert participants
  sqlLines.push('-- 1. Insert Unique Participants');
  for (const [normEmail, p] of participantsMap.entries()) {
    const normName = normalizeText(p.fullName);
    sqlLines.push(
      `INSERT INTO public.participants (full_name, normalized_name, email, normalized_email, registration_status) ` +
      `VALUES ('${escapeSql(p.fullName)}', '${escapeSql(normName)}', '${escapeSql(p.email)}', '${escapeSql(normEmail)}', 'active') ` +
      `ON CONFLICT (normalized_email) DO UPDATE SET full_name = EXCLUDED.full_name, normalized_name = EXCLUDED.normalized_name;`
    );
  }

  sqlLines.push('\n-- 2. Insert Participant Domain Associations');
  for (const [normEmail, p] of participantsMap.entries()) {
    for (const d of p.domains) {
      sqlLines.push(
        `INSERT INTO public.participant_domains (participant_id, domain_id, source_file, registration_status) ` +
        `SELECT p.id, d.id, '${escapeSql(d.sourceFile)}', 'active' ` +
        `FROM public.participants p, public.internship_domains d ` +
        `WHERE p.normalized_email = '${escapeSql(normEmail)}' AND d.domain_code = '${escapeSql(d.domainCode)}' ` +
        `ON CONFLICT (participant_id, domain_id) DO NOTHING;`
      );
    }
  }

  sqlLines.push('\n-- 3. Record Import Batches');
  for (const s of domainSummaries) {
    sqlLines.push(
      `INSERT INTO public.import_batches (file_name, domain_id, total_rows, valid_rows, invalid_rows, duplicate_rows, imported_rows, status) ` +
      `SELECT '${escapeSql(s.file)}', d.id, ${s.totalRows}, ${s.validRows}, ${s.invalidRows}, ${s.duplicateRows}, ${s.validRows}, 'completed' ` +
      `FROM public.internship_domains d WHERE d.domain_code = '${escapeSql(s.code)}';`
    );
  }

  sqlLines.push('\nCOMMIT;\n');

  const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20261105000001_seed_participants.sql');
  fs.writeFileSync(migrationPath, sqlLines.join('\n'));
  console.log(`Saved seed migration to ${migrationPath}`);

  // Generate Import Markdown Report
  const mdReport = [];
  mdReport.push('# UNAI TECH Virtual Internship Program – Official Import Report\n');
  mdReport.push('### Summary of Authoritative Excel Source Files\n');
  mdReport.push('| Domain Code | Domain Name | Source File | Valid Records | Duplicates | Invalid Records |');
  mdReport.push('|---|---|---|---|---|---|');
  for (const s of domainSummaries) {
    mdReport.push(`| \`${s.code}\` | ${s.name} | \`${s.file}\` | ${s.validRows} | ${s.duplicateRows} | ${s.invalidRows} |`);
  }

  const totalRegs = domainSummaries.reduce((acc, s) => acc + s.validRows, 0);
  mdReport.push(`\n- **Total Valid Domain Registrations:** ${totalRegs}`);
  mdReport.push(`- **Total Unique Participants (Unique Emails):** ${participantsMap.size}`);

  const multiDomain = Array.from(participantsMap.values()).filter((p) => p.domains.length > 1);
  mdReport.push(`- **Participants in Multiple Domains:** ${multiDomain.length}\n`);

  mdReport.push('### Multi-Domain Participants Breakdown:\n');
  for (const p of multiDomain) {
    const domainNames = p.domains.map((d) => d.domainName).join(', ');
    mdReport.push(`- **${p.fullName}** (\`${p.email}\`): registered in ${p.domains.length} domains [${domainNames}]`);
  }

  const reportPath = path.join(__dirname, 'docs', 'OFFICIAL_IMPORT_REPORT.md');
  fs.writeFileSync(reportPath, mdReport.join('\n'));
  console.log(`Saved import report to ${reportPath}`);
}

processAllFiles();

