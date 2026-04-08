import { useState } from 'react';
import { AppEvent } from '../../types';
import { checkOverlap } from '../eventUtils';
import { toast } from 'sonner';

export function useEventValidation(allEvents: AppEvent[]) {
  const [overlapEvent, setOverlapEvent] = useState<AppEvent | undefined>(undefined);
  const [showOverlapModal, setShowOverlapModal] = useState(false);

  const validateDate = (date: string) => {
    if (!date) {
      return 'Date is required';
    }
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      return 'Cannot set event date to the past';
    }
    return null;
  };

  const triggerOverlapCheck = (venueId: string, start: string, end: string, eventId?: string) => {
    const overlap = checkOverlap({ venue_id: venueId, start_time: start, end_time: end, id: eventId }, allEvents);
    if (overlap) {
      setOverlapEvent(overlap);
      setShowOverlapModal(true);
      return true;
    }
    return false;
  };

  return {
    overlapEvent,
    showOverlapModal,
    setShowOverlapModal,
    validateDate,
    triggerOverlapCheck
  };
}
