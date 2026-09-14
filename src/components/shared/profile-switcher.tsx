"use client";

import { useState } from "react";
import { useAppStore } from "@/store/use-app-store";
import { useProfiles } from "@/hooks/use-data";
import { T } from "@/lib/i18n";
import { PROFILE_TYPE_META, PROFILE_TYPE_COLOR } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, Plus, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useRouter } from "next/navigation";

export function ProfileSwitcher() {
  const profiles = useProfiles();
  const { activeProfileId, setActiveProfile, setSection } = useAppStore();
  const active = profiles?.find((p) => p.id === activeProfileId);
  // controlled so selecting a profile (or jumping to add-profile) dismisses the
  // popover — switching an account is a terminal action, not a multi-step flow
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-2 px-2.5 max-w-[42vw] sm:max-w-[200px]"
        >
          <span
            className={cn(
              "h-2 w-2 shrink-0 rounded-full transition-colors",
              active ? PROFILE_TYPE_COLOR[active.type] : "bg-muted-foreground"
            )}
          />
          <span className="truncate text-xs font-medium">
            {active ? active.name : T.common.noProfile}
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-2">
        <div className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground">
          {T.settings.profiles}
        </div>
        <div className="max-h-64 overflow-y-auto scroll-thin">
          {profiles?.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setActiveProfile(p.id);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-muted/60",
                p.id === activeProfileId && "bg-accent/50"
              )}
            >
              <span className={cn("h-2 w-2 shrink-0 rounded-full", PROFILE_TYPE_COLOR[p.type])} />
              <span className="flex-1 truncate text-right">{p.name}</span>
              <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {PROFILE_TYPE_META[p.type].label}
              </span>
              {p.id === activeProfileId && <Check className="h-4 w-4 text-accent-foreground" />}
            </button>
          ))}
          {!profiles && (
            <div className="px-2 py-3 text-sm text-muted-foreground">{T.common.loading}</div>
          )}
        </div>
        <div className="mt-1 border-t pt-1">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-sm"
            onClick={() => {
              setSection("settings");
              setOpen(false);
            }}
          >
            <Plus className="h-4 w-4" />
            {T.settings.addProfile}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
