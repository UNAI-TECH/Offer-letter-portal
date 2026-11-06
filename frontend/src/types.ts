export type InternshipDomainCode =
  | 'FULL_STACK'
  | 'AI_AUTOMATION'
  | 'APP_DEVELOPMENT'
  | 'WEB_DEVELOPMENT';

export const DOMAIN_OPTIONS: { code: InternshipDomainCode; name: string }[] = [
  { code: 'FULL_STACK', name: 'FULL STACK DEVELOPMENT' },
  { code: 'AI_AUTOMATION', name: 'AI & AUTOMATION' },
  { code: 'APP_DEVELOPMENT', name: 'APP DEVELOPMENT' },
  { code: 'WEB_DEVELOPMENT', name: 'WEB DEVELOPMENT' },
];

export interface VerifiedParticipantSession {
  sessionToken: string;
  verifiedName: string;
  registeredEmail: string;
  expiresAt: string;
}

export interface GeneratedOfferLetterData {
  offerLetterId: string;
  participantName: string;
  collegeName: string;
  domainName: string;
  issueDate: string;
  downloadUrl?: string;
  pdfBlob?: Blob;
  fileName: string;
  isExisting?: boolean;
  downloadCount: number;
  downloadedAt?: string;
}

export interface ParticipantRecord {
  id: string;
  fullName: string;
  email: string;
  normalizedEmail: string;
  domains: string[];
  registrationStatus: 'active' | 'inactive';
  createdAt?: string;
}

export interface OfferLetterRecord {
  id: string;
  offerLetterId: string;
  participantName: string;
  participantEmail: string;
  collegeName: string;
  domainName: string;
  issueDate: string;
  status: 'valid' | 'revoked';
  downloadCount: number;
  downloadedAt?: string;
  generatedAt: string;
  downloadUrl?: string;
  pdfBlob?: Blob;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  timestamp: string;
  participantEmail?: string;
  details: Record<string, any>;
  status: 'success' | 'warning' | 'error';
}

export interface ImportBatchSummary {
  id: string;
  fileName: string;
  domainName: string;
  domainCode: string;
  totalRows: number;
  validRows: number;
  duplicateRows: number;
  invalidRows: number;
  importedRows: number;
  timestamp: string;
}

