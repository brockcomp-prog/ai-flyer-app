

import React, { useState, useEffect } from 'react';
import type { StoredFlyer, CleanFlyerOutput } from './types';
import { generateFlyer } from './services/geminiService';
import Header from './components/Header';
import FlyerForm from './components/FlyerForm';
import FlyerPreview from './components/FlyerPreview';
import Loader from './components/Loader';
import LibraryModal from './components/LibraryModal';
import { DownloadIcon } from './components/Icon';


const LIBRARY_STORAGE_KEY = 'ai-flyer-library';
const MAX_LIBRARY_ITEMS = 20;

/**
 * Adds a watermark to an image from a data URL.
 * @param imageUrl The data URL of the image to watermark.
 * @param text The watermark text.
 * @returns A promise that resolves with the data URL of the watermarked image.
 */
const addWatermark = (imageUrl: string, text: string = "Created with AI Flyer Generator"): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Could not get canvas context.'));
      }

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Watermark styles
      const padding = Math.max(20, img.width * 0.015);
      const fontSize = Math.max(18, Math.min(img.width / 40, 24));
      ctx.font = `bold ${fontSize}px Inter, sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      
      // Draw watermark text
      ctx.fillText(text, canvas.width - padding, canvas.height - padding);

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = (err) => {
      console.error("Failed to load image for watermarking.", err);
      reject(new Error('Failed to load image for watermarking.'));
    };
    img.src = imageUrl;
  });
};


const App: React.FC = () => {
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flyerOutput, setFlyerOutput] = useState<StoredFlyer | null>(null);

  // Library State
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [libraryItems, setLibraryItems] = useState<StoredFlyer[]>([]);
  
  // Payment State
  const [purchasedFlyer, setPurchasedFlyer] = useState<StoredFlyer | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);

  // Load library from localStorage on initial render
  useEffect(() => {
    try {
      const storedFlyers = localStorage.getItem(LIBRARY_STORAGE_KEY);
      if (storedFlyers) {
        const parsedFlyers: StoredFlyer[] = JSON.parse(storedFlyers);
        if (Array.isArray(parsedFlyers)) {
            setLibraryItems(parsedFlyers);
            
            // Check for successful payment redirect
            const urlParams = new URLSearchParams(window.location.search);
            const paymentSuccess = urlParams.get('payment_success');
            const flyerId = urlParams.get('flyer_id');
            
            if (paymentSuccess === 'true' && flyerId) {
                const foundFlyer = parsedFlyers.find(item => item.id === flyerId);
                if (foundFlyer) {
                    setPurchasedFlyer(foundFlyer);
                    // Clean up URL
                    window.history.replaceState(null, '', window.location.pathname);
                }
            }
        }
      }
    } catch (e) {
      console.error("Failed to load or parse library from localStorage", e);
      localStorage.removeItem(LIBRARY_STORAGE_KEY);
    }
  }, []);

  const handlePurchase = async (flyer: StoredFlyer) => {
    setIsPurchasing(true);
    setError(null);
    try {
        // This endpoint needs to be created as a serverless function.
        const response = await fetch('/api/create-checkout-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ flyer }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to create payment session.');
        }

        const { url: checkoutUrl } = await response.json();
        if (checkoutUrl) {
            window.location.href = checkoutUrl;
        } else {
            throw new Error('Could not get payment URL.');
        }
    } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred during purchase.');
        setIsPurchasing(false);
    }
  };


  const handleGenerateFlyer = async (inputs: any) => {
    setLoadingMessage('Generating your flyer...');
    setError(null);
    setFlyerOutput(null);
    try {
      const result: CleanFlyerOutput = await generateFlyer(inputs, setLoadingMessage);
      
      setLoadingMessage('Adding final touches...');
      const [watermarkedFlyerImageUrl, watermarkedThumbnailImageUrl] = await Promise.all([
        addWatermark(result.flyerImageUrl),
        addWatermark(result.thumbnailImageUrl)
      ]);
      
      const newFlyer: StoredFlyer = {
        ...result,
        watermarkedFlyerImageUrl,
        watermarkedThumbnailImageUrl,
        id: `flyer-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      
      setFlyerOutput(newFlyer);

      setLibraryItems(prevItems => {
        const updatedItems = [newFlyer, ...prevItems].slice(0, MAX_LIBRARY_ITEMS);
        try {
          localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(updatedItems));
        } catch (e) {
          console.error("Failed to save to localStorage", e);
        }
        return updatedItems;
      });

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setLoadingMessage(null);
    }
  };
  
  const handleDeleteLibraryItem = (idToDelete: string) => {
    setLibraryItems(prevItems => {
      const updatedItems = prevItems.filter(item => item.id !== idToDelete);
       try {
          localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(updatedItems));
        } catch (e) {
          console.error("Failed to update localStorage after deletion", e);
        }
      return updatedItems;
    });
  };

  const isGenerating = !!loadingMessage;

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col">
      <Header onOpenLibrary={() => setIsLibraryOpen(true)} />
      <main className="flex-grow container mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <FlyerForm onSubmit={handleGenerateFlyer} isLoading={isGenerating} />
        <div className="lg:sticky top-8">
          {isGenerating && (
            <div className="w-full h-[600px] bg-neutral-900 rounded-lg flex flex-col items-center justify-center animated-background">
               <Loader />
               <p className="mt-4 text-neutral-200">{loadingMessage}</p>
               <p className="text-sm text-neutral-700">This may take a moment.</p>
            </div>
          )}
          {error && (
             <div className="w-full h-[600px] bg-red-900/20 border border-red-700 rounded-lg flex flex-col items-center justify-center p-8">
                <h3 className="text-lg font-bold text-red-400">An Error Occurred</h3>
                <p className="mt-2 text-center text-red-300">{error}</p>
             </div>
          )}
          {!isGenerating && !error && (
             <FlyerPreview flyerOutput={flyerOutput} onPurchase={handlePurchase} isPurchasing={isPurchasing} />
          )}
        </div>
      </main>
      {isLibraryOpen && (
        <LibraryModal 
            items={libraryItems} 
            onClose={() => setIsLibraryOpen(false)}
            onDeleteItem={handleDeleteLibraryItem}
            onPurchase={handlePurchase}
            isPurchasing={isPurchasing}
        />
      )}
      {purchasedFlyer && (
        <PaymentSuccessModal
            flyer={purchasedFlyer}
            onClose={() => setPurchasedFlyer(null)}
        />
      )}
    </div>
  );
};


