import React, { useState } from 'react';
import {
  GraduationCap,
  Layers,
  FileCheck2,
  AlertCircle,
  Loader2,
  Lock,
  ArrowLeft,
} from 'lucide-react';
import { api } from '../services/api';
import type {
  VerifiedParticipantSession,
  GeneratedOfferLetterData,
} from '../types';
import { DOMAIN_OPTIONS } from '../types';

interface Step2Props {
  session: VerifiedParticipantSession;
  onSuccess: (offerLetter: GeneratedOfferLetterData) => void;
  onReset: () => void;
}

export const Step2DomainSelection: React.FC<Step2Props> = ({
  session,
  onSuccess,
  onReset,
}) => {
  const [collegeName, setCollegeName] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanCollege = collegeName.trim();
    if (!cleanCollege) {
      setErrorMessage('Please enter your college name.');
      return;
    }

    if (!selectedDomain) {
      setErrorMessage('Please select your registered internship domain.');
      return;
    }

    setLoading(true);

    try {
      const result = await api.generateOfferLetter(
        session.sessionToken,
        cleanCollege,
        selectedDomain
      );
      onSuccess(result);
    } catch (err: any) {
      setErrorMessage(
        err.message ||
          'Your registered email is not associated with the selected internship domain. Please select the correct domain.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200/90 shadow-sm p-6 sm:p-8">
      {/* Verified banner */}
      <div className="mb-6 p-4 rounded-lg bg-green-50/80 border border-green-200/90 text-green-900 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold shrink-0">
            ✓
          </div>
          <div>
            <p className="text-sm font-semibold">Registration Verified Successfully!</p>
            <p className="text-xs text-green-700">
              Identity confirmed against UNAI TECH program records.
            </p>
          </div>
        </div>
        <button
          onClick={onReset}
          className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1 font-medium underline-offset-2 hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Change</span>
        </button>
      </div>

      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 text-unai-purple text-xs font-semibold mb-3">
          <span>Step 2 of 3</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          College & Domain Selection
        </h2>
        <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">
          Provide your current college or institution name and manually select your registered internship domain for backend authorization.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-sm font-medium leading-relaxed">{errorMessage}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {/* Read-only Verified Name & Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-lg bg-gray-50 border border-gray-200">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
              Verified Full Name
            </label>
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Lock className="w-3.5 h-3.5 text-gray-400" />
              <span>{session.verifiedName}</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
              Verified Registered Email
            </label>
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Lock className="w-3.5 h-3.5 text-gray-400" />
              <span className="font-mono text-xs">{session.registeredEmail}</span>
            </div>
          </div>
        </div>

        {/* Mandatory College Name */}
        <div>
          <label htmlFor="collegeName" className="block text-sm font-medium text-gray-700 mb-1.5">
            College / Institution Name <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              <GraduationCap className="w-4 h-4" />
            </div>
            <input
              id="collegeName"
              type="text"
              required
              value={collegeName}
              onChange={(e) => setCollegeName(e.target.value)}
              placeholder="e.g. Government College of Engineering"
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-unai-purple/20 focus:border-unai-purple transition-colors"
              disabled={loading}
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            This institution name will be officially printed into your offer letter.
          </p>
        </div>

        {/* Mandatory Internship Domain Dropdown */}
        <div>
          <label htmlFor="selectedDomain" className="block text-sm font-medium text-gray-700 mb-1.5">
            Internship Domain <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              <Layers className="w-4 h-4" />
            </div>
            <select
              id="selectedDomain"
              required
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-unai-purple/20 focus:border-unai-purple transition-colors"
              disabled={loading}
            >
              <option value="" disabled>
                -- Select your registered domain --
              </option>
              {DOMAIN_OPTIONS.map((d) => (
                <option key={d.code} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Note: The backend will validate your email against the authoritative Excel records for this specific domain.
          </p>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-unai-purple text-white text-sm font-semibold hover:bg-unai-purple-dark focus:outline-none focus:ring-4 focus:ring-unai-purple/20 transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Validating Domain & Generating Official PDF...</span>
              </>
            ) : (
              <>
                <FileCheck2 className="w-4 h-4" />
                <span>Generate My Offer Letter</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
