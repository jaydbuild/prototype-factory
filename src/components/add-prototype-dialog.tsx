import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import { Upload, Loader2 } from 'lucide-react';

const STORAGE_BUCKET = 'prototype-files';

interface AddPrototypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddPrototypeDialog({ open, onOpenChange }: AddPrototypeDialogProps) {
  const [name, setName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'link' | 'file'>('link');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file || !name.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide both a name and a file',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    try {
      // Create prototype entry first
      const { data: prototype, error: prototypeError } = await supabase
        .from('prototypes')
        .insert({
          name: name.trim(),
          url: null,
          created_by: 'anonymous',
          preview_url: null,
          preview_title: null,
          preview_description: null,
          preview_image: null
        })
        .select()
        .single();

      if (prototypeError) throw prototypeError;

      // Upload file with prototype ID in path
      const filePath = `${prototype.id}/${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        // If bucket doesn't exist, try to create it
        if (uploadError.message.includes('bucket not found')) {
          const { data: bucket, error: bucketError } = await supabase.storage
            .createBucket(STORAGE_BUCKET, {
              public: false,
              fileSizeLimit: 52428800, // 50MB
              allowedMimeTypes: ['application/zip', 'text/html']
            });

          if (bucketError) throw bucketError;

          // Retry upload after bucket creation
          const { error: retryError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false
            });

          if (retryError) throw retryError;
        } else {
          throw uploadError;
        }
      }

      // Update prototype with file path
      const { error: updateError } = await supabase
        .from('prototypes')
        .update({ file_path: filePath })
        .eq('id', prototype.id);

      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ['prototypes'] });
      
      toast({
        title: 'Success',
        description: 'Prototype uploaded successfully',
      });
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error uploading prototype:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    accept: {
      'application/zip': ['.zip'],
      'text/html': ['.html']
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a name for the prototype',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    try {
      const { error } = await supabase
        .from('prototypes')
        .insert({
          name: name.trim(),
          url: null,
          created_by: 'anonymous',
          preview_url: null,
          preview_title: null,
          preview_description: null,
          preview_image: null
        });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['prototypes'] });
      
      toast({
        title: 'Success',
        description: 'Prototype added successfully',
      });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Prototype</DialogTitle>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'link' | 'file')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="link">Link</TabsTrigger>
            <TabsTrigger value="file">File</TabsTrigger>
          </TabsList>
          <TabsContent value="link">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter prototype name"
                  disabled={isUploading}
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isUploading}>
                  {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Prototype
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
          <TabsContent value="file">
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter prototype name"
                  disabled={isUploading}
                />
              </div>
              <div
                {...getRootProps()}
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                  ${isDragActive ? 'border-primary bg-primary/10' : 'border-muted'}
                  ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <input {...getInputProps()} disabled={isUploading} />
                <Upload className="w-8 h-8 mx-auto mb-4 text-muted-foreground" />
                {isUploading ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <p>Uploading...</p>
                  </div>
                ) : isDragActive ? (
                  <p>Drop the file here ...</p>
                ) : (
                  <>
                    <p>Drag & drop a file here, or click to select</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Accepts .zip and .html files
                    </p>
                  </>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