// --- Payment Success Modal ---
interface PaymentSuccessModalProps {
    flyer: StoredFlyer;
    onClose: () => void;
}

const PaymentSuccessModal: React.FC<PaymentSuccessModalProps> = ({ flyer, onClose }) => {
    
    const handleDownload = (imageUrl: string, filename: string) => {
      const a = document.createElement('a');
      a.href = imageUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
            <div className="bg-neutral-900 w-full max-w-lg rounded-lg border border-neutral-800 flex flex-col overflow-hidden p-8 text-center items-center">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center border-2 border-green-500 mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8 text-green-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                </div>
                <h2 className="text-2xl font-bold text-white">Payment Successful!</h2>
                <p className="text-neutral-200 mt-2 mb-6">Your watermark-free flyers are ready for download.</p>
                
                <div className="w-full max-w-sm mx-auto bg-neutral-800 p-4 rounded-lg mb-6">
                    <img src={flyer.thumbnailImageUrl} alt="Purchased flyer thumbnail" className="w-full rounded" />
                </div>
                
                <div className="w-full flex items-center gap-4">
                  <button onClick={() => handleDownload(flyer.flyerImageUrl, `flyer-${flyer.id}-clean.png`)} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-brand-primary/50 text-sm font-medium rounded-md text-brand-primary bg-brand-primary/10 hover:bg-brand-primary/20 transition-colors">
                    <DownloadIcon className="w-4 h-4" /> Download Flyer
                  </button>
                   <button onClick={() => handleDownload(flyer.thumbnailImageUrl, `thumbnail-${flyer.id}-clean.png`)} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-brand-primary/50 text-sm font-medium rounded-md text-brand-primary bg-brand-primary/10 hover:bg-brand-primary/20 transition-colors">
                    <DownloadIcon className="w-4 h-4" /> Download Thumb
                  </button>
                </div>
                
                <button onClick={onClose} className="mt-6 w-full px-4 py-2 bg-neutral-700 text-white rounded-md hover:bg-neutral-600 transition-colors">
                    Done
                </button>
            </div>
        </div>
    );
};

export default App;