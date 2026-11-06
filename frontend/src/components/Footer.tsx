import React from 'react';
import { Phone, Mail } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-gray-200 bg-white mt-auto py-6 sm:py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-gray-500 space-y-2">
        <p className="font-semibold text-gray-700 text-xs sm:text-sm">
          © 2026 UNAI TECH Pvt. Ltd. All Rights Reserved.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-gray-500 pt-0.5">
          <span className="text-gray-400">Virtual Internship Program</span>
          <span className="hidden sm:inline text-gray-300">•</span>
          <a
            href="tel:9043988697"
            className="inline-flex items-center gap-1 hover:text-unai-purple transition-colors font-medium"
          >
            <Phone className="w-3.5 h-3.5 text-unai-purple" />
            <span>9043988697</span>
          </a>
          <span className="hidden sm:inline text-gray-300">•</span>
          <a
            href="mailto:contact@unaitech.com"
            className="inline-flex items-center gap-1 hover:text-unai-purple transition-colors font-medium"
          >
            <Mail className="w-3.5 h-3.5 text-unai-purple" />
            <span>contact@unaitech.com</span>
          </a>
        </div>
      </div>
    </footer>
  );
};
