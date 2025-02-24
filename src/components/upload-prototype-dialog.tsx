
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

export function UploadPrototypeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [name, setName] = useState("");
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

      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user) {
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
        .update({ file_path: filePath })
        .eq('id', prototype.id);

      if (updateError) throw updateError;

      // Process prototype
      const { error: processError } = await supabase.functions
        .invoke('process-prototype', {
          body: { 
            prototypeId: prototype.id,
            fileName: file.name
          }
        });

      if (processError) throw processError;

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
      toast({
        title: "Error",
        description: error.message || "Failed to upload prototype",
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
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Prototype</DialogTitle>
          <DialogDescription>
            Upload your HTML, CSS, and JavaScript files or a ZIP package containing your prototype.
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
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
              ${isDragActive ? 'border-primary bg-primary/10' : 'border-muted'}
            `}
          >
            <input {...getInputProps()} />
            <p className="mt-2 text-sm text-muted-foreground">
              {isDragActive
                ? "Drop your prototype here"
                : "Drag and drop your prototype here, or click to select"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Upload a ZIP file containing your prototype or a single HTML file
            </p>
          </div>
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
