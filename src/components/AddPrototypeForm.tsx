import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { useToast } from './ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

export function AddPrototypeForm({ onSuccess }: { onSuccess: () => void }) {
  const [type, setType] = useState<'link' | 'file'>('link');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!name.trim()) {
        throw new Error('Please enter a name for your prototype');
      }

      const prototypeData = {
        name,
        type,
        deployment_status: 'pending',
      };

      if (type === 'link') {
        if (!url.trim()) {
          throw new Error('Please enter a valid URL');
        }
        prototypeData.url = url;
      } else {
        if (!file) {
          throw new Error('Please select a file to upload');
        }
        const { data: prototype, error: insertError } = await supabase
          .from('prototypes')
          .insert([prototypeData])
          .select()
          .single();

        if (insertError) throw insertError;

        const { error: uploadError } = await supabase.storage
          .from('prototype-uploads')
          .upload(`${prototype.id}/${file.name}`, file);

        if (uploadError) throw uploadError;

        prototypeData.file_path = `${prototype.id}/${file.name}`;
      }

      const { error } = await supabase
        .from('prototypes')
        .insert([prototypeData]);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Prototype added successfully',
      });

      queryClient.invalidateQueries(['prototypes']);
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Prototype Type</Label>
        <RadioGroup
          defaultValue="link"
          value={type}
          onValueChange={(value: 'link' | 'file') => setType(value)}
          className="flex gap-4 mt-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="link" id="link" />
            <Label htmlFor="link">Link</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="file" id="file" />
            <Label htmlFor="file">File Upload</Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <Label>Prototype Name</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter prototype name"
          required
        />
      </div>

      {type === 'link' ? (
        <div>
          <Label>Prototype URL</Label>
          <Input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter prototype URL"
            required
          />
        </div>
      ) : (
        <div>
          <Label>Prototype File</Label>
          <Input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            accept=".html,.zip"
            required
          />
        </div>
      )}

      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Adding...' : 'Add Prototype'}
      </Button>
    </form>
  );
}
