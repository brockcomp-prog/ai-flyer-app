import React from 'react';
import { StarIcon, BookOpenIcon } from '@/components/Icon';

interface HeaderProps {
  onOpenLibrary: () => void;
}

const Header: React.FC<HeaderProps> = ({ onOpenLibrary }) => {
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
        <button
          onClick={onOpenLibrary}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md text-neutral-200 bg-neutral-800 hover:bg-neutral-700 transition-colors"
        >
          <BookOpenIcon className="w-5 h-5" />
          My Library
        </button>
      </div>
    </header>
  );
};

export default Header;