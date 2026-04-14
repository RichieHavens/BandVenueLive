export type UserRole = 'venue_manager' | 'band_manager' | 'musician' | 'registered_guest' | 'promoter' | 'super_admin';

export interface Profile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  default_role?: UserRole;
  avatar_url?: string;
  created_at: string;
  created_by_id?: string;
  updated_at?: string;
  updated_by_id?: string;
  is_super_admin: boolean;
  is_musician?: boolean;
  is_band_manager?: boolean;
  is_venue_manager?: boolean;
  is_solo_act?: boolean;
}

export interface RoleMaster {
  id: UserRole;
  name: string;
  description: string;
  primary_goal: string;
  core_pain_points: string[];
  desired_outcomes: string[];
  preferred_messaging: string;
  welcome_template: string;
  dashboard_headline: string;
  dashboard_subheadline: string;
  primary_ctas: { label: string; tab: string }[];
  default_dashboard_cards: string[];
  help_focus: string;
  feature_priorities: string[];
  active_flag: boolean;
  display_order: number;
}

export interface RolePageContent {
  id: string;
  role_id: UserRole;
  page_id: string;
  section_id: string;
  content_text: string;
}

export interface RoleAlert {
  id: string;
  user_id: string;
  role_id: UserRole;
  type: 'missing_info' | 'pending_action' | 'blocking';
  priority: number;
  message: string;
  link_url?: string;
  is_resolved: boolean;
  created_at: string;
  created_by_id?: string;
  updated_at?: string;
  updated_by_id?: string;
}

export interface Genre {
  id: string;
  name: string;
}

export interface MusicianDetails {
  id: string;
  user_id?: string;
  musician_bio?: string;
  vocal_type?: string;
  looking_for_bands?: boolean;
  open_for_gigs?: boolean;
  instruments?: string[];
  low_res_image_url?: string;
  high_res_image_url?: string;
  hero_image_url?: string;
  music_description?: string;
  about_description?: string;
  created_at: string;
  created_by_id?: string;
  updated_at?: string;
  updated_by_id?: string;
}

export interface Person {
  id: string;
  user_id?: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string;
  is_super_admin?: boolean;
  is_solo_act?: boolean;
  default_role?: UserRole;
  venue_ids: string[];
  band_ids: string[];
  last_login_at?: string;
  created_at: string;
  created_by_id?: string;
  updated_at?: string;
  updated_by_id?: string;
  musician_details?: MusicianDetails;
  profiles?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export interface Venue {
  id: string;
  manager_id?: string;
  name: string;
  description: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  phone: string;
  email: string;
  website_url: string;
  description_food: string;
  tech_specs?: string;
  logo_url?: string;
  hero_url?: string;
  video_links?: string[];
  linkedin_url?: string;
  pinterest_url?: string;
  youtube_url?: string;
  instagram_url?: string;
  apple_music_url?: string;
  spotify_url?: string;
  facebook_url?: string;
  twitter_url?: string;
  x_url?: string;
  tiktok_url?: string;
  soundcloud_url?: string;
  bandcamp_url?: string;
  images: string[];
  bag_policy?: string;
  is_archived?: boolean;
  is_confirmed?: boolean;
  is_published?: boolean;
  created_at: string;
  created_by_id?: string;
  updated_at?: string;
  updated_by_id?: string;
}

export interface VenueEventProfile {
  id: string;
  venue_id: string;
  title: string;
  description: string;
  start_time: string;
  end_time?: string;
  doors_open_time: string;
  cover_charge: number;
  recap?: string;
  internal_notes?: string;
  bag_policy?: string;
  overall_status: 'draft' | 'pending' | 'confirmed' | 'canceled' | 'past';
  has_multiple_acts: boolean;
  created_by: string;
  created_at: string;
  created_by_id?: string;
  updated_at?: string;
  updated_by_id?: string;
}

export interface VenueEventAct {
  id: string;
  event_id: string;
  band_id?: string;
  start_time?: string;
  end_time?: string;
  act_status: 'empty' | 'pending' | 'confirmed' | 'canceled';
  sort_order: number;
}

export interface VenueEventDocument {
  id: string;
  event_id: string;
  file_name: string;
  file_url: string;
  document_type: 'contract' | 'tech_spec' | 'other';
  created_at: string;
  created_by_id?: string;
  updated_at?: string;
  updated_by_id?: string;
}

export interface Band {
  id: string;
  manager_id?: string;
  name: string;
  description: string;
  phone: string;
  email: string;
  website_url: string;
  address_line1?: string;
  address_line2?: string;
  postal_code?: string;
  city?: string;
  state?: string;
  country?: string;
  travel_region: 'Local' | 'Regional' | 'National';
  logo_url?: string;
  hero_url?: string;
  images: string[];
  video_links: string[];
  facebook_url?: string;
  instagram_url?: string;
  tiktok_url?: string;
  pinterest_url?: string;
  linkedin_url?: string;
  youtube_url?: string;
  apple_music_url?: string;
  spotify_url?: string;
  soundcloud_url?: string;
  bandcamp_url?: string;
  x_url?: string;
  created_by_id?: string;
  created_at: string;
  updated_at?: string;
  updated_by_id?: string;
  is_confirmed: boolean;
  is_published?: boolean;
  is_archived?: boolean;
  created_by_venue_id?: string;
}

export interface AppEvent {
  id: string;
  venue_id: string;
  title: string;
  band_event_name?: string;
  venue_event_name?: string;
  description: string;
  start_time: string;
  end_time?: string;
  doors_open_time: string;
  ticket_price_low: number;
  ticket_price_high: number;
  ticket_disclaimer: string;
  venue_confirmed: boolean;
  band_confirmed: boolean;
  promoter_confirmed?: boolean;
  band_confirmation_status?: 'pending' | 'sent' | 'confirmed' | 'declined';
  confirmation_requested_at?: string | null;
  confirmation_last_sent_at?: string | null;
  confirmation_sent_count?: number;
  band_confirmed_at?: string | null;
  is_public: boolean;
  is_published: boolean;
  bag_policy?: string;
  hero_url?: string;
  venue_hero_url?: string;
  created_at: string;
  created_by_id?: string;
  updated_at?: string;
  updated_by_id?: string;
  created_by?: string;
  status?: 'pending' | 'confirmed' | 'rejected';
  venues?: Venue;
  acts?: Act[];
  event_genres?: string[];
  is_canceled?: boolean;
  has_multiple_acts: boolean;
}

export interface Act {
  id: string;
  event_id: string;
  band_id: string;
  bands?: Band;
  start_time: string;
  created_at: string;
  created_by_id?: string;
  updated_at?: string;
  updated_by_id?: string;
}

export interface VenueSponsor {
  id: string;
  venue_id: string;
  name: string;
  description: string;
  logo_url: string;
  created_at: string;
  created_by_id?: string;
  updated_at?: string;
  updated_by_id?: string;
}

export interface BandMember {
  id: string;
  band_id: string;
  person_id: string;
  first_name: string;
  last_name: string;
  email: string;
  instrument_description: string;
  is_active: boolean;
  created_at: string;
  created_by_id?: string;
  updated_at?: string;
  updated_by_id?: string;
}

export interface BookingInquiry {
  id: string;
  venue_id: string;
  band_id: string;
  event_id?: string;
  sender_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  message: string;
  proposed_date: string;
  created_at: string;
  updated_at: string;
}
