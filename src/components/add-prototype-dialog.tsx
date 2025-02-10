
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { TagSelect } from "./tag-select";
import { fetchPreview } from "@/lib/preview";

type FormData = {
  name: string;
  url: string;
  preview_url: string;
  tags: string[];
};

export const AddPrototypeDialog = () => {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<FormData>({
    defaultValues: {
      name: "",
      url: "",
      preview_url: "",
      tags: [],
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      setIsLoading(true);
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("You must be logged in to create a prototype");
      }

      // Fetch preview data
      const previewData = await fetchPreview(data.url);

      // Insert the prototype with type-safe values
      const { data: prototype, error: prototypeError } = await supabase
        .from("prototypes")
        .insert({
          name: data.name,
          url: data.url,
          preview_url: data.preview_url || null,
          preview_title: previewData?.title || null,
          preview_description: previewData?.description || null,
          preview_image: previewData?.image || null,
          created_by: user.id
        })
        .select()
        .single();

      if (prototypeError) throw prototypeError;

      // Insert prototype tags if any are selected
      if (data.tags.length > 0) {
        const { error: tagError } = await supabase
          .from("prototype_tags")
          .insert(
            data.tags.map(tagId => ({
              prototype_id: prototype.id,
              tag_id: tagId
            }))
          );

        if (tagError) throw tagError;
      }

      toast({
        title: "Success",
        description: "Prototype added successfully",
      });

      // Reset form and close dialog
      form.reset();
      setOpen(false);
      
      // Invalidate prototypes query to refetch the list
      queryClient.invalidateQueries({ queryKey: ['prototypes'] });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Add Prototype
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Prototype</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter prototype name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter prototype URL" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="preview_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preview URL (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter preview image URL" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags</FormLabel>
                  <FormControl>
                    <TagSelect 
                      value={field.value} 
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Adding..." : "Add Prototype"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
