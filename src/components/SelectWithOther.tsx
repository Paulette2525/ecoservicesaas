import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

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

const OTHER_KEY = "__other__";

export default function SelectWithOther({
  options,
  value,
  onValueChange,
  placeholder = "Sélectionner...",
  otherLabel = "Autre",
  otherPlaceholder = "Saisir une valeur...",
}: SelectWithOtherProps) {
  const isPredefined = !value || options.some((o) => o.value === value);
  const [isOther, setIsOther] = useState(!isPredefined && !!value);
  const [customValue, setCustomValue] = useState(!isPredefined ? value : "");

  useEffect(() => {
    const predefined = !value || options.some((o) => o.value === value);
    if (predefined) {
      setIsOther(false);
      setCustomValue("");
    } else {
      setIsOther(true);
      setCustomValue(value);
    }
  }, [value, options]);

  const handleSelectChange = (v: string) => {
    if (v === OTHER_KEY) {
      setIsOther(true);
      setCustomValue("");
      onValueChange("");
    } else {
      setIsOther(false);
      setCustomValue("");
      onValueChange(v);
    }
  };

  const handleCustomChange = (text: string) => {
    setCustomValue(text);
    onValueChange(text);
  };

  return (
    <div className="space-y-2">
      <Select value={isOther ? OTHER_KEY : value} onValueChange={handleSelectChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
          <SelectItem value={OTHER_KEY}>{otherLabel}</SelectItem>
        </SelectContent>
      </Select>
      {isOther && (
        <Input
          placeholder={otherPlaceholder}
          value={customValue}
          onChange={(e) => handleCustomChange(e.target.value)}
          autoFocus
        />
      )}
    </div>
  );
}
