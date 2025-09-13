import React, { useState, useEffect } from 'react';
import type { StoredFlyer } from '../types';
import { CloseIcon, DownloadIcon, TrashIcon, CreditCardIcon } from './Icon';

interface LibraryModalProps {
  items: StoredFlyer[];
  onClose: () => void;
  onDeleteItem: (id: string) => void;
  onPurchase: (flyer: StoredFlyer) => void;
}

const LibraryModal: React.FC<LibraryModalProps> = ({ items, onClose, onDeleteItem, onPurchase }) => {
  const [selectedItem, setSelectedItem] = useState<StoredFlyer | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleDownload = (imageUrl: string, filename: string) => {
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevent opening detail view when deleting
    onDeleteItem(id);
    if(selectedItem?.id === id) {
        setSelectedItem(null); // Go back to grid view if deleting the selected item
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="library-heading"
    >
      <div
        className="bg-neutral-900 w-full max-w-4xl h-full max-h-[90vh] rounded-lg border border-neutral-800 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="p-4 border-b border-neutral-800 flex items-center justify-between flex-shrink-0">
          <h2 id="library-heading" className="text-xl font-bold text-white">
            {selectedItem ? 'Flyer Details' : 'My Library'}
          </h2>
          {selectedItem && (
             <button onClick={() => setSelectedItem(null)} className="text-sm font-medium text-neutral-200 hover:text-white">
                &larr; Back to Library
             </button>
          )}
          <button onClick={onClose} className="p-1 rounded-full text-neutral-700 hover:text-white hover:bg-neutral-800" aria-label="Close library">
            <CloseIcon className="w-6 h-6" />
          </button>
        </header>

        <main className="flex-grow overflow-y-auto p-4 md:p-6">
          {selectedItem ? (
            <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-grow">
                    <img src={selectedItem.watermarkedFlyerImageUrl} alt="Selected flyer" className="w-full h-auto rounded-md shadow-lg" />
                </div>
                <div className="md:w-64 flex-shrink-0 space-y-4">
                    <div>
                        <h3 className="font-bold text-white">Generated On</h3>
                        <p className="text-sm text-neutral-200">{new Date(selectedItem.createdAt).toLocaleString()}</p>
                    </div>
                     <div className="space-y-2">
                        <button 
                          onClick={() => onPurchase(selectedItem)} 
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-neutral-950 bg-brand-primary hover:bg-brand-secondary transition-colors"
                        >
                            <CreditCardIcon className="w-5 h-5" /> Purchase & Download
                        </button>
                        <button 
                          onClick={() => handleDownload(selectedItem.watermarkedFlyerImageUrl, `flyer-${selectedItem.id}-watermarked.png`)} 
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-neutral-700 text-sm font-medium rounded-md text-white bg-neutral-800 hover:bg-neutral-700 transition-colors"
                        >
                            <DownloadIcon className="w-4 h-4" /> Download Free
                        </button>
                     </div>
                     <button onClick={(e) => handleDelete(e, selectedItem.id)} className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-red-900/50 text-sm font-medium rounded-md text-red-400 bg-red-900/20 hover:bg-red-900/40 transition-colors">
                        <TrashIcon className="w-4 h-4" /> Delete Flyer
                    </button>
                </div>
            </div>
          ) : items.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="aspect-square bg-neutral-800 rounded-lg overflow-hidden cursor-pointer relative group"
                  onClick={() => setSelectedItem(item)}
                  tabIndex={0}
                  onKeyPress={(e) => e.key === 'Enter' && setSelectedItem(item)}
                  role="button"
                  aria-label={`View flyer generated on ${new Date(item.createdAt).toLocaleDateString()}`}
                >
                  <img src={item.watermarkedFlyerImageUrl} alt="Generated flyer thumbnail" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center" />
                  <button
                    onClick={(e) => handleDelete(e, item.id)}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    aria-label="Delete this flyer"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center h-full flex flex-col items-center justify-center text-neutral-700">
                <p className="text-lg font-medium">Your Library is Empty</p>
                <p className="mt-1 text-sm">Generate a flyer and it will appear here.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default LibraryModal;