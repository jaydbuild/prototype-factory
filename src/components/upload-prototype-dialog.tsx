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
import { useDropzone } from "react-dropzone";

export function UploadPrototypeDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [name, setName] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length === 0) return;
      if (!name.trim()) {
        toast({
          title: "Error",
          description: "Please enter a name for the prototype",
          variant: "destructive",
        });
        return;
      }

      setIsUploading(true);
      try {
        // Create a new prototype entry
        const { data: prototype, error: prototypeError } = await supabase
          .from("prototypes")
          .insert({
            name,
            deployment_status: "pending",
          })
          .select()
          .single();

        if (prototypeError) throw prototypeError;

        // Upload files to storage
        const timestamp = new Date().getTime();
        const folderPath = `prototypes/${prototype.id}_${timestamp}`;
        
        // Handle zip file or individual files
        if (acceptedFiles.length === 1 && acceptedFiles[0].name.endsWith('.zip')) {
          const { error: uploadError } = await supabase.storage
            .from('prototype-files')
            .upload(`${folderPath}/source.zip`, acceptedFiles[0]);

          if (uploadError) throw uploadError;
        } else {
          // Upload individual files
          for (const file of acceptedFiles) {
            const { error: uploadError } = await supabase.storage
              .from('prototype-files')
              .upload(`${folderPath}/${file.name}`, file);

            if (uploadError) throw uploadError;
          }
        }

        // Update prototype with files path
        const { error: updateError } = await supabase
          .from("prototypes")
          .update({
            files_path: folderPath,
          })
          .eq("id", prototype.id);

        if (updateError) throw updateError;

        // Trigger processing function
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-prototype`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabase.auth.session()?.access_token}`,
            },
            body: JSON.stringify({
              prototypeId: prototype.id,
              folderPath: folderPath,
            }),
          }
        );

        if (!response.ok) {
          throw new Error('Failed to trigger prototype processing');
        }

        toast({
          title: "Success",
          description: "Prototype files uploaded and processing started",
        });

        queryClient.invalidateQueries(["prototypes"]);
        setIsOpen(false);
      } catch (error) {
        console.error("Upload error:", error);
        toast({
          title: "Error",
          description: "Failed to upload prototype files",
          variant: "destructive",
        });
      } finally {
        setIsUploading(false);
      }
    },
    accept: {
      "text/html": [".html"],
      "text/css": [".css"],
      "text/javascript": [".js"],
      "application/zip": [".zip"],
    },
    multiple: true,
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          Upload Prototype
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Upload Prototype Files</DialogTitle>
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
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? "border-primary bg-primary/5" : "border-muted"
            }`}
          >
            <input {...getInputProps()} />
            {isDragActive ? (
              <p>Drop the files here...</p>
            ) : (
              <p>Drag and drop files here, or click to select files</p>
            )}
            <p className="text-sm text-muted-foreground mt-2">
              Accepts HTML, CSS, JavaScript files or a ZIP package
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            type="submit"
            disabled={isUploading}
            onClick={() => document.querySelector('input[type="file"]')?.click()}
          >
            {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isUploading ? "Uploading..." : "Select Files"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
