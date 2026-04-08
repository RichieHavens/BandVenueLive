/*
  BANDVENUE SUPABASE SCHEMA
  Run this in your Supabase SQL Editor
*/

-- 1. Roles Enum
CREATE TYPE user_role AS ENUM ('venue_manager', 'band_manager', 'musician', 'guest', 'syndication_manager', 'admin');

-- 2. Profiles Table (Extends Auth)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  address TEXT,
  avatar_url TEXT,
  roles user_role[] DEFAULT '{attendee}',
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.1 Login Logs Table
CREATE TABLE login_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  email TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for login_logs
ALTER TABLE login_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own login logs" ON login_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all login logs" ON login_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND 'admin' = ANY(roles)
    )
  );

-- 2.2 People Table (Unified Master List)
CREATE TABLE people (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id), -- Optional: links to registered account
  first_name TEXT,
  last_name TEXT,
  email TEXT UNIQUE,
  phone TEXT,
  roles user_role[] DEFAULT '{attendee}',
  venue_ids UUID[] DEFAULT '{}',
  band_ids UUID[] DEFAULT '{}',
  last_login_at TIMESTAMP WITH TIME ZONE,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  existing_person_id UUID;
BEGIN
  -- 1. Create the profile
  INSERT INTO public.profiles (id, email, roles)
  VALUES (new.id, new.email, '{guest}');

  -- 2. Check if this person already exists in our master list by email
  SELECT id INTO existing_person_id FROM public.people WHERE email = new.email;

  IF existing_person_id IS NOT NULL THEN
    -- Link existing person to the new user account
    UPDATE public.people SET user_id = new.id WHERE id = existing_person_id;
    -- Copy roles and other info from people table to the new profile
    UPDATE public.profiles p 
    SET 
      roles = pe.roles,
      first_name = COALESCE(p.first_name, pe.first_name),
      last_name = COALESCE(p.last_name, pe.last_name),
      phone = COALESCE(p.phone, pe.phone)
    FROM public.people pe 
    WHERE p.id = new.id AND pe.id = existing_person_id;
  ELSE
    -- Create a new person record
    INSERT INTO public.people (user_id, email, first_name, last_name)
    VALUES (new.id, new.email, new.raw_user_meta_data->>'first_name', new.raw_user_meta_data->>'last_name');
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Trigger to sync venue_ids to people table
CREATE OR REPLACE FUNCTION public.sync_venue_to_people()
RETURNS trigger AS $$
BEGIN
  IF (NEW.person_id IS NOT NULL) THEN
    UPDATE public.people 
    SET venue_ids = array_append(array_remove(venue_ids, NEW.id), NEW.id)
    WHERE id = NEW.person_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_venue_upsert
  AFTER INSERT OR UPDATE ON public.venues
  FOR EACH ROW EXECUTE PROCEDURE public.sync_venue_to_people();

-- Trigger to sync band_ids to people table
CREATE OR REPLACE FUNCTION public.sync_band_to_people()
RETURNS trigger AS $$
BEGIN
  IF (NEW.person_id IS NOT NULL) THEN
    UPDATE public.people 
    SET band_ids = array_append(array_remove(band_ids, NEW.id), NEW.id)
    WHERE id = NEW.person_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_band_upsert
  AFTER INSERT OR UPDATE ON public.bands
  FOR EACH ROW EXECUTE PROCEDURE public.sync_band_to_people();

-- Trigger to sync people changes back to profiles
CREATE OR REPLACE FUNCTION public.sync_people_to_profile()
RETURNS trigger AS $$
BEGIN
  IF (NEW.user_id IS NOT NULL) THEN
    UPDATE public.profiles 
    SET 
      first_name = COALESCE(NEW.first_name, first_name),
      last_name = COALESCE(NEW.last_name, last_name),
      phone = COALESCE(NEW.phone, phone),
      roles = NEW.roles
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_people_upsert
  AFTER UPDATE ON public.people
  FOR EACH ROW EXECUTE PROCEDURE public.sync_people_to_profile();

