import React from 'react';
import { Clock, ArrowLeft } from 'lucide-react';

interface HeaderProps {
  isAdminView: boolean;
  onExitAdmin?: () => void;
  deadlinePassed?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  isAdminView,
  onExitAdmin,
  deadlinePassed = false,
}) => {
  return (
    <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img
            src="/logo.png"
            alt="UNAI TECH Pvt. Ltd."
            className="h-10 w-auto object-contain"
          />
          <div className="hidden sm:block h-6 w-px bg-gray-200" />
          <div className="hidden sm:block">
            <p className="text-xs font-semibold uppercase tracking-wider text-unai-purple">
              Virtual Internship 2026
            </p>
            <p className="text-sm font-medium text-gray-500">
              Official Offer Letter Portal
            </p>
          </div>
        </div>

        {/* Portal Action controls */}
        <div className="flex items-center gap-3">
          {isAdminView ? (
            <button
              onClick={onExitAdmin}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Portal</span>
            </button>
          ) : (
            <div className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
              deadlinePassed
                ? 'bg-red-50 text-red-700 border-red-200'
                : 'bg-purple-50 text-unai-purple border-purple-100'
            }`}>
              <Clock className="w-3.5 h-3.5" />
              <span>
                {deadlinePassed
                  ? 'Generation Closed (Deadline: 09 Nov, 12:00 PM)'
                  : 'Deadline: 09 Nov 2026, 12:00 PM IST'}
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
