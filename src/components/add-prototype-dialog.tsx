
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
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
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        toast({
          title: 'Error',
          description: 'Please sign in to upload prototypes',
          variant: 'destructive',
        });
        navigate('/auth');
        return;
      }

      // Create prototype with required fields
      const { data: prototype, error: prototypeError } = await supabase
        .from('prototypes')
        .insert({
          name: name.trim(),
          created_by: session.user.id,
          url: 'pending', // Required field
          deployment_status: 'pending'
        })
        .select()
        .single();

      if (prototypeError) throw prototypeError;

      // Upload file
      const filePath = `${prototype.id}/${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('prototype-uploads')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Update prototype with file path
      const { error: updateError } = await supabase
        .from('prototypes')
        .update({ 
          file_path: filePath,
        })
        .eq('id', prototype.id);

      if (updateError) throw updateError;

      // Process the prototype
      const { error: processError } = await supabase.functions
        .invoke('process-prototype', {
          body: { prototypeId: prototype.id, fileName: file.name },
        });

      if (processError) throw processError;

      // Use the correct invalidate query format
      queryClient.invalidateQueries({ queryKey: ['prototypes'] });

      toast({
        title: 'Success',
        description: 'Prototype uploaded successfully',
      });
      onOpenChange(false);
    } catch (error: any) {
      console.error('Operation failed:', error);
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
