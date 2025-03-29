
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { validatePrototypeZip } from '../utils/zip-utils';

export function UploadPrototypeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [name, setName] = useState("");
  const [figmaUrl, setFigmaUrl] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const onDrop = async (acceptedFiles: File[]) => {
    try {
      const file = acceptedFiles[0];
      if (!file) return;

      if (!name.trim()) {
        toast({
          title: "Error",
          description: "Please enter a name for the prototype",
          variant: "destructive",
        });
        return;
      }

      // Check file size (300MB limit)
      const maxFileSize = 300 * 1024 * 1024; // 300MB in bytes
      if (file.size > maxFileSize) {
        toast({
          title: "Error",
          description: "File size exceeds the 300MB limit",
          variant: "destructive",
        });
        return;
      }

      // Validate ZIP structure first
      await validatePrototypeZip(file);

      // Get current session
      const { data } = await supabase.auth.getSession();
      
      if (!data.session?.user) {
        toast({
          title: "Error",
          description: "Please sign in to upload prototypes",
          variant: "destructive",
        });
        navigate('/auth');
        return;
      }

      // Create prototype entry with all required fields
      const { data: prototype, error: prototypeError } = await supabase
        .from('prototypes')
        .insert({
          name: name.trim(),
          created_by: data.session.user.id,
          url: null,
          deployment_status: 'pending',
          figma_url: figmaUrl.trim() || null
        })
        .select()
        .single();

      if (prototypeError) throw prototypeError;

      // Upload file
      const filePath = `${prototype.id}/${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('prototype-uploads')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Ensure upload is complete before processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Process prototype
      const { data: processData, error: processError } = await supabase.functions
        .invoke('process-prototype', {
          body: { 
            prototypeId: prototype.id,
            fileName: file.name
          }
        });

      if (processError) {
        console.error('Process error details:', processError);
        throw new Error(processError.message || 'Failed to process prototype');
      }

      // Update status to reflect processing started
      const { error: updateError } = await supabase
        .from('prototypes')
        .update({ 
          file_path: filePath,
          deployment_status: 'processing'
        })
        .eq('id', prototype.id);

      if (updateError) throw updateError;

      // Use correct invalidate query format
      queryClient.invalidateQueries({
        queryKey: ['prototypes']
      });

      toast({
        title: "Success",
        description: "Prototype uploaded successfully",
      });
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error uploading prototype:', error);
      const errorMessage = error.message || "Failed to upload prototype";
      const description = error.response?.text 
        ? await error.response.text()
        : errorMessage;
        
      toast({
        title: "Error",
        description: description,
        variant: "destructive",
      });
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    accept: {
      'application/zip': ['.zip'],
      'text/html': ['.html'],
      'text/css': ['.css'],
      'application/javascript': ['.js']
    },
    maxSize: 300 * 1024 * 1024, // 300MB size limit
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Prototype</DialogTitle>
          <DialogDescription>
            Upload your prototype files or a ZIP archive containing your prototype.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              placeholder="Enter prototype name"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="figmaUrl" className="text-right">
              Figma URL
            </Label>
            <div className="col-span-3 space-y-1">
              <Input
                id="figmaUrl"
                value={figmaUrl}
                onChange={(e) => setFigmaUrl(e.target.value)}
                className="w-full"
                placeholder="https://www.figma.com/file/..."
              />
              <p className="text-xs text-muted-foreground">
                Link your Figma design to view it alongside your prototype
              </p>
            </div>
          </div>
        </div>
        
        <div {...getRootProps()} className="group relative">
          <div className={`flex h-64 w-full flex-col items-center justify-center rounded-lg border-2 border-dashed 
            ${isDragActive ? 'border-primary bg-primary/10' : 'border-muted-foreground/50'} 
            transition-colors hover:border-primary p-6`}>
            <div className="space-y-4 text-center">
              <UploadCloud className="mx-auto h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  {isDragActive ? 'Drop to upload' : 'Drag files here or click to select'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Required: index.html
                </p>
                <p className="text-xs text-muted-foreground">
                  Optional: CSS and JavaScript files
                </p>
                <p className="text-xs text-muted-foreground">
                  Or upload everything as a ZIP (max 300MB)
                </p>
              </div>
              {uploadProgress > 0 && (
                <div className="w-full max-w-xs mx-auto">
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300" 
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {uploadProgress === 100 ? 'Processing...' : `Uploading: ${uploadProgress}%`}
                  </p>
                </div>
              )}
            </div>
          </div>
          <input {...getInputProps()} />
        </div>
        <DialogFooter>
          <Button
            type="submit"
            onClick={() => {
              const input = document.querySelector('input[type="file"]') as HTMLInputElement;
              if (input) input.click();
            }}
          >
            Select Files
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
