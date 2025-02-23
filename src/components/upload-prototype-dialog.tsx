import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Loader2 } from "lucide-react";
import { useCallback } from "react";
import { useDropzone } from "react-dropzone";

export function UploadPrototypeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [name, setName] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
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

      // Create a new prototype entry
      const { data: prototype, error: prototypeError } = await supabase
        .from('prototypes')
        .insert([
          {
            name: name,
            deployment_status: 'pending'
          }
        ])
        .select()
        .single();

      if (prototypeError) throw prototypeError;

      // Upload the file
      const { error: uploadError } = await supabase.storage
        .from('prototype-uploads')
        .upload(`${prototype.id}/${file.name}`, file);

      if (uploadError) throw uploadError;

      // Trigger the processing function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-prototype`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabase.auth.session()?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prototypeId: prototype.id,
          fileName: file.name,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to process prototype');
      }

      toast({
        title: "Success",
        description: "Prototype uploaded successfully. Processing will begin shortly.",
      });

      queryClient.invalidateQueries(["prototypes"]);
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error uploading prototype:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload prototype",
        variant: "destructive",
      });
    }
  }, [name, onOpenChange, queryClient]);

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
            <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
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
            onClick={() => document.querySelector('input[type="file"]')?.click()}
          >
            Select Files
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
