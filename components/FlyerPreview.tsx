

import React, { useState } from 'react';
import type { StoredFlyer } from '../types';
import { DownloadIcon, CreditCardIcon } from './Icon';
import Loader from './Loader';

interface FlyerPreviewProps {
  flyerOutput: StoredFlyer | null;
  onPurchase: (flyer: StoredFlyer) => void;
  isPurchasing: boolean;
}

const FlyerPreview: React.FC<FlyerPreviewProps> = ({ flyerOutput, onPurchase, isPurchasing }) => {
    const [activeTab, setActiveTab] = useState<'flyer' | 'thumbnail'>('flyer');
    
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

  return (
    <div className="bg-neutral-900 rounded-lg border border-neutral-800 overflow-hidden">
      <div className="p-4 border-b border-neutral-800">
          <div className="flex space-x-2">
            <button onClick={() => setActiveTab('flyer')} className={`px-4 py-2 text-sm font-medium rounded-md ${activeTab === 'flyer' ? 'bg-brand-primary text-neutral-950' : 'bg-neutral-800 text-neutral-200'}`}>Flyer (1080x1350)</button>
            <button onClick={() => setActiveTab('thumbnail')} className={`px-4 py-2 text-sm font-medium rounded-md ${activeTab === 'thumbnail' ? 'bg-brand-primary text-neutral-950' : 'bg-neutral-800 text-neutral-200'}`}>Thumbnail (1080x1080)</button>
          </div>
      </div>
      
      <div className="p-4 bg-neutral-950">
        {activeTab === 'flyer' && (
          <img
            src={flyerOutput.watermarkedFlyerImageUrl}
            alt="Generated flyer preview with watermark"
            className="w-full h-auto rounded-md shadow-lg"
          />
        )}
        {activeTab === 'thumbnail' && (
          <img
            src={flyerOutput.watermarkedThumbnailImageUrl}
            alt="Generated thumbnail preview with watermark"
            className="w-full h-auto rounded-md shadow-lg"
          />
        )}
      </div>
      
      <div className="p-4 border-t border-neutral-800 space-y-4">
        <button 
          onClick={() => onPurchase(flyerOutput)} 
          disabled={isPurchasing}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-neutral-950 bg-brand-primary hover:bg-brand-secondary transition-colors disabled:bg-neutral-700 disabled:cursor-not-allowed"
        >
          {isPurchasing ? (
            <>
              <Loader className="w-5 h-5" />
              Processing...
            </>
          ) : (
            <>
              <CreditCardIcon className="w-5 h-5" />
              Purchase & Download (No Watermark)
            </>
          )}
        </button>
        <div className="flex items-center gap-4">
          <button onClick={() => handleDownload(flyerOutput.watermarkedFlyerImageUrl, `flyer-watermarked.png`)} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-neutral-700 text-sm font-medium rounded-md text-white bg-neutral-800 hover:bg-neutral-700 transition-colors">
            <DownloadIcon className="w-4 h-4" /> Download Free Flyer
          </button>
           <button onClick={() => handleDownload(flyerOutput.watermarkedThumbnailImageUrl, `thumbnail-watermarked.png`)} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-neutral-700 text-sm font-medium rounded-md text-white bg-neutral-800 hover:bg-neutral-700 transition-colors">
            <DownloadIcon className="w-4 h-4" /> Download Free Thumb
          </button>
        </div>
      </div>
    </div>
  );
};

export default FlyerPreview;