-- 3. Genres Table
CREATE TABLE genres (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

-- 4. Venues Table
CREATE TABLE venues (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  manager_id UUID REFERENCES profiles(id),
  name TEXT NOT NULL,
  description TEXT,
  address TEXT, -- Combined address string
  street TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  country TEXT DEFAULT 'US',
  phone TEXT,
  email TEXT,
  website TEXT,
  food_description TEXT,
  tech_specs TEXT,
  logo_url TEXT,
  hero_url TEXT,
  bag_policy TEXT,
  linkedin_url TEXT,
  pinterest_url TEXT,
  youtube_url TEXT,
  instagram_url TEXT,
  apple_music_url TEXT,
  spotify_url TEXT,
  facebook_url TEXT,
  twitter_url TEXT,
  images TEXT[] DEFAULT '{}', -- URLs to images
  is_seed BOOLEAN DEFAULT FALSE, -- Forensic seed data
  person_id UUID REFERENCES people(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE,
  updated_by UUID REFERENCES profiles(id)
);

-- 5. Bands Table
CREATE TABLE bands (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  manager_id UUID REFERENCES profiles(id),
  name TEXT NOT NULL,
  description TEXT,
  address TEXT, -- Combined address string
  street TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  country TEXT DEFAULT 'US',
  phone TEXT,
  email TEXT,
  website TEXT,
  logo_url TEXT,
  hero_url TEXT,
  linkedin_url TEXT,
  pinterest_url TEXT,
  youtube_url TEXT,
  instagram_url TEXT,
  apple_music_url TEXT,
  spotify_url TEXT,
  facebook_url TEXT,
  twitter_url TEXT,
  images TEXT[] DEFAULT '{}',
  video_links TEXT[] DEFAULT '{}',
  is_seed BOOLEAN DEFAULT FALSE, -- Forensic seed data
  person_id UUID REFERENCES people(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE,
  updated_by UUID REFERENCES profiles(id)
);

-- 6. Musicians Table (Detailed profile)
CREATE TABLE musicians (
  id UUID REFERENCES profiles(id) PRIMARY KEY,
  phone TEXT,
  website TEXT,
  video_links TEXT[] DEFAULT '{}',
  description TEXT,
  looking_for_bands BOOLEAN DEFAULT FALSE,
  instruments TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Events Table
CREATE TABLE events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id UUID REFERENCES venues(id),
  title TEXT NOT NULL,
  description TEXT,
  doors_open_time TIME,
  ticket_price_low DECIMAL,
  ticket_price_high DECIMAL,
  ticket_disclaimer TEXT,
  end_time TIMESTAMP WITH TIME ZONE,
  venue_confirmed BOOLEAN DEFAULT FALSE,
  band_confirmed BOOLEAN DEFAULT FALSE,
  is_public BOOLEAN DEFAULT FALSE,
  is_published BOOLEAN DEFAULT FALSE,
  hero_url TEXT,
  bag_policy TEXT,
  is_seed BOOLEAN DEFAULT FALSE, -- Forensic seed data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE,
  updated_by UUID REFERENCES profiles(id)
);

-- 8. Acts Table (Part of an Event)
CREATE TABLE acts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  band_id UUID REFERENCES bands(id),
  start_time TIMESTAMP WITH TIME ZONE,
  is_seed BOOLEAN DEFAULT FALSE, -- Forensic seed data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Venue Sponsors
CREATE TABLE venue_sponsors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id UUID REFERENCES venues(id),
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Event Sponsors (Link table)
CREATE TABLE event_sponsors (
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  sponsor_id UUID REFERENCES venue_sponsors(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, sponsor_id)
);

-- 11. BandVenue Global Sponsors
CREATE TABLE global_sponsors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  contact_first_name TEXT,
  contact_last_name TEXT,
  phone TEXT,
  email TEXT,
  description TEXT,
  image_url TEXT,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Syndication Locations
CREATE TABLE syndication_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  website TEXT NOT NULL,
  contact_first_name TEXT,
  contact_last_name TEXT,
  phone TEXT,
  email TEXT,
  description TEXT,
  image_url TEXT,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. Favorites (Attendees)
CREATE TABLE favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  target_id UUID NOT NULL, -- Can be venue_id, band_id, or musician_id
  target_type TEXT NOT NULL CHECK (target_type IN ('venue', 'band', 'musician')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, target_id, target_type)
);

-- 14. Junction Tables for Genres
CREATE TABLE band_genres (
  band_id UUID REFERENCES bands(id) ON DELETE CASCADE,
  genre_id UUID REFERENCES genres(id) ON DELETE CASCADE,
  PRIMARY KEY (band_id, genre_id)
);

CREATE TABLE event_genres (
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  genre_id UUID REFERENCES genres(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, genre_id)
);

CREATE TABLE venue_genres (
  venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
  genre_id UUID REFERENCES genres(id) ON DELETE CASCADE,
  PRIMARY KEY (venue_id, genre_id)
);

-- 15. Band Musicians (Linking musicians to bands)
CREATE TABLE band_musicians (
  band_id UUID REFERENCES bands(id) ON DELETE CASCADE,
  musician_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT TRUE,
  PRIMARY KEY (band_id, musician_id)
);

-- 16. Disclaimer Acceptances
CREATE TABLE disclaimer_acceptances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id), -- NULL for anonymous
  accepted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  url TEXT NOT NULL,
  user_agent TEXT,
  ip_address TEXT, -- Optional, for forensic tracking
  session_id TEXT -- For anonymous tracking
);

