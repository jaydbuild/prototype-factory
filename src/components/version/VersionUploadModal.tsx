import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { PrototypeVersion } from '@/lib/version-control';
import { Loader2 } from 'lucide-react';

interface VersionUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prototypeId: string;
  onSuccess?: (version: PrototypeVersion) => void;
}

const MAX_FILE_SIZE_MB = 20;
const MAX_TITLE_LENGTH = 80;
const MAX_DESCRIPTION_LENGTH = 500;

export function VersionUploadModal({
  open,
  onOpenChange,
  prototypeId,
  onSuccess
}: VersionUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [figmaUrl, setFigmaUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const supabaseClient = useSupabaseClient();

  // Reset form state when modal opens/closes
  React.useEffect(() => {
    if (!open) {
      setFile(null);
      setTitle("");
      setDescription("");
      setFigmaUrl("");
      setErrors({});
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [open]);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    
    if (!selectedFile) {
      setFile(null);
      return;
    }
    
    // Check if file is a ZIP
    if (!selectedFile.name.toLowerCase().endsWith('.zip')) {
      setErrors({
        ...errors,
        file: "File must be a ZIP archive"
      });
      setFile(null);
      return;
    }
    
    // Check file size
    const fileSizeMB = selectedFile.size / (1024 * 1024);
    if (fileSizeMB > MAX_FILE_SIZE_MB) {
      setErrors({
        ...errors,
        file: `File size must be less than ${MAX_FILE_SIZE_MB}MB`
      });
      setFile(null);
      return;
    }
    
    // Clear errors and set file
    setErrors({
      ...errors,
      file: ""
    });
    setFile(selectedFile);
  };

  // Validate form data
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // File validation
    if (!file) {
      newErrors.file = "Please select a ZIP file to upload";
    }
    
    // Title validation (optional)
    if (title && title.length > MAX_TITLE_LENGTH) {
      newErrors.title = `Title must be ${MAX_TITLE_LENGTH} characters or less`;
    }
    
    // Description validation (optional)
    if (description && description.length > MAX_DESCRIPTION_LENGTH) {
      newErrors.description = `Description must be ${MAX_DESCRIPTION_LENGTH} characters or less`;
    }
    
    // Figma URL validation (optional)
    if (figmaUrl && !isValidUrl(figmaUrl)) {
      newErrors.figmaUrl = "Please enter a valid URL";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Check if a string is a valid URL
  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !file) return;
    
    setUploading(true);
    
    try {
      // Create FormData for multipart upload
      const formData = new FormData();
      formData.append('file', file);
      
      // Add optional metadata
      if (title) formData.append('title', title);
      if (description) formData.append('description', description);
      if (figmaUrl) formData.append('figma_url', figmaUrl);
      
      // Get authenticated user's token for upload
      const { data: { session } } = await supabaseClient.auth.getSession();
      
      if (!session) {
        toast({
          title: 'Authentication Error',
          description: 'You must be logged in to upload versions',
          variant: 'destructive'
        });
        setUploading(false);
        return;
      }
      
      // Make API call to upload version
      // Use Supabase Functions URL in production or API proxy path in dev
      const apiUrl = process.env.NODE_ENV === 'production'
        ? `https://lilukmlnbrzyjrksteay.functions.supabase.co/version-upload-api`
        : `/api/prototypes/${prototypeId}/versions`;
        
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData
      });
      
      // Handle response
      if (response.status === 429) {
        // Too Many Requests (soft cap reached)
        const errorData = await response.json();
        toast({
          title: 'Version limit reached',
          description: errorData.message || 'You have reached the maximum number of versions for this prototype',
          variant: 'destructive'
        });
        setUploading(false);
        return;
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'An error occurred while uploading the version');
      }
      
      // Parse success response
      const versionData: PrototypeVersion = await response.json();
      
      // Show success toast
      toast({
        title: 'Version upload started',
        description: `Version ${versionData.version_number} is now processing. You'll see it when it's ready.`,
      });
      
      // Call success callback with new version data
      onSuccess?.(versionData);
      
      // Close modal
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error uploading version:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'An error occurred while uploading the version',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="version-upload-modal">
        <DialogHeader>
          <DialogTitle>Upload New Version</DialogTitle>
          <DialogDescription>
            Upload a ZIP file containing your prototype's HTML, CSS, and JavaScript.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="grid gap-4 py-4" data-testid="version-upload-form">
          {/* File upload field */}
          <div className="grid gap-2">
            <Label htmlFor="file" className="font-medium">
              ZIP File <span className="text-red-500">*</span>
            </Label>
            <Input
              id="file"
              type="file"
              accept=".zip"
              onChange={handleFileChange}
              ref={fileInputRef}
              disabled={uploading}
              className="cursor-pointer"
              data-testid="file-input"
            />
            {errors.file && (
              <p className="text-sm text-red-500" data-testid="file-error">{errors.file}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Must be a ZIP file under {MAX_FILE_SIZE_MB}MB containing an index.html file at the root or in a /dist folder.
            </p>
          </div>
          
          {/* Title field */}
          <div className="grid gap-2">
            <Label htmlFor="title" className="font-medium">
              Title <span className="text-xs text-muted-foreground">(Optional)</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={MAX_TITLE_LENGTH}
              placeholder="e.g. Initial Design, Layout Updates, Fixes"
              disabled={uploading}
              data-testid="title-input"
            />
            {errors.title && (
              <p className="text-sm text-red-500">{errors.title}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {title.length}/{MAX_TITLE_LENGTH} characters
            </p>
          </div>
          
          {/* Description field */}
          <div className="grid gap-2">
            <Label htmlFor="description" className="font-medium">
              Description <span className="text-xs text-muted-foreground">(Optional)</span>
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={MAX_DESCRIPTION_LENGTH}
              placeholder="Add details about this version"
              disabled={uploading}
              rows={3}
              data-testid="description-input"
            />
            {errors.description && (
              <p className="text-sm text-red-500">{errors.description}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {description.length}/{MAX_DESCRIPTION_LENGTH} characters
            </p>
          </div>
          
          {/* Figma URL field */}
          <div className="grid gap-2">
            <Label htmlFor="figma-url" className="font-medium">
              Figma Link <span className="text-xs text-muted-foreground">(Optional)</span>
            </Label>
            <Input
              id="figma-url"
              value={figmaUrl}
              onChange={(e) => setFigmaUrl(e.target.value)}
              placeholder="https://www.figma.com/file/..."
              type="url"
              disabled={uploading}
              data-testid="figma-url-input"
            />
            {errors.figmaUrl && (
              <p className="text-sm text-red-500">{errors.figmaUrl}</p>
            )}
          </div>
          
          <DialogFooter className="sm:justify-end mt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={uploading}
              data-testid="cancel-button"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={uploading || !file} 
              data-testid="upload-button"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Upload Version"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
