import { useState, useEffect, useRef } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, ChevronDown, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";

interface Option {
  value: string;
  label: string;
}

interface SelectWithOtherProps {
  options: Option[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  otherLabel?: string;
  otherPlaceholder?: string;
}

export default function SelectWithOther({
  options,
  value,
  onValueChange,
  placeholder = "Sélectionner...",
  otherLabel = "Autre",
  otherPlaceholder = "Saisir une valeur...",
}: SelectWithOtherProps) {
  const [open, setOpen] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const isPredefined = options.some((o) => o.value === value);
  const displayLabel = isPredefined
    ? options.find((o) => o.value === value)?.label
    : value || placeholder;

  useEffect(() => {
    if (!open) {
      setShowCustomInput(false);
      setCustomValue("");
    }
  }, [open]);

  const handleSelectOption = (optionValue: string) => {
    onValueChange(optionValue);
    setOpen(false);
  };

  const handleOtherClick = () => {
    setShowCustomInput(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleCustomSubmit = () => {
    if (customValue.trim()) {
      onValueChange(customValue.trim());
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className={cn(!value && "text-muted-foreground")}>
            {displayLabel}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="flex flex-col">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground text-left transition-colors",
                value === o.value && "bg-accent"
              )}
              onClick={() => handleSelectOption(o.value)}
            >
              <Check
                className={cn(
                  "h-4 w-4 shrink-0",
                  value === o.value ? "opacity-100" : "opacity-0"
                )}
              />
              {o.label}
            </button>
          ))}

          {!showCustomInput ? (
            <button
              type="button"
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground text-left transition-colors border-t",
                !isPredefined && value && "bg-accent"
              )}
              onClick={handleOtherClick}
            >
              <PenLine className="h-4 w-4 shrink-0 opacity-70" />
              {otherLabel}
            </button>
          ) : (
            <div className="border-t p-2 flex gap-2">
              <Input
                ref={inputRef}
                placeholder={otherPlaceholder}
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCustomSubmit();
                  }
                }}
                className="h-8 text-sm"
              />
              <Button
                type="button"
                size="sm"
                className="h-8 px-3 shrink-0"
                onClick={handleCustomSubmit}
                disabled={!customValue.trim()}
              >
                OK
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
