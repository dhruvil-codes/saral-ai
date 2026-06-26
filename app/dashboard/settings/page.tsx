"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    businessName: "Glamour Salon & Spa",
    whatsappNumber: "+91 98765 43210",
    systemPrompt: `You are a friendly AI receptionist for Glamour Salon & Spa. Your name is Sara.

Your role is to:
- Help callers book, reschedule, or cancel appointments
- Answer questions about our services and pricing
- Capture lead information for follow-up

Always be warm, professional, and speak in a mix of Hindi and English (Hinglish) when appropriate.

Current business hours: Monday–Saturday 9 AM–8 PM, Sunday 10 AM–6 PM.`,
  });

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="flex flex-col gap-6 py-4 max-w-2xl">
      {/* Business Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Business Profile</CardTitle>
          <CardDescription>
            Basic information about your business that the AI will use when answering calls.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="business-name">Business Name</Label>
            <Input
              id="business-name"
              value={form.businessName}
              onChange={(e) => setForm({ ...form, businessName: e.target.value })}
              placeholder="e.g. My Salon & Spa"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="whatsapp-number">
              WhatsApp Number
              <Badge variant="secondary" className="ml-2 text-xs">
                For lead notifications
              </Badge>
            </Label>
            <Input
              id="whatsapp-number"
              value={form.whatsappNumber}
              onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })}
              placeholder="+91 XXXXX XXXXX"
            />
            <p className="text-xs text-muted-foreground">
              New leads and call summaries will be sent to this WhatsApp number.
            </p>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* System Prompt */}
      <Card>
        <CardHeader>
          <CardTitle>AI System Prompt</CardTitle>
          <CardDescription>
            Define how your AI voice assistant behaves on calls. This is the core instruction
            set for your assistant's personality and capabilities.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="system-prompt">System Prompt</Label>
            <Textarea
              id="system-prompt"
              value={form.systemPrompt}
              onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
              rows={12}
              className="font-mono text-sm resize-none"
              placeholder="Describe how your AI assistant should behave..."
            />
            <p className="text-xs text-muted-foreground">
              Tip: Include your business name, services, working hours, and preferred tone.
              You can also specify the language (Hindi, English, or Hinglish).
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave}>
          {saved ? "Saved!" : "Save Changes"}
        </Button>
        {saved && (
          <p className="text-sm text-muted-foreground">
            Settings saved successfully.
          </p>
        )}
      </div>
    </div>
  );
}
