import React, { useState, useRef, useCallback, useEffect } from 'react';
// FIX: Changed import path for types from aliased '@' to relative path '../types' to resolve module ambiguity.
import type { FlyerInputs, LayoutPositions, LayoutGuidePosition, ArtStyle, FontStyle, LogoInput, SubjectTransform, ImageInput, Venue, Event, Season, Style, AnalyzedLogoElement } from '../types';
import { INITIAL_LAYOUT_POSITIONS, VENUES, EVENTS, SEASONS, STYLES, ART_STYLES, FONT_STYLES } from '@/constants';
import { DEFAULT_SUGGESTION, findBestSuggestion, type TextSuggestion } from '@/constants/suggestions';
import { UploadIcon, GenerateIcon, MoveIcon, PlusIcon, TrashIcon, StarIcon, SparklesIcon, AdjustmentsIcon, ReplaceIcon } from '@/components/Icon';
import { removeImageBackground, analyzeInspirationImage } from '@/services/geminiService';
import Loader from '@/components/Loader';

type ImageMode = 'none' | 'subject' | 'inspiration';

interface ProcessedSubjectData {
    thumbnailSrc: string;
    previewSrc: string;
    mimeType: string;
    name: string;
    base64: string;
}

interface InspirationData {
    thumbnailSrc: string;
    mimeType: string;
    name: string;
    base64: string;
}

interface MimicLogoAction {
  id: string;
  originalLogo: AnalyzedLogoElement;
  action: 'keep' | 'delete' | 'replace';
  replacementLogo?: {
    base64: string;
    mimeType: string;
    objectUrl: string; // for easier drawing
  };
}

interface OriginalImageForCrop {
    src: string;
    width: number;
    height: number;
    fileType: string;
}

interface CropRect {
    x: number;
    y: number;
    width: number;
    height: number;
}


interface FlyerFormProps {
  onSubmit: (inputs: FlyerInputs) => void;
  isLoading: boolean;
}

