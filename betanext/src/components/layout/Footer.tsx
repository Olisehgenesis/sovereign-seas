import React from 'react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="text-center">
          <p className="text-gray-600 text-sm">
            © {currentYear} Sovereign Seas. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
