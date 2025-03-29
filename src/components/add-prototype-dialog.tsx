
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Loader2, Check, AlertTriangle } from "lucide-react";
import JSZip from 'jszip';

interface AddPrototypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddPrototypeDialog({ open, onOpenChange }: AddPrototypeDialogProps) {
  const [name, setName] = useState("");
  const [figmaUrl, setFigmaUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState<string>("");
  const [fileValidationStatus, setFileValidationStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  const [fileValidationMessage, setFileValidationMessage] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const validateHtmlFile = async (file: File): Promise<boolean> => {
    setFileValidationStatus('validating');
    setFileValidationMessage("Validating HTML file...");
    
    try {
      if (!file.name.toLowerCase().endsWith('.html')) {
        setFileValidationStatus('invalid');
        setFileValidationMessage("File must be an HTML document.");
        return false;
      }
      
      const content = await file.text();
      if (!content.includes('<html') && !content.includes('<HTML')) {
        setFileValidationStatus('invalid');
        setFileValidationMessage("File does not appear to be a valid HTML document.");
        return false;
      }
      
      setFileValidationStatus('valid');
      setFileValidationMessage("HTML file is valid.");
      return true;
    } catch (error) {
      console.error("HTML validation error:", error);
      setFileValidationStatus('invalid');
      setFileValidationMessage("Error validating HTML file.");
      return false;
    }
  };

  const validateZipFile = async (file: File): Promise<boolean> => {
    setFileValidationStatus('validating');
    setFileValidationMessage("Validating ZIP archive...");
    
    try {
      const zip = new JSZip();
      const contents = await zip.loadAsync(file);
      
      const hasHtmlFile = Object.keys(contents.files).some(
        filename => filename.toLowerCase().endsWith('.html')
      );
      
      if (!hasHtmlFile) {
        setFileValidationStatus('invalid');
        setFileValidationMessage("ZIP archive must contain at least one HTML file.");
        return false;
      }
      
      const hasIndexHtml = Object.keys(contents.files).some(
        filename => filename === 'index.html' || filename.endsWith('/index.html')
      );
      
      if (!hasIndexHtml) {
        setFileValidationStatus('valid');
        setFileValidationMessage("ZIP is valid, but does not contain index.html. The first HTML file will be used.");
      } else {
        setFileValidationStatus('valid');
        setFileValidationMessage("ZIP archive contains valid HTML content.");
      }
      
      return true;
    } catch (error) {
      console.error("ZIP validation error:", error);
      setFileValidationStatus('invalid');
      setFileValidationMessage("Invalid ZIP archive format.");
      return false;
    }
  };

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

    // Check file size (300MB limit)
    const maxFileSize = 300 * 1024 * 1024; // 300MB in bytes
    if (file.size > maxFileSize) {
      toast({
        title: 'Error',
        description: 'File size exceeds the 300MB limit',
        variant: 'destructive',
      });
      return;
    }

    let isValid = false;
    if (file.name.toLowerCase().endsWith('.zip')) {
      isValid = await validateZipFile(file);
    } else if (file.name.toLowerCase().endsWith('.html')) {
      isValid = await validateHtmlFile(file);
    } else {
      setFileValidationStatus('invalid');
      setFileValidationMessage("Unsupported file type. Please upload an HTML file or ZIP archive.");
      return;
    }

    if (!isValid) {
      toast({
        title: 'Validation Error',
        description: fileValidationMessage,
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    setUploadStep("Getting session...");
    
    try {
      const { data } = await supabase.auth.getSession();
      console.log('Auth Session:', { 
        hasSession: !!data.session,
        userId: data.session?.user?.id,
        sessionError: !data.session 
      });

      if (!data.session?.user) {
        toast({
          title: 'Error',
          description: 'Please sign in to upload prototypes',
          variant: 'destructive',
        });
        navigate('/auth');
        return;
      }

      setUploadStep("Creating prototype entry...");
      console.log('Creating prototype:', { 
        name: name.trim(),
        userId: data.session.user.id 
      });

      const { data: prototype, error: prototypeError } = await supabase
        .from('prototypes')
        .insert({
          name: name.trim(),
          created_by: data.session.user.id,
          url: 'pending',
          deployment_status: 'processing',
          figma_url: figmaUrl.trim() || null
        })
        .select()
        .single();

      if (prototypeError) {
        console.error('Prototype creation error:', prototypeError);
        throw prototypeError;
      }

      console.log('Prototype created:', prototype);

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

      setUploadStep("Updating prototype metadata...");
      const { error: updateError } = await supabase
        .from('prototypes')
        .update({ 
          file_path: filePath,
          deployment_status: 'deployed',
          status: 'deployed'
        })
        .eq('id', prototype.id);

      if (updateError) {
        console.error('Prototype update error:', updateError);
        throw updateError;
      }

      queryClient.invalidateQueries({ queryKey: ['prototypes'] });

      toast({
        title: 'Success',
        description: 'Prototype uploaded successfully',
      });
      
      navigate(`/prototype/${prototype.id}`);
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
      setFileValidationStatus('idle');
      setFileValidationMessage("");
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/html': ['.html'],
      'application/zip': ['.zip']
    },
    maxFiles: 1,
    maxSize: 300 * 1024 * 1024, // 300MB size limit
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
          <div className="grid gap-2">
            <Input
              id="figmaUrl"
              placeholder="Figma design URL (optional)"
              value={figmaUrl}
              onChange={(e) => setFigmaUrl(e.target.value)}
              disabled={isUploading}
            />
            <p className="text-xs text-muted-foreground">
              Link your Figma design to view it alongside your prototype
            </p>
          </div>
          <div 
            {...getRootProps()} 
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
              ${isDragActive ? 'border-primary' : 'border-muted'}
              ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
              ${fileValidationStatus === 'valid' ? 'border-green-500 bg-green-50' : ''}
              ${fileValidationStatus === 'invalid' ? 'border-red-500 bg-red-50' : ''}
            `}
          >
            <input {...getInputProps()} />
            {isUploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin" />
                <p>{uploadStep || 'Uploading...'}</p>
              </div>
            ) : fileValidationStatus === 'validating' ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin" />
                <p>{fileValidationMessage || 'Validating file...'}</p>
              </div>
            ) : fileValidationStatus === 'valid' ? (
              <div className="flex flex-col items-center gap-2">
                <Check className="h-6 w-6 text-green-500" />
                <p className="text-green-700">{fileValidationMessage || 'File is valid!'}</p>
              </div>
            ) : fileValidationStatus === 'invalid' ? (
              <div className="flex flex-col items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-red-500" />
                <p className="text-red-700">{fileValidationMessage || 'File is invalid!'}</p>
                <p className="text-sm text-red-600 mt-2">
                  Please upload a valid HTML file or ZIP archive containing HTML files.
                </p>
              </div>
            ) : isDragActive ? (
              <p>Drop the files here...</p>
            ) : (
              <p>Drag 'n' drop a file here, or click to select</p>
            )}
            <p className="text-sm text-muted-foreground mt-2">
              Supports HTML files or ZIP archives containing web content (max 300MB)
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
