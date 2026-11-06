import React, { useState } from 'react';
import { User, Mail, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import type { VerifiedParticipantSession } from '../types';

interface Step1Props {
  onVerified: (session: VerifiedParticipantSession) => void;
}

export const Step1Verification: React.FC<Step1Props> = ({ onVerified }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setErrorMessage('Please enter your full name as registered.');
      return;
    }

    if (!trimmedEmail) {
      setErrorMessage('Please enter your registered email address.');
      return;
    }

    setLoading(true);

    try {
      const session = await api.verifyParticipant(trimmedName, trimmedEmail);
      onVerified(session);
    } catch (err: any) {
      setErrorMessage(
        err.message ||
          "Sorry! We couldn't verify your registration. Please check your registered name and email address."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200/90 shadow-sm p-4 sm:p-8 transition-all">
      <div className="mb-5 sm:mb-6">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 text-unai-purple text-xs font-semibold mb-2.5 sm:mb-3">
          <span>Step 1 of 3</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          Verify Your Registration
        </h2>
        <p className="mt-1 sm:mt-1.5 text-xs sm:text-sm text-gray-600 leading-relaxed">
          Please enter your official registered name and email address as used during enrollment in the UNAI TECH Virtual Internship Program.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-5 p-3.5 sm:p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 flex items-start gap-2.5 sm:gap-3">
          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 shrink-0 mt-0.5" />
          <p className="text-xs sm:text-sm font-medium leading-relaxed">{errorMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5" noValidate>
        <div>
          <label htmlFor="fullName" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
            Full Name (To be printed on Offer Letter) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              <User className="w-4 h-4" />
            </div>
            <input
              id="fullName"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your name"
              className="w-full pl-10 pr-4 py-2.5 sm:py-2.5 border border-gray-300 rounded-lg text-base sm:text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-unai-purple/20 focus:border-unai-purple transition-colors shadow-2xs"
              disabled={loading}
              autoComplete="name"
            />
          </div>
          <p className="mt-1 text-[11px] sm:text-xs text-gray-500">
            Enter your official full name with initials as you want it printed on your offer letter.
          </p>
        </div>

        <div>
          <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
            Registered Email Address <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              <Mail className="w-4 h-4" />
            </div>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your registered mail address"
              className="w-full pl-10 pr-4 py-2.5 sm:py-2.5 border border-gray-300 rounded-lg text-base sm:text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-unai-purple/20 focus:border-unai-purple transition-colors shadow-2xs"
              disabled={loading}
              autoComplete="email"
              inputMode="email"
            />
          </div>
          <p className="mt-1 text-[11px] sm:text-xs text-gray-500">
            Eligibility is verified exclusively against your registered email in the official program database.
          </p>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-unai-purple text-white text-sm font-semibold hover:bg-unai-purple-dark focus:outline-none focus:ring-4 focus:ring-unai-purple/20 transition-all shadow-xs active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed min-h-[44px]"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying Registration Records...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Verify My Registration</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
