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

export function UploadPrototypeDialog({ onUpload }: { onUpload?: () => void }) {
  const [open, setOpen] = useState(false);
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

      // Check file size (1GB limit)
      const maxFileSize = 1024 * 1024 * 1024; // 1GB in bytes
      if (file.size > maxFileSize) {
        toast({
          title: "Error",
          description: "File size exceeds the 1GB limit",
          variant: "destructive",
        });
        return;
      }

      // Only validate ZIP files, other files will be handled directly
      if (file.name.toLowerCase().endsWith('.zip')) {
        // Validate ZIP structure
        await validatePrototypeZip(file);
      } else if (!file.name.toLowerCase().match(/\.(html|htm|jsx|tsx|js|ts)$/)) {
        toast({
          title: "Error",
          description: "Please upload an HTML, React/JS file, or a ZIP archive",
          variant: "destructive",
        });
        return;
      }

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

      // Upload file with progress tracking
      const filePath = `${prototype.id}/${file.name}`;
      
      // Start tracking upload progress
      const fileReader = new FileReader();
      
      // Set up progress tracking
      let uploadProgressInterval: number | undefined;
      
      fileReader.onload = async () => {
        const fileData = new Uint8Array(fileReader.result as ArrayBuffer);
        
        // Simulate upload progress (actual progress tracking not supported by Supabase JS client)
        let progress = 0;
        uploadProgressInterval = window.setInterval(() => {
          progress += 5;
          if (progress <= 95) {
            setUploadProgress(progress);
          }
        }, 300) as unknown as number;
        
        try {
          console.log(`Uploading file: ${file.name} (${Math.round(file.size / 1024 / 1024)}MB)`);
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('prototype-uploads')
            .upload(filePath, fileData, {
              contentType: file.type || 'application/octet-stream'
            });

          if (uploadError) throw uploadError;
          
          // Complete progress
          setUploadProgress(100);
          
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
          setOpen(false);
          
          // Redirect to the prototype preview
          navigate(`/prototype/${prototype.id}`);
        } catch (error) {
          throw error;
        } finally {
          clearInterval(uploadProgressInterval);
        }
      };
      
      fileReader.readAsArrayBuffer(file);
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
      
      setUploadProgress(0);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    accept: {
      'application/zip': ['.zip'],
      'text/html': ['.html', '.htm'],
      'text/jsx': ['.jsx'],
      'text/typescript': ['.tsx'],
      'application/javascript': ['.js'],
      'application/typescript': ['.ts']
    },
    maxSize: 1024 * 1024 * 1024, // 1GB size limit
  });

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2"
      >
        <span className="hidden md:inline">Add Prototype</span>
        <span className="md:hidden">Add</span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Prototype</DialogTitle>
            <DialogDescription>
              Upload your prototype files (HTML, React components) or a ZIP archive containing your project.
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
                    Supported formats:
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <strong>HTML:</strong> .html, .htm
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <strong>React/JS:</strong> .jsx, .tsx, .js, .ts
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <strong>Archive:</strong> .zip (max 1GB)
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
    </>
  );
}
