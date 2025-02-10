
import { useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface TagSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function TagSelect({ value, onChange }: TagSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: tags } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tags')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  const createNewTag = async (name: string) => {
    const { data, error } = await supabase
      .from('tags')
      .insert({ name })
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  const handleSelect = async (currentValue: string) => {
    let tagId = currentValue;

    // If it's a new tag (prefixed with "+"), create it
    if (currentValue.startsWith('+')) {
      const newTagName = currentValue.slice(1).trim();
      const newTag = await createNewTag(newTagName);
      tagId = newTag.id;
    }

    const newValue = value.includes(tagId)
      ? value.filter((v) => v !== tagId)
      : [...value, tagId];
    
    onChange(newValue);
    setSearch("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <span className="truncate">
            {value.length === 0 ? (
              "Select tags..."
            ) : (
              <div className="flex flex-wrap gap-1">
                {value.map((tagId) => {
                  const tag = tags?.find((t) => t.id === tagId);
                  return (
                    <Badge variant="secondary" key={tagId}>
                      {tag?.name}
                    </Badge>
                  );
                })}
              </div>
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput 
            placeholder="Search tags..." 
            value={search}
            onValueChange={setSearch}
          />
          <CommandEmpty className="py-2 px-2">
            {search && (
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => handleSelect(`+${search}`)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create "{search}"
              </Button>
            )}
          </CommandEmpty>
          <CommandGroup>
            {tags?.map((tag) => (
              <CommandItem
                key={tag.id}
                value={tag.id}
                onSelect={handleSelect}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value.includes(tag.id) ? "opacity-100" : "opacity-0"
                  )}
                />
                {tag.name}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
