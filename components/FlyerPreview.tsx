import React, { useState } from 'react';
import type { MonetizedFlyerOutput } from '../types';
import { DownloadIcon, WandIcon, CreditCardIcon } from './Icon';

interface FlyerPreviewProps {
  flyerOutput: MonetizedFlyerOutput | null;
  onRedesign: (prompt: string) => void;
  onPurchase: (flyer: MonetizedFlyerOutput) => void;
  isLoading: boolean;
}

const FlyerPreview: React.FC<FlyerPreviewProps> = ({ flyerOutput, onRedesign, onPurchase, isLoading }) => {
    const [redesignPrompt, setRedesignPrompt] = useState('');
    
    if (!flyerOutput) {
    return (
      <div className="w-full h-full bg-neutral-900 rounded-lg flex flex-col items-center justify-center p-8 border border-neutral-800">
        <h3 className="text-lg font-bold text-neutral-200">Flyer Preview</h3>
        <p className="mt-2 text-center text-neutral-700">Your generated flyer will appear here once you submit the form.</p>
      </div>
    );
  }
  
  const handleDownload = (imageUrl: string, filename: string) => {
      const a = document.createElement('a');
      a.href = imageUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
  }

  const handleRedesignSubmit = () => {
    if (!redesignPrompt.trim() || isLoading) return;
    onRedesign(redesignPrompt);
    setRedesignPrompt('');
  };

  return (
    <div className="bg-neutral-900 rounded-lg border border-neutral-800 overflow-hidden">
      <div className="p-4 bg-neutral-950">
        <img
          src={flyerOutput.watermarkedFlyerImageUrl}
          alt="Generated flyer preview"
          className="w-full h-auto rounded-md shadow-lg"
        />
      </div>
      
      <div className="p-4 border-t border-neutral-800 space-y-3">
        <button 
          onClick={() => onPurchase(flyerOutput)} 
          className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-neutral-950 bg-brand-primary hover:bg-brand-secondary transition-colors"
        >
          <CreditCardIcon className="w-5 h-5" /> Purchase & Download (No Watermark)
        </button>
        <button 
          onClick={() => handleDownload(flyerOutput.watermarkedFlyerImageUrl, `flyer-watermarked.png`)} 
          className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-neutral-700 text-sm font-medium rounded-md text-white bg-neutral-800 hover:bg-neutral-700 transition-colors"
        >
          <DownloadIcon className="w-4 h-4" /> Download Free (with watermark)
        </button>
      </div>

      <div className="p-4 border-t border-neutral-800 space-y-3 bg-neutral-900/50">
        <h4 className="text-base font-medium text-white">Refine Your Design</h4>
        <p className="text-sm text-neutral-200">
            Not quite right? Tell the AI what you want to change.
        </p>
        <textarea 
            value={redesignPrompt}
            onChange={(e) => setRedesignPrompt(e.target.value)}
            placeholder="e.g., Make the background darker, use a more elegant font, change the main color to blue..."
            className="w-full bg-neutral-800 border border-neutral-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
            rows={3}
            disabled={isLoading}
        />
        <button 
            onClick={handleRedesignSubmit} 
            disabled={isLoading || !redesignPrompt.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-neutral-950 bg-brand-secondary hover:bg-brand-primary disabled:bg-neutral-700 disabled:cursor-not-allowed transition-colors"
        >
            <WandIcon className="w-5 h-5" />
            {isLoading ? 'Redesigning...' : 'Redesign Flyer'}
        </button>
    </div>
    </div>
  );
};

export default FlyerPreview;