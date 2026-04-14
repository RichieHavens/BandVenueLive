import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { GoogleGenAI, Type } from "@google/genai";
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import { supabase } from '../lib/supabase';
import { formatAddress, AddressParts } from '../lib/geo';
import { isSimilar, formatDate, formatTime, cleanWebsiteUrl } from '../lib/utils';
import { Venue, Band, VenueEventProfile } from '../types';
import { 
  Loader2, Sparkles, Upload, X, CheckCircle, Music, MapPin, 
  Calendar, Clock, Search, Filter, Trash2, Globe, Settings, ShieldCheck, Plus,
  AlertTriangle, Info, HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Card } from '../components/ui/Card';

interface ScrapeResults {
  venues: (Partial<Venue> & { match?: string; matchId?: string; genres?: string[] })[];
  bands: (Partial<Band> & { match?: string; matchId?: string; genres?: string[] })[];
  events: (Partial<VenueEventProfile> & { venue_name?: string; band_names?: string[]; genres?: string[] })[];
  genres: string[];
}

export function ScraperView() {
  const { profile, user, personId, refreshProfile } = useAuth();
  const [url, setUrl] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [inputType, setInputType] = useState<'url' | 'text'>('url');
  const [scrapeVenues, setScrapeVenues] = useState(true);
  const [scrapeBands, setScrapeBands] = useState(true);
  const [scrapeEvents, setScrapeEvents] = useState(true);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [status, setStatus] = useState('');
  const [importSummary, setImportSummary] = useState<{ 
    venues: number, 
    bands: number, 
    events: number, 
    genres: number,
    duplicatesSkipped: number,
    fuzzyMatches: number
  } | null>(null);
  const [rawAIResponse, setRawAIResponse] = useState<string | null>(null);
  const [showRawResponse, setShowRawResponse] = useState(false);
  const [editingRecord, setEditingRecord] = useState<{
    type: 'venues' | 'bands' | 'events';
    index: number;
    data: any;
  } | null>(null);
  const [matchedRecord, setMatchedRecord] = useState<any>(null);
  const [selectedVenueId, setSelectedVenueId] = useState<string>('');
  const [selectedBandId, setSelectedBandId] = useState<string>('');
  const [venues, setVenues] = useState<any[]>([]);
  const [bands, setBands] = useState<any[]>([]);
  const [headerMapping, setHeaderMapping] = useState<Record<string, string>>({});
  const [unknownHeaders, setUnknownHeaders] = useState<string[]>([]);
  const [mappingPreview, setMappingPreview] = useState<{ header: string; internalField: string; sampleValue: string }[]>([]);
  const [duplicateHeaders, setDuplicateHeaders] = useState<string[]>([]);
  const [aliasedHeaders, setAliasedHeaders] = useState<{ original: string; mapped: string }[]>([]);
  const [missingRequiredHeaders, setMissingRequiredHeaders] = useState<string[]>([]);
  const [showMappingPreview, setShowMappingPreview] = useState(false);

  const handleVenueChange = (venueId: string) => {
    setSelectedVenueId(venueId);
    if (venueId) {
      setScrapeVenues(false);
      setSelectedBandId(''); // Enforce mutual exclusivity
      setScrapeBands(true);
    } else {
      setScrapeVenues(true);
    }
  };

  const handleBandChange = (bandId: string) => {
    setSelectedBandId(bandId);
    if (bandId) {
      setScrapeBands(false);
      setSelectedVenueId(''); // Enforce mutual exclusivity
      setScrapeVenues(true);
    } else {
      setScrapeBands(true);
    }
  };

  useEffect(() => {
    const fetchContext = async () => {
      const { data: venues } = await supabase.from('venues').select('id, name').order('name');
      const { data: bands } = await supabase.from('bands_ordered').select('id, name').order('name');
      if (venues) setVenues(venues);
      if (bands) setBands(bands);
    };
    fetchContext();
  }, []);

  useEffect(() => {
    const fetchMatchedRecord = async () => {
      if (editingRecord?.data?.matchId) {
        const { data } = await supabase
          .from(editingRecord.type)
          .select('*')
          .eq('id', editingRecord.data.matchId)
          .maybeSingle();
        
        if (data) {
          setMatchedRecord(data);
        }
      } else {
        setMatchedRecord(null);
      }
    };

    fetchMatchedRecord();
  }, [editingRecord]);
  const [importDetails, setImportDetails] = useState<{
    venues: { name: string, status: 'matched' | 'new' | 'error', match?: string, matchId?: string, error?: string, originalData?: any }[],
    bands: { name: string, status: 'matched' | 'new' | 'error', match?: string, matchId?: string, error?: string, originalData?: any }[],
    events: { title: string, status: 'new' | 'error' | 'skipped', reason?: string, error?: string, id?: string, venue_name?: string, band_names?: string[] }[],
    genres: { name: string, status: 'matched' | 'new' | 'error', match?: string, error?: string }[]
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus('Reading file...');
    setLoading(true);

    try {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      let extractedText = '';

      if (fileExtension === 'txt' || fileExtension === 'csv') {
        extractedText = await file.text();
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        extractedText = XLSX.utils.sheet_to_csv(worksheet, { FS: '|' });
      } else if (fileExtension === 'docx') {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        extractedText = result.value;
      } else {
        throw new Error('Unsupported file type. Please upload .txt, .csv, .xlsx, or .docx');
      }

      setPastedText(extractedText);
      setInputType('text');
      setStatus('File loaded successfully! Click Analyze Text to process.');
    } catch (err: any) {
      console.error('File reading error:', err);
      alert(err.message || 'Failed to read file.');
      setStatus('Error reading file.');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      setElapsedTime(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleScrape = async () => {
    if (inputType === 'url' && !url) return;
    if (inputType === 'text' && !pastedText) return;
    
    setLoading(true);
    setResults(null);
    setImportSummary(null);
    setRawAIResponse(null);
    setShowRawResponse(false);
    setShowMappingPreview(false);
    setUnknownHeaders([]);
    setDuplicateHeaders([]);
    setAliasedHeaders([]);
    setMissingRequiredHeaders([]);
    
    try {
      // 1. Check for structured batch import format first
      if (inputType === 'text') {
        const lines = pastedText.split('\n').map(l => l.trim()).filter(l => l);
        if (lines.length < 2) {
          // Not enough lines for a structured import with header
        } else {
          const CANONICAL_HEADERS = [
            'profile_type', 'name', 'address_line1', 'address_line2', 'city', 'state', 'postal_code', 'country',
            'phone', 'email', 'website_url', 'facebook_url', 'instagram_url', 'x_url', 'twitter_url', 'tiktok_url',
            'youtube_url', 'spotify_url', 'soundcloud_url', 'bandcamp_url', 'apple_music_url', 'description', 'genres'
          ];

          const HEADER_ALIASES: Record<string, string> = {
            'street': 'address_line1',
            'zip': 'postal_code',
            'zip_code': 'postal_code',
            'type': 'profile_type',
            'twitter': 'twitter_url',
            'facebook': 'facebook_url',
            'instagram': 'instagram_url',
            'tiktok': 'tiktok_url',
            'youtube': 'youtube_url',
            'spotify': 'spotify_url',
            'soundcloud': 'soundcloud_url',
            'bandcamp': 'bandcamp_url',
            'apple_music': 'apple_music_url',
            'itunes': 'apple_music_url',
            'website': 'website_url',
            'site': 'website_url',
            'url': 'website_url',
            'web': 'website_url'
          };

          const normalizeHeader = (header: string) => {
            if (!header) return { normalized: '', isAliased: false };
            const baseNormalized = header
              .trim()
              .toLowerCase()
              .replace(/\s+/g, '_')
              .replace(/[^a-z0-9_]/g, '');
            
            const aliased = HEADER_ALIASES[baseNormalized];
            if (aliased) {
              return { normalized: aliased, isAliased: true };
            }
            return { normalized: baseNormalized, isAliased: false };
          };

          // Detect delimiter (comma, tab, or pipe) from the first line
          const firstLine = lines[0];
          const counts = {
            ',': (firstLine.match(/,/g) || []).length,
            '\t': (firstLine.match(/\t/g) || []).length,
            '|': (firstLine.match(/\|/g) || []).length
          };
          // Pick the delimiter that appears most frequently in the header row
          const delimiter = (Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]) || ',';
          const rawHeaders = firstLine.split(delimiter).map(h => h.trim());
          
          // Normalize headers and check for duplicates/unknowns
          const normalizedHeaders: string[] = [];
          const seenHeaders = new Set<string>();
          const duplicates: string[] = [];
          const unknowns: string[] = [];
          const aliases: { original: string; mapped: string }[] = [];
          const mapping: Record<number, string> = {};
          const preview: { header: string; internalField: string; sampleValue: string }[] = [];

          rawHeaders.forEach((raw, index) => {
            if (!raw) return;
            const { normalized, isAliased } = normalizeHeader(raw);
            
            if (seenHeaders.has(normalized)) {
              duplicates.push(raw);
            }
            seenHeaders.add(normalized);
            normalizedHeaders.push(normalized);

            if (isAliased) {
              aliases.push({ original: raw, mapped: normalized });
            }

            if (CANONICAL_HEADERS.includes(normalized)) {
              mapping[index] = normalized;
              // Get sample value from first data row if available
              const sampleValue = lines[1] ? lines[1].split(delimiter)[index] || '' : '';
              preview.push({ header: raw, internalField: normalized, sampleValue });
            } else {
              unknowns.push(raw);
              preview.push({ header: raw, internalField: 'Unknown column', sampleValue: '' });
            }
          });

          // Check for required headers
          const missingRequired = ['profile_type', 'name'].filter(h => !seenHeaders.has(h));

          // If we have at least some recognized headers, treat as structured attempt
          const hasRecognizedHeaders = normalizedHeaders.some(h => CANONICAL_HEADERS.includes(h));
          
          if (hasRecognizedHeaders) {
            setStatus('Processing structured batch import...');
            setUnknownHeaders(unknowns);
            setDuplicateHeaders(duplicates);
            setAliasedHeaders(aliases);
            setMissingRequiredHeaders(missingRequired);
            setMappingPreview(preview);
            setShowMappingPreview(true);

            // Only proceed with data processing if required fields are present
            if (missingRequired.length === 0) {
              const structuredResults: ScrapeResults = { venues: [], bands: [], events: [], genres: [] };
            
            // Process data rows (skip header)
            for (let i = 1; i < lines.length; i++) {
              const rowParts = lines[i].split(delimiter).map(p => p.trim());
              const record: any = {};
              
              // Map values based on header mapping
              Object.entries(mapping).forEach(([indexStr, field]) => {
                const index = parseInt(indexStr);
                record[field] = rowParts[index] || '';
              });

              // Detect secondary header rows (duplicates of the first row)
              const isHeaderRow = rowParts.every((part, idx) => part === rawHeaders[idx]);
              if (isHeaderRow) {
                setDuplicateHeaders(prev => [...prev, `Row ${i + 1} appears to be a duplicate header row`]);
                continue;
              }

              const type = record.profile_type?.toLowerCase().trim();
              if (type === 'venue') {
                structuredResults.venues.push({
                  ...record,
                  twitter_url: record.x_url || record.twitter_url || '',
                  x_url: record.x_url || record.twitter_url || '',
                  apple_music_url: record.apple_music_url || '',
                  email: (record.email || '').toLowerCase().trim(),
                  website_url: cleanWebsiteUrl(record.website_url),
                  genres: record.genres ? record.genres.split(';').map((g: any) => g.trim()) : []
                });
              } else if (type === 'band') {
                structuredResults.bands.push({
                  ...record,
                  twitter_url: record.x_url || record.twitter_url || '',
                  x_url: record.x_url || record.twitter_url || '',
                  apple_music_url: record.apple_music_url || '',
                  email: (record.email || '').toLowerCase().trim(),
                  website_url: cleanWebsiteUrl(record.website_url),
                  genres: record.genres ? record.genres.split(';').map((g: any) => g.trim()) : []
                });
              } else if (type === 'event') {
                structuredResults.events.push({
                  title: record.name || record.title || '',
                  venue_name: record.venue_name || '',
                  start_time: record.start_time || '',
                  band_names: record.band_names ? record.band_names.split(';').map((b: any) => b.trim()) : [],
                  description: record.description || '',
                  genres: record.genres ? record.genres.split(';').map((g: any) => g.trim()) : []
                });
              }
            }

            // Fuzzy matching against existing database
            const { data: existingVenues } = await supabase.from('venues').select('id, name, address_line1, city, state, postal_code, phone, website_url');
            const { data: existingBands } = await supabase.from('bands_ordered').select('id, name, address_line1, city, state, postal_code, phone, website_url');

            const findVenueMatch = (v: any) => {
              return existingVenues?.find(ev => {
                const nameMatch = isSimilar(ev.name, v.name);
                if (!nameMatch) return false;
                if (v.address_line1 && ev.address_line1 && isSimilar(ev.address_line1, v.address_line1)) return true;
                if (v.phone && ev.phone && ev.phone.replace(/\D/g, '') === v.phone.replace(/\D/g, '')) return true;
                if (v.website_url && ev.website_url) {
                  const vWeb = v.website_url.toLowerCase().replace(/https?:\/\/(www\.)?/, '').replace(/\/$/, '');
                  const evWeb = ev.website_url.toLowerCase().replace(/https?:\/\/(www\.)?/, '').replace(/\/$/, '');
                  if (vWeb && evWeb && (vWeb.includes(evWeb) || evWeb.includes(vWeb))) return true;
                }
                return true;
              });
            };

            const findBandMatch = (b: any) => {
              return existingBands?.find(eb => {
                const nameMatch = isSimilar(eb.name, b.name);
                if (!nameMatch) return false;
                if (b.address_line1 && eb.address_line1 && isSimilar(eb.address_line1, b.address_line1)) return true;
                if (b.phone && eb.phone && eb.phone.replace(/\D/g, '') === b.phone.replace(/\D/g, '')) return true;
                if (b.website_url && eb.website_url) {
                  const bWeb = b.website_url.toLowerCase().replace(/https?:\/\/(www\.)?/, '').replace(/\/$/, '');
                  const ebWeb = eb.website_url.toLowerCase().replace(/https?:\/\/(www\.)?/, '').replace(/\/$/, '');
                  if (bWeb && ebWeb && (bWeb.includes(ebWeb) || ebWeb.includes(bWeb))) return true;
                }
                return true;
              });
            };

            structuredResults.venues = structuredResults.venues.map(v => {
              const match = findVenueMatch(v);
              return match ? { ...v, match: match.name, matchId: match.id } : v;
            });

            structuredResults.bands = structuredResults.bands.map(b => {
              const match = findBandMatch(b);
              return match ? { ...b, match: match.name, matchId: match.id } : b;
            });

            setResults(structuredResults);
            setStatus('Batch import processed successfully!');
            setLoading(false);
            return;
          } else {
            // Missing required fields - we show the mapping preview but don't process rows
            setLoading(false);
            return;
          }
        }
      }
    }

      // 2. Fallback to AI scraping if not structured
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      let response;
      let attempts = 0;
      const maxAttempts = 6;

      while (attempts < maxAttempts) {
        try {
          attempts++;
          console.log(`AI Generation Attempt ${attempts}...`);
          
          if (inputType === 'url') {
            setStatus('AI is fetching and analyzing website content...');
            response = await ai.models.generateContent({
              model: "gemini-3-flash-preview",
              contents: `Extract ${scrapeVenues ? 'ALL venue, ' : ''}${scrapeBands ? 'ALL band, ' : ''}${scrapeEvents ? 'ALL event ' : ''}information from the following URL: ${url}. 
              
              CRITICAL INSTRUCTIONS: 
              1. Analyze the content at ${url} carefully.
              2. ${scrapeEvents ? 'Extract every upcoming show, performance, or event listed.' : 'Do not extract any events.'}
              3. ${scrapeVenues ? 'Identify the venue.' : 'Do not extract venue information.'}
              4. ${scrapeBands ? 'Identify all performing bands/artists.' : 'Do not extract band information.'}
              5. If the page is a Facebook page, look for the 'Events' or 'About' section content if possible.
              6. Populate the ${scrapeVenues ? "'venues', " : ''}${scrapeBands ? "'bands', " : ''}${scrapeEvents ? "'events' " : ''}arrays in the JSON response.`,
              config: {
                systemInstruction: `You are a professional data extractor. Extract ${scrapeVenues ? 'ALL venue, ' : ''}${scrapeBands ? 'ALL band, ' : ''}${scrapeEvents ? 'ALL event ' : ''}information from the provided URL. You MUST populate the ${scrapeVenues ? 'venues, ' : ''}${scrapeBands ? 'bands, ' : ''}${scrapeEvents ? 'events ' : ''}arrays if any exist in the text. Output ONLY valid JSON. Ensure all JSON brackets are closed. Limit genres to the top 2. If you hit a token limit, ensure the JSON is as complete as possible up to that point.`,
                responseMimeType: "application/json",
                maxOutputTokens: 8192,
                tools: [{ urlContext: {} }],
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    venues: scrapeVenues ? {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          name: { type: Type.STRING, description: "Name of the venue" },
                          address_line1: { type: Type.STRING, description: "Street address" },
                          address_line2: { type: Type.STRING, description: "Suite, unit, etc." },
                          city: { type: Type.STRING },
                          state: { type: Type.STRING },
                          postal_code: { type: Type.STRING },
                          country: { type: Type.STRING },
                          description: { type: Type.STRING, description: "Short description (max 200 chars)" },
                          phone: { type: Type.STRING },
                          email: { type: Type.STRING },
                          website_url: { type: Type.STRING, description: "Official website URL." },
                          facebook_url: { type: Type.STRING },
                          instagram_url: { type: Type.STRING },
                          twitter_url: { type: Type.STRING },
                          tiktok_url: { type: Type.STRING },
                          youtube_url: { type: Type.STRING },
                          spotify_url: { type: Type.STRING },
                          soundcloud_url: { type: Type.STRING },
                          bandcamp_url: { type: Type.STRING },
                          genres: { type: Type.ARRAY, items: { type: Type.STRING } },
                          images: { type: Type.ARRAY, items: { type: Type.STRING } }
                        },
                        required: ["name"]
                      }
                    } : { type: Type.ARRAY, items: { type: Type.OBJECT }, description: "Empty array as venue scraping is disabled" },
                    bands: scrapeBands ? {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          name: { type: Type.STRING, description: "Name of the band" },
                          description: { type: Type.STRING, description: "Short description (max 200 chars)" },
                          website_url: { type: Type.STRING, description: "Official website URL." },
                          facebook_url: { type: Type.STRING },
                          instagram_url: { type: Type.STRING },
                          twitter_url: { type: Type.STRING },
                          tiktok_url: { type: Type.STRING },
                          youtube_url: { type: Type.STRING },
                          spotify_url: { type: Type.STRING },
                          soundcloud_url: { type: Type.STRING },
                          bandcamp_url: { type: Type.STRING },
                          phone: { type: Type.STRING },
                          email: { type: Type.STRING },
                          city: { type: Type.STRING, description: "City where the band is based" },
                          state: { type: Type.STRING, description: "State where the band is based (2-letter code if US)" },
                          genres: { type: Type.ARRAY, items: { type: Type.STRING } },
                          images: { type: Type.ARRAY, items: { type: Type.STRING } }
                        },
                        required: ["name"]
                      }
                    } : { type: Type.ARRAY, items: { type: Type.OBJECT }, description: "Empty array as band scraping is disabled" },
                    events: scrapeEvents ? {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          title: { type: Type.STRING, description: "Title of the event/show" },
                          description: { type: Type.STRING, description: "Short description (max 200 chars)" },
                          start_time: { type: Type.STRING, description: "ISO 8601 date string. If year is missing, assume current year." },
                          venue_name: { type: Type.STRING, description: "Name of the venue where the event is held" },
                          band_names: { type: Type.ARRAY, items: { type: Type.STRING } },
                          genres: { type: Type.ARRAY, items: { type: Type.STRING } }
                        },
                        required: ["title"]
                      }
                    } : { type: Type.ARRAY, items: { type: Type.OBJECT }, description: "Empty array as event scraping is disabled" },
                    genres: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING }
                    }
                  }
                }
              }
            });
          } else {
            setStatus('AI is analyzing pasted text...');
            response = await ai.models.generateContent({
              model: "gemini-3-flash-preview",
              contents: `Extract ${scrapeVenues ? 'venue, ' : ''}${scrapeBands ? 'band, ' : ''}${scrapeEvents ? 'event ' : ''}information from the following text: 
              ---
              ${pastedText.substring(0, 30000)}
              ---
              
              CRITICAL INSTRUCTIONS: 
              1. The text provided is likely a calendar, schedule, or list of upcoming shows. Treat each block of text with a date/time as a separate event.
              2. ${scrapeEvents ? 'Extract ALL events.' : 'Do not extract any events.'}
              3. ${scrapeVenues ? 'Extract ALL venues.' : 'Do not extract any venues.'}
              4. ${scrapeBands ? 'Extract ALL bands.' : 'Do not extract any bands.'}
              5. The event 'title' should be the name of the specific show, performance, or headlining band.
              6. Return a JSON object with:
                 - venues: ${scrapeVenues ? 'array of { name, address_line1, address_line2, city, state, postal_code, country, description, phone, email, website_url, facebook_url, instagram_url, twitter_url, tiktok_url, youtube_url, spotify_url, soundcloud_url, bandcamp_url, genres, images }' : 'empty array'}
                 - bands: ${scrapeBands ? 'array of { name, address_line1, address_line2, city, state, postal_code, country, description, phone, email, website_url, facebook_url, instagram_url, twitter_url, tiktok_url, youtube_url, spotify_url, soundcloud_url, bandcamp_url, genres, images }' : 'empty array'}
                 - events: ${scrapeEvents ? 'array of { title, description, start_time, venue_name, band_names, genres }' : 'empty array'}
                 - genres: array of strings`,
              config: {
                systemInstruction: `You are a professional data extractor. Extract ${scrapeVenues ? 'venue, ' : ''}${scrapeBands ? 'band, ' : ''}${scrapeEvents ? 'event ' : ''}information from the provided text. You MUST populate the ${scrapeVenues ? 'venues, ' : ''}${scrapeBands ? 'bands, ' : ''}${scrapeEvents ? 'events ' : ''}arrays if any exist in the text. Output ONLY valid JSON. Ensure all JSON brackets are closed. Limit genres to the top 2. If you hit a token limit, ensure the JSON is as complete as possible up to that point.`,
                responseMimeType: "application/json",
                maxOutputTokens: 8192,
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    venues: scrapeVenues ? {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          name: { type: Type.STRING },
                          address_line1: { type: Type.STRING },
                          city: { type: Type.STRING },
                          state: { type: Type.STRING },
                          postal_code: { type: Type.STRING },
                          country: { type: Type.STRING },
                          description: { type: Type.STRING },
                          phone: { type: Type.STRING },
                          email: { type: Type.STRING },
                          website_url: { type: Type.STRING },
                          facebook_url: { type: Type.STRING },
                          instagram_url: { type: Type.STRING },
                          twitter_url: { type: Type.STRING },
                          tiktok_url: { type: Type.STRING },
                          youtube_url: { type: Type.STRING },
                          spotify_url: { type: Type.STRING },
                          soundcloud_url: { type: Type.STRING },
                          bandcamp_url: { type: Type.STRING },
                          genres: { type: Type.ARRAY, items: { type: Type.STRING } },
                          images: { type: Type.ARRAY, items: { type: Type.STRING } }
                        },
                        required: ["name"]
                      }
                    } : { type: Type.ARRAY, items: { type: Type.OBJECT }, description: "Empty array as venue scraping is disabled" },
                    bands: scrapeBands ? {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          name: { type: Type.STRING },
                          description: { type: Type.STRING },
                          website_url: { type: Type.STRING },
                          facebook_url: { type: Type.STRING },
                          instagram_url: { type: Type.STRING },
                          twitter_url: { type: Type.STRING },
                          tiktok_url: { type: Type.STRING },
                          youtube_url: { type: Type.STRING },
                          spotify_url: { type: Type.STRING },
                          soundcloud_url: { type: Type.STRING },
                          bandcamp_url: { type: Type.STRING },
                          phone: { type: Type.STRING },
                          email: { type: Type.STRING },
                          genres: { type: Type.ARRAY, items: { type: Type.STRING } },
                          images: { type: Type.ARRAY, items: { type: Type.STRING } }
                        },
                        required: ["name"]
                      }
                    } : { type: Type.ARRAY, items: { type: Type.OBJECT }, description: "Empty array as band scraping is disabled" },
                    events: scrapeEvents ? {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          title: { type: Type.STRING },
                          description: { type: Type.STRING },
                          start_time: { type: Type.STRING },
                          venue_name: { type: Type.STRING },
                          band_names: { type: Type.ARRAY, items: { type: Type.STRING } },
                          genres: { type: Type.ARRAY, items: { type: Type.STRING } }
                        },
                        required: ["title"]
                      }
                    } : { type: Type.ARRAY, items: { type: Type.OBJECT }, description: "Empty array as event scraping is disabled" },
                    genres: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING }
                    }
                  }
                }
              }
            });
          }
          break; // Success!
        } catch (aiErr: any) {
          console.error(`AI Generation Error (Attempt ${attempts}):`, aiErr);
          const errMessage = JSON.stringify(aiErr);
          
          if (errMessage.toLowerCase().includes('quota') || errMessage.includes('429')) {
            throw new Error("Gemini API Quota Exceeded. Please wait a few minutes before trying again or try a smaller amount of text.");
          }

          const isRetryable = errMessage.includes('500') || errMessage.includes('INTERNAL') || errMessage.includes('503') || errMessage.includes('UNAVAILABLE');
          
          if (attempts < maxAttempts && isRetryable) {
            setStatus(`AI is busy. Retrying (${attempts}/${maxAttempts})...`);
            await new Promise(r => setTimeout(r, 5000 * attempts)); // Increased exponential backoff
            continue;
          }
          
          if (isRetryable) {
            throw new Error('The AI is currently unavailable due to high demand. Please try again in a few minutes.');
          }
          throw aiErr;
        }
      }

      let text = response.text;
      
      // Check for extreme repetition (looping)
      if (text.length > 2000) {
        const first500 = text.substring(0, 500);
        const count = (text.match(new RegExp(first500.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
        if (count > 3) {
          console.warn('AI response appears to be looping. Attempting to truncate.');
          // Try to find the first complete JSON object and truncate there
          const lastBrace = text.indexOf('}', 500);
          if (lastBrace !== -1) {
            text = text.substring(0, lastBrace + 1);
          }
        }
      }

      setRawAIResponse(text);
      console.log('Raw AI Response:', text);
      
      // Clean up markdown if present
      text = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
      
      // If the response is still not valid JSON, try to find the JSON block
      if (!text.startsWith('{')) {
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          text = match[0];
        }
      }
      
      // 3. Length check - if it's too long, it's likely looping
      if (text.length > 150000) {
        console.warn('Response too long, likely looping. Truncating...');
        text = text.substring(0, 50000);
      }

      const tryParse = (jsonStr: string) => {
        try {
          return JSON.parse(jsonStr);
        } catch (e) {
          return null;
        }
      };

      // 4. Repetition/Loop detection & In-place replacement
      // Instead of truncating the whole response, we replace the loop in-place
      // to keep the rest of the JSON structure intact.
      const loopRegex = /(.{1,50}?)\1{10,}/g;
      if (loopRegex.test(text)) {
        console.warn('AI loops detected, cleaning up response...');
        text = text.replace(loopRegex, (match, pattern) => {
          console.log('Replacing loop pattern:', pattern);
          return pattern + '...[loop removed]';
        });
      }

      let parsed = tryParse(text);
      
      if (!parsed) {
        console.warn('Initial JSON parse failed, attempting repair...');
        let repairedText = text;
        
        // 1. Handle mid-string truncation (if it still happens)
        const lastQuote = repairedText.lastIndexOf('"');
        const lastColon = repairedText.lastIndexOf(':');
        const lastBrace = repairedText.lastIndexOf('{');
        const lastBracket = repairedText.lastIndexOf('[');
        
        // If it looks like we're in the middle of a key: value pair but value is missing
        const quotesCount = (repairedText.match(/"/g) || []).length;
        if (quotesCount % 2 !== 0) {
          repairedText += '"';
        } else if (lastColon > lastQuote && lastColon > lastBrace && lastColon > lastBracket) {
          // If it looks like we're in the middle of a key: value pair but value is missing
          repairedText += 'null';
        }
        
        // 2. Remove trailing commas and other invalid trailing chars
        repairedText = repairedText.trim().replace(/,$/, '').replace(/,$/, '');
        
        // 3. Try to close arrays and objects
        let openBraces = (repairedText.match(/\{/g) || []).length;
        let closeBraces = (repairedText.match(/\}/g) || []).length;
        let openBrackets = (repairedText.match(/\[/g) || []).length;
        let closeBrackets = (repairedText.match(/\]/g) || []).length;
        
        if (openBraces > closeBraces || openBrackets > closeBrackets) {
          let tempText = repairedText;
          // We need to close them in the correct order (LIFO)
          // This is a simple stack-based approach that ignores chars inside strings
          const stack: string[] = [];
          let inString = false;
          let escaped = false;
          
          for (let i = 0; i < repairedText.length; i++) {
            const char = repairedText[i];
            if (char === '"' && !escaped) {
              inString = !inString;
            }
            if (inString) {
              escaped = char === '\\' && !escaped;
              continue;
            }
            escaped = false;
            
            if (char === '{') stack.push('}');
            else if (char === '[') stack.push(']');
            else if (char === '}') stack.pop();
            else if (char === ']') stack.pop();
          }
          
          // Before closing, remove any trailing comma that would make the JSON invalid
          tempText = tempText.trim().replace(/,$/, '');
          
          while (stack.length > 0) {
            tempText += stack.pop();
          }
          
          parsed = tryParse(tempText);
          if (parsed) {
            console.log('JSON repaired successfully via stack-based closure');
            repairedText = tempText;
          }
        }
        
        if (!parsed) {
          // 4. Even more aggressive: find the last valid object boundary
          // This time we also handle commas before the boundary
          const lastObjectEnd = repairedText.lastIndexOf('}');
          const lastArrayEnd = repairedText.lastIndexOf(']');
          const lastBoundary = Math.max(lastObjectEnd, lastArrayEnd);
          
          if (lastBoundary !== -1) {
            let truncatedText = repairedText.substring(0, lastBoundary + 1);
            // Clean up any trailing commas before the boundary
            truncatedText = truncatedText.replace(/,\s*([\}\]])/g, '$1');
            
            parsed = tryParse(truncatedText);
            if (parsed) console.log('JSON repaired successfully via truncation to last boundary');
          }
        }

        if (!parsed) {
          console.error('JSON repair failed. Repaired text preview:', repairedText.substring(repairedText.length - 200));
        }
      }

      if (parsed) {
        // Cleanup: Truncate any excessively long strings that might be loops
        const truncateLongStrings = (obj: any) => {
          if (!obj || typeof obj !== 'object') return;
          for (const key in obj) {
            if (typeof obj[key] === 'string' && obj[key].length > 500) {
              console.warn(`Truncating long string in field ${key}`, { length: obj[key].length });
              obj[key] = obj[key].substring(0, 500) + '... (truncated)';
            } else if (typeof obj[key] === 'object') {
              truncateLongStrings(obj[key]);
            }
          }
        };
        truncateLongStrings(parsed);

        // Ensure arrays exist even if empty or truncated
        parsed.venues = parsed.venues || [];
        parsed.bands = parsed.bands || [];
        parsed.events = parsed.events || [];
        parsed.genres = parsed.genres || [];
        
        // Fuzzy matching against existing database to identify duplicates before import
        setStatus('Checking for existing records...');
        const { data: existingVenues } = await supabase.from('venues').select('id, name, address_line1, city, state, postal_code, phone, website_url');
        const { data: existingBands } = await supabase.from('bands_ordered').select('id, name, address_line1, city, state, postal_code, phone, website_url');

        const findVenueMatch = (v: any) => {
          return existingVenues?.find(ev => {
            const nameMatch = isSimilar(ev.name, v.name);
            if (!nameMatch) return false;
            
            if (v.address_line1 && ev.address_line1 && isSimilar(ev.address_line1, v.address_line1)) return true;
            if (v.phone && ev.phone && ev.phone.replace(/\D/g, '') === v.phone.replace(/\D/g, '')) return true;
            if (v.website_url && ev.website_url) {
              const vWeb = v.website_url.toLowerCase().replace(/https?:\/\/(www\.)?/, '').replace(/\/$/, '');
              const evWeb = ev.website_url.toLowerCase().replace(/https?:\/\/(www\.)?/, '').replace(/\/$/, '');
              if (vWeb && evWeb && (vWeb.includes(evWeb) || evWeb.includes(vWeb))) return true;
            }
            return true;
          });
        };

        const findBandMatch = (b: any) => {
          return existingBands?.find(eb => {
            const nameMatch = isSimilar(eb.name, b.name);
            if (!nameMatch) return false;
            
            if (b.address_line1 && eb.address_line1 && isSimilar(eb.address_line1, b.address_line1)) return true;
            if (b.phone && eb.phone && eb.phone.replace(/\D/g, '') === b.phone.replace(/\D/g, '')) return true;
            if (b.website_url && eb.website_url) {
              const bWeb = b.website_url.toLowerCase().replace(/https?:\/\/(www\.)?/, '').replace(/\/$/, '');
              const ebWeb = eb.website_url.toLowerCase().replace(/https?:\/\/(www\.)?/, '').replace(/\/$/, '');
              if (bWeb && ebWeb && (bWeb.includes(ebWeb) || ebWeb.includes(bWeb))) return true;
            }
            return true;
          });
        };

        parsed.venues = parsed.venues.map((v: any) => {
          const match = findVenueMatch(v);
          return match ? { ...v, match: match.name, matchId: match.id } : v;
        });

        parsed.bands = parsed.bands.map((b: any) => {
          const match = findBandMatch(b);
          return match ? { ...b, match: match.name, matchId: match.id } : b;
        });

        setResults(parsed);
        setStatus('Analysis complete!');
      } else {
        throw new Error('Failed to parse model response as JSON. The response may have been too long or malformed.');
      }
    } catch (err: any) {
      console.error('Scraper Error:', err);
      setStatus(`Error: ${err.message || 'Failed to scrape website'}. If the URL is blocked (like Facebook), try copying and pasting the text instead.`);
    } finally {
      setLoading(false);
    }
  };

  const splitBandNames = (name: string): string[] => {
    if (!name) return [];
    // Split by common separators: " & ", " and ", ", "
    // We use regex to be more robust
    const parts = name.split(/\s+&\s+|\s+and\s+|,\s+/i);
    return parts.map(p => p.trim()).filter(p => p.length > 0);
  };

  const handleImport = async () => {
    if (!results || !user) {
      console.log('Import aborted: results or user missing', { hasResults: !!results, hasUser: !!user });
      return;
    }
    setLoading(true);
    setImportSummary(null);
    setImportDetails(null);
    setStatus('Importing data to database...');
    let vCount = 0;
    let bCount = 0;
    let eCount = 0;
    let errors = 0;
    let duplicatesSkipped = 0;
    let fuzzyMatches = 0;
    const details: {
      venues: { name: string, status: 'matched' | 'new' | 'error', match?: string, matchId?: string, error?: string, originalData?: any }[],
      bands: { name: string, status: 'matched' | 'new' | 'error', match?: string, matchId?: string, error?: string, originalData?: any }[],
      events: { title: string, status: 'new' | 'error' | 'skipped', reason?: string, error?: string, id?: string, venue_name?: string, band_names?: string[] }[],
      genres: { name: string, status: 'matched' | 'new' | 'error', match?: string, error?: string }[]
    } = { venues: [], bands: [], events: [], genres: [] };

    try {
      console.log('Starting import process for user:', user.id);
      
      // 1. Fetch existing data for fuzzy matching
      const { data: existingVenues, error: evError } = await supabase.from('venues').select('id, name, address_line1, city, state, postal_code, phone, website_url');
      const { data: existingBands, error: ebError } = await supabase.from('bands_ordered').select('id, name, address_line1, city, state, postal_code, phone, website_url');
      const { data: existingGenres, error: egError } = await supabase.from('genres').select('id, name');
      const { data: existingEvents, error: eeError } = await supabase.from('events').select('id, title, venue_id');
      
      if (evError) console.error('Error fetching existing venues:', evError.message || evError);
      if (ebError) console.error('Error fetching existing bands:', ebError.message || ebError);
      if (egError) console.error('Error fetching existing genres:', egError.message || egError);
      if (eeError) console.error('Error fetching existing events:', eeError.message || eeError);
      
      const venueMap = new Map<string, string>();
      const bandMap = new Map<string, string>();
      const genreMap = new Map<string, string>();

      // Populate genre map
      existingGenres?.forEach(g => genreMap.set(g.name.toLowerCase(), g.id));

      const matchOrCreateGenre = async (genreName: string) => {
        const normalized = genreName.toLowerCase().trim();
        if (!normalized) return null;
        
        // Check if already in map (including pre-existing and newly created in this session)
        if (genreMap.has(normalized)) return genreMap.get(normalized);

        // Try fuzzy match in existing genres
        const match = existingGenres?.find(eg => isSimilar(eg.name, genreName));
        if (match) {
          genreMap.set(normalized, match.id);
          // Only add to details if not already logged
          if (!details.genres.find(g => g.name.toLowerCase() === normalized)) {
            details.genres.push({ name: genreName, status: 'matched', match: match.name });
          }
          return match.id;
        }

        // Create new genre if not found
        const { data, error } = await supabase.from('genres').insert({ 
          name: genreName,
          created_by_id: personId,
          updated_at: new Date().toISOString(),
          updated_by_id: personId
        }).select().maybeSingle();
        if (data) {
          genreMap.set(normalized, data.id);
          if (!details.genres.find(g => g.name.toLowerCase() === normalized)) {
            details.genres.push({ name: genreName, status: 'new' });
          }
          return data.id;
        }
        if (error) {
          if (!details.genres.find(g => g.name.toLowerCase() === normalized)) {
            details.genres.push({ name: genreName, status: 'error', error: error.message });
          }
        }
        return null;
      };

      // 1.5 Process top-level genres first to ensure they are matched/created
      if (Array.isArray(results.genres)) {
        console.log('Processing top-level genres:', results.genres);
        for (const gName of results.genres) {
          await matchOrCreateGenre(gName);
        }
      }

      // 2. Process Venues (from explicit list and events)
      if (scrapeVenues) {
        const allVenueNames = new Set<string>();
        results.venues.forEach((v: any) => { if (v.name) allVenueNames.add(v.name.trim()); });
        if (scrapeEvents) {
          results.events.forEach((e: any) => { if (e.venue_name) allVenueNames.add(e.venue_name.trim()); });
        }

        console.log('Processing venues:', Array.from(allVenueNames));

        for (const vName of allVenueNames) {
          if (!vName) continue;
          
          // Check if already in map
          if (venueMap.has(vName)) continue;

          const venueData = results.venues.find((v: any) => v.name?.trim() === vName) || { name: vName };

          // Check fuzzy match in existing
          const match = existingVenues?.find(ev => {
            const nameMatch = isSimilar(ev.name, vName);
            if (!nameMatch) return false;
            
            // If name matches, check other fields for confirmation if available
            if (venueData.address_line1 && ev.address_line1 && isSimilar(ev.address_line1, venueData.address_line1)) return true;
            if (venueData.phone && ev.phone && ev.phone.replace(/\D/g, '') === venueData.phone.replace(/\D/g, '')) return true;
            if (venueData.website_url && ev.website_url) {
              const vWeb = venueData.website_url.toLowerCase().replace(/https?:\/\/(www\.)?/, '').replace(/\/$/, '');
              const evWeb = ev.website_url.toLowerCase().replace(/https?:\/\/(www\.)?/, '').replace(/\/$/, '');
              if (vWeb && evWeb && (vWeb.includes(evWeb) || evWeb.includes(vWeb))) return true;
            }
            return true;
          });
          
          if (match) {
            console.log('Fuzzy match found for venue:', vName, '->', match.name, match.id);
            venueMap.set(vName, match.id);
            details.venues.push({ 
              name: vName, 
              status: 'matched', 
              match: match.name, 
              matchId: match.id,
              originalData: venueData
            });
            fuzzyMatches++;
            continue;
          }
          console.log('Inserting new venue:', vName, venueData);
          
          const venueToInsert = {
            name: vName,
            address_line1: venueData.address_line1 || '',
            address_line2: venueData.address_line2 || '',
            city: venueData.city || '',
            state: venueData.state || '',
            postal_code: venueData.postal_code || '',
            country: venueData.country || 'US',
            description: venueData.description || '',
            phone: venueData.phone || '',
            email: (venueData.email || '').toLowerCase().trim(),
            website_url: cleanWebsiteUrl(venueData.website_url),
            facebook_url: venueData.facebook_url || '',
            instagram_url: venueData.instagram_url || '',
            twitter_url: venueData.twitter_url || '',
            x_url: venueData.x_url || '',
            tiktok_url: venueData.tiktok_url || '',
            youtube_url: venueData.youtube_url || '',
            spotify_url: venueData.spotify_url || '',
            apple_music_url: venueData.apple_music_url || '',
            soundcloud_url: venueData.soundcloud_url || '',
            bandcamp_url: venueData.bandcamp_url || '',
            images: Array.isArray(venueData.images) ? venueData.images : [],
            manager_id: null,
            created_by_id: personId,
            updated_at: new Date().toISOString(),
            updated_by_id: personId
          };

          const { data, error } = await supabase.from('venues').insert(venueToInsert).select().maybeSingle();
          
          if (data) {
            console.log('Successfully inserted venue:', data.name, data.id);
            venueMap.set(vName, data.id);
            vCount++;
            details.venues.push({ name: vName, status: 'new' });

            // Save venue genres
            if (Array.isArray(venueData.genres)) {
              for (const gName of venueData.genres) {
                const genreId = await matchOrCreateGenre(gName);
                if (genreId) {
                  const { error: vgError } = await supabase.from('venue_genres').insert({ 
                    venue_id: data.id, 
                    genre_id: genreId,
                    created_by_id: personId,
                    updated_at: new Date().toISOString(),
                    updated_by_id: personId
                  });
                  if (vgError) console.error('Error linking venue to genre:', vName, gName, vgError);
                }
              }
            }

            // Notify
            try {
              await fetch('/api/notify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'venue', name: vName, details: venueToInsert })
              });
            } catch (nErr) {
              console.warn('Notification failed for venue:', vName, nErr);
            }
          } else if (error) {
            console.error('Error inserting venue:', vName, error);
            errors++;
            details.venues.push({ 
              name: vName, 
              status: 'error', 
              error: `${error.code}: ${error.message}${error.details ? ` (${error.details})` : ''}` 
            });
          }
        }
      }

      // 3. Process Bands (from explicit list and events)
      if (scrapeBands) {
        const allBandNames = new Set<string>();
        results.bands.forEach((b: any) => { 
          if (b.name) {
            splitBandNames(b.name).forEach(n => allBandNames.add(n));
          }
        });
        if (scrapeEvents) {
          results.events.forEach((e: any) => { 
            if (Array.isArray(e.band_names)) {
              e.band_names.forEach((bn: string) => { 
                if (bn) splitBandNames(bn).forEach(n => allBandNames.add(n));
              });
            } else if (e.band_name) {
              splitBandNames(e.band_name).forEach(n => allBandNames.add(n));
            }
          });
        }

        console.log('Processing bands:', Array.from(allBandNames));

        for (const bName of allBandNames) {
          if (!bName) continue;

          if (bandMap.has(bName)) continue;

          const bandData = results.bands.find((b: any) => b.name?.trim() === bName) || { name: bName };

          const match = existingBands?.find(eb => {
            const nameMatch = isSimilar(eb.name, bName);
            if (!nameMatch) return false;
            
            if (bandData.phone && eb.phone && eb.phone.replace(/\D/g, '') === bandData.phone.replace(/\D/g, '')) return true;
            if (bandData.website_url && eb.website_url) {
              const bWeb = bandData.website_url.toLowerCase().replace(/https?:\/\/(www\.)?/, '').replace(/\/$/, '');
              const ebWeb = eb.website_url.toLowerCase().replace(/https?:\/\/(www\.)?/, '').replace(/\/$/, '');
              if (bWeb && ebWeb && (bWeb.includes(ebWeb) || ebWeb.includes(bWeb))) return true;
            }
            return true;
          });
          
          if (match) {
            console.log('Fuzzy match found for band:', bName, '->', match.name, match.id);
            bandMap.set(bName, match.id);
            details.bands.push({ 
              name: bName, 
              status: 'matched', 
              match: match.name, 
              matchId: match.id,
              originalData: bandData
            });
            fuzzyMatches++;
            continue;
          }
          console.log('Inserting new band:', bName, bandData);
          
          const bandToInsert = {
            name: bName,
            address_line1: bandData.address_line1 || '',
            address_line2: bandData.address_line2 || '',
            city: bandData.city || '',
            state: bandData.state || '',
            postal_code: bandData.postal_code || '',
            country: bandData.country || 'US',
            description: bandData.description || '',
            phone: bandData.phone || '',
            email: (bandData.email || '').toLowerCase().trim(),
            website_url: cleanWebsiteUrl(bandData.website_url),
            facebook_url: bandData.facebook_url || '',
            instagram_url: bandData.instagram_url || '',
            twitter_url: bandData.twitter_url || '',
            x_url: bandData.x_url || '',
            tiktok_url: bandData.tiktok_url || '',
            youtube_url: bandData.youtube_url || '',
            spotify_url: bandData.spotify_url || '',
            apple_music_url: bandData.apple_music_url || '',
            soundcloud_url: bandData.soundcloud_url || '',
            bandcamp_url: bandData.bandcamp_url || '',
            images: Array.isArray(bandData.images) ? bandData.images : [],
            manager_id: null,
            created_by_id: personId,
            updated_at: new Date().toISOString(),
            updated_by_id: personId
          };

          const { data, error } = await supabase.from('bands').insert(bandToInsert).select().maybeSingle();
          
          if (data) {
            console.log('Successfully inserted band:', data.name, data.id);
            bandMap.set(bName, data.id);
            bCount++;
            details.bands.push({ name: bName, status: 'new' });

            // Save band genres
            if (Array.isArray(bandData.genres)) {
              for (const gName of bandData.genres) {
                const genreId = await matchOrCreateGenre(gName);
                if (genreId) {
                  const { error: bgError } = await supabase.from('band_genres').insert({ 
                    band_id: data.id, 
                    genre_id: genreId,
                    created_by_id: personId,
                    updated_at: new Date().toISOString(),
                    updated_by_id: personId
                  });
                  if (bgError) console.error('Error linking band to genre:', bName, gName, bgError);
                }
              }
            }

            // Notify
            try {
              await fetch('/api/notify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'band', name: bName, details: bandToInsert })
              });
            } catch (nErr) {
              console.warn('Notification failed for band:', bName, nErr);
            }
          } else if (error) {
            console.error('Error inserting band:', bName, error);
            errors++;
            details.bands.push({ 
              name: bName, 
              status: 'error', 
              error: `${error.code}: ${error.message}${error.details ? ` (${error.details})` : ''}` 
            });
          }
        }
      }

      // 4. Import Events
      if (scrapeEvents) {
        console.log('Processing events:', results.events.length);
        const processedEventKeys = new Set<string>();
        
        for (const e of results.events) {
          const vName = e.venue_name?.trim();
          const eventKey = `${e.title?.trim()}|${vName}|${e.start_time?.trim()}`;
          
          if (processedEventKeys.has(eventKey)) {
            console.log('Skipping duplicate event in results:', eventKey);
            duplicatesSkipped++;
            details.events.push({ title: e.title || 'Untitled', status: 'skipped', reason: 'Duplicate in scrape results' });
            continue;
          }
          processedEventKeys.add(eventKey);

        let bNames: string[] = [];
        if (Array.isArray(e.band_names)) {
          e.band_names.forEach(bn => {
            bNames = [...bNames, ...splitBandNames(bn)];
          });
        } else if (e.band_name) {
          bNames = splitBandNames(e.band_name);
        }
        
        const venueId = selectedVenueId || venueMap.get(vName);

        if (venueId) {
          const genericTitles = ['live music', 'event', 'show', 'concert', 'performance'];
          const titleLower = e.title?.toLowerCase().trim() || '';
          const isGeneric = !e.title || genericTitles.includes(titleLower) || isSimilar(e.title || '', vName || '');
          const finalTitle = isGeneric && bNames.length > 0 ? bNames.join(' & ') : (e.title || 'Live Music');

          // Check if event already exists in DB for this venue
          const eventExists = existingEvents?.some(ee => 
            ee.venue_id === venueId && 
            isSimilar(ee.title, finalTitle)
          );

          if (eventExists) {
            console.log('Skipping event: Already exists in database:', finalTitle);
            duplicatesSkipped++;
            details.events.push({ title: finalTitle, status: 'skipped', reason: 'Already exists in database' });
            continue;
          }

          console.log('Inserting event for venueId:', venueId, finalTitle);
          const eventToInsert: any = {
            venue_id: venueId,
            title: finalTitle,
            description: e.description || '',
            is_published: false,
            is_public: true,
            created_by_id: personId,
            updated_at: new Date().toISOString(),
            updated_by_id: personId
          };

          const { data: eventData, error: eventError } = await supabase.from('events').insert(eventToInsert).select().maybeSingle();
          
          if (eventData) {
            eCount++;
            details.events.push({ 
              title: finalTitle, 
              status: 'new', 
              id: eventData.id,
              venue_name: vName,
              band_names: bNames
            });

            // Link bands to event
            const bandsToLink = [...bNames];
            if (selectedBandId) {
                // Find band name for selectedBandId
                const selectedBand = bands.find(b => b.id === selectedBandId);
                if (selectedBand && !bandsToLink.includes(selectedBand.name)) {
                    bandsToLink.push(selectedBand.name);
                }
            }

            for (const bName of bandsToLink) {
              const bandId = bandMap.get(bName) || (bName === bands.find(b => b.id === selectedBandId)?.name ? selectedBandId : null);
              if (bandId) {
                await supabase.from('acts').insert({
                  event_id: eventData.id,
                  band_id: bandId,
                  start_time: e.start_time || new Date().toISOString(),
                  created_by_id: personId,
                  updated_at: new Date().toISOString(),
                  updated_by_id: personId
                });
              }
            }

            // Link genres to event
            if (Array.isArray(e.genres)) {
              for (const gName of e.genres) {
                const genreId = await matchOrCreateGenre(gName);
                if (genreId) {
                  await supabase.from('event_genres').insert({ event_id: eventData.id, genre_id: genreId });
                }
              }
            }

            // Notify
            try {
              await fetch('/api/notify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'event', name: finalTitle, details: eventToInsert })
              });
            } catch (nErr) {
              console.warn('Notification failed for event:', finalTitle, nErr);
            }
          } else if (eventError) {
            console.error('Error inserting event:', finalTitle, eventError);
            errors++;
            details.events.push({ title: finalTitle, status: 'error', error: eventError.message });
          }
        } else {
          console.warn('Skipping event: Venue not found/created:', vName, e.title);
          details.events.push({ title: e.title, status: 'skipped', reason: `Venue "${vName}" not found or created` });
        }
      }
      }

      // Log the import
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        table_name: 'scraper_import',
        record_id: user.id,
        changes: {
          type: 'import',
          summary: {
            venues: vCount,
            bands: bCount,
            events: eCount,
            genres: details.genres.filter(g => g.status === 'new').length,
            duplicates_skipped: duplicatesSkipped,
            fuzzy_matches: fuzzyMatches
          },
          url: url || 'Pasted Text'
        }
      });

      setImportSummary({ 
        venues: vCount, 
        bands: bCount, 
        events: eCount, 
        genres: details.genres.filter(g => g.status === 'new').length,
        duplicatesSkipped,
        fuzzyMatches
      });
      setImportDetails(details);
      setResults(null); 
      setStatus('Import complete!');
      refreshProfile();
    } catch (err: any) {
      console.error('Import Error:', err);
      setStatus('Error occurred during import.');
      alert(err.message || 'Import failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveRecord = (type: 'venues' | 'bands' | 'events', index: number) => {
    if (!results) return;
    const newResults = { ...results };
    newResults[type] = [...newResults[type]];
    newResults[type].splice(index, 1);
    
    // If all arrays are empty, clear results entirely
    const isEmpty = newResults.venues.length === 0 && 
                  newResults.bands.length === 0 && 
                  newResults.events.length === 0;
    
    if (isEmpty) {
      setResults(null);
    } else {
      setResults(newResults);
    }
  };

  const handleImportSingle = async (type: 'venues' | 'bands' | 'events', index: number, overrideData?: any) => {
    if (!results || !user) return;
    
    setLoading(true);
    setStatus(`Importing single ${type.slice(0, -1)}...`);
    
    try {
      const item = overrideData || results[type][index];
      
      // 1. Fetch existing data for fuzzy matching
      const { data: existingVenues } = await supabase.from('venues').select('id, name');
      const { data: existingBands } = await supabase.from('bands_ordered').select('id, name');
      const { data: existingGenres } = await supabase.from('genres').select('id, name');
      
      const genreMap = new Map<string, string>();
      existingGenres?.forEach(g => genreMap.set(g.name.toLowerCase(), g.id));

      const matchOrCreateGenre = async (genreName: string) => {
        const normalized = genreName.toLowerCase().trim();
        if (!normalized) return null;
        if (genreMap.has(normalized)) return genreMap.get(normalized);
        const match = existingGenres?.find(eg => isSimilar(eg.name, genreName));
        if (match) {
          genreMap.set(normalized, match.id);
          return match.id;
        }
        const { data } = await supabase.from('genres').insert({ name: genreName }).select().maybeSingle();
        if (data) {
          genreMap.set(normalized, data.id);
          return data.id;
        }
        return null;
      };

      if (type === 'venues') {
        const vName = item.name?.trim();
        if (!vName) throw new Error('Venue name is missing');
        
        // If we haven't already identified this as a match in the UI, check again
        if (!item.match) {
          const match = existingVenues?.find(ev => isSimilar(ev.name, vName));
          if (match) {
            throw new Error(`A similar venue "${match.name}" already exists.`);
          }
        }

        const venueToInsert = {
          name: vName,
          address_line1: item.address_line1 || '',
          address_line2: item.address_line2 || '',
          city: item.city || '',
          state: item.state || '',
          postal_code: item.postal_code || '',
          country: item.country || 'US',
          description: item.description || '',
          phone: item.phone || '',
          email: (item.email || '').toLowerCase().trim(),
          website_url: cleanWebsiteUrl(item.website_url),
          facebook_url: item.facebook_url || '',
          instagram_url: item.instagram_url || '',
          twitter_url: item.twitter_url || '',
          x_url: item.x_url || '',
          tiktok_url: item.tiktok_url || '',
          youtube_url: item.youtube_url || '',
          spotify_url: item.spotify_url || '',
          apple_music_url: item.apple_music_url || '',
          soundcloud_url: item.soundcloud_url || '',
          bandcamp_url: item.bandcamp_url || '',
          images: Array.isArray(item.images) ? item.images : [],
          manager_id: null
        };

        const { data, error } = await supabase.from('venues').insert(venueToInsert).select().maybeSingle();
        if (error) throw error;
        if (data) {
          if (Array.isArray(item.genres)) {
            for (const gName of item.genres) {
              const genreId = await matchOrCreateGenre(gName);
              if (genreId) await supabase.from('venue_genres').insert({ venue_id: data.id, genre_id: genreId });
            }
          }
          handleRemoveRecord('venues', index);
          setStatus('Venue imported successfully!');
          
          // Notify
          try {
            await fetch('/api/notify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ type: 'venue', name: vName, details: venueToInsert })
            });
          } catch (nErr) {
            console.warn('Notification failed for venue:', vName, nErr);
          }

          setEditingRecord(null);
        }
      } else if (type === 'bands') {
        const bName = item.name?.trim();
        if (!bName) throw new Error('Band name is missing');
        
        // If we haven't already identified this as a match in the UI, check again
        if (!item.match) {
          const match = existingBands?.find(eb => isSimilar(eb.name, bName));
          if (match) {
            throw new Error(`A similar band "${match.name}" already exists.`);
          }
        }

        const bandToInsert = {
          name: bName,
          address_line1: item.address_line1 || '',
          address_line2: item.address_line2 || '',
          city: item.city || '',
          state: item.state || '',
          postal_code: item.postal_code || '',
          country: item.country || 'US',
          description: item.description || '',
          phone: item.phone || '',
          email: (item.email || '').toLowerCase().trim(),
          website_url: cleanWebsiteUrl(item.website_url),
          facebook_url: item.facebook_url || '',
          instagram_url: item.instagram_url || '',
          twitter_url: item.twitter_url || '',
          x_url: item.x_url || '',
          tiktok_url: item.tiktok_url || '',
          youtube_url: item.youtube_url || '',
          spotify_url: item.spotify_url || '',
          apple_music_url: item.apple_music_url || '',
          soundcloud_url: item.soundcloud_url || '',
          bandcamp_url: item.bandcamp_url || '',
          images: Array.isArray(item.images) ? item.images : [],
          manager_id: null
        };

        const { data, error } = await supabase.from('bands').insert(bandToInsert).select().maybeSingle();
        if (error) throw error;
        if (data) {
          if (Array.isArray(item.genres)) {
            for (const gName of item.genres) {
              const genreId = await matchOrCreateGenre(gName);
              if (genreId) await supabase.from('band_genres').insert({ band_id: data.id, genre_id: genreId });
            }
          }
          handleRemoveRecord('bands', index);
          setStatus('Band imported successfully!');

          // Notify
          try {
            await fetch('/api/notify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ type: 'band', name: bName, details: bandToInsert })
            });
          } catch (nErr) {
            console.warn('Notification failed for band:', bName, nErr);
          }

          setEditingRecord(null);
        }
      } else if (type === 'events') {
        const vName = item.venue_name?.trim();
        if (!vName) throw new Error('Venue name is missing for this event');
        
        // Find or create venue
        let venueId = existingVenues?.find(ev => isSimilar(ev.name, vName))?.id;
        if (!venueId) {
          const { data: newVenue } = await supabase.from('venues').insert({ 
            name: vName, 
            manager_id: null 
          }).select().maybeSingle();
          if (newVenue) venueId = newVenue.id;
        }

        if (!venueId) throw new Error(`Could not find or create venue "${vName}"`);

        // Link bands
        let bNames: string[] = [];
        if (Array.isArray(item.band_names)) {
          item.band_names.forEach(bn => {
            bNames = [...bNames, ...splitBandNames(bn)];
          });
        } else if (item.band_name) {
          bNames = splitBandNames(item.band_name);
        }

        const genericTitles = ['live music', 'event', 'show', 'concert', 'performance'];
        const titleLower = item.title?.toLowerCase().trim() || '';
        const isGeneric = !item.title || genericTitles.includes(titleLower) || isSimilar(item.title || '', vName || '');
        const finalTitle = isGeneric && bNames.length > 0 ? bNames.join(' & ') : (item.title || 'Live Music');

        // Check for existing event
        const { data: existingEvents } = await supabase.from('events')
          .select('id, title')
          .eq('venue_id', venueId);
        
        const eventExists = existingEvents?.some(ee => isSimilar(ee.title, finalTitle));
        if (eventExists) {
          throw new Error(`An event similar to "${finalTitle}" already exists at this venue.`);
        }

        const eventToInsert = {
          venue_id: venueId,
          title: finalTitle,
          description: item.description || '',
          is_published: false,
          is_public: true
        };

        const { data: eventData, error: eventError } = await supabase.from('events').insert(eventToInsert).select().maybeSingle();
        if (eventError) throw eventError;
        if (eventData) {
          for (const bn of bNames) {
            let bandId = existingBands?.find(eb => isSimilar(eb.name, bn))?.id;
            if (!bandId) {
              const { data: newBand } = await supabase.from('bands').insert({ 
                name: bn, 
                manager_id: null 
              }).select().maybeSingle();
              if (newBand) bandId = newBand.id;
            }
            if (bandId) {
              await supabase.from('acts').insert({
                event_id: eventData.id,
                band_id: bandId,
                start_time: item.start_time || new Date().toISOString()
              });
            }
          }

          // Link genres to event
          if (Array.isArray(item.genres)) {
            for (const gName of item.genres) {
              const genreId = await matchOrCreateGenre(gName);
              if (genreId) {
                await supabase.from('event_genres').insert({ event_id: eventData.id, genre_id: genreId });
              }
            }
          }

          // Notify
          try {
            await fetch('/api/notify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ type: 'event', name: finalTitle, details: eventToInsert })
            });
          } catch (nErr) {
            console.warn('Notification failed for event:', finalTitle, nErr);
          }

          handleRemoveRecord('events', index);
          setStatus('Event imported successfully!');
          setEditingRecord(null);
        }
      }
      
      setTimeout(() => setStatus(''), 2000);
      refreshProfile();
    } catch (err: any) {
      console.error('Single Import Error:', err);
      alert(err.message || 'Import failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleOverrideMatch = async (item: any, type: 'venue' | 'band') => {
    if (!user || !importDetails) return;
    
    setLoading(true);
    setStatus(`Overriding ${type} match and creating new record...`);
    
    try {
      const originalData = item.originalData;
      const name = item.name;
      const matchId = item.matchId;
      
      let newId = '';
      
      if (type === 'venue') {
        const venueToInsert = {
          name: name,
          address_line1: originalData.address_line1 || '',
          address_line2: originalData.address_line2 || '',
          city: originalData.city || '',
          state: originalData.state || '',
          postal_code: originalData.postal_code || '',
          country: originalData.country || 'US',
          description: originalData.description || '',
          phone: originalData.phone || '',
          email: (originalData.email || '').toLowerCase().trim(),
          website_url: cleanWebsiteUrl(originalData.website_url),
          facebook_url: originalData.facebook_url || '',
          instagram_url: originalData.instagram_url || '',
          twitter_url: originalData.twitter_url || '',
          tiktok_url: originalData.tiktok_url || '',
          youtube_url: originalData.youtube_url || '',
          spotify_url: originalData.spotify_url || '',
          soundcloud_url: originalData.soundcloud_url || '',
          bandcamp_url: originalData.bandcamp_url || '',
          images: Array.isArray(originalData.images) ? originalData.images : [],
          manager_id: null
        };
        
        const { data, error } = await supabase.from('venues').insert(venueToInsert).select().maybeSingle();
        if (error) throw error;
        if (!data) throw new Error('Failed to create venue');
        newId = data.id;
        
        // Update events created in this session that were linked to the matchId because of this name
        const eventsToUpdate = importDetails.events
          .filter(e => e.status === 'new' && e.venue_name === name && e.id)
          .map(e => e.id);
          
        if (eventsToUpdate.length > 0) {
          const { error: updateError } = await supabase
            .from('events')
            .update({ venue_id: newId })
            .in('id', eventsToUpdate);
          if (updateError) console.error('Error updating events with new venue:', updateError);
        }
      } else {
        const bandToInsert = {
          name: name,
          address_line1: originalData.address_line1 || '',
          address_line2: originalData.address_line2 || '',
          city: originalData.city || '',
          state: originalData.state || '',
          postal_code: originalData.postal_code || '',
          country: originalData.country || 'US',
          description: originalData.description || '',
          phone: originalData.phone || '',
          email: (originalData.email || '').toLowerCase().trim(),
          website_url: cleanWebsiteUrl(originalData.website_url),
          facebook_url: originalData.facebook_url || '',
          instagram_url: originalData.instagram_url || '',
          twitter_url: originalData.twitter_url || '',
          tiktok_url: originalData.tiktok_url || '',
          youtube_url: originalData.youtube_url || '',
          spotify_url: originalData.spotify_url || '',
          soundcloud_url: originalData.soundcloud_url || '',
          bandcamp_url: originalData.bandcamp_url || '',
          images: Array.isArray(originalData.images) ? originalData.images : [],
          manager_id: null
        };
        
        const { data, error } = await supabase.from('bands').insert(bandToInsert).select().maybeSingle();
        if (error) throw error;
        if (!data) throw new Error('Failed to create band');
        newId = data.id;
        
        // Update acts created in this session that were linked to the matchId because of this name
        const eventsWithThisBand = importDetails.events
          .filter(e => e.status === 'new' && e.band_names?.includes(name) && e.id)
          .map(e => e.id);
          
        if (eventsWithThisBand.length > 0) {
          const { error: updateError } = await supabase
            .from('acts')
            .update({ band_id: newId })
            .in('event_id', eventsWithThisBand)
            .eq('band_id', matchId);
          if (updateError) console.error('Error updating acts with new band:', updateError);
        }
      }
      
      // Update local state
      const updatedVenues = [...importDetails.venues];
      const updatedBands = [...importDetails.bands];
      
      if (type === 'venue') {
        const idx = updatedVenues.findIndex(v => v.name === name);
        if (idx !== -1) updatedVenues[idx] = { ...updatedVenues[idx], status: 'new' };
      } else {
        const idx = updatedBands.findIndex(b => b.name === name);
        if (idx !== -1) updatedBands[idx] = { ...updatedBands[idx], status: 'new' };
      }
      
      setImportDetails({
        ...importDetails,
        venues: updatedVenues,
        bands: updatedBands
      });
      
      // Update summary
      if (importSummary) {
        setImportSummary({
          ...importSummary,
          venues: type === 'venue' ? importSummary.venues + 1 : importSummary.venues,
          bands: type === 'band' ? importSummary.bands + 1 : importSummary.bands,
          fuzzyMatches: importSummary.fuzzyMatches - 1
        });
      }
      
      setStatus('Override successful!');
      setTimeout(() => setStatus(''), 2000);
      
    } catch (err: any) {
      console.error('Override Error:', err);
      alert(err.message || 'Override failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <Card className="p-8 space-y-6 mb-6">
        <h2 className="text-2xl font-bold text-white">Scraper Settings</h2>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer text-neutral-300 hover:text-white transition-colors">
            <input type="checkbox" checked={scrapeVenues} onChange={(e) => setScrapeVenues(e.target.checked)} className="accent-blue-600" />
            Venues
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-neutral-300 hover:text-white transition-colors">
            <input type="checkbox" checked={scrapeBands} onChange={(e) => setScrapeBands(e.target.checked)} className="accent-blue-600" />
            Bands
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-neutral-300 hover:text-white transition-colors">
            <input type="checkbox" checked={scrapeEvents} onChange={(e) => setScrapeEvents(e.target.checked)} className="accent-blue-600" />
            Events
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2">Target Venue (Optional)</label>
            <select value={selectedVenueId} onChange={(e) => handleVenueChange(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-sm outline-none text-white focus:border-blue-600 transition-colors">
              <option value="">Select Venue</option>
              {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2">Target Band (Optional)</label>
            <select value={selectedBandId} onChange={(e) => handleBandChange(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-sm outline-none text-white focus:border-blue-600 transition-colors">
              <option value="">Select Band</option>
              {bands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-4">
          <Button 
            variant={inputType === 'url' ? 'primary' : 'secondary'}
            onClick={() => setInputType('url')}
          >
            Website URL
          </Button>
          <Button 
            variant={inputType === 'text' ? 'primary' : 'secondary'}
            onClick={() => setInputType('text')}
          >
            Paste Text / Upload File
          </Button>
        </div>

        {inputType === 'url' ? (
          <div className="flex gap-4">
            <Input 
              placeholder="https://example.com/events"
              className="flex-1"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <Button 
              onClick={handleScrape}
              disabled={loading}
              className="px-8"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
              {loading ? `Analyzing (${elapsedTime}s)...` : 'Analyze Website'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <p className="text-sm text-neutral-400">Paste text content (CSV, Tab, or Pipe delimited) or upload a document (.txt, .csv, .xlsx, .docx)</p>
                <p className="text-[10px] text-neutral-500 italic">
                  Structured format: type | name | field1 | field2... (e.g. venue | The Grove | 123 Main St | 555-1234)
                </p>
              </div>
              <Button 
                variant="ghost"
                onClick={() => fileInputRef.current?.click()}
                className="text-blue-500 hover:text-blue-400"
              >
                <Upload size={16} className="mr-2" />
                Upload File
              </Button>
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                accept=".txt,.csv,.xlsx,.xls,.docx"
              />
            </div>
            <Textarea 
              placeholder="Paste event listings, calendar text, or band info here..."
              className="w-full h-64"
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
            />
            <Button 
              onClick={handleScrape}
              disabled={loading || !pastedText}
              className="w-full"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
              {loading ? `Analyzing (${elapsedTime}s)...` : 'Analyze Text Content'}
            </Button>
          </div>
        )}

        {status && (
          <div className="mt-4 flex items-center gap-2 text-sm text-neutral-400">
            {loading && <Loader2 className="animate-spin text-blue-600" size={14} />}
            {status}
          </div>
        )}
      </Card>
      
      {showMappingPreview && (
        <Card className="p-8 space-y-6 mb-6 border-blue-600/50 bg-blue-600/5">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Settings className="text-blue-500" size={20} />
              Import Mapping Preview
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setShowMappingPreview(false)}>
              <X size={16} />
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Column Mapping</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                {mappingPreview.map((m, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-neutral-950 rounded-xl border border-neutral-800">
                    <div className="space-y-1">
                      <p className="text-xs text-neutral-500">Header: <span className="text-white font-mono">{m.header}</span></p>
                      <p className="text-xs text-neutral-500">Sample: <span className="text-neutral-400 italic">{m.sampleValue || '(empty)'}</span></p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${m.internalField === 'Unknown column' ? 'bg-neutral-800 text-neutral-500' : 'bg-blue-600/20 text-blue-400'}`}>
                        {m.internalField}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Validation Status</h4>
              <div className="space-y-3">
                {missingRequiredHeaders.length > 0 && (
                  <div className="p-4 bg-red-600/20 border border-red-600 rounded-xl">
                    <p className="text-sm font-bold text-red-500 mb-1 flex items-center gap-2">
                      <X size={18} /> Import Blocked: Missing Required Fields
                    </p>
                    <p className="text-xs text-red-400/80">The following columns are required but missing: {missingRequiredHeaders.join(', ')}</p>
                  </div>
                )}

                {duplicateHeaders.length > 0 && (
                  <div className="p-4 bg-yellow-600/20 border border-yellow-600 rounded-xl">
                    <p className="text-sm font-bold text-yellow-500 mb-1 flex items-center gap-2">
                      <AlertTriangle size={18} /> Warning: Duplicate Headers Detected
                    </p>
                    <p className="text-xs text-yellow-500/80 mb-2">Duplicate or repeated header rows were found and will be skipped:</p>
                    <ul className="text-xs text-yellow-500/70 list-disc list-inside">
                      {duplicateHeaders.map((h, i) => <li key={i}>{h}</li>)}
                    </ul>
                  </div>
                )}

                {aliasedHeaders.length > 0 && (
                  <div className="p-4 bg-blue-600/20 border border-blue-600 rounded-xl">
                    <p className="text-sm font-bold text-blue-400 mb-1 flex items-center gap-2">
                      <Info size={18} /> Notice: Automatic Header Mapping
                    </p>
                    <p className="text-xs text-blue-400/80 mb-2">Some headers were automatically mapped to standard fields:</p>
                    <div className="grid grid-cols-1 gap-1">
                      {aliasedHeaders.map((a, i) => (
                        <div key={i} className="text-[10px] flex items-center gap-2 text-blue-400/60">
                          <span className="font-mono bg-blue-900/30 px-1 rounded">{a.original}</span>
                          <span>→</span>
                          <span className="font-mono bg-blue-900/30 px-1 rounded">{a.mapped}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {unknownHeaders.length > 0 && (
                  <div className="p-4 bg-neutral-800 border border-neutral-600 rounded-xl">
                    <p className="text-sm font-bold text-neutral-300 mb-1 flex items-center gap-2">
                      <HelpCircle size={18} /> Warning: Unknown Columns
                    </p>
                    <p className="text-xs text-neutral-400 mb-2">These columns do not match our template and will be ignored:</p>
                    <p className="text-[10px] text-neutral-500 font-mono bg-black/30 p-2 rounded">{unknownHeaders.join(', ')}</p>
                  </div>
                )}

                {duplicateHeaders.length === 0 && unknownHeaders.length === 0 && missingRequiredHeaders.length === 0 && aliasedHeaders.length === 0 && (
                  <div className="p-4 bg-green-600/20 border border-green-600 rounded-xl flex items-center gap-3">
                    <CheckCircle className="text-green-500" size={24} />
                    <div>
                      <p className="text-sm font-bold text-green-500">Perfect Match!</p>
                      <p className="text-xs text-green-600/80">All headers match the canonical template exactly.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {results && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-white">Analysis Results</h3>
            <div className="flex gap-4">
              <Button 
                variant="ghost"
                onClick={() => {
                  setResults(null);
                  setShowMappingPreview(false);
                  setPastedText('');
                }}
                className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
              >
                <Trash2 size={18} />
                Clear Results
              </Button>
              <Button 
                variant="ghost"
                onClick={() => setShowRawResponse(!showRawResponse)}
              >
                {showRawResponse ? 'Hide Raw AI' : 'Show Raw AI'}
              </Button>
              <Button 
                onClick={handleImport}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                Import to Database
              </Button>
            </div>
          </div>

          {showRawResponse && rawAIResponse && (
            <div className="bg-black border border-neutral-800 rounded-2xl p-4 overflow-auto max-h-96">
              <pre className="text-[10px] text-green-500 font-mono leading-relaxed">{rawAIResponse}</pre>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <div className="flex items-center gap-3 mb-4">
                <MapPin className="text-blue-600" size={20} />
                <h4 className="font-bold text-white">Venues ({results.venues.length})</h4>
              </div>
              <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                {results.venues.map((v: any, i: number) => (
                  <div key={i} className="p-3 bg-neutral-950 rounded-xl text-sm flex justify-between items-start group border border-neutral-800">
                    <div>
                      <p className="font-bold text-white">{v.name}</p>
                      {v.match ? (
                        <p className="text-[10px] text-green-500 font-bold flex items-center gap-1">
                          <ShieldCheck size={10} /> Matches: {v.match}
                        </p>
                      ) : (
                        <p className="text-xs text-neutral-400 truncate max-w-[150px]">{v.address_line1}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 transition-all">
                      <Button 
                        variant="ghost"
                        size="sm"
                        onClick={() => handleImportSingle('venues', i)}
                        className="text-green-500 hover:text-green-400 hover:bg-green-500/10"
                        title="Quick Import"
                      >
                        <Plus size={14} />
                      </Button>
                      <Button 
                        variant="secondary"
                        size="sm"
                        onClick={() => setEditingRecord({ 
                          type: 'venues', 
                          index: i, 
                          data: { 
                            ...v, 
                            address_line1: v.address_line1 || '',
                            address_line2: v.address_line2 || '',
                            city: v.city || '',
                            state: v.state || '',
                            postal_code: v.postal_code || '',
                            country: v.country || 'US',
                            phone: v.phone || '', 
                            email: v.email || '',
                            website_url: v.website_url || '',
                            facebook_url: v.facebook_url || '',
                            instagram_url: v.instagram_url || '',
                            twitter_url: v.twitter_url || '',
                            tiktok_url: v.tiktok_url || '',
                            youtube_url: v.youtube_url || '',
                            spotify_url: v.spotify_url || '',
                            soundcloud_url: v.soundcloud_url || '',
                            bandcamp_url: v.bandcamp_url || ''
                          } 
                        })}
                        title={v.match ? "Compare with existing record" : "Edit record"}
                      >
                        <Settings size={14} />
                      </Button>
                        <Button 
                        variant="danger"
                        size="sm"
                        onClick={() => handleRemoveRecord('venues', i)}
                        title="Delete from list"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-3 mb-4">
                <Music className="text-blue-600" size={20} />
                <h4 className="font-bold text-white">Bands ({results.bands.length})</h4>
              </div>
              <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                {results.bands.map((b: any, i: number) => (
                  <div key={i} className="p-3 bg-neutral-950 rounded-xl text-sm flex justify-between items-start group border border-neutral-800">
                    <div>
                      <p className="font-bold text-white">{b.name}</p>
                      {b.match ? (
                        <p className="text-[10px] text-green-500 font-bold flex items-center gap-1">
                          <ShieldCheck size={10} /> Matches: {b.match}
                        </p>
                      ) : (
                        <p className="text-xs text-neutral-400 truncate max-w-[150px]">{b.genres?.join(', ')}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 transition-all">
                      <Button 
                        variant="ghost"
                        size="sm"
                        onClick={() => handleImportSingle('bands', i)}
                        className="text-green-500 hover:text-green-400 hover:bg-green-500/10"
                        title="Quick Import"
                      >
                        <Plus size={14} />
                      </Button>
                      <Button 
                        variant="secondary"
                        size="sm"
                        onClick={() => setEditingRecord({ 
                          type: 'bands', 
                          index: i, 
                          data: {
                            ...b,
                            address_line1: b.address_line1 || '',
                            address_line2: b.address_line2 || '',
                            city: b.city || '',
                            state: b.state || '',
                            postal_code: b.postal_code || '',
                            country: b.country || 'US',
                            phone: b.phone || '',
                            email: b.email || '',
                            website_url: b.website_url || '',
                            facebook_url: b.facebook_url || '',
                            instagram_url: b.instagram_url || '',
                            twitter_url: b.twitter_url || '',
                            tiktok_url: b.tiktok_url || '',
                            youtube_url: b.youtube_url || '',
                            spotify_url: b.spotify_url || '',
                            soundcloud_url: b.soundcloud_url || '',
                            bandcamp_url: b.bandcamp_url || ''
                          }
                        })}
                        title={b.match ? "Compare with existing record" : "Edit record"}
                      >
                        <Settings size={14} />
                      </Button>
                      <Button 
                        variant="danger"
                        size="sm"
                        onClick={() => handleRemoveRecord('bands', i)}
                        title="Delete from list"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-3 mb-4">
                <Calendar className="text-blue-600" size={20} />
                <h4 className="font-bold text-white">Events ({results.events.length})</h4>
              </div>
              <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                {results.events.map((e: any, i: number) => (
                  <div key={i} className="p-3 bg-neutral-950 rounded-xl text-sm flex justify-between items-start group border border-neutral-800">
                    <div>
                      <p className="font-bold text-white">{e.title}</p>
                      <p className="text-xs text-neutral-400 truncate max-w-[150px]">
                        {e.venue_name} • {e.start_time ? formatDate(e.start_time) : 'No Date'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 transition-all">
                      <Button 
                        variant="ghost"
                        size="sm"
                        onClick={() => handleImportSingle('events', i)}
                        className="text-green-500 hover:text-green-400 hover:bg-green-500/10"
                        title="Quick Import"
                      >
                        <Plus size={14} />
                      </Button>
                      <Button 
                        variant="secondary"
                        size="sm"
                        onClick={() => setEditingRecord({ type: 'events', index: i, data: e })}
                        title="Edit record"
                      >
                        <Settings size={14} />
                      </Button>
                      <Button 
                        variant="danger"
                        size="sm"
                        onClick={() => handleRemoveRecord('events', i)}
                        title="Delete from list"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {importSummary && (
        <Card className="bg-green-950/20 border-green-500/20 p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-green-500 p-2 rounded-full">
              <CheckCircle className="text-white" size={24} />
            </div>
            <h3 className="text-2xl font-bold text-green-500">Import Successful!</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
            <div>
              <p className="text-3xl font-black text-white">{importSummary.venues}</p>
              <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">New Venues</p>
            </div>
            <div>
              <p className="text-3xl font-black text-white">{importSummary.bands}</p>
              <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">New Bands</p>
            </div>
            <div>
              <p className="text-3xl font-black text-white">{importSummary.events}</p>
              <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">New Events</p>
            </div>
            <div>
              <p className="text-3xl font-black text-white">{importSummary.genres}</p>
              <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">New Genres</p>
            </div>
            <div>
              <p className="text-3xl font-black text-blue-500">{importSummary.duplicatesSkipped}</p>
              <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">Duplicates</p>
            </div>
            <div>
              <p className="text-3xl font-black text-purple-500">{importSummary.fuzzyMatches}</p>
              <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">Matched</p>
            </div>
          </div>

          {importDetails && (
            <div className="mt-8 pt-8 border-t border-green-500/10 space-y-6">
              <h4 className="font-bold text-sm uppercase tracking-widest text-neutral-400">Detailed Report</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <p className="text-xs font-bold text-neutral-400 uppercase mb-2">Venues & Bands</p>
                  {[...importDetails.venues.map(v => ({ ...v, type: 'venue' as const })), ...importDetails.bands.map(b => ({ ...b, type: 'band' as const }))].map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-xs p-2 bg-black/20 rounded-lg group">
                      <div className="flex flex-col">
                        <span className="font-medium text-white">{item.name}</span>
                        <span className="text-[10px] text-neutral-400 uppercase tracking-widest">{item.type}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter ${
                          item.status === 'new' ? 'bg-green-500/20 text-green-500' : 
                          item.status === 'matched' ? 'bg-blue-500/20 text-blue-500' : 'bg-red-500/20 text-red-500'
                        }`}>
                          {item.status === 'matched' ? `Matched: ${item.match}` : item.status}
                        </span>
                        {item.status === 'matched' && (
                          <Button 
                            variant="danger"
                            size="sm"
                            onClick={() => handleOverrideMatch(item, item.type)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Plus size={10} className="mr-1" />
                            Add as New
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-bold text-neutral-400 uppercase mb-2">Events</p>
                  {importDetails.events.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-xs p-2 bg-black/20 rounded-lg">
                      <span className="font-medium text-white truncate max-w-[150px]">{item.title}</span>
                      <span className={`px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter ${
                        item.status === 'new' ? 'bg-green-500/20 text-green-500' : 
                        item.status === 'skipped' ? 'bg-neutral-500/20 text-neutral-400' : 'bg-red-500/20 text-red-500'
                      }`}>
                        {item.status === 'skipped' ? `Skipped: ${item.reason}` : item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Compare/Edit Record Modal */}
      <AnimatePresence>
        {editingRecord && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setEditingRecord(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl bg-neutral-950 border border-neutral-800 rounded-[2.5rem] p-8 shadow-2xl max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-bold text-white capitalize">
                    {matchedRecord ? 'Compare' : 'Edit'} {editingRecord.type.slice(0, -1)}
                  </h3>
                  {matchedRecord && (
                    <p className="text-sm text-neutral-400 mt-1">
                      A similar record was found in the database. Review both before adding.
                    </p>
                  )}
                </div>
                <Button variant="ghost" onClick={() => setEditingRecord(null)}>
                  <X size={24} />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-12">
                {/* New Record Section */}
                <section>
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="text-lg font-bold text-blue-600 flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                      New Record (Scraped Data)
                    </h4>
                    <div className="flex gap-3">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          handleRemoveRecord(editingRecord.type, editingRecord.index);
                          setEditingRecord(null);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => handleImportSingle(editingRecord.type, editingRecord.index, editingRecord.data)}
                        className="bg-blue-700 hover:bg-blue-800"
                      >
                        <Plus size={14} className="mr-2" />
                        Add {editingRecord.type.slice(0, -1)}
                      </Button>
                    </div>
                  </div>

                  <Card className="bg-neutral-900 border-neutral-800 p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {Object.entries(editingRecord.data).map(([key, value]) => {
                          if (key === 'match' || key === 'matchId' || key === 'match_id' || key === 'id' || key === 'address' || key === 'street' || key === 'zip') return null;
                        
                        if (editingRecord.type === 'events' && key === 'start_time') {
                          let dateValue = '';
                          let timeValue = '20:00';
                          
                          try {
                            if (value) {
                              const d = new Date(value as string);
                              if (!isNaN(d.getTime())) {
                                const year = d.getFullYear();
                                const month = (d.getMonth() + 1).toString().padStart(2, '0');
                                const day = d.getDate().toString().padStart(2, '0');
                                dateValue = `${year}-${month}-${day}`;
                                
                                const hours = d.getHours().toString().padStart(2, '0');
                                const minutes = d.getMinutes().toString().padStart(2, '0');
                                timeValue = `${hours}:${minutes}`;
                              }
                            }
                          } catch (e) {
                            console.error('Error parsing start_time:', e);
                          }

                          return (
                            <React.Fragment key={key}>
                              <div>
                                <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2">Date</label>
                                <Input 
                                  type="date"
                                  value={dateValue}
                                  onChange={(e) => {
                                    const newDate = e.target.value;
                                    try {
                                      const combined = new Date(`${newDate}T${timeValue || '20:00'}`).toISOString();
                                      const newData = { ...editingRecord.data, start_time: combined };
                                      setEditingRecord({ ...editingRecord, data: newData });
                                    } catch (err) {
                                      const newData = { ...editingRecord.data, start_time: newDate };
                                      setEditingRecord({ ...editingRecord, data: newData });
                                    }
                                  }}
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2">Time</label>
                                <Input 
                                  type="time"
                                  value={timeValue}
                                  onChange={(e) => {
                                    const newTime = e.target.value;
                                    try {
                                      const combined = new Date(`${dateValue || new Date().toISOString().split('T')[0]}T${newTime}`).toISOString();
                                      const newData = { ...editingRecord.data, start_time: combined };
                                      setEditingRecord({ ...editingRecord, data: newData });
                                    } catch (err) {
                                      const newData = { ...editingRecord.data, start_time: `${dateValue} ${newTime}` };
                                      setEditingRecord({ ...editingRecord, data: newData });
                                    }
                                  }}
                                />
                              </div>
                            </React.Fragment>
                          );
                        }

                        if (editingRecord.type === 'events' && key === 'date') return null;
                        
                        if (key === 'genres' || key === 'band_names' || key === 'images') {
                          return (
                            <div key={key}>
                              <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2">{key.replace('_', ' ')}</label>
                              <Input 
                                value={Array.isArray(value) ? value.join(', ') : ''}
                                onChange={(e) => {
                                  const newData = { ...editingRecord.data, [key]: e.target.value.split(',').map(s => s.trim()) };
                                  setEditingRecord({ ...editingRecord, data: newData });
                                }}
                              />
                            </div>
                          );
                        }
                        return (
                          <div key={key}>
                            <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2">
                              {key === 'address_line1' ? 'Street Address' : 
                               key === 'postal_code' ? 'Zip/Postal Code' : 
                               key.replace('_', ' ')}
                            </label>
                            <Input 
                              value={String(value || '')}
                              onChange={(e) => {
                                const newData = { ...editingRecord.data, [key]: e.target.value };
                                setEditingRecord({ ...editingRecord, data: newData });
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                </section>

                {/* Existing Record Section */}
                {matchedRecord && (
                  <section>
                    <h4 className="text-lg font-bold text-green-500 flex items-center gap-2 mb-6">
                      <ShieldCheck size={20} />
                      Existing Record (Database)
                    </h4>
                    <Card className="bg-green-950/10 border-green-500/20 p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {Object.entries(matchedRecord).map(([key, value]) => {
                          if (['id', 'created_at', 'manager_id', 'updated_at', 'address', 'street', 'zip'].includes(key)) return null;
                          
                          if ((editingRecord.type === 'venues' || editingRecord.type === 'bands') && (key === 'address' || key === 'street' || key === 'zip')) return null;

                          if (editingRecord.type === 'events' && key === 'start_time') {
                            try {
                              const d = new Date(value as string);
                              if (!isNaN(d.getTime())) {
                                const dateStr = formatDate(d);
                                const timeStr = formatTime(d);
                                return (
                                  <React.Fragment key={key}>
                                    <div>
                                      <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2">Existing Date</label>
                                      <div className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-neutral-400 italic">
                                        {dateStr}
                                      </div>
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2">Existing Time</label>
                                      <div className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-neutral-400 italic">
                                        {timeStr}
                                      </div>
                                    </div>
                                  </React.Fragment>
                                );
                              }
                            } catch (e) {}
                          }

                          if (editingRecord.type === 'events' && key === 'date') return null;

                          return (
                            <div key={key}>
                              <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2">
                                Existing {key === 'address_line1' ? 'Street Address' : 
                                         key === 'postal_code' ? 'Zip/Postal Code' : 
                                         key.replace('_', ' ')}
                              </label>
                              <div className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-neutral-400 italic">
                                {Array.isArray(value) ? value.join(', ') : String(value || 'None')}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  </section>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
