"use client";

import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { useState } from "react";
import { SettingsDialog } from "./settings-dialog";

export function SettingsButton() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        onClick={() => setIsSettingsOpen(true)}
        className="bg-card text-card-foreground hover:bg-muted"
        title="Settings"
      >
        <Settings className="h-4 w-4" />
      </Button>
      <SettingsDialog
        isOpen={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
      />
    </>
  );
} 