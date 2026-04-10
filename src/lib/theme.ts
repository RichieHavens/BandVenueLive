import { EventStatus } from '../components/ui/StatusBadge';

export const statusColors: Record<EventStatus, string> = {
  'Draft': 'bg-muted text-muted-foreground border-border',
  'Needs Band Confirmation': 'bg-accent/20 text-accent border-accent/20',
  'Needs Promo Assets': 'bg-primary/20 text-primary border-primary/20',
  'Almost Ready': 'bg-status-waiting/20 text-status-waiting border-status-waiting/20',
  'Ready': 'bg-status-ready/20 text-status-ready border-status-ready/20',
  'Published': 'bg-status-published/20 text-status-published border-status-published/20',
  'Canceled': 'bg-status-canceled/20 text-status-canceled border-status-canceled/20',
  'Archived': 'bg-muted text-muted-foreground border-border',
  'Waiting on You': 'bg-status-waiting/20 text-status-waiting border-status-waiting/20',
  'Waiting on Band': 'bg-accent/20 text-accent border-accent/20',
  'Waiting on Others': 'bg-accent/20 text-accent border-accent/20',
};

export const theme = {
  card: "bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-sm",
  input: "w-full bg-neutral-950 border border-neutral-700 rounded-2xl py-3 px-4 text-white focus:ring-2 focus:ring-blue-600 outline-none transition-all placeholder:text-neutral-600",
  button: {
    primary: "btn-primary-gradient",
    secondary: "bg-neutral-800 border border-neutral-700 text-neutral-300 hover:bg-neutral-700 hover:text-white",
    ghost: "text-neutral-400 hover:text-white hover:bg-neutral-800",
    danger: "bg-red-600/10 text-red-500 border border-red-500/20 hover:bg-red-600/20",
  }
};
