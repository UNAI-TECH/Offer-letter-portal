import React, { useState } from 'react';
import {
  Download,
  CheckCircle,
  FileText,
  Calendar,
  Building,
  Briefcase,
  Hash,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import type { GeneratedOfferLetterData } from '../types';
import { api } from '../services/api';

interface Step3Props {
  offerLetter: GeneratedOfferLetterData;
  onReset: () => void;
}

export const Step3DownloadOfferLetter: React.FC<Step3Props> = ({
  offerLetter,
  onReset,
}) => {
  const [downloading, setDownloading] = useState(false);
  const [hasDownloaded, setHasDownloaded] = useState((offerLetter.downloadCount || 0) >= 1);

  const handleDownload = () => {
    if (hasDownloaded) return;

    setDownloading(true);
    try {
      if (offerLetter.pdfBlob) {
        api.downloadOfferLetterPdf(offerLetter.pdfBlob, offerLetter.fileName, offerLetter.offerLetterId);
      } else if (offerLetter.downloadUrl) {
        api.downloadOfferLetterPdf(offerLetter.downloadUrl, offerLetter.fileName, offerLetter.offerLetterId);
      }
      setHasDownloaded(true);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setTimeout(() => setDownloading(false), 500);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200/90 shadow-sm p-4 sm:p-8 transition-all">
      {/* Success banner */}
      <div className="text-center pb-5 sm:pb-6 border-b border-gray-100">
        <div className="mx-auto w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-50 flex items-center justify-center text-unai-purple mb-2.5 sm:mb-3">
          <CheckCircle className="w-6 h-6 sm:w-7 sm:h-7" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-green-50 text-green-700 text-[11px] sm:text-xs font-semibold mb-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Official Document Authorized</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          Your Official Offer Letter Is Ready!
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-gray-600 max-w-md mx-auto">
          Your personalized internship offer letter has been generated with verified UNAI TECH executive authorization.
        </p>
      </div>

      {/* Offer Letter Details Card */}
      <div className="my-5 sm:my-6 p-4 sm:p-5 rounded-xl bg-gray-50 border border-gray-200/80 space-y-3 sm:space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-medium text-gray-500 mb-0.5">
              <FileText className="w-3.5 h-3.5" />
              <span>Participant Name</span>
            </div>
            <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate">
              {offerLetter.participantName}
            </p>
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-medium text-gray-500 mb-0.5">
              <Building className="w-3.5 h-3.5" />
              <span>College Name</span>
            </div>
            <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate">
              {offerLetter.collegeName}
            </p>
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-medium text-gray-500 mb-0.5">
              <Briefcase className="w-3.5 h-3.5" />
              <span>Internship Domain</span>
            </div>
            <p className="text-xs sm:text-sm font-semibold text-unai-purple truncate">
              {offerLetter.domainName}
            </p>
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-medium text-gray-500 mb-0.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>Issue Date</span>
            </div>
            <p className="text-xs sm:text-sm font-semibold text-gray-900">
              {offerLetter.issueDate}
            </p>
          </div>
        </div>

        <div className="pt-2.5 sm:pt-3 border-t border-gray-200 flex flex-col xs:flex-row xs:items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-gray-500">
            <Hash className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span>Reference ID:</span>
          </div>
          <span className="font-mono text-[11px] sm:text-xs font-bold text-gray-800 bg-white px-2 py-0.5 rounded border border-gray-200 self-start xs:self-auto">
            {offerLetter.offerLetterId}
          </span>
        </div>
      </div>

      {/* Strict Single-Use Policy Notice */}
      <div className={`mb-5 sm:mb-6 p-3.5 sm:p-4 rounded-lg border text-xs leading-relaxed flex items-start gap-2.5 sm:gap-3 ${
        hasDownloaded
          ? 'bg-amber-50 border-amber-200 text-amber-900'
          : 'bg-purple-50/60 border-purple-100 text-purple-900'
      }`}>
        {hasDownloaded ? (
          <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        ) : (
          <AlertTriangle className="w-4 h-4 text-unai-purple shrink-0 mt-0.5" />
        )}
        <div>
          <p className="font-semibold mb-0.5">
            {hasDownloaded
              ? 'Global Download Quota Consumed (Single Download Across All Domains)'
              : 'Strict Global 1-Offer Letter Policy'}
          </p>
          <p className="text-gray-600 text-[11px] sm:text-xs leading-relaxed">
            {hasDownloaded
              ? `You have downloaded your official offer letter for ${offerLetter.domainName}. Under UNAI TECH program policy, each verified email address can download only ONE offer letter in total across all registered domains. You cannot generate or download any other offer letter under any other domain. Please store your PDF safely.`
              : 'Each verified participant can download ONLY ONE offer letter across all registered domains. If you are registered in multiple domains, choosing and downloading this offer letter will permanently consume your allowance; you will NOT be able to download an offer letter for any other domain.'}
          </p>
        </div>
      </div>

      {/* Primary Download Action Button */}
      <div className="space-y-3">
        {hasDownloaded ? (
          <div className="space-y-2">
            <div className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-gray-100 text-gray-500 border border-gray-200 text-xs sm:text-sm font-semibold cursor-not-allowed">
              <Lock className="w-4 h-4" />
              <span>Offer Letter Downloaded (Global 1/1 Quota Used)</span>
            </div>
            <p className="text-center text-[11px] text-gray-500">
              Download finalized. Need assistance? Please reach out to the contact administrator below.
            </p>
          </div>
        ) : (
          <>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-lg bg-unai-purple text-white text-sm sm:text-base font-semibold hover:bg-unai-purple-dark focus:outline-none focus:ring-4 focus:ring-unai-purple/20 transition-all shadow-md active:scale-[0.99] min-h-[48px]"
            >
              <Download className="w-5 h-5 shrink-0" />
              <span>{downloading ? 'Downloading Official PDF...' : 'Download Official Offer Letter (PDF)'}</span>
            </button>

            {/* Change domain before downloading */}
            <button
              onClick={onReset}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-lg text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Change Selected Domain (Before Downloading)</span>
            </button>
          </>
        )}
      </div>

      <div className="mt-5 sm:mt-6 pt-4 sm:pt-5 border-t border-gray-100 text-center">
        <p className="text-[11px] sm:text-xs text-gray-500 leading-relaxed">
          The document carries official UNAI TECH executive signatures and authorization seals. Keep this offer letter safe for academic submission.
        </p>
      </div>
    </div>
  );
};
