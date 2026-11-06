import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-gray-200 bg-white mt-auto py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-gray-500 space-y-1.5">
        <p className="font-medium text-gray-600">
          © 2026 UNAI TECH Pvt. Ltd. All Rights Reserved.
        </p>
        <p className="text-[11px] text-gray-400">
          Virtual Internship Program • Chennai, Tamil Nadu • contact@unaitech.com
        </p>
      </div>
    </footer>
  );
};

