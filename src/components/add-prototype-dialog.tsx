
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

interface AddPrototypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddPrototypeDialog({ open, onOpenChange }: AddPrototypeDialogProps) {
  const [name, setName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Log initial auth state when component mounts
  useEffect(() => {
    const checkAuthState = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      console.log('Initial Auth State:', {
        hasSession: !!session,
        userId: session?.user?.id,
        error: error?.message,
        timestamp: new Date().toISOString()
      });
    };
    checkAuthState();
  }, []);

  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    console.log('File Drop Event:', {
      hasFile: !!file,
      fileName: file?.name,
      fileSize: file?.size,
      timestamp: new Date().toISOString()
    });

    if (!file || !name.trim()) {
      console.log('Validation Error:', {
        hasFile: !!file,
        hasName: !!name.trim(),
        timestamp: new Date().toISOString()
      });
      toast({
        title: 'Error',
        description: 'Please provide both a name and a file',
        variant: 'destructive',
      });
      return;
    }

    // Get current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('Auth Check:', {
      hasSession: !!session,
      userId: session?.user?.id,
      error: sessionError?.message,
      timestamp: new Date().toISOString()
    });
    
    if (sessionError || !session) {
      console.log('Auth Error:', {
        error: sessionError?.message,
        timestamp: new Date().toISOString()
      });
      toast({
        title: 'Error',
        description: 'Please sign in to upload prototypes',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }

    setIsUploading(true);
    try {
      // Create prototype entry first with user ID
      console.log('Creating Prototype:', {
        name: name.trim(),
        userId: session.user.id,
        timestamp: new Date().toISOString()
      });

      const { data: prototype, error: prototypeError } = await supabase
        .from('prototypes')
        .insert([{
          name: name.trim(),
          url: 'pending',
          created_by: session.user.id
        }])
        .select()
        .single();

      if (prototypeError) {
        console.error('Prototype Creation Error:', {
          error: prototypeError.message,
          details: prototypeError,
          timestamp: new Date().toISOString()
        });
        throw prototypeError;
      }

      console.log('Prototype Created:', {
        prototypeId: prototype.id,
        timestamp: new Date().toISOString()
      });

      // Upload file
      const filePath = `${prototype.id}/${file.name}`;
      console.log('Uploading File:', {
        filePath,
        fileSize: file.size,
        timestamp: new Date().toISOString()
      });

      const { error: uploadError } = await supabase.storage
        .from('prototype-uploads')
        .upload(filePath, file);

      if (uploadError) {
        console.error('File Upload Error:', {
          error: uploadError.message,
          details: uploadError,
          timestamp: new Date().toISOString()
        });
        throw uploadError;
      }

      console.log('File Uploaded Successfully:', {
        filePath,
        timestamp: new Date().toISOString()
      });

      // Update prototype with file path
      const { error: updateError } = await supabase
        .from('prototypes')
        .update({ file_path: filePath })
        .eq('id', prototype.id);

      if (updateError) {
        console.error('Prototype Update Error:', {
          error: updateError.message,
          details: updateError,
          timestamp: new Date().toISOString()
        });
        throw updateError;
      }

      console.log('Prototype Updated:', {
        prototypeId: prototype.id,
        filePath,
        timestamp: new Date().toISOString()
      });

      // Trigger processing
      console.log('Triggering Processing:', {
        prototypeId: prototype.id,
        fileName: file.name,
        timestamp: new Date().toISOString()
      });

      const { error: processError } = await supabase.functions
        .invoke('process-prototype', {
          body: { prototypeId: prototype.id, fileName: file.name },
        });

      if (processError) {
        console.error('Processing Error:', {
          error: processError.message,
          details: processError,
          timestamp: new Date().toISOString()
        });
        throw processError;
      }

      queryClient.invalidateQueries({ queryKey: ['prototypes'] });
      
      console.log('Process Complete:', {
        success: true,
        timestamp: new Date().toISOString()
      });

      toast({
        title: 'Success',
        description: 'Prototype uploaded successfully',
      });
      onOpenChange(false);
    } catch (error: any) {
      console.error('Operation Failed:', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
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
          <div {...getRootProps()} className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
            ${isDragActive ? 'border-primary' : 'border-muted'}
            ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
          `}>
            <input {...getInputProps()} />
            {isUploading ? (
              <p>Uploading...</p>
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