-- 17. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  changes JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 18. Booking Inquiries
CREATE TABLE IF NOT EXISTS booking_inquiries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
  band_id UUID REFERENCES bands(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL, -- Optional: link to existing event
  sender_id UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  message TEXT,
  proposed_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE booking_inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own inquiries" ON booking_inquiries;
CREATE POLICY "Users can view their own inquiries" ON booking_inquiries
  FOR SELECT USING (
    auth.uid() = sender_id OR 
    EXISTS (SELECT 1 FROM venues WHERE id = venue_id AND manager_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM bands WHERE id = band_id AND manager_id = auth.uid())
  );

DROP POLICY IF EXISTS "Bands can create inquiries" ON booking_inquiries;
CREATE POLICY "Bands can create inquiries" ON booking_inquiries
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM bands WHERE id = band_id AND manager_id = auth.uid())
  );

DROP POLICY IF EXISTS "Managers can update inquiry status" ON booking_inquiries;
CREATE POLICY "Managers can update inquiry status" ON booking_inquiries
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM venues WHERE id = venue_id AND manager_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM bands WHERE id = band_id AND manager_id = auth.uid())
  );

-- Helper function for admin check
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND 'admin' = ANY(roles)
    )
    OR (auth.jwt() ->> 'email' = 'rickheavern@gmail.com')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable Realtime for key tables
-- Note: Publication might already exist, so we use a safe way to add tables
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE events, acts, profiles, venues, bands;

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Profiles are viewable by everyone." ON profiles;
CREATE POLICY "Profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert their own profile." ON profiles;
CREATE POLICY "Users can insert their own profile." ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile." ON profiles;
CREATE POLICY "Users can update own profile." ON profiles FOR UPDATE USING (auth.uid() = id);

ALTER TABLE people ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage all people" ON people;
CREATE POLICY "Admins can manage all people" ON people FOR ALL USING (is_admin());
DROP POLICY IF EXISTS "Users can view their own person record" ON people;
CREATE POLICY "Users can view their own person record" ON people FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Managers can see other people for booking" ON people;
CREATE POLICY "Managers can see other people for booking" ON people FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (
        'venue_manager' = ANY(profiles.roles) OR 
        'band_manager' = ANY(profiles.roles) OR
        'admin' = ANY(profiles.roles)
      )
    )
);

ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Venues are viewable by everyone" ON venues;
CREATE POLICY "Venues are viewable by everyone" ON venues FOR SELECT USING (true);
DROP POLICY IF EXISTS "Managers can manage their own venues" ON venues;
CREATE POLICY "Managers can manage their own venues" ON venues FOR ALL USING (auth.uid() = manager_id);
DROP POLICY IF EXISTS "Admins can manage all venues" ON venues;
CREATE POLICY "Admins can manage all venues" ON venues FOR ALL USING (is_admin());

ALTER TABLE bands ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Bands are viewable by everyone" ON bands;
CREATE POLICY "Bands are viewable by everyone" ON bands FOR SELECT USING (true);
DROP POLICY IF EXISTS "Managers can manage their own bands" ON bands;
CREATE POLICY "Managers can manage their own bands" ON bands FOR ALL USING (auth.uid() = manager_id);
DROP POLICY IF EXISTS "Admins can manage all bands" ON bands;
CREATE POLICY "Admins can manage all bands" ON bands FOR ALL USING (is_admin());

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Events are viewable by everyone" ON events;
CREATE POLICY "Events are viewable by everyone" ON events FOR SELECT USING (true);
DROP POLICY IF EXISTS "Venue managers can manage events at their venues" ON events;
CREATE POLICY "Venue managers can manage events at their venues" ON events FOR ALL USING (
    EXISTS (
      SELECT 1 FROM venues 
      WHERE venues.id = events.venue_id 
      AND venues.manager_id = auth.uid()
    )
);
DROP POLICY IF EXISTS "Admins can manage all events" ON events;
CREATE POLICY "Admins can manage all events" ON events FOR ALL USING (is_admin());

