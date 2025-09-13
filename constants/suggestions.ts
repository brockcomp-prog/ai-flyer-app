import type { Venue, Occasion, Club, Season } from '../types';

export interface TextSuggestion {
  headline: string;
  subheading: string;
  body: string;
  contactInfo: string;
}

const SUGGESTIONS: {
  venue?: Venue;
  occasion?: Occasion;
  club?: Club;
  season?: Season;
  suggestion: TextSuggestion;
}[] = [
  // Specific Combos
  {
    venue: 'Restaurant',
    occasion: 'Grand Opening',
    suggestion: {
      headline: 'Grand Opening Feast',
      subheading: 'Taste a New Tradition',
      body: 'Join us this Friday at 7 PM\nFirst 50 guests get a free appetizer!',
      contactInfo: 'The Savory Spoon • 123 Flavor Ave\nReserve at (555) 123-4567',
    },
  },
  {
    venue: 'Hair Salon',
    occasion: 'Big Sale',
    suggestion: {
      headline: 'Annual Style Sale',
      subheading: '50% Off All Color Services',
      body: 'Book now through the end of the month!\nIncludes cut, color, and style.',
      contactInfo: 'The Modern Mane • 456 Beauty Blvd\nBook online: modernmane.com',
    },
  },
  {
    venue: 'Fitness',
    season: 'New Years',
    suggestion: {
        headline: 'New Year, New You',
        subheading: 'Your Fitness Journey Starts Now',
        body: 'Sign up in January and get your first month FREE!\nPersonal training packages 20% off.',
        contactInfo: 'Peak Performance Gym • 789 Muscle St.\npeakperformance.com',
    }
  },
  {
    occasion: 'Live Music',
    season: 'Summer',
    suggestion: {
        headline: 'Summer Concert Series',
        subheading: 'Live Bands Under the Stars',
        body: 'Every Saturday in July • 8 PM Start\nFood trucks and local brews on site.',
        contactInfo: 'The Open Air Stage • 101 Parkside Dr.\n@OpenAirStage',
    }
  },
   {
    club: 'Nightclub',
    suggestion: {
        headline: 'Massive Saturdays',
        subheading: 'Resident DJs All Night Long',
        body: 'Doors open at 10 PM | 21+\nVIP Bottle Service Available',
        contactInfo: 'Club ELEVATE • 101 Beats Ave\nFor tables text (555)-123-4567',
    }
  },
  {
    club: 'DJ Set',
    suggestion: {
        headline: 'Special Guest DJ',
        subheading: 'An Exclusive Night of House Music',
        body: 'One night only! This Friday, 11 PM\nLimited tickets available at the door',
        contactInfo: 'The Underground • 456 Bass Dr.\n@TheUnderground',
    }
  },
  {
    club: 'Lounge',
    suggestion: {
        headline: 'Elevated Evenings',
        subheading: 'Craft Cocktails & Good Vibes',
        body: 'Live Lo-fi beats from 8 PM\nHappy Hour until 9 PM',
        contactInfo: 'The Velvet Room • 789 Chill St.\n@VelvetRoomLounge',
    }
  },

  // General Venue
  {
    venue: 'Restaurant',
    suggestion: {
      headline: 'A Taste of Excellence',
      subheading: 'Now Open for Dinner',
      body: 'Open daily from 5 PM to 11 PM\nWeekend brunch available.',
      contactInfo: 'The Delicious Place • 123 Foodie Lane\nReservations recommended.',
    },
  },
  {
    venue: 'Hair Salon',
    suggestion: {
        headline: 'Look Your Best',
        subheading: 'Expert Cuts, Color & Styling',
        body: 'Walk-ins welcome!\nOpen Tuesday-Saturday 10am - 7pm',
        contactInfo: 'Chic Cuts • 456 Style St.\nCall for appointment: (555) 987-6543'
    }
  },
  {
    venue: 'Fitness',
    suggestion: {
        headline: 'Unleash Your Potential',
        subheading: 'State-of-the-Art Fitness Center',
        body: '24/7 Access • Group Classes Included\nFree trial pass available on our website.',
        contactInfo: 'Flex Fitness • 789 Power Ave\nflexfitness.com'
    }
  },

  // General Occasion
  {
    occasion: 'Grand Opening',
    suggestion: {
      headline: 'You\'re Invited!',
      subheading: 'Celebrate Our Grand Opening',
      body: 'Join us for music, drinks, and giveaways!\nThis Saturday at 6 PM',
      contactInfo: 'Our New Spot • 123 Main St.\n@OurNewSpot',
    },
  },
  {
    occasion: 'Live Music',
    suggestion: {
      headline: 'Live Music Night',
      subheading: 'Featuring The Groovy Tones',
      body: 'Every Friday at 9 PM\nNo cover charge.',
      contactInfo: 'The Music Spot • 456 Melody Ave\n@TheMusicSpot',
    },
  },
  {
    occasion: 'Big Sale',
    suggestion: {
      headline: 'Massive Sale Event',
      subheading: 'Everything Must Go!',
      body: 'Up to 70% off storewide.\nThis weekend only!',
      contactInfo: 'The Sale Rack • 789 Discount Dr.\n@TheSaleRack',
    },
  },

  // General Season
  {
    season: 'Halloween',
    suggestion: {
      headline: 'Spooky Halloween Bash',
      subheading: 'Costume Contest & Drink Specials',
      body: 'Saturday, October 31st • 8 PM \'til late\n$500 prize for best costume!',
      contactInfo: 'The Haunted Lounge • 666 Fright St.\n@HauntedLounge',
    },
  },
  {
    season: 'Holidays',
    suggestion: {
        headline: 'Holiday Spectacular',
        subheading: 'A Festive Celebration',
        body: 'Join us for seasonal treats and joyful music!\nDecember 20th • 7 PM',
        contactInfo: 'The Winter Hall • 1225 Cheer Ct.\n@WinterWonder',
    }
  },
  {
    season: 'Summer',
    suggestion: {
        headline: 'Summer Kick-off Party',
        subheading: 'Sun, Fun, and Good Vibes',
        body: 'Music, food, and games all day long!\nJune 21st • Noon til Sunset',
        contactInfo: 'The Beach Club • 1 Seaside Way\n@TheBC',
    }
  }
];

