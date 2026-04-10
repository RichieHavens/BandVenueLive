import React, { useRef, useState } from 'react';
import { Upload, Loader2, Image as ImageIcon } from 'lucide-react';
import { uploadGalleryImage, uploadLogoImageSet, uploadHeroImageSet, UploadedImageSet } from '../lib/imageUtils';
import { useAuth } from '../AuthContext';
import { toast } from 'sonner';

interface ImageUploadProps {
  onUploadComplete: (url: string | UploadedImageSet) => void;
  type?: 'logo' | 'hero' | 'gallery';
  className?: string;
  children?: React.ReactNode;
}

export default function ImageUpload({ onUploadComplete, type = 'gallery', className, children }: ImageUploadProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    const toastId = toast.loading('Uploading image...');
    try {
      let result;
      if (type === 'gallery') {
        result = await uploadGalleryImage(file, user.id);
      } else if (type === 'logo') {
        result = await uploadLogoImageSet(file, user.id);
      } else if (type === 'hero') {
        result = await uploadHeroImageSet(file, user.id);
      }
      
      if (result) {
        toast.success('Image uploaded successfully', { id: toastId });
        onUploadComplete(result);
      }
    } catch (err: any) {
      console.error('Image upload failed:', err);
      toast.error(err.message || 'Failed to upload image.', { id: toastId });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className={className}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/jpeg, image/png, image/webp"
        className="hidden"
      />
      <div onClick={() => !isUploading && fileInputRef.current?.click()}>
        {isUploading ? (
          <div className="flex flex-col items-center justify-center h-full w-full text-neutral-400">
            <Loader2 className="animate-spin mb-2" size={24} />
            <span className="text-xs font-medium">Uploading...</span>
          </div>
        ) : (
          children || (
            <div className="flex flex-col items-center justify-center h-full w-full text-neutral-400 hover:text-blue-500 cursor-pointer transition-colors">
              <Upload size={24} className="mb-2" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Upload Image</span>
            </div>
          )
        )}
      </div>
    </div>
  );
}
