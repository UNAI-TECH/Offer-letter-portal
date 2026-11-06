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
    <header className="border-b border-gray-200 bg-white sticky top-0 z-50 shadow-xs">
      <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
          <img
            src="/logo.png"
            alt="UNAI TECH Pvt. Ltd."
            className="h-8 sm:h-11 w-auto object-contain shrink-0"
          />
          <div className="hidden xs:block h-5 sm:h-6 w-px bg-gray-200 shrink-0" />
          <div className="hidden xs:block truncate">
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-unai-purple truncate">
              Virtual Internship 2026
            </p>
            <p className="text-xs sm:text-sm font-medium text-gray-500 truncate">
              Offer Letter Portal
            </p>
          </div>
        </div>

        {/* Portal Action controls */}
        <div className="flex items-center gap-2 shrink-0">
          {isAdminView ? (
            <button
              onClick={onExitAdmin}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-lg text-xs font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors shadow-xs active:scale-95"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Portal</span>
            </button>
          ) : (
            <div
              className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-3 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-medium border ${
                deadlinePassed
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-purple-50 text-unai-purple border-purple-100'
              }`}
            >
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">
                {deadlinePassed
                  ? 'Generation Closed (Deadline: 09 Nov, 12:00 PM)'
                  : 'Deadline: 09 Nov 2026, 12:00 PM IST'}
              </span>
              <span className="sm:hidden">
                {deadlinePassed ? 'Closed' : '09 Nov, 12 PM'}
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
