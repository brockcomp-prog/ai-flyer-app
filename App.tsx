
import React, { useState, useEffect } from 'react';
import type { FlyerInputs, MonetizedFlyerOutput } from './types';
import { generateFlyer } from './services/geminiService';
import Header from './components/Header';
import FlyerForm from './components/FlyerForm';
import FlyerPreview from './components/FlyerPreview';
import Loader from './components/Loader';
import { CheckIcon, DownloadIcon } from './components/Icon';

const PENDING_PURCHASE_KEY = 'ai-flyer-pending-purchase';

// IMPORTANT: Replace this with your actual Stripe Payment Link
const STRIPE_PAYMENT_LINK = 'https://buy.stripe.com/test_7sI5m4eZI1a4gGQcMM';

// Client-side watermarking function
const addWatermark = (imageUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('Could not get canvas context');
        
        ctx.drawImage(img, 0, 0);
        
        // Watermark style
        const watermarkText = 'Created with AI Flyer Generator';
        const padding = Math.max(20, canvas.width * 0.01);
        ctx.font = `bold ${Math.max(16, canvas.width * 0.015)}px Inter, sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        
        ctx.fillText(watermarkText, canvas.width - padding, canvas.height - padding);
        
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject('Failed to load image for watermarking');
      img.src = imageUrl;
    });
};

const App: React.FC = () => {
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flyerOutput, setFlyerOutput] = useState<MonetizedFlyerOutput | null>(null);
  const [lastFlyerInputs, setLastFlyerInputs] = useState<FlyerInputs | null>(null);
  
  // Purchase State
  const [purchaseSuccessUrl, setPurchaseSuccessUrl] = useState<string | null>(null);

  // Check for successful purchase on initial render
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('payment_success')) {
        const cleanUrl = localStorage.getItem(PENDING_PURCHASE_KEY);
        if (cleanUrl) {
            setPurchaseSuccessUrl(cleanUrl);
            localStorage.removeItem(PENDING_PURCHASE_KEY);
            // Clean up URL to prevent modal from showing on refresh
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }
  }, []);

  const handleGenerateFlyer = async (inputs: FlyerInputs) => {
    setLoadingMessage(inputs.redesignRequest ? 'Redesigning your flyer...' : 'Generating your flyer...');
    setError(null);
    setFlyerOutput(null);
    
    const { redesignRequest, ...baseInputs } = inputs;
    setLastFlyerInputs(baseInputs);

    try {
      const result = await generateFlyer(inputs, setLoadingMessage);
      
      onProgress('Adding watermark...');
      const watermarkedImageUrl = await addWatermark(result.flyerImageUrl);

      const output: MonetizedFlyerOutput = {
        cleanFlyerImageUrl: result.flyerImageUrl,
        watermarkedFlyerImageUrl: watermarkedImageUrl,
      };

      setFlyerOutput(output);

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setLoadingMessage(null);
    }
  };
  
  const onProgress = (message: string) => {
    setLoadingMessage(message);
  };

  const handleRedesignFlyer = (prompt: string) => {
    if (!lastFlyerInputs) {
      setError("Cannot redesign. Please generate a flyer first.");
      return;
    }
    const redesignInputs: FlyerInputs = {
      ...lastFlyerInputs,
      redesignRequest: prompt,
    };
    handleGenerateFlyer(redesignInputs);
  };
  
  const handlePurchase = (flyer: MonetizedFlyerOutput) => {
    if (!STRIPE_PAYMENT_LINK || STRIPE_PAYMENT_LINK.includes('YOUR_LINK_HERE')) {
        setError("The payment link is not configured. Please contact the site administrator.");
        return;
    }
    try {
        localStorage.setItem(PENDING_PURCHASE_KEY, flyer.cleanFlyerImageUrl);
        window.location.href = STRIPE_PAYMENT_LINK;
    } catch (e) {
        setError("Could not initiate purchase. Your browser's storage might be full or blocked.");
        console.error("Failed to save pending purchase to localStorage", e);
    }
  };

  const isLoading = !!loadingMessage;

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <FlyerForm onSubmit={handleGenerateFlyer} isLoading={isLoading} />
        <div className="lg:sticky top-8">
          {isLoading && (
            <div className="w-full h-[600px] bg-neutral-900 rounded-lg flex flex-col items-center justify-center animated-background">
               <Loader />
               <p className="mt-4 text-neutral-200">{loadingMessage}</p>
               <p className="text-sm text-neutral-700">This may take a moment.</p>
            </div>
          )}
          {error && (
             <div className="w-full h-[600px] bg-red-900/20 border border-red-700 rounded-lg flex flex-col items-center justify-center p-8">
                <h3 className="text-lg font-bold text-red-400">Action Failed</h3>
                <p className="mt-2 text-center text-red-300">{error}</p>
             </div>
          )}
          {!isLoading && !error && (
             <FlyerPreview 
                flyerOutput={flyerOutput} 
                onRedesign={handleRedesignFlyer}
                onPurchase={handlePurchase}
                isLoading={isLoading}
             />
          )}
        </div>
      </main>
      {purchaseSuccessUrl && (
        <PaymentSuccessModal
            imageUrl={purchaseSuccessUrl}
            onClose={() => setPurchaseSuccessUrl(null)}
        />
      )}
    </div>
  );
};

const PaymentSuccessModal: React.FC<{ imageUrl: string; onClose: () => void; }> = ({ imageUrl, onClose }) => {
    const handleDownload = () => {
        const a = document.createElement('a');
        a.href = imageUrl;
        a.download = 'flyer-no-watermark.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-neutral-900 w-full max-w-md rounded-lg border border-neutral-800 flex flex-col overflow-hidden text-center p-8" onClick={e => e.stopPropagation()}>
                <div className="mx-auto w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center border-2 border-green-500">
                    <CheckIcon className="w-8 h-8 text-green-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mt-6">Payment Successful!</h2>
                <p className="text-neutral-200 mt-2">Your watermark-free flyer is ready to download.</p>
                <div className="my-6 p-2 bg-neutral-800 rounded-md">
                    <img src={imageUrl} alt="Purchased flyer" className="w-full h-auto rounded-sm" />
                </div>
                <button onClick={handleDownload} className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-transparent text-base font-medium rounded-md text-neutral-950 bg-brand-primary hover:bg-brand-secondary transition-colors">
                    <DownloadIcon className="w-5 h-5" /> Download Flyer
                </button>
                 <button onClick={onClose} className="w-full mt-2 px-4 py-2 text-sm font-medium rounded-md text-neutral-200 hover:bg-neutral-800 transition-colors">
                    Close
                </button>
            </div>
        </div>
    );
};


export default App;