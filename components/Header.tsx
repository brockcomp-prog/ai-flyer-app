

import React from 'react';
import { StarIcon } from './Icon';

const Header: React.FC = () => {
  return (
    <header className="bg-neutral-900 border-b border-neutral-800 p-4">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-brand-primary p-2 rounded-lg">
            <StarIcon className="w-6 h-6 text-neutral-950" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">AI Flyer Generator</h1>
            <p className="text-sm text-neutral-200">Flyers for any occasion</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;