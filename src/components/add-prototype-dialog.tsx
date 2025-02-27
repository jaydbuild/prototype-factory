
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

interface AddPrototypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddPrototypeDialog({ open, onOpenChange }: AddPrototypeDialogProps) {
  const [name, setName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    console.log('Drop event:', { 
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type 
    });

    if (!file || !name.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide both a name and a file',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    setUploadStep("Getting session...");
    
    try {
      // Get current session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      console.log('Auth Session:', { 
        hasSession: !!sessionData?.session,
        userId: sessionData?.session?.user?.id,
        sessionError 
      });

      if (!sessionData?.session?.user) {
        toast({
          title: 'Error',
          description: 'Please sign in to upload prototypes',
          variant: 'destructive',
        });
        navigate('/auth');
        return;
      }

      // Create prototype entry
      setUploadStep("Creating prototype entry...");
      console.log('Creating prototype:', { 
        name: name.trim(),
        userId: sessionData.session.user.id 
      });

      const { data: prototype, error: prototypeError } = await supabase
        .from('prototypes')
        .insert({
          name: name.trim(),
          created_by: sessionData.session.user.id,
          url: 'pending',
          deployment_status: 'pending'
        })
        .select()
        .single();

      if (prototypeError) {
        console.error('Prototype creation error:', prototypeError);
        throw prototypeError;
      }

      console.log('Prototype created:', prototype);

      // Upload file
      setUploadStep("Uploading file...");
      const filePath = `${prototype.id}/${file.name}`;
      console.log('Uploading file:', { filePath, fileSize: file.size });

      const { error: uploadError } = await supabase.storage
        .from('prototype-uploads')
        .upload(filePath, file);

      if (uploadError) {
        console.error('File upload error:', uploadError);
        throw uploadError;
      }

      console.log('File uploaded successfully:', { filePath });

      // Update prototype with file path
      setUploadStep("Updating prototype metadata...");
      const { error: updateError } = await supabase
        .from('prototypes')
        .update({ file_path: filePath })
        .eq('id', prototype.id);

      if (updateError) {
        console.error('Prototype update error:', updateError);
        throw updateError;
      }

      // Process prototype
      setUploadStep("Processing prototype...");
      console.log('Invoking process-prototype function:', {
        prototypeId: prototype.id,
        fileName: file.name
      });

      const { data: processData, error: processError } = await supabase.functions
        .invoke('process-prototype', {
          body: { 
            prototypeId: prototype.id, 
            fileName: file.name 
          }
        });

      console.log('Process response:', { processData, processError });

      if (processError) {
        console.error('Processing error:', processError);
        throw processError;
      }

      queryClient.invalidateQueries({ queryKey: ['prototypes'] });

      toast({
        title: 'Success',
        description: 'Prototype uploaded successfully',
      });
      onOpenChange(false);
    } catch (error: any) {
      console.error('Operation failed:', {
        error,
        message: error.message,
        stack: error.stack
      });
      toast({
        title: 'Error',
        description: error.message || 'Failed to process prototype',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      setUploadStep("");
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/html': ['.html'],
      'application/zip': ['.zip']
    },
    maxFiles: 1,
    disabled: isUploading
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Prototype</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Input
              id="name"
              placeholder="Prototype name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isUploading}
            />
          </div>
          <div 
            {...getRootProps()} 
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
              ${isDragActive ? 'border-primary' : 'border-muted'}
              ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <input {...getInputProps()} />
            {isUploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin" />
                <p>{uploadStep || 'Uploading...'}</p>
              </div>
            ) : isDragActive ? (
              <p>Drop the files here...</p>
            ) : (
              <p>Drag 'n' drop a file here, or click to select</p>
            )}
            <p className="text-sm text-muted-foreground mt-2">
              Supports HTML files or ZIP archives
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
