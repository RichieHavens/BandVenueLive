import React from 'react';
import { motion } from 'motion/react';
import { X, Music } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AboutModal({ isOpen, onClose }: AboutModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="max-w-sm w-full bg-neutral-900 border border-neutral-800 rounded-[2.5rem] p-10 relative shadow-2xl"
      >
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-neutral-400 hover:text-cyan-400 transition-colors"
        >
          <X size={20} />
        </button>
        <div className="mb-6">
          <div className="w-full flex items-center justify-center mb-8">
            <img 
              src="/bandvenue_transparent.png" 
              alt="BandVenue Logo" 
              className="w-48 h-auto max-w-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="w-12 h-1 bg-red-600 rounded-full mb-6" />
          <h3 className="text-2xl font-bold mb-4 text-white tracking-tight">About BandVenue</h3>
          <p className="text-neutral-400 text-sm leading-relaxed">
            BandVenue makes it easier for everyone to enjoy live music together. 
            We bridge the gap between venues, bands, and fans to create unforgettable experiences.
          </p>
        </div>
        <div className="pt-6 border-t border-neutral-800">
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2">General Inquiries</p>
          <a 
            href="mailto:inquiries@bandvenue.com" 
            className="text-white hover:text-red-500 transition-colors font-medium text-sm"
          >
            inquiries@bandvenue.com
          </a>
        </div>
      </motion.div>
    </div>
  );
}
