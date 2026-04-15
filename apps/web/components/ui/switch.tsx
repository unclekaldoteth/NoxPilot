import { cn } from "@/lib/utils";

type SwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
};

export function Switch({ checked, onCheckedChange, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-7 w-12 items-center rounded-full border transition-all",
        checked ? "border-emerald-400/40 bg-emerald-400/20" : "border-white/10 bg-white/5",
        disabled && "opacity-50"
      )}
    >
      <span
        className={cn(
          "ml-1 inline-block h-5 w-5 rounded-full bg-white shadow transition-transform",
          checked && "translate-x-5 bg-emerald-200"
        )}
      />
    </button>
  );
}
