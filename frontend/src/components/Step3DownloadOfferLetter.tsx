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
    <div className="bg-white rounded-xl border border-gray-200/90 shadow-sm p-6 sm:p-8">
      {/* Success banner */}
      <div className="text-center pb-6 border-b border-gray-100">
        <div className="mx-auto w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-unai-purple mb-3">
          <CheckCircle className="w-7 h-7" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-semibold mb-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Official Document Authorized</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
          Your Official Offer Letter Is Ready!
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Your personalized internship offer letter has been generated with verified UNAI TECH executive authorization.
        </p>
      </div>

      {/* Offer Letter Details Card */}
      <div className="my-6 p-5 rounded-xl bg-gray-50 border border-gray-200/80 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1">
              <FileText className="w-3.5 h-3.5" />
              <span>Participant Name</span>
            </div>
            <p className="text-sm font-semibold text-gray-900">
              {offerLetter.participantName}
            </p>
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1">
              <Building className="w-3.5 h-3.5" />
              <span>College Name</span>
            </div>
            <p className="text-sm font-semibold text-gray-900">
              {offerLetter.collegeName}
            </p>
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1">
              <Briefcase className="w-3.5 h-3.5" />
              <span>Internship Domain</span>
            </div>
            <p className="text-sm font-semibold text-unai-purple">
              {offerLetter.domainName}
            </p>
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Issue Date</span>
            </div>
            <p className="text-sm font-semibold text-gray-900">
              {offerLetter.issueDate}
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Hash className="w-3.5 h-3.5 text-gray-400" />
            <span>Reference ID:</span>
          </div>
          <span className="font-mono text-xs font-bold text-gray-800 bg-white px-2.5 py-1 rounded border border-gray-200">
            {offerLetter.offerLetterId}
          </span>
        </div>
      </div>

      {/* Strict Single-Use Policy Notice */}
      <div className={`mb-6 p-4 rounded-lg border text-xs leading-relaxed flex items-start gap-3 ${
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
              ? 'Download Quota Consumed (Single Download Enforced)'
              : 'Important Single-Use Download Policy'}
          </p>
          <p className="text-gray-600">
            {hasDownloaded
              ? 'You have downloaded your official offer letter for this domain. To maintain security and document integrity, each participant is permitted only ONE download per registered domain. Please ensure you store your saved PDF safely.'
              : 'In accordance with UNAI TECH security policy, each verified email is permitted to download their offer letter only ONCE per registered domain. Please ensure your device saves the file safely.'}
          </p>
        </div>
      </div>

      {/* Main Single Action Button */}
      <div className="space-y-3">
        <button
          onClick={handleDownload}
          disabled={downloading || hasDownloaded}
          className={`w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-lg text-base font-semibold transition-all shadow-md ${
            hasDownloaded
              ? 'bg-gray-100 text-gray-400 border border-gray-300 cursor-not-allowed'
              : 'bg-unai-purple text-white hover:bg-unai-purple-dark focus:outline-none focus:ring-4 focus:ring-unai-purple/20 active:scale-[0.99]'
          }`}
        >
          {hasDownloaded ? (
            <>
              <Lock className="w-5 h-5 text-gray-400" />
              <span>Offer Letter Downloaded (Download Locked)</span>
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              <span>Download Offer Letter PDF (1-Time Only)</span>
            </>
          )}
        </button>

        {hasDownloaded && (
          <p className="text-center text-xs text-green-700 font-medium">
            ✓ PDF file downloaded ({offerLetter.fileName}). Download quota for this domain is now complete.
          </p>
        )}
      </div>

      {/* Secondary Reset / Another Generation button */}
      <div className="mt-6 pt-5 border-t border-gray-100 flex items-center justify-between">
        <span className="text-xs text-gray-500">
          Enrolled in multiple domains?
        </span>
        <button
          onClick={onReset}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-unai-purple hover:text-unai-purple-dark transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Verify Another Domain</span>
        </button>
      </div>
    </div>
  );
};
