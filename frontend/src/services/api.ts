import type {
  VerifiedParticipantSession,
  GeneratedOfferLetterData,
  ParticipantRecord,
  OfferLetterRecord,
  AuditLogEntry,
  ImportBatchSummary,
} from '../types';
import { OFFICIAL_PARTICIPANTS } from '../data/officialParticipantsData';
import { generateOfferLetterPdf } from './pdfEngine';
import * as XLSX from 'xlsx';

// Deadline: 09 November 2026, 12:00 PM IST
export const OFFER_LETTER_DEADLINE_MS = new Date('2026-11-09T12:00:00+05:30').getTime();

export function isOfferLetterDeadlinePassed(): boolean {
  return Date.now() > OFFER_LETTER_DEADLINE_MS;
}

const GENERIC_VERIFY_FAILURE =
  "Sorry! We couldn't verify your registration. Please check your registered name and email address.";

function normalizeText(text: string): string {
  return (text || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function checkNameMatch(inputName: string, registeredName: string): boolean {
  const normInput = normalizeText(inputName);
  const normDb = normalizeText(registeredName);
  if (normInput === normDb) return true;

  // Check word permutation (e.g., First Last vs Last First)
  const inputWords = normInput.split(' ').sort().join(' ');
  const dbWords = normDb.split(' ').sort().join(' ');
  return inputWords === dbWords;
}

async function sha256Hex(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function generateRandomToken(len = 32): string {
  const array = new Uint8Array(len);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_');
}

// In-memory persistent state (synced with localStorage)
class PortalStorageManager {
  private participants: ParticipantRecord[] = [];
  private sessions: Map<string, { participantId: string; expiresAt: number }> = new Map();
  private offerLetters: OfferLetterRecord[] = [];
  private auditLogs: AuditLogEntry[] = [];
  private importBatches: ImportBatchSummary[] = [];

  constructor() {
    this.init();
  }

  private init() {
    // Load initial participants
    const savedP = localStorage.getItem('unai_participants');
    if (savedP) {
      try {
        this.participants = JSON.parse(savedP);
      } catch {
        this.participants = this.seedParticipants();
      }
    } else {
      this.participants = this.seedParticipants();
      this.saveParticipants();
    }

    // Load offer letters
    const savedOffers = localStorage.getItem('unai_offer_letters');
    if (savedOffers) {
      try {
        this.offerLetters = JSON.parse(savedOffers);
      } catch {
        this.offerLetters = [];
      }
    }

    // Load audit logs
    const savedLogs = localStorage.getItem('unai_audit_logs');
    if (savedLogs) {
      try {
        this.auditLogs = JSON.parse(savedLogs);
      } catch {
        this.auditLogs = [];
      }
    }

    // Load import batches
    const savedBatches = localStorage.getItem('unai_import_batches');
    if (savedBatches) {
      try {
        this.importBatches = JSON.parse(savedBatches);
      } catch {
        this.importBatches = [];
      }
    }
  }

  private seedParticipants(): ParticipantRecord[] {
    return OFFICIAL_PARTICIPANTS.map((p) => ({
      id: p.id,
      fullName: p.fullName,
      email: p.email,
      normalizedEmail: p.normalizedEmail,
      domains: [...p.domains],
      registrationStatus: 'active',
      createdAt: '2026-11-05T00:00:00.000Z',
    }));
  }

  saveParticipants() {
    localStorage.setItem('unai_participants', JSON.stringify(this.participants));
  }

  saveOfferLetters() {
    localStorage.setItem('unai_offer_letters', JSON.stringify(this.offerLetters));
  }

  saveAuditLogs() {
    localStorage.setItem('unai_audit_logs', JSON.stringify(this.auditLogs.slice(0, 500)));
  }

  saveImportBatches() {
    localStorage.setItem('unai_import_batches', JSON.stringify(this.importBatches));
  }

  getParticipants() {
    return this.participants;
  }

  getOfferLetters() {
    return this.offerLetters;
  }

  getAuditLogs() {
    return this.auditLogs;
  }

  getImportBatches() {
    return this.importBatches;
  }

  logAudit(action: string, status: 'success' | 'warning' | 'error', details: Record<string, any>, email?: string) {
    const entry: AuditLogEntry = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      action,
      status,
      details,
      participantEmail: email,
      timestamp: new Date().toISOString(),
    };
    this.auditLogs.unshift(entry);
    this.saveAuditLogs();
  }

  findParticipantByEmail(email: string): ParticipantRecord | undefined {
    const norm = normalizeText(email);
    return this.participants.find(
      (p) => p.normalizedEmail === norm && p.registrationStatus === 'active'
    );
  }

  findParticipantById(id: string): ParticipantRecord | undefined {
    return this.participants.find((p) => p.id === id && p.registrationStatus === 'active');
  }

  setSession(tokenHash: string, participantId: string, expiresAt: number) {
    this.sessions.set(tokenHash, { participantId, expiresAt });
  }

  getSession(tokenHash: string): { participantId: string; expiresAt: number } | undefined {
    const s = this.sessions.get(tokenHash);
    if (!s) return undefined;
    if (Date.now() > s.expiresAt) {
      this.sessions.delete(tokenHash);
      return undefined;
    }
    return s;
  }

  addOfferLetter(record: OfferLetterRecord) {
    this.offerLetters.unshift(record);
    this.saveOfferLetters();
  }

  incrementDownload(offerLetterId: string): boolean {
    const offer = this.offerLetters.find((o) => o.offerLetterId === offerLetterId);
    if (offer) {
      offer.downloadCount = (offer.downloadCount || 0) + 1;
      offer.downloadedAt = new Date().toISOString();
      this.saveOfferLetters();
      this.logAudit(
        'OFFER_LETTER_DOWNLOAD_CONSUMED',
        'success',
        {
          offerLetterId,
          downloadCount: offer.downloadCount,
          downloadedAt: offer.downloadedAt,
        },
        offer.participantEmail
      );
      return true;
    }
    return false;
  }

  resetDownload(offerLetterId: string): boolean {
    const offer = this.offerLetters.find((o) => o.offerLetterId === offerLetterId);
    if (offer) {
      offer.downloadCount = 0;
      delete offer.downloadedAt;
      this.saveOfferLetters();
      this.logAudit('OFFER_LETTER_DOWNLOAD_RESET_BY_ADMIN', 'warning', { offerLetterId });
      return true;
    }
    return false;
  }

  revokeOffer(offerLetterId: string): boolean {
    const offer = this.offerLetters.find((o) => o.offerLetterId === offerLetterId);
    if (offer) {
      offer.status = 'revoked';
      this.saveOfferLetters();
      return true;
    }
    return false;
  }

  reissueOffer(offerLetterId: string): boolean {
    const offer = this.offerLetters.find((o) => o.offerLetterId === offerLetterId);
    if (offer) {
      offer.status = 'valid';
      this.saveOfferLetters();
      return true;
    }
    return false;
  }

  addBatch(batch: ImportBatchSummary) {
    this.importBatches.unshift(batch);
    this.saveImportBatches();
  }
}

const storage = new PortalStorageManager();

// Supabase Edge Function URL from env if configured
const SUPABASE_FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const api = {
  /**
   * STEP 1: Verify participant name and email
   */
  async verifyParticipant(fullName: string, email: string): Promise<VerifiedParticipantSession> {
    if (isOfferLetterDeadlinePassed()) {
      throw new Error(
        'Offer letter generation closed on 09 November 2026 at 12:00 PM IST. The deadline for this internship cohort has concluded.'
      );
    }

    if (!fullName || !fullName.trim()) {
      throw new Error('Please enter your full name.');
    }
    if (!email || !email.trim()) {
      throw new Error('Please enter your registered email address.');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      throw new Error('Please enter a valid email address.');
    }

    // If live Supabase Edge Function is configured, invoke it
    if (SUPABASE_FUNCTIONS_URL && SUPABASE_ANON_KEY) {
      try {
        const resp = await fetch(`${SUPABASE_FUNCTIONS_URL}/verify-participant`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ fullName, email }),
        });
        const data = await resp.json();
        if (!resp.ok || !data.success) {
          throw new Error(data.error || GENERIC_VERIFY_FAILURE);
        }
        return {
          sessionToken: data.sessionToken,
          verifiedName: data.verifiedName,
          registeredEmail: data.registeredEmail,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        };
      } catch (err: any) {
        if (!err.message?.includes('Failed to fetch')) {
          throw err;
        }
        // Fallback to local verified database adapter
      }
    }

    // Backend participant verification against imported database
    const participant = storage.findParticipantByEmail(email);
    if (!participant || !checkNameMatch(fullName, participant.fullName)) {
      storage.logAudit(
        'PARTICIPANT_VERIFICATION_FAILED',
        'warning',
        { enteredName: fullName.trim(), enteredEmail: email.trim() },
        email.trim()
      );
      throw new Error(GENERIC_VERIFY_FAILURE);
    }

    // STRICT GLOBAL SINGLE-DOWNLOAD CHECK:
    // If this verified participant has already downloaded ANY offer letter under ANY domain, block immediately!
    const alreadyDownloadedOffer = storage.getOfferLetters().find(
      (o) =>
        o.participantEmail.toLowerCase() === participant.email.toLowerCase() &&
        o.status === 'valid' &&
        (o.downloadCount || 0) >= 1
    );

    if (alreadyDownloadedOffer) {
      storage.logAudit(
        'DOWNLOAD_LIMIT_BLOCKED_GLOBAL',
        'warning',
        {
          offerLetterId: alreadyDownloadedOffer.offerLetterId,
          domain: alreadyDownloadedOffer.domainName,
          downloadedAt: alreadyDownloadedOffer.downloadedAt,
        },
        participant.email
      );
      throw new Error(
        `You have already downloaded your official offer letter for ${alreadyDownloadedOffer.domainName} on ${new Date(alreadyDownloadedOffer.downloadedAt || '').toLocaleDateString()}. Under UNAI TECH program policy, each verified email address can download only ONE offer letter in total across all registered domains. Multi-domain downloads are strictly not allowed.`
      );
    }

    // Generate random opaque session token
    const rawToken = generateRandomToken(32);
    const tokenHash = await sha256Hex(rawToken);
    const expiresAt = Date.now() + 15 * 60 * 1000;

    storage.setSession(tokenHash, participant.id, expiresAt);
    storage.logAudit(
      'PARTICIPANT_VERIFIED_SUCCESS',
      'success',
      { verifiedName: participant.fullName },
      participant.email
    );

    return {
      sessionToken: rawToken,
      verifiedName: participant.fullName,
      registeredEmail: participant.email,
      expiresAt: new Date(expiresAt).toISOString(),
    };
  },

  /**
   * STEP 2 & 3: Final Backend Domain Validation & Offer Letter PDF Generation
   */
  async generateOfferLetter(
    sessionToken: string,
    collegeName: string,
    selectedDomain: string
  ): Promise<GeneratedOfferLetterData> {
    if (isOfferLetterDeadlinePassed()) {
      throw new Error(
        'Offer letter generation closed on 09 November 2026 at 12:00 PM IST. The deadline for this internship cohort has concluded.'
      );
    }

    if (!sessionToken) {
      throw new Error('Verification session missing. Please verify your registration.');
    }
    if (!collegeName || !collegeName.trim()) {
      throw new Error('Please enter your college name.');
    }
    if (!selectedDomain || !selectedDomain.trim()) {
      throw new Error('Please select your internship domain.');
    }

    // If live Supabase Edge Function is configured, invoke it
    if (SUPABASE_FUNCTIONS_URL && SUPABASE_ANON_KEY) {
      try {
        const resp = await fetch(`${SUPABASE_FUNCTIONS_URL}/generate-offer-letter`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ sessionToken, collegeName, selectedDomain }),
        });
        const data = await resp.json();
        if (!resp.ok || !data.success) {
          throw new Error(data.error || 'Failed to generate offer letter.');
        }
        return data;
      } catch (err: any) {
        if (!err.message?.includes('Failed to fetch')) {
          throw err;
        }
      }
    }

    // 1. Validate session token hash & expiry
    const tokenHash = await sha256Hex(sessionToken);
    const session = storage.getSession(tokenHash);
    if (!session) {
      throw new Error('Verification session has expired or is invalid. Please verify again.');
    }

    // 2. Retrieve participant
    const participant = storage.findParticipantById(session.participantId);
    if (!participant) {
      throw new Error('Active participant record not found.');
    }

    // 3. CRITICAL DOMAIN VALIDATION: Validate selected domain against original domain-specific records
    const cleanDomain = selectedDomain.trim();
    const isDomainRegistered = participant.domains.some(
      (d) => d.toLowerCase() === cleanDomain.toLowerCase()
    );

    if (!isDomainRegistered) {
      storage.logAudit(
        'DOMAIN_VERIFICATION_FAILED',
        'error',
        {
          attemptedDomain: cleanDomain,
          participantName: participant.fullName,
        },
        participant.email
      );
      throw new Error(
        'Your registered email is not associated with the selected internship domain. Please select the correct domain.'
      );
    }

    const cleanCollege = collegeName.trim();
    const fileName = `UNAI_TECH_Offer_Letter_${sanitizeFilename(participant.fullName)}.pdf`;

    // 4. CRITICAL: STRICT GLOBAL 1-DOWNLOAD LIMIT ACROSS ALL DOMAINS:
    // If participant has already downloaded an offer letter for ANY domain, strictly forbid generation or re-download of any other domain!
    const anyDownloadedOffer = storage.getOfferLetters().find(
      (o) =>
        o.participantEmail.toLowerCase() === participant.email.toLowerCase() &&
        o.status === 'valid' &&
        (o.downloadCount || 0) >= 1
    );

    if (anyDownloadedOffer) {
      storage.logAudit(
        'DOWNLOAD_LIMIT_BLOCKED_GLOBAL',
        'warning',
        {
          offerLetterId: anyDownloadedOffer.offerLetterId,
          previousDomain: anyDownloadedOffer.domainName,
          attemptedDomain: cleanDomain,
          downloadedAt: anyDownloadedOffer.downloadedAt,
        },
        participant.email
      );
      throw new Error(
        `You have already downloaded your official offer letter for ${anyDownloadedOffer.domainName} on ${new Date(anyDownloadedOffer.downloadedAt || '').toLocaleDateString()}. Under UNAI TECH program policy, each participant is permitted only ONE offer letter download across all registered domains. Multi-domain downloads are strictly not allowed.`
      );
    }

    // 5. Existing letter for this specific domain (before download consumption):
    const existing = storage.getOfferLetters().find(
      (o) =>
        o.participantEmail.toLowerCase() === participant.email.toLowerCase() &&
        o.domainName.toLowerCase() === cleanDomain.toLowerCase() &&
        o.status === 'valid'
    );

    if (existing) {
      // ENFORCE STRICT SINGLE-DOWNLOAD RESTRICTION
      if ((existing.downloadCount || 0) >= 1) {
        storage.logAudit(
          'DOWNLOAD_LIMIT_BLOCKED',
          'warning',
          {
            offerLetterId: existing.offerLetterId,
            domain: cleanDomain,
            downloadedAt: existing.downloadedAt,
          },
          participant.email
        );
        throw new Error(
          `You have already downloaded your official offer letter for ${cleanDomain} on ${new Date(existing.downloadedAt || '').toLocaleDateString()}. In accordance with UNAI TECH program policy, each participant is permitted only ONE download per registered domain. If you require assistance, please contact UNAI TECH administration.`
        );
      }

      if (existing.pdfBlob) {
        const downloadUrl = URL.createObjectURL(existing.pdfBlob);
        return {
          offerLetterId: existing.offerLetterId,
          participantName: participant.fullName,
          collegeName: existing.collegeName,
          domainName: existing.domainName,
          issueDate: '01 November 2026',
          downloadUrl,
          pdfBlob: existing.pdfBlob,
          fileName,
          isExisting: true,
          downloadCount: existing.downloadCount || 0,
          downloadedAt: existing.downloadedAt,
        };
      }
    }

    // 5. Generate pixel-perfect personalized PDF using pdf-lib overlay engine
    const pdfBytes = await generateOfferLetterPdf({
      participantName: participant.fullName,
      collegeName: cleanCollege,
      domainName: cleanDomain,
      issueDate: '01 November 2026',
    });

    const pdfBlob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
    const downloadUrl = URL.createObjectURL(pdfBlob);

    // 6. Generate Unique Reference ID
    const domainPrefix = cleanDomain
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 3);
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    const offerLetterId = `UNAI-2026-${domainPrefix}-${randomHex}`;

    // 7. Save to issued offer letters with initial downloadCount = 0
    const record: OfferLetterRecord = {
      id: participant.id,
      offerLetterId,
      participantName: participant.fullName,
      participantEmail: participant.email,
      collegeName: cleanCollege,
      domainName: cleanDomain,
      issueDate: '01 November 2026',
      status: 'valid',
      downloadCount: 0,
      generatedAt: new Date().toISOString(),
      downloadUrl,
      pdfBlob,
    };
    storage.addOfferLetter(record);

    // 8. Log generation in audit trail
    storage.logAudit(
      'OFFER_LETTER_GENERATED',
      'success',
      {
        offerLetterId,
        domain: cleanDomain,
        collegeName: cleanCollege,
      },
      participant.email
    );

    return {
      offerLetterId,
      participantName: participant.fullName,
      collegeName: cleanCollege,
      domainName: cleanDomain,
      issueDate: '01 November 2026',
      downloadUrl,
      pdfBlob,
      fileName,
      downloadCount: 0,
    };
  },

  /**
   * STEP 4: Trigger direct attachment download of the generated PDF (Enforces single-use download)
   */
  downloadOfferLetterPdf(blobOrUrl: Blob | string, fileName: string, offerLetterId?: string) {
    let url: string;
    let shouldRevoke = false;
    if (typeof blobOrUrl === 'string') {
      url = blobOrUrl;
    } else {
      url = URL.createObjectURL(blobOrUrl);
      shouldRevoke = true;
    }

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Immediately record that this download quota was consumed
    if (offerLetterId) {
      storage.incrementDownload(offerLetterId);
    }

    if (shouldRevoke) {
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }
  },

  async resetDownloadLimit(offerLetterId: string): Promise<boolean> {
    return storage.resetDownload(offerLetterId);
  },

  // ================= ADMIN DASHBOARD SERVICES =================

  async getAdminStats() {
    const participants = storage.getParticipants();
    const offerLetters = storage.getOfferLetters();

    let totalDomainRegs = 0;
    let fullStack = 0;
    let aiAuto = 0;
    let appDev = 0;
    let webDev = 0;

    for (const p of participants) {
      totalDomainRegs += p.domains.length;
      for (const d of p.domains) {
        const lower = d.toLowerCase();
        if (lower.includes('full stack')) fullStack++;
        else if (lower.includes('ai') || lower.includes('automation')) aiAuto++;
        else if (lower.includes('app')) appDev++;
        else if (lower.includes('web')) webDev++;
      }
    }

    const validOffers = offerLetters.filter((o) => o.status === 'valid').length;

    return {
      totalParticipants: participants.length,
      totalDomainRegistrations: totalDomainRegs,
      totalOfferLetters: validOffers,
      pendingOfferLetters: Math.max(0, totalDomainRegs - validOffers),
      fullStackRegistrations: fullStack,
      aiAutomationRegistrations: aiAuto,
      appDevelopmentRegistrations: appDev,
      webDevelopmentRegistrations: webDev,
    };
  },

  async getAllParticipants() {
    return storage.getParticipants();
  },

  async getAllOfferLetters() {
    return storage.getOfferLetters();
  },

  async getAuditLogs() {
    return storage.getAuditLogs();
  },

  async getImportBatches() {
    return storage.getImportBatches();
  },

  async revokeOfferLetter(offerLetterId: string, reason?: string) {
    const success = storage.revokeOffer(offerLetterId);
    if (success) {
      storage.logAudit('OFFER_LETTER_REVOKED', 'warning', { offerLetterId, reason });
    }
    return success;
  },

  async reissueOfferLetter(offerLetterId: string) {
    const success = storage.reissueOffer(offerLetterId);
    if (success) {
      storage.logAudit('OFFER_LETTER_REISSUED', 'success', { offerLetterId });
    }
    return success;
  },

  async importExcelFile(file: File, domainCode: string, domainName: string): Promise<ImportBatchSummary> {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    let totalRows = 0;
    let validRows = 0;
    let invalidRows = 0;
    let duplicateRows = 0;

    const seenInBatch = new Set<string>();
    const participants = storage.getParticipants();

    for (let r = 5; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || row.length === 0) continue;

      const col1 = String(row[0] || '').trim();
      const col2 = String(row[1] || '').trim();
      let col3 = String(row[2] || '').trim();

      if (!col1 && !col2 && !col3) continue;
      totalRows++;

      if (!emailRegex.test(col3)) {
        for (const cell of row) {
          const s = String(cell || '').trim();
          if (emailRegex.test(s)) {
            col3 = s;
            break;
          }
        }
      }

      if (!emailRegex.test(col3)) {
        invalidRows++;
        continue;
      }

      const normEmail = col3.toLowerCase().trim();
      if (seenInBatch.has(normEmail)) {
        duplicateRows++;
        continue;
      }
      seenInBatch.add(normEmail);

      let fullName = '';
      if (col2 && col1) fullName = `${col2} ${col1}`;
      else if (col2) fullName = col2;
      else if (col1) fullName = col1;
      else {
        invalidRows++;
        continue;
      }

      validRows++;

      // Upsert into participants list
      let p = participants.find((x) => x.normalizedEmail === normEmail);
      if (!p) {
        p = {
          id: 'p_' + Math.random().toString(36).substring(2, 10),
          fullName,
          email: col3,
          normalizedEmail: normEmail,
          domains: [],
          registrationStatus: 'active',
          createdAt: new Date().toISOString(),
        };
        participants.push(p);
      }

      if (!p.domains.includes(domainName)) {
        p.domains.push(domainName);
      }
    }

    storage.saveParticipants();

    const summary: ImportBatchSummary = {
      id: 'batch_' + Date.now(),
      fileName: file.name,
      domainName,
      domainCode,
      totalRows,
      validRows,
      duplicateRows,
      invalidRows,
      importedRows: validRows,
      timestamp: new Date().toISOString(),
    };

    storage.addBatch(summary);
    storage.logAudit('EXCEL_BATCH_IMPORTED', 'success', summary);

    return summary;
  },
};
