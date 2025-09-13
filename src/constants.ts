// FIX: Changed import path for types from aliased '@' to relative path './types' to resolve module ambiguity.
import type { LayoutPositions, ArtStyle, FontStyle, Venue, Event, Season, Style } from './types';

export const VENUES: { value: Venue; label: string }[] = [
    { value: 'None', label: 'None / Not Applicable' },
    { value: 'Barbershop', label: 'Barbershop' },
    { value: 'Hair Salon', label: 'Hair Salon' },
    { value: 'Nail Salon', label: 'Nail Salon' },
    { value: 'Tattoo Artist', label: 'Tattoo Artist' },
    { value: 'Real Estate', label: 'Real Estate' },
    { value: 'Restaurant', label: 'Restaurant' },
    { value: 'Fitness', label: 'Fitness' },
];

export const EVENTS: { value: Event; label: string }[] = [
    { value: 'None', label: 'None / Not Applicable' },
    { value: 'Grand Opening', label: 'Grand Opening' },
    { value: 'Big Sale', label: 'Big Sale' },
    { value: 'Workshop', label: 'Workshop' },
    { value: 'Birthday Bash', label: 'Birthday Bash' },
    { value: 'Karaoke Night', label: 'Karaoke Night' },
    { value: 'Game Day', label: 'Game Day' },
    { value: 'Live Music', label: 'Live Music' },
    { value: 'Pool Party', label: 'Pool Party' },
];

export const SEASONS: { value: Season; label: string }[] = [
    { value: 'None', label: 'None / Not Applicable' },
    { value: 'Spring', label: 'Spring' },
    { value: 'Summer', label: 'Summer' },
    { value: 'Autumn', label: 'Autumn' },
    { value: 'Winter', label: 'Winter' },
    { value: 'New Years', label: 'New Year\'s' },
    { value: 'Valentines', label: 'Valentine\'s' },
    { value: 'Halloween', label: 'Halloween' },
    { value: 'Holidays', label: 'Holidays' },
];

export const STYLES: { category: string, styles: { value: Style; label: string }[] }[] = [
    {
        category: 'Core Styles',
        styles: [
            { value: 'Auto', label: 'Auto-detect' },
            { value: 'Elegant', label: 'Elegant' },
            { value: 'Modern', label: 'Modern' },
            { value: 'Bold', label: 'Bold' },
        ],
    },
    {
        category: 'Zodiac & Astrology',
        styles: [
            { value: 'Aries', label: 'Aries' },
            { value: 'Taurus', label: 'Taurus' },
            { value: 'Gemini', label: 'Gemini' },
            { value: 'Cancer', label: 'Cancer' },
            { value: 'Leo', label: 'Leo' },
            { value: 'Virgo', label: 'Virgo' },
            { value: 'Libra', label: 'Libra' },
            { value: 'Scorpio', label: 'Scorpio' },
            { value: 'Sagittarius', label: 'Sagittarius' },
            { value: 'Capricorn', label: 'Capricorn' },
            { value: 'Aquarius', label: 'Aquarius' },
            { value: 'Pisces', label: 'Pisces' },
        ]
    }
];


export const ART_STYLES: { value: ArtStyle; label: string; }[] = [
    { value: 'Auto', label: 'Auto-detect' },
    { value: 'Photorealistic', label: 'Photorealistic' },
    { value: 'Cinematic', label: 'Cinematic' },
    { value: 'Minimalist', label: 'Minimalist' },
    { value: 'Vibrant Gradient', label: 'Vibrant Gradient' },
    { value: 'Grunge', label: 'Grunge' },
    { value: 'Art Deco', label: 'Art Deco' },
    { value: 'Vaporwave', label: 'Vaporwave' },
    { value: 'Gouache', label: 'Gouache' },
    { value: 'Holographic', label: 'Holographic' },
    { value: 'Retro Funk', label: 'Retro Funk' },
    { value: 'Street Art', label: 'Street Art' },
];

export const FONT_STYLES: { value: FontStyle; label: string; }[] = [
    { value: 'Auto', label: 'Auto-detect' },
    { value: 'Gold', label: 'Gold' },
    { value: 'Neon', label: 'Neon' },
    { value: 'Chrome', label: 'Chrome' },
    { value: 'Glass', label: 'Glass' },
    { value: 'Holographic', label: 'Holographic' },
    { value: 'Water', label: 'Water' },
    { value: 'Ice', label: 'Ice' },
    { value: 'Graffiti', label: 'Graffiti' },
    { value: 'Retro', label: 'Retro' },
    { value: 'Comic', label: 'Comic' },
    { value: 'Fire', label: 'Fire' },
    { value: 'Metal', label: 'Metal' },
    { value: '3D', label: '3D' },
    { value: 'Tattoo', label: 'Tattoo' },
    { value: 'Glitter', label: 'Glitter' },
];


export const INITIAL_LAYOUT_POSITIONS: LayoutPositions = {
  headline: { top: 15, left: 50 },
  subheading: { top: 35, left: 50 },
  body: { top: 75, left: 50 },
  contactInfo: { top: 90, left: 50 },
};