const FlyerForm: React.FC<FlyerFormProps> = ({ onSubmit, isLoading }) => {
  // Text content states, initialized with defaults for a good first impression
  const [headline, setHeadline] = useState(DEFAULT_SUGGESTION.headline);
  const [subheading, setSubheading] = useState(DEFAULT_SUGGESTION.subheading);
  const [body, setBody] = useState(DEFAULT_SUGGESTION.body);
  const [contactInfo, setContactInfo] = useState(DEFAULT_SUGGESTION.contactInfo);
  
  // State to track the currently applied suggestion to prevent overwriting user edits
  const [activeSuggestion, setActiveSuggestion] = useState<TextSuggestion>(DEFAULT_SUGGESTION);

  // New style states
  const [venue, setVenue] = useState<Venue>('None');
  const [event, setEvent] = useState<Event>('None');
  const [season, setSeason] = useState<Season>('None');
  const [style, setStyle] = useState<Style>('Auto');
  const [artStyle, setArtStyle] = useState<ArtStyle>('Auto');
  const [fontStyle, setFontStyle] = useState<FontStyle>('Auto');
  const [styleAdjustments, setStyleAdjustments] = useState('');

  const [isCustomizingStyle, setIsCustomizingStyle] = useState(false);
  
  const [imageMode, setImageMode] = useState<ImageMode>('none');
  const [processedSubject, setProcessedSubject] = useState<ProcessedSubjectData | null>(null);
  const [inspirationImage, setInspirationImage] = useState<InspirationData | null>(null);
  const [modifiedInspirationImage, setModifiedInspirationImage] = useState<InspirationData | null>(null);
  const [logos, setLogos] = useState<LogoInput[]>([]);
  const [mimicLogoActions, setMimicLogoActions] = useState<MimicLogoAction[]>([]);

  const [isProcessingSubject, setIsProcessingSubject] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [isAnalyzingInspiration, setIsAnalyzingInspiration] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [originalImageForCrop, setOriginalImageForCrop] = useState<OriginalImageForCrop | null>(null);
  const [crop, setCrop] = useState<CropRect>({ x: 0, y: 0, width: 100, height: 100 });

  const [layoutPositions, setLayoutPositions] = useState<LayoutPositions>(INITIAL_LAYOUT_POSITIONS);
  const [subjectTransform, setSubjectTransform] = useState<SubjectTransform>({ x: 50, y: 50, scale: 100 });

  const previewContainerRef = useRef<HTMLDivElement>(null);
  const draggingGuideRef = useRef<{
    type: 'text' | 'logo',
    key: keyof LayoutPositions | string,
    offsetX: number,
    offsetY: number
  } | null>(null);
  const draggingSubjectRef = useRef<{
    startX: number;
    startY: number;
    startTransformX: number;
    startTransformY: number;
  } | null>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const logoReplaceFileInputRef = useRef<HTMLInputElement>(null);
  const logoToReplaceIdRef = useRef<string | null>(null);
  const inspirationFileInputRef = useRef<HTMLInputElement>(null);

  // Effect to intelligently update text fields when style selections change
  useEffect(() => {
    const newSuggestion = findBestSuggestion(venue, event, season);

    // Only update fields that haven't been manually edited by the user.
    // We check if the current value matches the *previous* suggestion's value.
    setHeadline(prev => (prev === activeSuggestion.headline ? newSuggestion.headline : prev));
    setSubheading(prev => (prev === activeSuggestion.subheading ? newSuggestion.subheading : prev));
    setBody(prev => (prev === activeSuggestion.body ? newSuggestion.body : prev));
    setContactInfo(prev => (prev === activeSuggestion.contactInfo ? newSuggestion.contactInfo : prev));

    // Update the active suggestion for the next render
    setActiveSuggestion(newSuggestion);
  }, [venue, event, season]);

  // Effect to perform client-side compositing for replaced logos
  useEffect(() => {
    const performComposite = async () => {
      if (!inspirationImage || !mimicLogoActions.length) {
        setModifiedInspirationImage(inspirationImage);
        return;
      }

      const replacements = mimicLogoActions.filter(l => l.action === 'replace' && l.replacementLogo);
      if (replacements.length === 0) {
        setModifiedInspirationImage(inspirationImage);
        return;
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const baseImg = new Image();
      
      baseImg.onload = () => {
        canvas.width = baseImg.naturalWidth;
        canvas.height = baseImg.naturalHeight;
        if (!ctx) return;
        
        ctx.drawImage(baseImg, 0, 0);

        const replacementPromises = replacements.map(action => {
          return new Promise<void>(resolve => {
            const repImg = new Image();
            repImg.onload = () => {
              const { position, size } = action.originalLogo;
              const logoWidth = size.width / 100 * canvas.width;
              const logoHeight = size.height / 100 * canvas.height;
              const logoX = (position.left / 100) * canvas.width - logoWidth / 2;
              const logoY = (position.top / 100) * canvas.height - logoHeight / 2;
              ctx.drawImage(repImg, logoX, logoY, logoWidth, logoHeight);
              resolve();
            }
            repImg.src = action.replacementLogo!.objectUrl;
          });
        });

        Promise.all(replacementPromises).then(() => {
          const newDataUrl = canvas.toDataURL(inspirationImage.mimeType);
          setModifiedInspirationImage({
            ...inspirationImage,
            thumbnailSrc: newDataUrl,
            base64: newDataUrl.split(',')[1],
          });
        });
      };
      baseImg.src = inspirationImage.thumbnailSrc;
    };

    performComposite();
  }, [mimicLogoActions, inspirationImage]);

  const handleSubjectFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) {
        setError('File size cannot exceed 4MB.');
        return;
      }
      if (!['image/jpeg', 'image/png'].includes(file.type)) {
          setError('Invalid file type. Please upload a JPG or PNG.');
          return;
      }
      setError(null);
      setProcessedSubject(null);
      event.target.value = '';

      const reader = new FileReader();
      reader.onload = (e) => {
        const imgSrc = e.target!.result as string;
        const img = new Image();
        img.onload = () => {
            setOriginalImageForCrop({
                src: imgSrc,
                width: img.naturalWidth,
                height: img.naturalHeight,
                fileType: file.type
            });
            setCrop({ x: 0, y: 0, width: 100, height: 100 });
        };
        img.src = imgSrc;
      };
      reader.onerror = () => {
        setError('Failed to read the file.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInspirationFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      setError('Inspiration image size cannot exceed 4MB.');
      return;
    }
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setError('Invalid file type. Please upload a JPG or PNG.');
      return;
    }
    
    setError(null);
    setIsAnalyzingInspiration(true);
    setInspirationImage(null); // Clear previous image
    setMimicLogoActions([]);
    event.target.value = '';

    try {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async (e) => {
            try {
                const dataUrl = e.target!.result as string;
                const base64 = dataUrl.split(',')[1];
                const imageData = {
                    thumbnailSrc: dataUrl,
                    base64,
                    mimeType: file.type,
                    name: file.name,
                };
                setInspirationImage(imageData);
                setModifiedInspirationImage(imageData);


                const analysisResult = await analyzeInspirationImage(base64, file.type);
                
                setHeadline(analysisResult.headline.text);
                setSubheading(analysisResult.subheading.text);
                setBody(analysisResult.body.text);
                setContactInfo(analysisResult.contactInfo.text);
                setLayoutPositions({
                    headline: analysisResult.headline.position,
                    subheading: analysisResult.subheading.position,
                    body: analysisResult.body.position,
                    contactInfo: analysisResult.contactInfo.position,
                });
                setMimicLogoActions(analysisResult.logos.map((logo, i) => ({
                    id: `logo-${Date.now()}-${i}`,
                    originalLogo: logo,
                    action: 'keep',
                })));

            } catch (err) {
                 setError(err instanceof Error ? err.message : 'Failed to analyze inspiration image.');
                 setInspirationImage(null); // Clear image on failure
                 setModifiedInspirationImage(null);
            } finally {
                setIsAnalyzingInspiration(false);
            }
        };
        reader.onerror = () => {
          throw new Error('Failed to read the file.');
        };
    } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to process file.');
        setInspirationImage(null); // Clear image on failure
        setModifiedInspirationImage(null);
        setIsAnalyzingInspiration(false);
    }
};

  const handleLogoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (logos.length >= 3) {
        setError('You can upload a maximum of 3 logos.');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        setError('Logo file size cannot exceed 2MB.');
        return;
      }
      if (!['image/jpeg', 'image/png'].includes(file.type)) {
        setError('Invalid file type. Please upload a JPG or PNG for logos.');
        return;
      }
      setError(null);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = (e.target!.result as string).split(',')[1];
        const newLogo: LogoInput = {
          id: `${Date.now()}-${file.name}`,
          base64,
          mimeType: file.type,
          name: file.name,
          position: { top: 15 + logos.length * 10, left: 15 },
        };
        setLogos(prev => [...prev, newLogo]);
      };
      reader.readAsDataURL(file);
      event.target.value = ''; // Reset file input
    }
  };

  const handleLogoReplaceFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const logoId = logoToReplaceIdRef.current;
    if (!file || !logoId) return;

    if (file.size > 2 * 1024 * 1024) {
        setError('Replacement logo file size cannot exceed 2MB.');
        return;
    }
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
        setError('Invalid file type. Please upload a JPG or PNG for logos.');
        return;
    }
    setError(null);

    const reader = new FileReader();
    reader.onload = e => {
        const dataUrl = e.target!.result as string;
        const base64 = dataUrl.split(',')[1];
        setMimicLogoActions(prev => prev.map(action => 
            action.id === logoId 
            ? { 
                ...action, 
                action: 'replace',
                replacementLogo: {
                    base64,
                    mimeType: file.type,
                    objectUrl: dataUrl,
                }
            }
            : action
        ));
    };
    reader.readAsDataURL(file);
    event.target.value = '';
    logoToReplaceIdRef.current = null;
  };
  
  const handleRemoveSubject = () => {
    setProcessedSubject(null);
    setSubjectTransform({ x: 50, y: 50, scale: 100 });
  };
   const handleRemoveInspiration = () => {
    setInspirationImage(null);
    setModifiedInspirationImage(null);
    setMimicLogoActions([]);
    setStyleAdjustments('');
    setHeadline(DEFAULT_SUGGESTION.headline);
    setSubheading(DEFAULT_SUGGESTION.subheading);
    setBody(DEFAULT_SUGGESTION.body);
    setContactInfo(DEFAULT_SUGGESTION.contactInfo);
    setLayoutPositions(INITIAL_LAYOUT_POSITIONS);
    setActiveSuggestion(DEFAULT_SUGGESTION);
  };
  
  const handleRemoveLogo = (id: string) => {
    setLogos(prev => prev.filter(logo => logo.id !== id));
  };


  const handleCropConfirm = async () => {
    if (!originalImageForCrop || !crop) return;

    setIsProcessingSubject(true);
    setProcessingMessage('Cropping image...');
    setError(null);

    const canvas = document.createElement('canvas');
    const img = new Image();
    img.src = originalImageForCrop.src;

    img.onload = async () => {
        const scaleX = img.naturalWidth / 100;
        const scaleY = img.naturalHeight / 100;

        const sourceX = crop.x * scaleX;
        const sourceY = crop.y * scaleY;
        const sourceWidth = crop.width * scaleX;
        const sourceHeight = crop.height * scaleY;

        canvas.width = sourceWidth;
        canvas.height = sourceHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            setError("Could not create canvas context for cropping.");
            setIsProcessingSubject(false);
            return;
        }

        ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, sourceWidth, sourceHeight);
        
        // --- Smart Resizing Logic ---
        setProcessingMessage('Optimizing image for AI...');
        const MAX_DIMENSION = 1024;
        let finalCanvas = canvas;

        if (canvas.width > MAX_DIMENSION || canvas.height > MAX_DIMENSION) {
            const resizeCanvas = document.createElement('canvas');
            const resizeCtx = resizeCanvas.getContext('2d');
            if (!resizeCtx) {
                setError("Could not create canvas context for resizing.");
                setIsProcessingSubject(false);
                return;
            }

            const aspectRatio = canvas.width / canvas.height;
            if (aspectRatio > 1) { // landscape
                resizeCanvas.width = MAX_DIMENSION;
                resizeCanvas.height = MAX_DIMENSION / aspectRatio;
            } else { // portrait or square
                resizeCanvas.height = MAX_DIMENSION;
                resizeCanvas.width = MAX_DIMENSION * aspectRatio;
            }
            
            resizeCtx.drawImage(canvas, 0, 0, resizeCanvas.width, resizeCanvas.height);
            finalCanvas = resizeCanvas;
        }
        
        const imageToSendForProcessing = finalCanvas.toDataURL(originalImageForCrop.fileType);
        const croppedBase64 = imageToSendForProcessing.split(',')[1];
        
        try {
            setProcessingMessage('Removing background (can take up to a minute)...');
            const { base64: processedBase64, mimeType: processedMimeType } = await removeImageBackground(croppedBase64, originalImageForCrop.fileType);
            const dataUrl = `data:${processedMimeType};base64,${processedBase64}`;

            setProcessedSubject({
                thumbnailSrc: dataUrl,
                previewSrc: dataUrl,
                mimeType: processedMimeType,
                name: "processed-subject.png",
                base64: processedBase64,
            });
            setOriginalImageForCrop(null);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to process subject.');
        } finally {
            setIsProcessingSubject(false);
            setProcessingMessage('');
        }
    };
    img.onerror = () => {
        setError("Failed to load image for cropping.");
        setIsProcessingSubject(false);
        setProcessingMessage('');
    }
  };

  const handleCropCancel = () => {
    setOriginalImageForCrop(null);
    setError(null);
  }

  const handleGuideDragStart = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>, type: 'text' | 'logo', key: keyof LayoutPositions | string) => {
      e.preventDefault();
      e.stopPropagation();
      if (!previewContainerRef.current) return;

      const rect = previewContainerRef.current.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const startXPercent = ((clientX - rect.left) / rect.width) * 100;
      const startYPercent = ((clientY - rect.top) / rect.height) * 100;
      
      let currentPosition: LayoutGuidePosition;
      if (type === 'text') {
          currentPosition = layoutPositions[key as keyof LayoutPositions];
      } else {
          const logo = logos.find(l => l.id === key);
          if (!logo) return;
          currentPosition = logo.position;
      }

      const offsetX = startXPercent - currentPosition.left;
      const offsetY = startYPercent - currentPosition.top;

      draggingGuideRef.current = { type, key, offsetX, offsetY };
  };
  
  const handleSubjectDragStart = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      draggingSubjectRef.current = {
          startX: clientX,
          startY: clientY,
          startTransformX: subjectTransform.x,
          startTransformY: subjectTransform.y
      };
  };

  const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
      if (!previewContainerRef.current) return;
      if (!draggingGuideRef.current && !draggingSubjectRef.current) return;
      
      e.preventDefault();
      const rect = previewContainerRef.current.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      if (draggingGuideRef.current) {
        const { type, key, offsetX, offsetY } = draggingGuideRef.current;
        const cursorXPercent = ((clientX - rect.left) / rect.width) * 100;
        const cursorYPercent = ((clientY - rect.top) / rect.height) * 100;
        const newLeft = cursorXPercent - offsetX;
        const newTop = cursorYPercent - offsetY;
        const top = Math.max(0, Math.min(100, newTop));
        const left = Math.max(0, Math.min(100, newLeft));

        if (type === 'text') {
            setLayoutPositions(prev => ({ ...prev, [key as keyof LayoutPositions]: { top, left } }));
        } else {
            setLogos(prev => prev.map(logo => logo.id === key ? { ...logo, position: { top, left } } : logo));
        }
      } else if (draggingSubjectRef.current) {
        const { startX, startY, startTransformX, startTransformY } = draggingSubjectRef.current;
        const dx = ((clientX - startX) / rect.width) * 100;
        const dy = ((clientY - startY) / rect.height) * 100;
        const newX = Math.max(0, Math.min(100, startTransformX + dx));
        const newY = Math.max(0, Math.min(100, startTransformY + dy));
        setSubjectTransform(prev => ({ ...prev, x: newX, y: newY }));
      }
  }, []);

  const handleDragEnd = useCallback(() => {
      draggingGuideRef.current = null;
      draggingSubjectRef.current = null;
  }, []);

  const handleResetToAuto = () => {
    setIsCustomizingStyle(false);
    setVenue('None');
    setEvent('None');
    setSeason('None');
    setStyle('Auto');
    setArtStyle('Auto');
    setFontStyle('Auto');
  };

  useEffect(() => {
      const options = { passive: false } as any;
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDragMove, options);
      window.addEventListener('touchend', handleDragEnd);

      return () => {
          window.removeEventListener('mousemove', handleDragMove);
          window.removeEventListener('mouseup', handleDragEnd);
          window.removeEventListener('touchmove', handleDragMove, options);
          window.removeEventListener('touchend', handleDragEnd);
      };
  }, [handleDragMove, handleDragEnd]);

  const handleSubmit = (formEvent: React.FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    if (!headline.trim()) {
        setError('Please provide a headline for your flyer.');
        return;
    }

    let imageInput: ImageInput = null;
    if (imageMode === 'subject' && processedSubject) {
        imageInput = {
            type: 'subject',
            base64: processedSubject.base64,
            mimeType: processedSubject.mimeType,
            transform: subjectTransform,
            logos: logos,
        };
    } else if (imageMode === 'inspiration' && modifiedInspirationImage) {
        imageInput = {
            type: 'inspiration',
            base64: modifiedInspirationImage.base64,
            mimeType: modifiedInspirationImage.mimeType,
        };
    }
    
    const logosToDelete = mimicLogoActions
      .filter(l => l.action === 'delete' || l.action === 'replace')
      .map(l => l.originalLogo);

    onSubmit({
      imageInput,
      headline,
      subheading,
      body,
      contactInfo,
      venue,
      event,
      season,
      style,
      artStyle,
      fontStyle,
      layoutPositions,
      logosToDelete,
      styleAdjustments,
    });
  };

  const layoutGuideData = [
    { id: 'headline' as const, text: 'Headline' },
    { id: 'subheading' as const, text: 'Subheading' },
    { id: 'body' as const, text: 'Body Text' },
    { id: 'contactInfo' as const, text: 'Contact Info' },
  ];
  
  const previewBgClass = (imageMode === 'inspiration' && modifiedInspirationImage) ? 'bg-transparent' : 'bg-neutral-800';

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6 bg-neutral-900 p-6 rounded-lg border border-neutral-800">
        
        {originalImageForCrop && (
            <ImageCropper
                imageSrc={originalImageForCrop.src}
                crop={crop}
                setCrop={setCrop}
                onConfirm={handleCropConfirm}
                onCancel={handleCropCancel}
                isProcessing={isProcessingSubject}
                processingMessage={processingMessage}
            />
        )}

        {!originalImageForCrop && (
             <div>
                <label className="block text-sm font-medium text-neutral-200 mb-2">Image Options</label>
                <div className="flex gap-2 rounded-lg bg-neutral-800 p-1">
                    {(['none', 'subject', 'inspiration'] as ImageMode[]).map(mode => {
                        const modeLabels: Record<ImageMode, string> = {
                            none: 'No Image',
                            subject: 'Subject',
                            inspiration: 'Mimic Style'
                        };
                        return (
                            <button
                                key={mode}
                                type="button"
                                onClick={() => setImageMode(mode)}
                                className={`flex-1 text-sm font-medium py-2 rounded-md transition-colors ${imageMode === mode ? 'bg-neutral-950 text-white' : 'text-neutral-200 hover:bg-neutral-700'}`}
                            >
                                {modeLabels[mode]}
                            </button>
                        );
                    })}
                </div>
                
                {imageMode === 'subject' && (
                    <div className="mt-4">
                        <div className="mt-1 flex flex-col items-center justify-center px-6 pt-5 pb-6 border-2 border-neutral-700 border-dashed rounded-md min-h-[190px]">
                            {isProcessingSubject ? (
                                <div className="space-y-1 text-center py-4">
                                    <Loader />
                                    <p className="text-sm text-neutral-200 mt-2">{processingMessage || 'Processing image...'}</p>
                                    <p className="text-xs text-neutral-700">This may take a moment.</p>
                                </div>
                            ) : processedSubject ? (
                                <div className="text-center">
                                    <div className="mx-auto mb-4 h-24 w-24 rounded-md overflow-hidden p-1 bg-neutral-900">
                                        <img src={processedSubject.thumbnailSrc} alt="Processed subject preview" className="h-full w-full object-contain" />
                                    </div>
                                    <p className="text-sm text-neutral-200 truncate max-w-xs">{processedSubject.name}</p>
                                    <button type="button" onClick={handleRemoveSubject} className="mt-2 text-xs font-medium text-red-400 hover:text-red-300 transition-colors">
                                        Change Image
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-1 text-center">
                                    <UploadIcon className="mx-auto h-12 w-12 text-neutral-700"/>
                                    <div className="flex text-sm text-neutral-200">
                                        <label htmlFor="subject-file-upload" className="relative cursor-pointer bg-neutral-900 rounded-md font-medium text-brand-primary hover:text-brand-secondary focus-within:outline-none">
                                            <span>Upload a subject</span>
                                            <input id="subject-file-upload" name="file-upload" type="file" className="sr-only" onChange={handleSubjectFileChange} accept="image/png, image/jpeg" disabled={isProcessingSubject}/>
                                        </label>
                                    </div>
                                    <p className="text-xs text-neutral-700">PNG, JPG up to 4MB</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                
                {imageMode === 'inspiration' && (
                     <div className="mt-4">
                        <div className="mt-1 flex flex-col items-center justify-center px-6 pt-5 pb-6 border-2 border-neutral-700 border-dashed rounded-md min-h-[190px]">
                            {isAnalyzingInspiration ? (
                                <div className="space-y-1 text-center py-4">
                                    <Loader />
                                    <p className="text-sm text-neutral-200 mt-2">Analyzing image...</p>
                                    <p className="text-xs text-neutral-700">Extracting text, logos, and layout.</p>
                                </div>
                            ) : inspirationImage ? (
                                <div className="text-center">
                                    <div className="mx-auto mb-4 h-24 w-24 rounded-md overflow-hidden p-1 bg-neutral-900">
                                        <img src={inspirationImage.thumbnailSrc} alt="Mimic style preview" className="h-full w-full object-cover" />
                                    </div>
                                    <p className="text-sm text-neutral-200 truncate max-w-xs">{inspirationImage.name}</p>
                                    <button type="button" onClick={handleRemoveInspiration} className="mt-2 text-xs font-medium text-red-400 hover:text-red-300 transition-colors">
                                        Change Image
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-1 text-center">
                                    <StarIcon className="mx-auto h-12 w-12 text-neutral-700"/>
                                    <div className="flex text-sm text-neutral-200">
                                        <label htmlFor="inspiration-file-upload" className="relative cursor-pointer bg-neutral-900 rounded-md font-medium text-brand-primary hover:text-brand-secondary focus-within:outline-none">
                                            <span>Upload to mimic style</span>
                                            <input id="inspiration-file-upload" type="file" className="sr-only" onChange={handleInspirationFileChange} accept="image/png, image/jpeg" disabled={isAnalyzingInspiration} />
                                        </label>
                                    </div>
                                    <p className="text-xs text-neutral-700">PNG, JPG up to 4MB</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        )}

        {imageMode === 'subject' && processedSubject && !originalImageForCrop && (
          <div>
            <label className="block text-sm font-medium text-neutral-200 mb-2">Logos (Optional)</label>
            <div className="space-y-3">
              {logos.map(logo => (
                  <div key={logo.id} className="flex items-center gap-3 bg-neutral-800 p-2 rounded-md">
                      <img src={`data:${logo.mimeType};base64,${logo.base64}`} alt={logo.name} className="w-10 h-10 object-contain rounded bg-neutral-900" />
                      <p className="flex-grow text-sm text-neutral-200 truncate">{logo.name}</p>
                      <button type="button" onClick={() => handleRemoveLogo(logo.id)} className="text-neutral-700 hover:text-red-400 p-1 rounded-full transition-colors">
                          <TrashIcon className="w-5 h-5" />
                      </button>
                  </div>
              ))}
              {logos.length < 3 && (
                <button
                  type="button"
                  onClick={() => logoFileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-dashed border-neutral-700 text-sm font-medium rounded-md text-neutral-200 hover:bg-neutral-800 transition-colors"
                >
                  <PlusIcon className="w-4 h-4" />
                  Add Logo ({logos.length}/3)
                </button>
              )}
              <input type="file" ref={logoFileInputRef} className="sr-only" onChange={handleLogoFileChange} accept="image/png, image/jpeg" />
            </div>
          </div>
        )}


        {!originalImageForCrop && (
          <>
            <div>
                <label className="block text-sm font-medium text-neutral-200 mb-2">Layout Preview</label>
                <div
                    ref={previewContainerRef}
                    className={`relative w-full aspect-[1080/1350] rounded-md overflow-hidden border border-neutral-700 ${previewBgClass}`}
                >
                    {imageMode === 'inspiration' && modifiedInspirationImage && (
                        <img
                            src={modifiedInspirationImage.thumbnailSrc}
                            alt="Inspiration layout preview"
                            className="absolute inset-0 w-full h-full object-contain z-0"
                        />
                    )}
                     {imageMode === 'subject' && processedSubject && (
                        <div
                            className="absolute w-full h-full cursor-move z-10"
                            style={{
                                top: `${subjectTransform.y}%`,
                                left: `${subjectTransform.x}%`,
                                transform: `translate(-50%, -50%) scale(${subjectTransform.scale / 100})`,
                            }}
                            onMouseDown={handleSubjectDragStart}
                            onTouchStart={handleSubjectDragStart}
                        >
                            <img src={processedSubject.previewSrc} alt="Layout subject preview" className="w-full h-full object-contain" />
                        </div>
                     )}
                    
                    {layoutGuideData.map(guide => (
                        <LayoutGuide
                            key={guide.id}
                            text={guide.text}
                            position={layoutPositions[guide.id]}
                            onMouseDown={(e) => handleGuideDragStart(e, 'text', guide.id)}
                            onTouchStart={(e) => handleGuideDragStart(e, 'text', guide.id)}
                        />
                    ))}

                    {imageMode === 'subject' && logos.map((logo, index) => (
                      <React.Fragment key={logo.id}>
                          <img 
                            src={`data:${logo.mimeType};base64,${logo.base64}`} 
                            alt={`Logo ${index + 1}`} 
                            className="absolute w-1/6 h-auto object-contain z-10 pointer-events-none"
                            style={{
                              top: `${logo.position.top}%`,
                              left: `${logo.position.left}%`,
                              transform: 'translate(-50%, -50%)'
                            }}
                          />
                          <LayoutGuide
                              text={`Logo ${index + 1}`}
                              position={logo.position}
                              onMouseDown={(e) => handleGuideDragStart(e, 'logo', logo.id)}
                              onTouchStart={(e) => handleGuideDragStart(e, 'logo', logo.id)}
                          />
                      </React.Fragment>
                    ))}
                    <input type="file" ref={logoReplaceFileInputRef} className="sr-only" onChange={handleLogoReplaceFileChange} accept="image/png, image/jpeg" />
                     {imageMode === 'inspiration' && mimicLogoActions.map((logoAction, index) => (
                        <LogoOverlay
                            key={logoAction.id}
                            logoAction={logoAction}
                            onDelete={() => {
                                setMimicLogoActions(prev => prev.map(action => 
                                    action.id === logoAction.id 
                                    ? { ...action, action: action.action === 'delete' ? 'keep' : 'delete' }
                                    : action
                                ));
                            }}
                            onReplace={() => {
                                logoToReplaceIdRef.current = logoAction.id;
                                logoReplaceFileInputRef.current?.click();
                            }}
                        />
                    ))}
                </div>
                {imageMode === 'subject' && processedSubject && (
                    <div className="pt-4">
                        <label htmlFor="subject-scale" className="block text-sm font-medium text-neutral-200 mb-1">Subject Scale</label>
                        <input
                            id="subject-scale"
                            type="range"
                            min="20"
                            max="200"
                            value={subjectTransform.scale}
                            onChange={(e) => setSubjectTransform(prev => ({ ...prev, scale: Number(e.target.value) }))}
                            className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-brand-primary"
                        />
                    </div>
                )}
            </div>
            
            {imageMode === 'inspiration' && inspirationImage && (
                <TextArea
                    label="Style Adjustments (Optional)"
                    value={styleAdjustments}
                    onChange={e => setStyleAdjustments(e.target.value)}
                    placeholder="e.g., Change the color scheme to blue and gold. Make it more futuristic. Use a graffiti font for the headline."
                />
            )}
            
            <div>
                <label className="block text-sm font-medium text-neutral-200 mb-2">Creative Style</label>
                <div className="bg-neutral-800 p-4 rounded-lg space-y-4">
                    {!isCustomizingStyle ? (
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                        <SparklesIcon className="w-6 h-6 text-brand-primary" />
                        <div>
                            <p className="font-medium text-white">Auto-Magic Style</p>
                            <p className="text-sm text-neutral-200">AI will generate a unique style based on your headline.</p>
                        </div>
                        </div>
                        <button
                        type="button"
                        onClick={() => setIsCustomizingStyle(true)}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md text-neutral-200 bg-neutral-700 hover:bg-neutral-600 transition-colors"
                        >
                        <AdjustmentsIcon className="w-4 h-4" />
                        Customize
                        </button>
                    </div>
                    ) : (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-3">
                                <AdjustmentsIcon className="w-6 h-6 text-brand-primary" />
                                <div>
                                    <p className="font-medium text-white">Custom Style</p>
                                    <p className="text-sm text-neutral-200">Fine-tune the look and feel of your flyer.</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleResetToAuto}
                                className="px-3 py-2 text-sm font-medium rounded-md text-neutral-200 hover:bg-neutral-700 transition-colors"
                            >
                                Reset to Auto
                            </button>
                        </div>
                        <div className="space-y-4 pt-4 border-t border-neutral-700/50">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Select label="Venue / Business" value={venue} onChange={e => setVenue(e.target.value as Venue)}>
                                    {VENUES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                                </Select>
                                <Select label="Event / Occasion" value={event} onChange={e => setEvent(e.target.value as Event)}>
                                    {EVENTS.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                                </Select>
                                <Select label="Season / Holiday" value={season} onChange={e => setSeason(e.target.value as Season)}>
                                    {SEASONS.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                                </Select>
                                <Select label="Primary Style" value={style} onChange={e => setStyle(e.target.value as Style)}>
                                    {STYLES.map(group => (
                                        <optgroup key={group.category} label={group.category}>
                                            {group.styles.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                        </optgroup>
                                    ))}
                                </Select>
                                <Select label="Art Style" value={artStyle} onChange={e => setArtStyle(e.target.value as ArtStyle)}>
                                    {ART_STYLES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                </Select>
                                <Select label="Font Style (Headline)" value={fontStyle} onChange={e => setFontStyle(e.target.value as FontStyle)}>
                                    {FONT_STYLES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                </Select>
                            </div>
                        </div>
                    </div>
                    )}
                </div>
            </div>

            <Input label="Headline" value={headline} onChange={e => setHeadline(e.target.value)} required placeholder={activeSuggestion.headline} />
            <Input label="Subheading (Optional)" value={subheading} onChange={e => setSubheading(e.target.value)} placeholder={activeSuggestion.subheading} />
            <TextArea label="Body (Optional)" value={body} onChange={e => setBody(e.target.value)} placeholder={activeSuggestion.body} />
            <TextArea label="Contact Info (Optional)" value={contactInfo} onChange={e => setContactInfo(e.target.value)} placeholder={activeSuggestion.contactInfo} />
        </>
        )}
        
        {error && <p className="text-sm text-red-400">{error}</p>}

        {!originalImageForCrop && (
            <button type="submit" disabled={isLoading} className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-neutral-950 bg-brand-primary hover:bg-brand-secondary disabled:bg-neutral-700 disabled:cursor-not-allowed transition-colors">
                {isLoading ? 'Generating...' : 'Generate Flyer'}
                <GenerateIcon className="w-5 h-5"/>
            </button>
        )}
      </form>
    </>
  );
};

const ImageCropper: React.FC<{
    imageSrc: string;
    crop: CropRect;
    setCrop: React.Dispatch<React.SetStateAction<CropRect>>;
    onConfirm: () => void;
    onCancel: () => void;
    isProcessing: boolean;
    processingMessage: string;
}> = ({ imageSrc, crop, setCrop, onConfirm, onCancel, isProcessing, processingMessage }) => {
    const imageRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const dragActionRef = useRef<{ type: 'move' | 'resize'; handle: string; startX: number; startY: number; startCrop: CropRect } | null>(null);

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, handle: string) => {
        e.preventDefault();
        e.stopPropagation();
        dragActionRef.current = {
            type: handle === 'move' ? 'move' : 'resize',
            handle,
            startX: e.clientX,
            startY: e.clientY,
            startCrop: crop,
        };
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!dragActionRef.current || !imageRef.current || !containerRef.current) return;
        const { type, handle, startX, startY, startCrop } = dragActionRef.current;
        const rect = containerRef.current.getBoundingClientRect();

        const dx = ((e.clientX - startX) / rect.width) * 100;
        const dy = ((e.clientY - startY) / rect.height) * 100;

        setCrop(currentCrop => {
            let { x, y, width, height } = startCrop;

            if (type === 'move') {
                x += dx;
                y += dy;
            } else { // resize
                if (handle.includes('l')) {
                    x += dx;
                    width -= dx;
                }
                if (handle.includes('r')) {
                    width += dx;
                }
                if (handle.includes('t')) {
                    y += dy;
                    height -= dy;
                }
                if (handle.includes('b')) {
                    height += dy;
                }
            }

            width = Math.max(10, width);
            height = Math.max(10, height);
            x = Math.max(0, Math.min(x, 100 - width));
            y = Math.max(0, Math.min(y, 100 - height));
            
            return { x, y, width, height };
        });
    }, [setCrop]);

    const handleMouseUp = useCallback(() => {
        dragActionRef.current = null;
    }, []);

    useEffect(() => {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleMouseMove, handleMouseUp]);

    return (
        <div>
            <label className="block text-sm font-medium text-neutral-200 mb-2">Crop Subject</label>
            <div ref={containerRef} className="relative w-full select-none" style={{ aspectRatio: '1 / 1' }}>
                <img ref={imageRef} src={imageSrc} alt="Subject to crop" className="w-full h-full object-contain" />
                <div
                    className="absolute border-2 border-dashed border-brand-primary bg-black/30 cursor-move"
                    style={{
                        top: `${crop.y}%`,
                        left: `${crop.x}%`,
                        width: `${crop.width}%`,
                        height: `${crop.height}%`,
                    }}
                    onMouseDown={(e) => handleMouseDown(e, 'move')}
                >
                    {['tl', 'tr', 'bl', 'br', 't', 'b', 'l', 'r'].map(handle => {
                        const cursorMap: { [key: string]: string } = { tl: 'nwse', tr: 'nesw', bl: 'nesw', br: 'nwse', t: 'ns', b: 'ns', l: 'ew', r: 'ew' };
                        return (
                            <div
                                key={handle}
                                onMouseDown={(e) => handleMouseDown(e, handle)}
                                className="absolute bg-brand-primary w-3 h-3 -m-1.5"
                                style={{
                                    cursor: `${cursorMap[handle]}-resize`,
                                    top: handle.includes('t') ? '0%' : handle.includes('b') ? '100%' : '50%',
                                    left: handle.includes('l') ? '0%' : handle.includes('r') ? '100%' : '50%',
                                    transform: `translate(${handle.includes('l') ? '-50' : handle.includes('r') ? '50' : '0'}%, ${handle.includes('t') ? '-50' : handle.includes('b') ? '50' : '0'}%)`,
                                }}
                            />
                        );
                    })}
                </div>
            </div>
            <div className="flex gap-2 mt-4">
                <button type="button" onClick={onConfirm} disabled={isProcessing} className="flex-1 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-neutral-950 bg-brand-primary hover:bg-brand-secondary disabled:bg-neutral-700">
                    {isProcessing ? <div className="flex items-center justify-center gap-2"><Loader className="w-4 h-4 text-neutral-950" /> {processingMessage || "Processing..."}</div> : "Crop & Continue"}
                </button>
                <button type="button" onClick={onCancel} disabled={isProcessing} className="px-4 py-2 border border-neutral-700 text-sm font-medium rounded-md text-white bg-neutral-800 hover:bg-neutral-700">
                    Cancel
                </button>
            </div>
        </div>
    );
};

const LayoutGuide: React.FC<{
    text: string;
    position: LayoutGuidePosition;
    onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
    onTouchStart: (e: React.TouchEvent<HTMLDivElement>) => void;
}> = ({ text, position, onMouseDown, onTouchStart }) => (
    <div
        className="absolute p-1 cursor-move group z-20 select-none"
        style={{
            top: `${position.top}%`,
            left: `${position.left}%`,
            transform: 'translate(-50%, -50%)',
        }}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
    >
        <div className="flex items-center gap-2 border-2 border-dashed border-white/40 rounded-full px-3 py-1 bg-black/40 backdrop-blur-sm group-hover:border-white/80 transition-colors">
            <MoveIcon className="w-4 h-4 text-white/60 transition-colors group-hover:text-white" />
            <span className="font-sans font-medium text-sm text-white/80 whitespace-nowrap">{text}</span>
        </div>
    </div>
);

const LogoOverlay: React.FC<{
    logoAction: MimicLogoAction;
    onDelete: () => void;
    onReplace: () => void;
}> = ({ logoAction, onDelete, onReplace }) => {
    const { position, size } = logoAction.originalLogo;
    const baseClasses = "absolute z-20 border-2 border-dashed flex items-center justify-center transition-all duration-200";
    const stateClasses = logoAction.action === 'delete' ? 'border-red-500 bg-red-500/30' : 'border-brand-primary bg-brand-primary/20';

    return (
        <div
            className={`${baseClasses} ${stateClasses} group`}
            style={{
                top: `${position.top}%`,
                left: `${position.left}%`,
                width: `${size.width}%`,
                height: `${size.height}%`,
                transform: 'translate(-50%, -50%)',
            }}
        >
           <div className="absolute top-0 right-0 -mt-2 -mr-2 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button type="button" onClick={onReplace} className="p-1.5 rounded-full bg-neutral-800 text-white hover:bg-neutral-700 transition-colors shadow-lg" title="Replace Logo">
                    <ReplaceIcon className="w-4 h-4" />
                </button>
                <button type="button" onClick={onDelete} className={`p-1.5 rounded-full text-white hover:bg-neutral-700 transition-colors shadow-lg ${logoAction.action === 'delete' ? 'bg-red-500' : 'bg-neutral-800'}`} title="Delete Logo">
                    <TrashIcon className="w-4 h-4" />
                </button>
           </div>
        </div>
    );
};


const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, ...props }) => (
    <div>
        <label htmlFor={props.id || props.name} className="block text-sm font-medium text-neutral-200">{label}</label>
        <input {...props} className="mt-1 block w-full bg-neutral-800 border border-neutral-700 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm" />
    </div>
);

const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }> = ({ label, ...props }) => (
    <div>
        <label htmlFor={props.id || props.name} className="block text-sm font-medium text-neutral-200">{label}</label>
        <textarea {...props} rows={3} className="mt-1 block w-full bg-neutral-800 border border-neutral-700 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm" />
    </div>
);

const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: React.ReactNode }> = ({ label, children, ...props }) => (
    <div>
        <label htmlFor={props.id || props.name} className="block text-sm font-medium text-neutral-200 mb-1">{label}</label>
        <select {...props} className="block w-full bg-neutral-700 border border-neutral-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm">
            {children}
        </select>
    </div>
);


export default FlyerForm;