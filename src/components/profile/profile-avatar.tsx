
import { ChangeEvent, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";

interface ProfileAvatarProps {
  url?: string | null;
  userId?: string;
  fallbackUrl?: string | null;
  onFileChange?: (file: File | null) => void;
  size?: "sm" | "md" | "lg";
  editable?: boolean;
  className?: string;
}

export function ProfileAvatar({
  url,
  userId,
  fallbackUrl,
  onFileChange,
  size = "lg",
  editable = true,
  className = "",
}: ProfileAvatarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(url || fallbackUrl || null);

  const sizeClasses = {
    sm: "h-10 w-10",
    md: "h-16 w-16",
    lg: "h-24 w-24",
  };

  const handleClick = () => {
    if (editable && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    
    if (file) {
      // Create a preview URL
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      
      if (onFileChange) {
        onFileChange(file);
      }
    }
  };

  return (
    <div className="relative group">
      <Avatar 
        className={`${sizeClasses[size]} ${editable ? 'cursor-pointer' : ''} border-2 border-muted-foreground/10 ${className}`} 
        onClick={handleClick}
      >
        <AvatarImage src={previewUrl || undefined} alt="Profile picture" />
        <AvatarFallback className="bg-primary/10">
          <User className="h-1/2 w-1/2 text-primary" />
        </AvatarFallback>
      </Avatar>
      
      {editable && (
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />
      )}
      
      {editable && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
          Change
        </div>
      )}
    </div>
  );
}
