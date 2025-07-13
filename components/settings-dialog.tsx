"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Settings, Monitor, Moon, Sun, Palette } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface SettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ isOpen, onOpenChange }: SettingsDialogProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Settings
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label className="text-sm font-medium">Theme</Label>
            <RadioGroup value={theme} onValueChange={setTheme}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="light" id="light" />
                <Label htmlFor="light" className="flex items-center gap-2 cursor-pointer">
                  <Sun className="h-4 w-4" />
                  Light
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="dark" id="dark" />
                <Label htmlFor="dark" className="flex items-center gap-2 cursor-pointer">
                  <Moon className="h-4 w-4" />
                  Dark
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="system" id="system" />
                <Label htmlFor="system" className="flex items-center gap-2 cursor-pointer">
                  <Monitor className="h-4 w-4" />
                  System
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="blue" id="blue" />
                <Label htmlFor="blue" className="flex items-center gap-2 cursor-pointer">
                  <Palette className="h-4 w-4 text-blue-500" />
                  Blue
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="green" id="green" />
                <Label htmlFor="green" className="flex items-center gap-2 cursor-pointer">
                  <Palette className="h-4 w-4 text-green-500" />
                  Green
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pink" id="pink" />
                <Label htmlFor="pink" className="flex items-center gap-2 cursor-pointer">
                  <Palette className="h-4 w-4 text-pink-500" />
                  Pink
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="purple" id="purple" />
                <Label htmlFor="purple" className="flex items-center gap-2 cursor-pointer">
                  <Palette className="h-4 w-4 text-purple-500" />
                  Purple
                </Label>
              </div>
            </RadioGroup>
          </div>
          <div className="pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-2">About BlueDoku</p>
              <p>Version {new Date().getFullYear()}</p>
              <p>Built with Next.js, Tailwind CSS, and shadcn/ui</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 