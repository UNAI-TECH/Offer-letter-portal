import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Step1Verification } from './components/Step1Verification';
import { Step2DomainSelection } from './components/Step2DomainSelection';
import { Step3DownloadOfferLetter } from './components/Step3DownloadOfferLetter';
import { AdminDashboard } from './components/admin/AdminDashboard';
import type { VerifiedParticipantSession, GeneratedOfferLetterData } from './types';
import { Award, ShieldCheck, AlertOctagon, Clock } from 'lucide-react';
import { isOfferLetterDeadlinePassed } from './services/api';

function checkIsAdminRoute(): boolean {
  if (typeof window === 'undefined') return false;
  const path = (window.location.pathname || '').toLowerCase();
  const hash = (window.location.hash || '').toLowerCase();
  const search = (window.location.search || '').toLowerCase();

  return (
    path.includes('adminconsole') ||
    hash.includes('adminconsole') ||
    search.includes('adminconsole')
  );
}

export const App: React.FC = () => {
  const [isAdminView, setIsAdminView] = useState<boolean>(checkIsAdminRoute);
  const [session, setSession] = useState<VerifiedParticipantSession | null>(null);
  const [generatedLetter, setGeneratedLetter] = useState<GeneratedOfferLetterData | null>(null);
  const [deadlinePassed, setDeadlinePassed] = useState<boolean>(isOfferLetterDeadlinePassed());

  // Listen to navigation events (e.g. user types /adminconsole or changes hash)
  useEffect(() => {
    const handleLocationChange = () => {
      setIsAdminView(checkIsAdminRoute());
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);

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
    setGeneratedLetter(null);
  };

  const handleGenerationSuccess = (letter: GeneratedOfferLetterData) => {
    setGeneratedLetter(letter);
  };

  const handleReset = () => {
    setSession(null);
    setGeneratedLetter(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fcfcfd]">
      <Header
        isAdminView={isAdminView}
        onExitAdmin={handleExitAdmin}
        deadlinePassed={deadlinePassed}
      />

      <main className="flex-1 py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        {isAdminView ? (
          <AdminDashboard />
        ) : (
          <div className="space-y-8">
            {/* Hero / Portal Title Section */}
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 border border-purple-100 text-unai-purple text-xs font-semibold">
                <Award className="w-3.5 h-3.5" />
                <span>UNAI TECH Pvt. Ltd. • Virtual Internship Program</span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
                Internship Offer Letter Portal
              </h1>

              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                Welcome to the official UNAI TECH Virtual Internship Program portal. Verify your registration details and download your official personalized internship offer letter.
              </p>
            </div>

            {/* Deadline Announcement / Warning Banner */}
            {deadlinePassed ? (
              <div className="max-w-xl mx-auto p-5 rounded-xl bg-red-50 border border-red-200 text-red-900 shadow-sm">
                <div className="flex items-start gap-3">
                  <AlertOctagon className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
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
              <div className="max-w-xl mx-auto p-3.5 rounded-lg bg-purple-50/70 border border-purple-100 text-unai-purple flex items-center justify-between text-xs font-medium">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-unai-purple shrink-0" />
                  <span>Important: Generation window closes on <strong>09 November 2026 at 12:00 PM IST</strong>.</span>
                </div>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-white text-unai-purple font-semibold border border-purple-200 text-[11px]">
                  1 Download per Domain
                </span>
              </div>
            )}

            {/* Stepper Progress Bar */}
            <div className="max-w-xl mx-auto">
              <div className="flex items-center justify-between text-xs font-medium text-gray-500">
                <div
                  className={`flex items-center gap-1.5 ${
                    !session && !generatedLetter ? 'text-unai-purple font-bold' : 'text-gray-400'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                      session
                        ? 'bg-green-600 text-white'
                        : !session
                        ? 'bg-unai-purple text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {session ? '✓' : '1'}
                  </span>
                  <span>Identity Verification</span>
                </div>

                <div className="w-8 sm:w-16 h-px bg-gray-200" />

                <div
                  className={`flex items-center gap-1.5 ${
                    session && !generatedLetter ? 'text-unai-purple font-bold' : 'text-gray-400'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                      generatedLetter
                        ? 'bg-green-600 text-white'
                        : session
                        ? 'bg-unai-purple text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {generatedLetter ? '✓' : '2'}
                  </span>
                  <span>Domain Authorization</span>
                </div>

                <div className="w-8 sm:w-16 h-px bg-gray-200" />

                <div
                  className={`flex items-center gap-1.5 ${
                    generatedLetter ? 'text-unai-purple font-bold' : 'text-gray-400'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                      generatedLetter
                        ? 'bg-unai-purple text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    3
                  </span>
                  <span>Offer Letter Download</span>
                </div>
              </div>
            </div>

            {/* Interactive Step Content */}
            <div className="max-w-xl mx-auto">
              {deadlinePassed && !session && !generatedLetter ? (
                <div className="bg-white rounded-xl border border-gray-200/90 shadow-sm p-8 text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto text-gray-400">
                    <Clock className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-800">Registration Verification Closed</h3>
                  <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto leading-relaxed">
                    Offer letter generation is strictly disabled after the official deadline of <strong>09 November 2026, 12:00 PM IST</strong>. If you previously registered and were unable to download before the deadline, please contact UNAI TECH management.
                  </p>
                </div>
              ) : (
                <>
                  {!session && (
                    <Step1Verification onVerified={handleVerified} />
                  )}

                  {session && !generatedLetter && (
                    <Step2DomainSelection
                      session={session}
                      onSuccess={handleGenerationSuccess}
                      onReset={handleReset}
                    />
                  )}

                  {generatedLetter && (
                    <Step3DownloadOfferLetter
                      offerLetter={generatedLetter}
                      onReset={handleReset}
                    />
                  )}
                </>
              )}
            </div>

            {/* Security Assurance Footer Note */}
            <div className="max-w-xl mx-auto pt-6 text-center">
              <div className="inline-flex items-center gap-2 text-xs text-gray-400">
                <ShieldCheck className="w-4 h-4 text-gray-400" />
                <span>Official PDF Overlay Engine • SHA-256 Token Sessions • Idempotent Issuance</span>
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
