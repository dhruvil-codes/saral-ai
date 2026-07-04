"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
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
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    businessName: "",
    whatsappNumber: "",
    vadThresholdMs: 1000,
    systemPrompt: `You are a friendly AI receptionist for Glamour Salon & Spa. Your name is Sara.

Your role is to:
- Help callers book, reschedule, or cancel appointments
- Answer questions about our services and pricing
- Capture lead information for follow-up

Always be warm, professional, and speak in a mix of Hindi and English (Hinglish) when appropriate.

Current business hours: Monday–Saturday 9 AM–8 PM, Sunday 10 AM–6 PM.`,
  });

  const supabase = createClient();

  useEffect(() => {
    async function loadSettings() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) {
          setLoading(false);
          return;
        }

        const res = await fetch("http://localhost:8000/api/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          const user = data.user;
          if (user) {
            setForm((prev) => ({
              ...prev,
              businessName: user.business_name || "",
              whatsappNumber: user.whatsapp_number || "",
              vadThresholdMs: user.vad_threshold_ms || 1000,
            }));
          }
        }
      } catch (err) {
        console.error("Failed to load settings from API", err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        alert("Not authenticated");
        return;
      }

      const res = await fetch("http://localhost:8000/api/auth/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          business_name: form.businessName,
          whatsapp_number: form.whatsappNumber,
          vad_threshold_ms: form.vadThresholdMs,
        }),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        const errData = await res.json();
        console.error("Failed to save settings", errData);
        alert(`Error: ${errData.detail || "Failed to save settings"}`);
      }
    } catch (err) {
      console.error("Error during settings save", err);
      alert("An error occurred while saving settings.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-muted-foreground font-sans">Loading settings...</p>
      </div>
    );
  }

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

          <Separator className="my-2" />

          {/* AI Silence Tolerance VAD Setting */}
          <div className="flex flex-col gap-2 pt-2">
            <Label htmlFor="vad-threshold" className="font-heading text-2xl font-bold">
              AI Silence Tolerance
            </Label>
            <div className="flex items-center gap-4">
              <input
                id="vad-threshold"
                type="range"
                min="600"
                max="2000"
                step="50"
                value={form.vadThresholdMs}
                onChange={(e) => setForm({ ...form, vadThresholdMs: parseInt(e.target.value) })}
                className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-[#f5a623]"
              />
              <span className="font-mono text-sm min-w-[65px] text-right font-medium">
                {form.vadThresholdMs}ms
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-sans">
              Increase this if the AI interrupts your callers too quickly.
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
        <Button 
          onClick={handleSave}
          className="rounded-full bg-[#f5a623] hover:bg-[#e09510] text-black font-sans font-semibold px-6 shadow-sm"
        >
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