ALTER TABLE acts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acts are viewable by everyone" ON acts;
CREATE POLICY "Acts are viewable by everyone" ON acts FOR SELECT USING (true);
DROP POLICY IF EXISTS "Event managers can manage acts" ON acts;
CREATE POLICY "Event managers can manage acts" ON acts FOR ALL USING (
    EXISTS (
      SELECT 1 FROM events 
      JOIN venues ON events.venue_id = venues.id
      WHERE events.id = acts.event_id 
      AND venues.manager_id = auth.uid()
    )
);
DROP POLICY IF EXISTS "Admins can manage all acts" ON acts;
CREATE POLICY "Admins can manage all acts" ON acts FOR ALL USING (is_admin());

ALTER TABLE genres ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Genres are viewable by everyone" ON genres;
CREATE POLICY "Genres are viewable by everyone" ON genres FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated users can insert genres" ON genres;
CREATE POLICY "Authenticated users can insert genres" ON genres FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Admins can manage genres" ON genres;
CREATE POLICY "Admins can manage genres" ON genres FOR ALL TO authenticated USING (is_admin());

-- Junction Table Policies
ALTER TABLE band_genres ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Band genres are viewable by everyone" ON band_genres;
CREATE POLICY "Band genres are viewable by everyone" ON band_genres FOR SELECT USING (true);
DROP POLICY IF EXISTS "Managers can manage band genres" ON band_genres;
CREATE POLICY "Managers can manage band genres" ON band_genres FOR ALL USING (
    EXISTS (SELECT 1 FROM bands WHERE bands.id = band_genres.band_id AND bands.manager_id = auth.uid()) OR is_admin()
);

ALTER TABLE event_genres ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Event genres are viewable by everyone" ON event_genres;
CREATE POLICY "Event genres are viewable by everyone" ON event_genres FOR SELECT USING (true);
DROP POLICY IF EXISTS "Managers can manage event genres" ON event_genres;
CREATE POLICY "Managers can manage event genres" ON event_genres FOR ALL USING (
    EXISTS (SELECT 1 FROM events JOIN venues ON events.venue_id = venues.id WHERE events.id = event_genres.event_id AND venues.manager_id = auth.uid()) OR is_admin()
);

ALTER TABLE venue_genres ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Venue genres are viewable by everyone" ON venue_genres;
CREATE POLICY "Venue genres are viewable by everyone" ON venue_genres FOR SELECT USING (true);
DROP POLICY IF EXISTS "Managers can manage venue genres" ON venue_genres;
CREATE POLICY "Managers can manage venue genres" ON venue_genres FOR ALL USING (
    EXISTS (SELECT 1 FROM venues WHERE venues.id = venue_genres.venue_id AND venues.manager_id = auth.uid()) OR is_admin()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_logs;
CREATE POLICY "Admins can view audit logs" ON audit_logs FOR SELECT USING (is_admin());
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON audit_logs;
CREATE POLICY "Authenticated users can insert audit logs" ON audit_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');

ALTER TABLE disclaimer_acceptances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can insert acceptance" ON disclaimer_acceptances;
CREATE POLICY "Anyone can insert acceptance" ON disclaimer_acceptances FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Admins can view acceptances" ON disclaimer_acceptances;
CREATE POLICY "Admins can view acceptances" ON disclaimer_acceptances FOR SELECT USING (is_admin());

-- Storage Setup
INSERT INTO storage.buckets (id, name, public) VALUES ('images', 'images', true) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'images');
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'images' AND auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Owner Update" ON storage.objects;
CREATE POLICY "Owner Update" ON storage.objects FOR UPDATE USING (bucket_id = 'images' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "Owner Delete" ON storage.objects;
CREATE POLICY "Owner Delete" ON storage.objects FOR DELETE USING (bucket_id = 'images' AND auth.uid()::text = (storage.foldername(name))[1]);
