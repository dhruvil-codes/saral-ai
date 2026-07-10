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

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

const normalizePhoneNumber = (value: string) =>
  value.replace(/[\s()-]/g, "");

const isValidPhoneNumber = (value: string) =>
  value === "" || /^\+[1-9]\d{9,14}$/.test(normalizePhoneNumber(value));

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [phoneError, setPhoneError] = useState("");
  const [form, setForm] = useState({
    businessName: "",
    whatsappNumber: "",
    saralActive: true,
    vadThresholdMs: 1000,
    notificationPreference: "urgent_only",
    systemPrompt: `You are a friendly AI receptionist for City Physiotherapy Clinic. Your name is Shruti.

Your role is to:
- Help callers book, reschedule, or cancel patient appointments
- Answer questions about our clinical services and consultation timings
- Capture patient intake information for clinic follow-up

Always be warm, professional, and speak in a mix of Hindi and English (Hinglish) when appropriate.

Current clinic hours: Monday-Saturday 9 AM-8 PM, Sunday Closed.`,
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

        const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
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
              saralActive: user.saral_active ?? true,
              vadThresholdMs: user.vad_threshold_ms || 1000,
              notificationPreference: user.notification_preference || "urgent_only",
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
    const normalizedWhatsappNumber = normalizePhoneNumber(form.whatsappNumber);
    if (!isValidPhoneNumber(form.whatsappNumber)) {
      setPhoneError("Enter a valid E.164 phone number, for example +919876543210.");
      return;
    }
    setPhoneError("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        alert("Not authenticated");
        return;
      }

      const res = await fetch(`${BACKEND_URL}/api/auth/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          business_name: form.businessName,
          whatsapp_number: normalizedWhatsappNumber,
          saral_active: form.saralActive,
          vad_threshold_ms: form.vadThresholdMs,
          notification_preference: form.notificationPreference,
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
      {/* Clinic Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Clinic Setup</CardTitle>
          <CardDescription>
            Basic information about your clinic that the AI will use when answering calls.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="business-name">Clinic Name</Label>
            <Input
              id="business-name"
              value={form.businessName}
              onChange={(e) => setForm({ ...form, businessName: e.target.value })}
              placeholder="e.g. City Physiotherapy Clinic"
            />
          </div>
          
          <div className="flex flex-col gap-2">
            <Label htmlFor="whatsapp-number">
              WhatsApp Number for Case Card Notifications
              <Badge variant="secondary" className="ml-2 text-xs">
                Post-call case cards
              </Badge>
            </Label>
            <Input
              id="whatsapp-number"
              value={form.whatsappNumber}
              onChange={(e) => {
                setForm({ ...form, whatsappNumber: e.target.value });
                if (phoneError) {
                  setPhoneError("");
                }
              }}
              placeholder="+91 XXXXX XXXXX"
              aria-invalid={Boolean(phoneError)}
            />
            {phoneError && (
              <p className="text-xs text-destructive" role="alert">
                {phoneError}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Saral sends Stage 2 post-call patient case cards to this WhatsApp number.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Saral Status</Label>
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  value: true,
                  label: "Active",
                  description: "Saral is marked active for this clinic.",
                },
                {
                  value: false,
                  label: "Inactive",
                  description: "Saral is marked inactive for this clinic.",
                },
              ].map((opt) => (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => setForm({ ...form, saralActive: opt.value })}
                  className={`flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition-all ${
                    form.saralActive === opt.value
                      ? "border-primary bg-secondary ring-1 ring-primary"
                      : "border-border hover:bg-secondary/50"
                  }`}
                  aria-pressed={form.saralActive === opt.value}
                >
                  <span className="text-sm font-medium text-foreground">
                    {opt.label}
                  </span>
                  <span className="text-xs leading-normal text-muted-foreground">
                    {opt.description}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              This status is visible configuration only and does not change call handling yet.
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
                className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-sidebar-accent"
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

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-2xl font-bold">Notification Preferences</CardTitle>
          <CardDescription className="font-sans">
            Choose how and when you receive WhatsApp alerts for calls and bookings.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 font-sans">
          <div className="grid gap-3">
            {[
              {
                value: "all",
                label: "Immediate Alerts (All Calls)",
                description: "Get a WhatsApp message summary immediately after every call."
              },
              {
                value: "urgent_only",
                label: "Smart Alerts (Urgent Only + 8 PM Daily Digest)",
                description: "Only get immediate WhatsApps for failed bookings or urgent keywords. Other calls are compiled into an 8 PM daily summary.",
                recommended: true
              },
              {
                value: "digest",
                label: "Quiet Mode (8 PM Daily Digest Only)",
                description: "No immediate alerts. Receive a single daily summary message at 8 PM."
              }
            ].map((opt) => (
              <div
                key={opt.value}
                onClick={() => setForm({ ...form, notificationPreference: opt.value })}
                className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                  form.notificationPreference === opt.value
                    ? "border-sidebar-accent bg-sidebar-accent/10 ring-1 ring-sidebar-accent"
                    : "border-border hover:bg-secondary/50"
                }`}
              >
                <div className="flex items-center justify-center mt-1">
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    form.notificationPreference === opt.value
                      ? "border-sidebar-accent"
                      : "border-muted-foreground"
                  }`}>
                    {form.notificationPreference === opt.value && (
                      <div className="w-2 h-2 rounded-full bg-sidebar-accent" />
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-foreground">{opt.label}</span>
                    {opt.recommended && (
                      <Badge className="bg-sidebar-accent hover:bg-sidebar-accent/90 text-sidebar-accent-foreground text-[10px] font-semibold px-2 py-0.5 rounded-full border-none">
                        Recommended
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-normal">
                    {opt.description}
                  </p>
                </div>
              </div>
            ))}
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
            set for your assistant personality and capabilities.
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
          className="rounded-full bg-sidebar-accent hover:bg-sidebar-accent/90 text-sidebar-accent-foreground font-sans font-semibold px-6 shadow-sm"
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



