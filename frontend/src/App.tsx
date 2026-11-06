import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Step1Verification } from './components/Step1Verification';
import { Step2DomainSelection } from './components/Step2DomainSelection';
import { Step3DownloadOfferLetter } from './components/Step3DownloadOfferLetter';
import { AdminDashboard } from './components/admin/AdminDashboard';
import type { VerifiedParticipantSession, GeneratedOfferLetterData } from './types';
import { Award, AlertOctagon, Clock, Phone, Mail, Headphones } from 'lucide-react';
import { isOfferLetterDeadlinePassed } from './services/api';

/**
 * Robust detection of the admin route across all routing styles:
 * - /adminconsole
 * - \adminconsole or /%5Cadminconsole
 * - /#adminconsole or /?adminconsole
 * - SPA fallback: /#route=%2Fadminconsole
 */
function checkIsAdminRoute(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const rawHref = window.location.href || '';
    const decodedHref = decodeURIComponent(rawHref).toLowerCase();
    const rawPath = window.location.pathname || '';
    const decodedPath = decodeURIComponent(rawPath).toLowerCase();
    const hash = (window.location.hash || '').toLowerCase();
    const search = (window.location.search || '').toLowerCase();

    return (
      decodedHref.includes('adminconsole') ||
      decodedPath.includes('adminconsole') ||
      hash.includes('adminconsole') ||
      search.includes('adminconsole')
    );
  } catch {
    return false;
  }
}

