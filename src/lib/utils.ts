import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { UserRole } from "../types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const BUSINESS_PARTNER_ROLES: UserRole[] = ['promoter', 'venue_manager', 'band_manager', 'musician'];

export const isBusinessPartner = (roles: UserRole[] | UserRole): boolean => {
  const roleArray = Array.isArray(roles) ? roles : [roles];
  return roleArray.some(role => 
    ['venue_manager', 'band_manager', 'musician', 'promoter'].includes(role)
  );
};

export const getPriorityDefaultRole = (roles: UserRole[]): UserRole => {
  if (roles.includes('super_admin')) return 'super_admin';
  if (roles.includes('venue_manager')) return 'venue_manager';
  if (roles.includes('band_manager')) return 'band_manager';
  if (roles.includes('musician')) return 'musician';
  if (roles.includes('promoter')) return 'promoter';
  return 'registered_guest';
};

export const isSimilar = (s1: string, s2: string) => {
  if (!s1 || !s2) return false;
  
  const stopWords = new Set(['the', 'bar', 'grill', 'grille', 'pub', 'club', 'restaurant', 'cafe', 'music', 'hall', 'theater', 'theatre', 'distilling', 'company', 'distillery', 'brewery', 'brewing', 'inn', 'tavern', 'and', '&']);
  
  const tokenize = (s: string) => s.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 1 && !stopWords.has(word));

  const tokens1 = tokenize(s1);
  const tokens2 = tokenize(s2);

  if (tokens1.length === 0 || tokens2.length === 0) {
    // Fallback to basic normalization if tokens are empty
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const n1 = normalize(s1);
    const n2 = normalize(s2);
    return n1 === n2 || n1.includes(n2) || n2.includes(n1);
  }

  // Check how many tokens match
  const matches = tokens1.filter(t => tokens2.includes(t));
  const ratio = matches.length / Math.max(tokens1.length, tokens2.length);

  return ratio >= 0.7; // 70% token match
};

export const formatTimeString = (time: string) => {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  const h = parseInt(hours);
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
};

export const formatDate = (date: string | Date | number) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric'
  });
};

export const formatTime = (date: string | Date | number) => {
  if (!date) return '';
  return new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).toLowerCase();
};

export const formatDateTime = (date: string | Date | number) => {
  if (!date) return '';
  return new Date(date).toLocaleString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatFullDate = (date: string | Date | number) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
};

export const getTimeFromDate = (date: string | Date | number) => {
  if (!date) return '';
  const d = new Date(date);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
};

export const getDateFromDate = (date: string | Date | number) => {
  if (!date) return '';
  const d = new Date(date);
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
};

export const cleanWebsiteUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  
  const trimmed = url.trim();
  if (!trimmed) return null;
  
  const lower = trimmed.toLowerCase();
  
  // Check for "null" or variations
  if (lower === 'null' || lower === 'https://null' || lower === 'http://null') {
    return null;
  }
  
  // If it's just a protocol or something weird like "http://"
  if (lower === 'http://' || lower === 'https://') {
    return null;
  }

  // Add protocol if missing
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  
  return trimmed;
};
