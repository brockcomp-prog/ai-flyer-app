import type { Venue, Event, Season } from '../types';

export interface TextSuggestion {
  headline: string;
  subheading: string;
  body: string;
  contactInfo: string;
}

const SUGGESTIONS: {
  venue?: Venue;
  event?: Event;
  season?: Season;
  suggestion: TextSuggestion;
}[] = [
  // Specific Combos
  {
    venue: 'Restaurant',
    event: 'Grand Opening',
    suggestion: {
      headline: 'Grand Opening Feast',
      subheading: 'Taste a New Tradition',
      body: 'Join us this Friday at 7 PM\nFirst 50 guests get a free appetizer!',
      contactInfo: 'The Savory Spoon • 123 Flavor Ave\nReserve at (555) 123-4567',
    },
  },
  {
    venue: 'Hair Salon',
    event: 'Big Sale',
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
    event: 'Live Music',
    season: 'Summer',
    suggestion: {
        headline: 'Summer Concert Series',
        subheading: 'Live Bands Under the Stars',
        body: 'Every Saturday in July • 8 PM Start\nFood trucks and local brews on site.',
        contactInfo: 'The Open Air Stage • 101 Parkside Dr.\n@OpenAirStage',
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

  // General Event
  {
    event: 'Grand Opening',
    suggestion: {
      headline: 'You\'re Invited!',
      subheading: 'Celebrate Our Grand Opening',
      body: 'Join us for music, drinks, and giveaways!\nThis Saturday at 6 PM',
      contactInfo: 'Our New Spot • 123 Main St.\n@OurNewSpot',
    },
  },
  {
    event: 'Live Music',
    suggestion: {
      headline: 'Live Music Night',
      subheading: 'Featuring The Groovy Tones',
      body: 'Every Friday at 9 PM\nNo cover charge.',
      contactInfo: 'The Music Spot • 456 Melody Ave\n@TheMusicSpot',
    },
  },
  {
    event: 'Big Sale',
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
export const findBestSuggestion = (venue: Venue, event: Event, season: Season): TextSuggestion => {
    const v = venue === 'None' ? undefined : venue;
    const e = event === 'None' ? undefined : event;
    const s = season === 'None' ? undefined : season;
    
    // Prioritize more specific matches
    const bestMatch = 
        SUGGESTIONS.find(item => item.venue === v && item.event === e && item.season === s) ||
        SUGGESTIONS.find(item => item.venue === v && item.event === e && !item.season) ||
        SUGGESTIONS.find(item => item.venue === v && item.season === s && !item.event) ||
        SUGGESTIONS.find(item => item.event === e && item.season === s && !item.venue) ||
        SUGGESTIONS.find(item => item.venue === v && !item.event && !item.season) ||
        SUGGESTIONS.find(item => item.event === e && !item.venue && !item.season) ||
        SUGGESTIONS.find(item => item.season === s && !item.venue && !item.event);

    return bestMatch?.suggestion || DEFAULT_SUGGESTION;
}