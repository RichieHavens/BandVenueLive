import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { UserRole } from "../types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getPriorityDefaultRole = (roles: UserRole[]): UserRole => {
  if (roles.includes('venue_manager')) return 'venue_manager';
  if (roles.includes('band_manager')) return 'band_manager';
  return 'guest';
};

export const isSimilar = (s1: string, s2: string) => {
  if (!s1 || !s2) return false;
  const normalize = (s: string) => s.toLowerCase()
    .replace(/\b(the|bar|grill|grille|pub|club|restaurant|cafe|music|hall|theater|theatre|distilling|company|distillery|brewery|brewing|inn|tavern)\b/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
  const n1 = normalize(s1);
  const n2 = normalize(s2);
  if (!n1 || !n2) return false;
  return n1.includes(n2) || n2.includes(n1);
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
