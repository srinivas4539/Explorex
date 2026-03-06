export interface TribalStay {
  stay_id: number;
  tribe_name: string;
  location: string;
  eco_rating: number;
  capacity: number;
  cultural_activities: string;
  price_per_night: number;
  image_url: string;
}

export interface LocalProduct {
  product_id: number;
  name: string;
  artisan_name: string;
  eco_category: string;
  price: number;
  region: string;
  image_url: string;
}

export interface Guide {
  guide_id: number;
  name: string;
  vehicle_type: string;
  certification_status: string;
  language: string;
  rating: number;
  price_per_hour: number;
}

export interface Destination {
  dest_id: number;
  place: string;
  state: string;
  vibe: string;
  day_cost: number;
  ev_fee: number;
  resort: string;
  green_score: number;
  insight: string;
  image_url: string;
  photos?: string[];
  isFeatured?: boolean;
  history_prime: string;
  categories: string[];
}

export type Language = 'English' | 'Hindi' | 'Telugu' | 'Tamil' | 'Kannada' | 'Malayalam' | 'Odia' | 'Bengali' | 'Punjabi' | 'Gujarati' | 'Marathi' | 'Russian' | 'French' | 'Spanish' | 'German' | 'Vietnamese' | 'Japanese' | 'Korean';
