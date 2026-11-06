import React, { useState, useEffect } from 'react';
import {
  Users,
  Layers,
  FileText,
  Upload,
  Search,
  RefreshCw,
  Download,
  Lock,
  LogOut,
  History,
  FileCode,
} from 'lucide-react';
import { api } from '../../services/api';
import type {
  ParticipantRecord,
  OfferLetterRecord,
  AuditLogEntry,
  ImportBatchSummary,
} from '../../types';
import { DOMAIN_OPTIONS } from '../../types';

export const AdminDashboard: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminPass, setAdminPass] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'overview' | 'import' | 'participants' | 'offers' | 'templates' | 'audit'>('overview');

  const [stats, setStats] = useState<any>(null);
  const [participants, setParticipants] = useState<ParticipantRecord[]>([]);
  const [offerLetters, setOfferLetters] = useState<OfferLetterRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [importBatches, setImportBatches] = useState<ImportBatchSummary[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters & Search
  const [participantSearch, setParticipantSearch] = useState('');
  const [selectedDomainFilter, setSelectedDomainFilter] = useState('ALL');
  const [offerSearch, setOfferSearch] = useState('');

  // Excel Import state
  const [importDomain, setImportDomain] = useState('FULL_STACK');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportBatchSummary | null>(null);
  const [importing, setImporting] = useState(false);

  // Quick initial check (saved session or default passkey)
  useEffect(() => {
    const session = sessionStorage.getItem('unai_admin_auth');
    if (session === 'true') {
      setIsAuthenticated(true);
      loadAllData();
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    // Secure administrator access authorization
    if (adminPass.trim() === 'UNAITECH@intern2026') {
      setIsAuthenticated(true);
      sessionStorage.setItem('unai_admin_auth', 'true');
      loadAllData();
    } else {
      setAuthError('Invalid administrator credentials.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('unai_admin_auth');
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [st, parts, offers, logs, batches] = await Promise.all([
        api.getAdminStats(),
        api.getAllParticipants(),
        api.getAllOfferLetters(),
        api.getAuditLogs(),
        api.getImportBatches(),
      ]);
      setStats(st);
      setParticipants(parts);
      setOfferLetters(offers);
      setAuditLogs(logs);
      setImportBatches(batches);
    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setImporting(true);
    setImportResult(null);

    try {
      const domainObj = DOMAIN_OPTIONS.find((d) => d.code === importDomain);
      const res = await api.importExcelFile(selectedFile, importDomain, domainObj?.name || importDomain);
      setImportResult(res);
      setSelectedFile(null);
      await loadAllData();
    } catch (err: any) {
      alert('Import failed: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  const handleRevoke = async (offerLetterId: string) => {
    if (window.confirm(`Are you sure you want to revoke offer letter ${offerLetterId}?`)) {
      await api.revokeOfferLetter(offerLetterId, 'Administrator manual revocation');
      await loadAllData();
    }
  };

  const handleReissue = async (offerLetterId: string) => {
    if (window.confirm(`Reissue offer letter ${offerLetterId}?`)) {
      await api.reissueOfferLetter(offerLetterId);
      await loadAllData();
    }
  };

  const handleResetDownload = async (offerLetterId: string) => {
    if (
      window.confirm(
        `Reset download quota for offer letter ${offerLetterId}? This will permit the participant to download their document one more time.`
      )
    ) {
      await api.resetDownloadLimit(offerLetterId);
      await loadAllData();
    }
  };

  // Filtered Participants
  const filteredParticipants = participants.filter((p) => {
    const matchesSearch =
      p.fullName.toLowerCase().includes(participantSearch.toLowerCase()) ||
      p.email.toLowerCase().includes(participantSearch.toLowerCase());
    const matchesDomain =
      selectedDomainFilter === 'ALL' ||
      p.domains.some((d) => d.toUpperCase().includes(selectedDomainFilter));
    return matchesSearch && matchesDomain;
  });

  // Filtered Offer Letters
  const filteredOfferLetters = offerLetters.filter((o) => {
    return (
      o.participantName.toLowerCase().includes(offerSearch.toLowerCase()) ||
      o.participantEmail.toLowerCase().includes(offerSearch.toLowerCase()) ||
      o.offerLetterId.toLowerCase().includes(offerSearch.toLowerCase()) ||
      o.domainName.toLowerCase().includes(offerSearch.toLowerCase())
    );
  });

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-6 sm:my-12 bg-white rounded-xl border border-gray-200/90 shadow-sm p-4 sm:p-8">
        <div className="text-center mb-5 sm:mb-6">
          <div className="mx-auto w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-50 flex items-center justify-center text-unai-purple mb-2.5 sm:mb-3">
            <Lock className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">Administrator Console</h2>
          <p className="text-xs text-gray-500 mt-1">
            Sign in with authorized UNAI TECH administrator credentials.
          </p>
        </div>

        {authError && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-xs font-medium border border-red-200">
            {authError}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Admin Access Passkey
            </label>
            <input
              type="password"
              required
              value={adminPass}
              onChange={(e) => setAdminPass(e.target.value)}
              placeholder="Enter administrator passkey"
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-unai-purple/20 focus:border-unai-purple"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 rounded-lg bg-unai-purple text-white text-sm font-semibold hover:bg-unai-purple-dark transition-all shadow-sm active:scale-[0.99] min-h-[44px]"
          >
            Authenticate Administrator
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="bg-white rounded-xl border border-gray-200/90 shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 shrink-0" />
            <h2 className="text-base sm:text-lg font-bold text-gray-900">Administrator Management Console</h2>
          </div>
          <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">
            UNAI TECH Virtual Internship Offer Letter Portal • Enterprise Database & Security
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={loadAllData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-red-200 text-xs font-medium text-red-600 hover:bg-red-50"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 sm:gap-2 border-b border-gray-200 overflow-x-auto pb-1 text-xs sm:text-sm font-medium no-scrollbar">
        {[
          { key: 'overview', label: 'Overview', icon: Layers },
          { key: 'import', label: 'Excel Import', icon: Upload },
          { key: 'participants', label: `Participants (${participants.length})`, icon: Users },
          { key: 'offers', label: `Issued (${offerLetters.length})`, icon: FileText },
          { key: 'templates', label: 'PDF Template', icon: FileCode },
          { key: 'audit', label: `Audit Trail (${auditLogs.length})`, icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors whitespace-nowrap ${
                active
                  ? 'bg-unai-purple text-white font-semibold shadow-xs'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW METRICS */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm">
              <p className="text-xs font-medium text-gray-500">Unique Participants</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalParticipants}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Authoritative unique emails</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm">
              <p className="text-xs font-medium text-gray-500">Total Domain Registrations</p>
              <p className="text-2xl font-bold text-unai-purple mt-1">{stats.totalDomainRegistrations}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Across 4 domain workbooks</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm">
              <p className="text-xs font-medium text-gray-500">Letters Issued</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.totalOfferLetters}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Verified & downloaded</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm">
              <p className="text-xs font-medium text-gray-500">Pending Letters</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">{stats.pendingOfferLetters}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Awaiting participant verification</p>
            </div>
          </div>

          {/* Domain Specific Breakdown */}
          <div className="bg-white rounded-xl border border-gray-200/90 shadow-sm p-6">
            <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider text-xs">
              Registration Breakdown By Internship Domain
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-purple-50/50 border border-purple-100">
                <span className="text-xs font-semibold text-unai-purple">FULL STACK DEVELOPMENT</span>
                <p className="text-xl font-bold text-gray-900 mt-2">{stats.fullStackRegistrations}</p>
                <p className="text-xs text-gray-500 mt-1">Domain Code: FULL_STACK</p>
              </div>
              <div className="p-4 rounded-lg bg-blue-50/50 border border-blue-100">
                <span className="text-xs font-semibold text-blue-700">AI & AUTOMATION</span>
                <p className="text-xl font-bold text-gray-900 mt-2">{stats.aiAutomationRegistrations}</p>
                <p className="text-xs text-gray-500 mt-1">Domain Code: AI_AUTOMATION</p>
              </div>
              <div className="p-4 rounded-lg bg-indigo-50/50 border border-indigo-100">
                <span className="text-xs font-semibold text-indigo-700">APP DEVELOPMENT</span>
                <p className="text-xl font-bold text-gray-900 mt-2">{stats.appDevelopmentRegistrations}</p>
                <p className="text-xs text-gray-500 mt-1">Domain Code: APP_DEVELOPMENT</p>
              </div>
              <div className="p-4 rounded-lg bg-teal-50/50 border border-teal-100">
                <span className="text-xs font-semibold text-teal-700">WEB DEVELOPMENT</span>
                <p className="text-xl font-bold text-gray-900 mt-2">{stats.webDevelopmentRegistrations}</p>
                <p className="text-xs text-gray-500 mt-1">Domain Code: WEB_DEVELOPMENT</p>
              </div>
            </div>
          </div>

          {/* Recent Activity Mini-Feed */}
          <div className="bg-white rounded-xl border border-gray-200/90 shadow-sm p-6">
            <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider text-xs">
              Recent System Activity
            </h3>
            <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
              {auditLogs.slice(0, 8).map((log) => (
                <div key={log.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        log.status === 'success'
                          ? 'bg-green-500'
                          : log.status === 'warning'
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                    />
                    <span className="font-mono font-medium text-gray-800">{log.action}</span>
                    {log.participantEmail && (
                      <span className="text-gray-500">({log.participantEmail})</span>
                    )}
                  </div>
                  <span className="text-gray-400 font-mono">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EXCEL IMPORT MANAGER */}
      {activeTab === 'import' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200/90 shadow-sm p-6">
            <h3 className="text-base font-bold text-gray-900 mb-1">
              Upload & Import Authoritative Excel Workbooks
            </h3>
            <p className="text-xs text-gray-500 mb-6">
              Idempotent import system: duplicate records within or across batches are automatically detected and mapped safely.
            </p>

            <form onSubmit={handleImportSubmit} className="space-y-4 max-w-xl">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">
                  Target Internship Domain
                </label>
                <select
                  value={importDomain}
                  onChange={(e) => setImportDomain(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-unai-purple/20 focus:border-unai-purple"
                >
                  {DOMAIN_OPTIONS.map((d) => (
                    <option key={d.code} value={d.code}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">
                  Excel Workbook File (.xlsx, .xls)
                </label>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  required
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-unai-purple hover:file:bg-purple-100 cursor-pointer"
                />
              </div>

              <button
                type="submit"
                disabled={!selectedFile || importing}
                className="inline-flex items-center gap-2 py-2.5 px-4 rounded-lg bg-unai-purple text-white text-xs font-semibold hover:bg-unai-purple-dark disabled:opacity-60 transition-colors shadow-sm"
              >
                <Upload className="w-4 h-4" />
                <span>{importing ? 'Processing & Validating Workbook...' : 'Start Production Import'}</span>
              </button>
            </form>

            {importResult && (
              <div className="mt-6 p-4 rounded-lg bg-green-50 border border-green-200 text-green-900">
                <p className="text-xs font-bold uppercase tracking-wider mb-2">Import Report Summary</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>Total Rows: <span className="font-bold">{importResult.totalRows}</span></div>
                  <div>Valid Records: <span className="font-bold">{importResult.validRows}</span></div>
                  <div>Duplicates Skipped: <span className="font-bold">{importResult.duplicateRows}</span></div>
                  <div>Invalid Rows: <span className="font-bold">{importResult.invalidRows}</span></div>
                </div>
              </div>
            )}
          </div>

          {/* Import Batches History */}
          <div className="bg-white rounded-xl border border-gray-200/90 shadow-sm p-6">
            <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider text-xs">
              Batch Import History
            </h3>
            {importBatches.length === 0 ? (
              <p className="text-xs text-gray-400">No batch imports recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-600">
                  <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200">
                    <tr>
                      <th className="py-2.5 px-3">File Name</th>
                      <th className="py-2.5 px-3">Domain</th>
                      <th className="py-2.5 px-3">Valid Rows</th>
                      <th className="py-2.5 px-3">Imported Rows</th>
                      <th className="py-2.5 px-3">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {importBatches.map((b) => (
                      <tr key={b.id} className="hover:bg-gray-50">
                        <td className="py-2.5 px-3 font-mono">{b.fileName}</td>
                        <td className="py-2.5 px-3 font-medium text-unai-purple">{b.domainName}</td>
                        <td className="py-2.5 px-3">{b.validRows}</td>
                        <td className="py-2.5 px-3 font-bold text-green-700">{b.importedRows}</td>
                        <td className="py-2.5 px-3 text-gray-400">{new Date(b.timestamp).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: PARTICIPANTS DIRECTORY */}
      {activeTab === 'participants' && (
        <div className="bg-white rounded-xl border border-gray-200/90 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={participantSearch}
                onChange={(e) => setParticipantSearch(e.target.value)}
                placeholder="Search participant name or email..."
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-unai-purple/20 focus:border-unai-purple"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Domain:</span>
              <select
                value={selectedDomainFilter}
                onChange={(e) => setSelectedDomainFilter(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none"
              >
                <option value="ALL">All Domains ({participants.length})</option>
                <option value="FULL STACK">Full Stack Development</option>
                <option value="AI & AUTOMATION">AI & Automation</option>
                <option value="APP DEVELOPMENT">App Development</option>
                <option value="WEB DEVELOPMENT">Web Development</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200">
                <tr>
                  <th className="py-2.5 px-3">Participant Name</th>
                  <th className="py-2.5 px-3">Registered Email</th>
                  <th className="py-2.5 px-3">Enrolled Domains</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredParticipants.slice(0, 100).map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="py-2.5 px-3 font-semibold text-gray-900">{p.fullName}</td>
                    <td className="py-2.5 px-3 font-mono">{p.email}</td>
                    <td className="py-2.5 px-3">
                      <div className="flex flex-wrap gap-1">
                        {p.domains.map((d, i) => (
                          <span
                            key={i}
                            className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-unai-purple border border-purple-100"
                          >
                            {d}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-green-50 text-green-700">
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-gray-400">
            Showing {Math.min(filteredParticipants.length, 100)} of {filteredParticipants.length} participants
          </p>
        </div>
      )}

      {/* TAB 4: ISSUED OFFER LETTERS */}
      {activeTab === 'offers' && (
        <div className="bg-white rounded-xl border border-gray-200/90 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={offerSearch}
                onChange={(e) => setOfferSearch(e.target.value)}
                placeholder="Search by reference ID, name, or domain..."
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-unai-purple/20 focus:border-unai-purple"
              />
            </div>
          </div>

          {filteredOfferLetters.length === 0 ? (
            <div className="text-center py-8 text-xs text-gray-400">
              No offer letters have been generated yet. Test from the participant portal!
            </div>
          ) : (
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-left text-xs text-gray-600">
                <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="py-2.5 px-3">Reference ID</th>
                    <th className="py-2.5 px-3">Participant</th>
                    <th className="py-2.5 px-3">College</th>
                    <th className="py-2.5 px-3">Domain</th>
                    <th className="py-2.5 px-3">Issue Date</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Download Limit</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredOfferLetters.map((o) => (
                    <tr key={o.offerLetterId} className="hover:bg-gray-50">
                      <td className="py-2.5 px-3 font-mono font-bold text-gray-900">{o.offerLetterId}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-gray-900">{o.participantName}</div>
                        <div className="text-[11px] text-gray-400 font-mono">{o.participantEmail}</div>
                      </td>
                      <td className="py-2.5 px-3 max-w-xs truncate">{o.collegeName}</td>
                      <td className="py-2.5 px-3 font-medium text-unai-purple">{o.domainName}</td>
                      <td className="py-2.5 px-3">{o.issueDate}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                            o.status === 'valid'
                              ? 'bg-green-50 text-green-700'
                              : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {o.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        {(o.downloadCount || 0) >= 1 ? (
                          <span
                            className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200"
                            title={`Downloaded on ${o.downloadedAt ? new Date(o.downloadedAt).toLocaleString() : 'N/A'}`}
                          >
                            DOWNLOADED (1/1)
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                            PENDING (0/1)
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right space-x-2">
                        {o.downloadUrl && (
                          <button
                            onClick={() => api.downloadOfferLetterPdf(o.downloadUrl!, `UNAI_TECH_${o.offerLetterId}.pdf`)}
                            className="inline-flex items-center gap-1 text-unai-purple font-semibold hover:underline"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download</span>
                          </button>
                        )}
                        {(o.downloadCount || 0) >= 1 && (
                          <button
                            onClick={() => handleResetDownload(o.offerLetterId)}
                            className="text-amber-700 hover:underline font-semibold"
                            title="Reset download quota so participant can download again"
                          >
                            Allow Re-download
                          </button>
                        )}
                        {o.status === 'valid' ? (
                          <button
                            onClick={() => handleRevoke(o.offerLetterId)}
                            className="text-red-600 hover:underline font-semibold"
                          >
                            Revoke
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReissue(o.offerLetterId)}
                            className="text-green-600 hover:underline font-semibold"
                          >
                            Reissue
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: PDF TEMPLATE MANAGER */}
      {activeTab === 'templates' && (
        <div className="bg-white rounded-xl border border-gray-200/90 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-gray-900">Official PDF Offer Letter Template</h3>
              <p className="text-xs text-gray-500">
                Official single-page background: ammu.pdf (3).pdf (595.5 pt x 842.25 pt)
              </p>
            </div>
            <span className="px-2.5 py-1 rounded bg-green-50 text-green-700 text-xs font-semibold">
              Active v1.0
            </span>
          </div>

          <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 text-xs space-y-2">
            <p className="font-semibold text-gray-800">Calibrated Placeholder Overlays:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-600 font-mono text-[11px]">
              <div>• {'{participant name}'}: x=87.62, y=620.75 (Times-Bold 12pt)</div>
              <div>• {'{date}'}: x=442.00, y=620.75 (01 November 2026)</div>
              <div>• {'{College Name}'}: x=248.32, y=535.97 (Times-Roman 12pt)</div>
              <div>• {'{domain}'} (Subject): x=249.91, y=594.49 (Times-Bold 12pt)</div>
              <div>• {'{domain}'} (Details): x=126.71, y=328.13 (Times-Roman 12pt)</div>
              <div>• Watermark & Signature: Protected & Undisturbed</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-xl border border-gray-200/90 shadow-sm p-6 space-y-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider text-xs">
            Security & Audit Activity Trail
          </h3>

          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Participant Email</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="py-2.5 px-3 font-mono text-gray-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-gray-900">{log.action}</td>
                    <td className="py-2.5 px-3 font-mono">{log.participantEmail || '—'}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                          log.status === 'success'
                            ? 'bg-green-50 text-green-700'
                            : log.status === 'warning'
                            ? 'bg-yellow-50 text-yellow-700'
                            : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {log.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] max-w-xs truncate text-gray-500">
                      {JSON.stringify(log.details)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
