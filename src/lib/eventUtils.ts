import { AppEvent } from '../types';

export function checkOverlap(newEvent: Partial<AppEvent>, existingEvents: AppEvent[]): AppEvent | undefined {
  if (!newEvent.venue_id || !newEvent.start_time || !newEvent.end_time) return undefined;
  
  const start = new Date(newEvent.start_time).getTime();
  const end = new Date(newEvent.end_time).getTime();
  
  return existingEvents.find(event => {
    if (event.id === newEvent.id || event.venue_id !== newEvent.venue_id) return false;
    
    const eventStart = new Date(event.start_time).getTime();
    const eventEnd = event.end_time ? new Date(event.end_time).getTime() : eventStart + 60 * 60 * 1000; // Assume 1 hour if no end time
    
    return start < eventEnd && end > eventStart;
  });
}
