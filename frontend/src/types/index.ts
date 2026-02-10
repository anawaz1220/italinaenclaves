export interface Church {
  id: number;
  name: string;
  city: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
  year_founded: number | null;
}

export interface ChurchDetail {
  id: number;
  name: string;
  original_location: string | null;
  city: string | null;
  state: string | null;
  year_founded: number | null;
  notes: string | null;
  latitude: number | null;
  longitude: number | null;
  formatted_address: string | null;
  google_place_id: string | null;
  google_photos: GooglePhoto[];
  google_rating: number | null;
  google_url: string | null;
  website: string | null;
  phone: string | null;
}

export interface GooglePhoto {
  photo_reference: string;
  height: number;
  width: number;
  html_attributions: string[];
}

export interface ApiResponse<T> {
  data: T;
  count: number;
}