export const App: React.FC = () => {
  const [isAdminView, setIsAdminView] = useState<boolean>(checkIsAdminRoute);
  const [session, setSession] = useState<VerifiedParticipantSession | null>(null);
  const [generatedLetter, setGeneratedLetter] = useState<GeneratedOfferLetterData | null>(null);
  const [deadlinePassed, setDeadlinePassed] = useState<boolean>(isOfferLetterDeadlinePassed());

  // Preserved input state so Back buttons retain user values
  const [savedName, setSavedName] = useState<string>('');
  const [savedEmail, setSavedEmail] = useState<string>('');
  const [savedCollege, setSavedCollege] = useState<string>('');
  const [savedDomain, setSavedDomain] = useState<string>('');

  // Listen to navigation events (e.g. user types /adminconsole or changes hash)
  useEffect(() => {
    const handleLocationChange = () => {
      setIsAdminView(checkIsAdminRoute());
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);

    // Initial check in case of SPA redirects
    handleLocationChange();

    // Periodic deadline tick check
    const interval = setInterval(() => {
      setDeadlinePassed(isOfferLetterDeadlinePassed());
    }, 10000);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
      clearInterval(interval);
    };
  }, []);

  const handleExitAdmin = () => {
    // Return to public portal cleanly
    try {
      window.history.pushState(null, '', '/');
    } catch {
      window.location.hash = '';
    }
    setIsAdminView(false);
  };

  const handleVerified = (verifiedSession: VerifiedParticipantSession) => {
    setSession(verifiedSession);
    setSavedName(verifiedSession.verifiedName);
    setSavedEmail(verifiedSession.registeredEmail);
    setGeneratedLetter(null);
  };

  const handleGenerationSuccess = (letter: GeneratedOfferLetterData) => {
    setGeneratedLetter(letter);
    setSavedCollege(letter.collegeName);
    setSavedDomain(letter.domainName);
  };

  // Back Navigation Handlers
  const handleBackToStep1 = () => {
    setSession(null);
    setGeneratedLetter(null);
  };

  const handleBackToStep2 = () => {
    setGeneratedLetter(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fcfcfd]">
      <Header
        isAdminView={isAdminView}
        onExitAdmin={handleExitAdmin}
        deadlinePassed={deadlinePassed}
      />

      <main className="flex-1 py-6 sm:py-12 px-3 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        {isAdminView ? (
          <AdminDashboard />
        ) : (
          <div className="space-y-6 sm:space-y-8">
            {/* Hero / Portal Title Section */}
            <div className="text-center max-w-2xl mx-auto space-y-2 sm:space-y-3 px-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 border border-purple-100 text-unai-purple text-[11px] sm:text-xs font-semibold">
                <Award className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">UNAI TECH Pvt. Ltd. • Virtual Internship Program</span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
                Internship Offer Letter Portal
              </h1>

              <p className="text-xs sm:text-base text-gray-600 leading-relaxed max-w-xl mx-auto">
                Welcome to the official UNAI TECH Virtual Internship Program portal. Verify your registration details and download your official personalized internship offer letter.
              </p>
            </div>

            {/* Deadline Announcement / Warning Banner */}
            {deadlinePassed ? (
              <div className="max-w-xl mx-auto p-4 sm:p-5 rounded-xl bg-red-50 border border-red-200 text-red-900 shadow-xs">
                <div className="flex items-start gap-3">
                  <AlertOctagon className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h3 className="font-bold text-sm sm:text-base text-red-900">
                      Offer Letter Generation Concluded
                    </h3>
                    <p className="text-xs sm:text-sm text-red-700 leading-relaxed">
                      The official deadline to generate and download offer letters was{' '}
                      <strong>09 November 2026 at 12:00 PM IST</strong>. This internship portal is now closed for new document issuance. For any inquiries, please contact the UNAI TECH program coordination team.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="max-w-xl mx-auto p-3 sm:p-3.5 rounded-lg bg-purple-50/70 border border-purple-100 text-unai-purple flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs font-medium">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-unai-purple shrink-0" />
                  <span>Important: Generation window closes on <strong>09 November 2026 at 12:00 PM IST</strong>.</span>
                </div>
                <span className="self-start sm:self-center px-2 py-0.5 rounded bg-white text-unai-purple font-semibold border border-purple-200 text-[11px] whitespace-nowrap">
                  1 Download per Verified Email (All Domains)
                </span>
              </div>
            )}

            {/* Responsive Stepper Progress Bar (Interactive for Completed Steps) */}
            <div className="max-w-xl mx-auto px-1">
              <div className="flex items-center justify-between text-xs font-medium text-gray-500">
                {/* Step 1 Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (session && !generatedLetter) handleBackToStep1();
                    if (generatedLetter && (generatedLetter.downloadCount || 0) < 1) handleBackToStep1();
                  }}
                  disabled={!session || ((generatedLetter?.downloadCount || 0) >= 1)}
                  className={`flex items-center gap-1.5 shrink-0 transition-opacity ${session && ((generatedLetter?.downloadCount || 0) < 1) ? 'cursor-pointer hover:opacity-80' : ''
                    } ${!session && !generatedLetter ? 'text-unai-purple font-bold' : 'text-gray-400'}`}
                  title={session && ((generatedLetter?.downloadCount || 0) < 1) ? 'Click to return to Step 1' : ''}
                >
                  <span
                    className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-semibold ${session
                        ? 'bg-green-600 text-white'
                        : !session
                          ? 'bg-unai-purple text-white shadow-xs'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                  >
                    {session ? '✓' : '1'}
                  </span>
                  <span className="hidden sm:inline">Identity Verification</span>
                  <span className="sm:hidden text-[11px]">Identity</span>
                </button>

                <div className="flex-1 mx-2 sm:mx-4 h-px bg-gray-200" />

                {/* Step 2 Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (generatedLetter && (generatedLetter.downloadCount || 0) < 1) handleBackToStep2();
                  }}
                  disabled={!generatedLetter || ((generatedLetter.downloadCount || 0) >= 1)}
                  className={`flex items-center gap-1.5 shrink-0 transition-opacity ${generatedLetter && (generatedLetter.downloadCount || 0) < 1 ? 'cursor-pointer hover:opacity-80' : ''
                    } ${session && !generatedLetter ? 'text-unai-purple font-bold' : 'text-gray-400'}`}
                  title={generatedLetter && (generatedLetter.downloadCount || 0) < 1 ? 'Click to return to Step 2' : ''}
                >
                  <span
                    className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-semibold ${generatedLetter
                        ? 'bg-green-600 text-white'
                        : session
                          ? 'bg-unai-purple text-white shadow-xs'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                  >
                    {generatedLetter ? '✓' : '2'}
                  </span>
                  <span className="hidden sm:inline">Domain Authorization</span>
                  <span className="sm:hidden text-[11px]">Domain</span>
                </button>

                <div className="flex-1 mx-2 sm:mx-4 h-px bg-gray-200" />

                {/* Step 3 */}
                <div
                  className={`flex items-center gap-1.5 shrink-0 ${generatedLetter ? 'text-unai-purple font-bold' : 'text-gray-400'
                    }`}
                >
                  <span
                    className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-semibold ${generatedLetter
                        ? 'bg-unai-purple text-white shadow-xs'
                        : 'bg-gray-200 text-gray-600'
                      }`}
                  >
                    3
                  </span>
                  <span className="hidden sm:inline">Offer Letter Download</span>
                  <span className="sm:hidden text-[11px]">Download</span>
                </div>
              </div>
            </div>

            {/* Interactive Step Content */}
            <div className="max-w-xl mx-auto">
              {deadlinePassed && !session && !generatedLetter ? (
                <div className="bg-white rounded-xl border border-gray-200/90 shadow-sm p-6 sm:p-8 text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto text-gray-400">
                    <Clock className="w-6 h-6" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-800">Registration Verification Closed</h3>
                  <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto leading-relaxed">
                    Offer letter generation is strictly disabled after the official deadline of <strong>09 November 2026, 12:00 PM IST</strong>. If you previously registered and were unable to download before the deadline, please contact UNAI TECH management.
                  </p>
                </div>
              ) : (
                <>
                  {!session && (
                    <Step1Verification
                      onVerified={handleVerified}
                      initialName={savedName}
                      initialEmail={savedEmail}
                    />
                  )}

                  {session && !generatedLetter && (
                    <Step2DomainSelection
                      session={session}
                      onSuccess={handleGenerationSuccess}
                      onBack={handleBackToStep1}
                      initialCollege={savedCollege}
                      initialDomain={savedDomain}
                    />
                  )}

                  {generatedLetter && (
                    <Step3DownloadOfferLetter
                      offerLetter={generatedLetter}
                      onBackToStep2={handleBackToStep2}
                      onBackToStep1={handleBackToStep1}
                    />
                  )}
                </>
              )}
            </div>

            {/* Contact Administrator Section */}
            <div className="max-w-xl mx-auto bg-white rounded-xl border border-gray-200/90 shadow-sm p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-md bg-purple-50 text-unai-purple">
                      <Headphones className="w-4 h-4" />
                    </span>
                    <h3 className="text-sm font-bold text-gray-900">
                      Contact Administrator
                    </h3>
                  </div>
                  <p className="text-xs text-gray-500">
                    Need assistance with your verification or offer letter?
                  </p>
                </div>

                <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2">
                  <a
                    href="tel:9043988697"
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-gray-50 hover:bg-purple-50 text-gray-700 hover:text-unai-purple border border-gray-200 text-xs font-semibold transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 text-unai-purple shrink-0" />
                    <span>9043988697</span>
                  </a>

                  <a
                    href="mailto:contact@unaitech.com"
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-gray-50 hover:bg-purple-50 text-gray-700 hover:text-unai-purple border border-gray-200 text-xs font-semibold transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5 text-unai-purple shrink-0" />
                    <span>contact@unaitech.com</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default App;