export const DEFAULT_SUGGESTION: TextSuggestion = {
    headline: 'Grand Opening Party',
    subheading: 'Featuring DJ Spinmaster',
    body: 'Saturday, Oct 26 • 9PM–2AM\nFree Entry Before 10PM',
    contactInfo: 'Your Venue • 1234 Main St\n@YourHandle',
};

// Helper function to find the best suggestion based on selected styles
export const findBestSuggestion = (venue: Venue, occasion: Occasion, club: Club, season: Season): TextSuggestion => {
    const v = venue === 'None' ? undefined : venue;
    const o = occasion === 'None' ? undefined : occasion;
    const c = club === 'None' ? undefined : club;
    const s = season === 'None' ? undefined : season;
    
    // Prioritize more specific matches, with club being a strong signal
    const bestMatch = 
        SUGGESTIONS.find(item => item.club === c && c !== undefined) ||
        SUGGESTIONS.find(item => item.venue === v && item.occasion === o && item.season === s) ||
        SUGGESTIONS.find(item => item.venue === v && item.occasion === o && !item.season) ||
        SUGGESTIONS.find(item => item.venue === v && item.season === s && !item.occasion) ||
        SUGGESTIONS.find(item => item.occasion === o && item.season === s && !item.venue) ||
        SUGGESTIONS.find(item => item.venue === v && !item.occasion && !item.season) ||
        SUGGESTIONS.find(item => item.occasion === o && !item.venue && !item.season) ||
        SUGGESTIONS.find(item => item.season === s && !item.venue && !item.occasion);

    return bestMatch?.suggestion || DEFAULT_SUGGESTION;
}