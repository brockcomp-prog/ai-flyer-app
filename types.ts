
export type Venue =
  'None'
  // Professions
  | 'Barbershop' | 'Hair Salon' | 'Nail Salon' | 'Tattoo Artist' | 'Real Estate' | 'Restaurant' | 'Fitness';

export type Event =
  'None'
  // Business
  | 'Grand Opening' | 'Big Sale' | 'Workshop'
  // Events
  | 'Birthday Bash' | 'Karaoke Night' | 'Game Day' | 'Live Music' | 'Pool Party';
  
export type Season =
  'None'
  // Seasonal
  | 'Spring' | 'Summer' | 'Autumn' | 'Winter' | 'New Years' | 'Valentines' | 'Halloween' | 'Holidays';

export type Style =
  // Styles
  | 'Auto' | 'Elegant' | 'Modern' | 'Bold'
  // Zodiac
  | 'Aries' | 'Taurus' | 'Gemini' | 'Cancer' | 'Leo' | 'Virgo' | 'Libra' | 'Scorpio' | 'Sagittarius' | 'Capricorn' | 'Aquarius' | 'Pisces';

export type ArtStyle = "Auto" | "Photorealistic" | "Cinematic" | "Minimalist" | "Retro Funk" | "Vibrant Gradient" | "Grunge" | "Art Deco" | "Vaporwave" | "Gouache" | "Holographic" | "Street Art";
export type FontStyle = "Auto" | "Gold" | "Neon" | "Graffiti" | "Retro" | "Comic" | "Fire" | "Metal" | "3D" | "Tattoo" | "Glitter" | "Chrome" | "Glass" | "Holographic" | "Water" | "Ice";

export type LayoutGuidePosition = {
  top: number;
  left: number;
};
export type LayoutPositions = {
  headline: LayoutGuidePosition;
  subheading: LayoutGuidePosition;
  body: LayoutGuidePosition;
  contactInfo: LayoutGuidePosition;
};

export interface LogoInput {
  id: string;
  base64: string;
  mimeType: string;
  name: string;
  position: LayoutGuidePosition;
}

export interface SubjectTransform {
  x: number; // center x percentage
  y: number; // center y percentage
  scale: number; // percentage
}

export type ImageInput = {
  type: 'subject';
  base64: string;
  mimeType: string;
  transform: SubjectTransform;
  logos: LogoInput[];
} | {
  type: 'inspiration';
  base64: string;
  mimeType: string;
} | null;

export interface FlyerInputs {
  imageInput: ImageInput;
  headline: string;
  subheading: string;
  body: string;
  contactInfo: string;
  venue: Venue;
  event: Event;
  season: Season;
  style: Style;
  artStyle: ArtStyle;
  fontStyle: FontStyle;
  layoutPositions: LayoutPositions;
  logosToDelete?: AnalyzedLogoElement[];
  styleAdjustments?: string;
}

export interface CleanFlyerOutput {
  flyerImageUrl: string;
  thumbnailImageUrl: string;
}

export interface FlyerOutput extends CleanFlyerOutput {
  watermarkedFlyerImageUrl: string;
  watermarkedThumbnailImageUrl: string;
}


export interface StoredFlyer extends FlyerOutput {
  id: string;
  createdAt: string;
}

export interface AnalyzedTextElement {
  text: string;
  position: LayoutGuidePosition;
}

export interface AnalyzedLogoElement {
  position: LayoutGuidePosition;
  size: {
    width: number; // as percentage of image width
    height: number; // as percentage of image height
  };
}

export interface AnalyzedImageData {
  headline: AnalyzedTextElement;
  subheading: AnalyzedTextElement;
  body: AnalyzedTextElement;
  contactInfo: AnalyzedTextElement;
  logos: AnalyzedLogoElement[];
}
