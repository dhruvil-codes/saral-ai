"use client"

import React, { useState, useMemo } from "react"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"
import {
  Mic,
  MessageSquareCode,
  Database,
  ShoppingBag,
  Building,
  Stethoscope,
  Briefcase,
  Utensils,
  CircleDashed,
  ChevronLeft,
  ChevronRight,
  Check,
  Sparkles,
  ArrowRight,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

// ── Step Configuration & Data Constants ──

const STEP_CONFIG = [
  {
    title: "Welcome to Saral AI",
    description: "Your 24/7 AI voice receptionist is ready to get to work.",
  },
  {
    title: "Tailor your agent",
    description: "Tell us a bit about your business so we can optimize the AI.",
  },
  {
    title: "You're ready to launch!",
    description: "Complete these final steps to activate your voice agent.",
  },
]

export const FEATURES = [
  {
    id: "voice-agent",
    icon: Mic,
    title: "Zero-Friction Voice AI",
    description:
      "Never miss a customer call again. The AI answers instantly and handles inquiries with sub-2.5s latency.",
    image: "/onboarding/feature-voice.png",
  },
  {
    id: "whatsapp-sync",
    icon: MessageSquareCode,
    title: "Instant WhatsApp Sync",
    description:
      "Every call ends with a beautifully summarized lead sent directly to your WhatsApp.",
    image: "/onboarding/feature-whatsapp.png",
  },
  {
    id: "knowledge-base",
    icon: Database,
    title: "Dynamic Knowledge Base",
    description:
      "Teach the AI about your business by simply adding FAQs. It learns instantly.",
    image: "/onboarding/feature-rag.png",
  },
] as const

export const ROLES = [
  { id: "retail", label: "Retail / E-commerce", icon: ShoppingBag },
  { id: "real-estate", label: "Real Estate", icon: Building },
  { id: "healthcare", label: "Clinic / Healthcare", icon: Stethoscope },
  { id: "agency", label: "Agency / Services", icon: Briefcase },
  { id: "hospitality", label: "Restaurant / Hotel", icon: Utensils },
  { id: "other", label: "Other", icon: CircleDashed },
] as const

export const GOALS = [
  { id: "lead-gen", label: "Capturing more leads" },
  { id: "support", label: "Handling customer support" },
  { id: "booking", label: "Booking appointments" },
  { id: "faq", label: "Answering common questions" },
] as const

export const TIPS = [
  {
    number: 1,
    text: "Head to Settings to set your Business Name and verify your WhatsApp number.",
  },
  {
    number: 2,
    text: "Add at least 3 common questions to your Knowledge Base so the AI knows how to answer your customers.",
  },
  {
    number: 3,
    text: "Call your dedicated Twilio number to test the agent before sharing it with customers.",
  },
] as const

// ── Helper Component for Aspect-Ratio Images with Graceful Fallback ──

function FeatureImageFallback({
  src,
  alt,
  icon: Icon,
}: {
  src: string
  alt: string
  icon: React.ElementType
}) {
  const [hasError, setHasError] = useState(!src || src.includes("/onboarding/"))

  return (
    <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-muted/40 border border-border/60 flex items-center justify-center group shadow-xs">
      {!hasError ? (
        <img
          src={src}
          alt={alt}
          onError={() => setHasError(true)}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="flex flex-col items-center justify-center p-6 text-center space-y-3 bg-gradient-to-br from-muted/60 via-muted/30 to-background w-full h-full">
          <div className="size-12 rounded-full bg-[#f5a623]/10 text-[#f5a623] flex items-center justify-center border border-[#f5a623]/20 shadow-xs">
            <Icon className="size-6" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-sans font-semibold text-foreground">
              {alt}
            </p>
            <p className="text-[11px] font-sans text-muted-foreground max-w-[220px]">
              Interactive visual preview module active
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Custom Onboarding Compound Wrappers ──

export function OnboardingWrapper({ children }: { children: React.ReactNode }) {
  return <div className="space-y-6">{children}</div>
}

export function OnboardingStepIndicator({
  currentStep,
  totalSteps,
}: {
  currentStep: number
  totalSteps: number
}) {
  return (
    <div className="flex items-center justify-between pt-1 pb-2">
      <div className="flex items-center gap-1.5">
        {Array.from({ length: totalSteps }).map((_, idx) => (
          <div
            key={idx}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              idx === currentStep
                ? "w-8 bg-[#f5a623]"
                : idx < currentStep
                ? "w-3 bg-[#f5a623]/40"
                : "w-3 bg-muted"
            )}
          />
        ))}
      </div>
      <span className="text-xs font-sans text-muted-foreground font-medium">
        Step {currentStep + 1} of {totalSteps}
      </span>
    </div>
  )
}

// ── Step 1 Component: HeadlessFeatureStep ──

export function HeadlessFeatureStep() {
  const [activeFeatureIdx, setActiveFeatureIdx] = useState(0)
  const activeFeature = FEATURES[activeFeatureIdx]

  return (
    <div className="space-y-4">
      {/* 4:3 Aspect Ratio Image Preview */}
      <FeatureImageFallback
        src={activeFeature.image}
        alt={activeFeature.title}
        icon={activeFeature.icon}
      />

      {/* Feature Navigation & List */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
        {FEATURES.map((feature, idx) => {
          const Icon = feature.icon
          const isActive = idx === activeFeatureIdx
          return (
            <button
              key={feature.id}
              type="button"
              onClick={() => setActiveFeatureIdx(idx)}
              className={cn(
                "flex flex-col items-start p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer",
                isActive
                  ? "bg-[#f5a623]/10 border-[#f5a623]/60 ring-1 ring-[#f5a623]/30"
                  : "bg-card border-border/60 hover:bg-muted/40 text-muted-foreground"
              )}
            >
              <div
                className={cn(
                  "size-7 rounded-lg flex items-center justify-center mb-2 transition-colors",
                  isActive
                    ? "bg-[#f5a623] text-black"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <Icon className="size-4" />
              </div>
              <span
                className={cn(
                  "text-xs font-sans font-semibold line-clamp-1",
                  isActive ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {feature.title}
              </span>
            </button>
          )
        })}
      </div>

      {/* Active Feature Description */}
      <div className="p-3.5 rounded-xl bg-muted/30 border border-border/40">
        <p className="text-xs font-sans text-muted-foreground leading-relaxed">
          {activeFeature.description}
        </p>
      </div>
    </div>
  )
}

// ── Step 2 Component: HeadlessRoleStep ──

export function HeadlessRoleStep() {
  const [selectedRole, setSelectedRole] = useState<string>("retail")
  const [selectedGoals, setSelectedGoals] = useState<string[]>(["lead-gen"])

  const toggleGoal = (goalId: string) => {
    setSelectedGoals((prev) =>
      prev.includes(goalId)
        ? prev.filter((id) => id !== goalId)
        : [...prev, goalId]
    )
  }

  return (
    <div className="space-y-5 max-h-[360px] overflow-y-auto pr-1">
      {/* Role Selection */}
      <div className="space-y-2.5">
        <label className="text-xs font-sans font-semibold uppercase tracking-wider text-muted-foreground">
          What is your business type?
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {ROLES.map((role) => {
            const Icon = role.icon
            const isSelected = selectedRole === role.id
            return (
              <button
                key={role.id}
                type="button"
                onClick={() => setSelectedRole(role.id)}
                className={cn(
                  "flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer",
                  isSelected
                    ? "bg-[#f5a623]/10 border-[#f5a623]/60 ring-1 ring-[#f5a623]/30 text-foreground font-medium"
                    : "bg-card border-border/60 hover:bg-muted/40 text-muted-foreground"
                )}
              >
                <div
                  className={cn(
                    "size-7 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                    isSelected
                      ? "bg-[#f5a623] text-black"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="size-3.5" />
                </div>
                <span className="text-xs font-sans leading-tight">
                  {role.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Goal Selection */}
      <div className="space-y-2.5">
        <label className="text-xs font-sans font-semibold uppercase tracking-wider text-muted-foreground">
          What are your primary goals?
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {GOALS.map((goal) => {
            const isSelected = selectedGoals.includes(goal.id)
            return (
              <button
                key={goal.id}
                type="button"
                onClick={() => toggleGoal(goal.id)}
                className={cn(
                  "flex items-center justify-between p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer",
                  isSelected
                    ? "bg-[#f5a623]/10 border-[#f5a623]/60 text-foreground font-medium"
                    : "bg-card border-border/60 hover:bg-muted/40 text-muted-foreground"
                )}
              >
                <span className="text-xs font-sans">{goal.label}</span>
                <div
                  className={cn(
                    "size-4 rounded-md border flex items-center justify-center transition-colors",
                    isSelected
                      ? "bg-[#f5a623] border-[#f5a623] text-black"
                      : "border-muted-foreground/30 bg-background"
                  )}
                >
                  {isSelected && <Check className="size-3 stroke-[3]" />}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Step 3 Component: HeadlessTipsStep ──

export function HeadlessTipsStep() {
  return (
    <div className="space-y-3.5">
      <div className="p-4 rounded-xl bg-gradient-to-r from-[#f5a623]/15 via-[#f5a623]/5 to-transparent border border-[#f5a623]/20 flex items-center gap-3">
        <div className="size-9 rounded-full bg-[#f5a623] text-black flex items-center justify-center shrink-0 shadow-xs">
          <Sparkles className="size-5" />
        </div>
        <div>
          <h4 className="text-sm font-sans font-semibold text-foreground">
            Agent configured & active
          </h4>
          <p className="text-xs font-sans text-muted-foreground">
            Follow this quick checklist to complete setup.
          </p>
        </div>
      </div>

      <div className="space-y-2.5">
        {TIPS.map((tip) => (
          <div
            key={tip.number}
            className="flex items-start gap-3 p-3.5 rounded-xl bg-card border border-border/60 shadow-2xs"
          >
            <div className="size-6 rounded-full bg-[#f5a623] text-black font-sans font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
              {tip.number}
            </div>
            <p className="text-xs font-sans text-foreground/90 leading-relaxed pt-0.5">
              {tip.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main Onboarding Component: HeadlessOnboardingDemo ──

export interface OnboardingDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Called after the voice agent is successfully activated (final step). */
  onComplete?: () => void
}

export function HeadlessOnboardingDemo({
  open = true,
  onOpenChange,
  onComplete,
}: OnboardingDialogProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isActivating, setIsActivating] = useState(false)
  const supabase = useMemo(() => createClient(), [])
  const totalSteps = STEP_CONFIG.length
  const stepInfo = STEP_CONFIG[currentStep]

  const handleNext = async () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((prev) => prev + 1)
    } else {
      setIsActivating(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        let token = session?.access_token
        if (!token) {
          toast.error("Not authenticated")
          setIsActivating(false)
          return
        }

        const makeSettingsRequest = (authToken: string) =>
          fetch(`${BACKEND_URL}/api/auth/settings`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({
              saral_active: true,
            }),
          })

        let res = await makeSettingsRequest(token)

        // On 401, try refreshing the Supabase session (access token may have expired)
        if (res.status === 401) {
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
          if (refreshError || !refreshData.session?.access_token) {
            toast.error("Session expired. Please log in again.")
            window.location.href = "/login"
            return
          }
          token = refreshData.session.access_token
          res = await makeSettingsRequest(token)
        }

        if (res.ok) {
          toast.success("Saral Voice Agent activated successfully!")
          onComplete?.()
          onOpenChange?.(false)
        } else {
          const errData = await res.json()
          console.error("Failed to activate Saral Voice Agent", errData)
          toast.error(`Error: ${errData.detail || "Failed to activate"}`)
        }
      } catch (err) {
        console.error("Error activating Saral Voice Agent", err)
        toast.error("An error occurred while activating Saral Voice Agent.")
      } finally {
        setIsActivating(false)
      }
    }
  }


  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={true} className="sm:max-w-md p-6 gap-5">
        <DialogHeader className="space-y-2 text-left">
          <OnboardingStepIndicator
            currentStep={currentStep}
            totalSteps={totalSteps}
          />
          {/* Strict Typography Rule: Titles must use ITC Garamond Book Narrow and be >= 24px */}
          <DialogTitle
            className="font-heading font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground"
            style={{
              fontFamily:
                'var(--font-garamond), "ITC Garamond Book Narrow", Georgia, serif',
            }}
          >
            {stepInfo.title}
          </DialogTitle>
          {/* Strict Typography Rule: Descriptions use Geist (font-sans) */}
          <DialogDescription className="font-sans text-sm text-muted-foreground leading-normal">
            {stepInfo.description}
          </DialogDescription>
        </DialogHeader>

        <OnboardingWrapper>
          {currentStep === 0 && <HeadlessFeatureStep />}
          {currentStep === 1 && <HeadlessRoleStep />}
          {currentStep === 2 && <HeadlessTipsStep />}
        </OnboardingWrapper>

        <DialogFooter className="flex-row items-center justify-between gap-3 pt-2 sm:justify-between -mx-0 -mb-0 p-0 bg-transparent border-0">
          <div>
            {currentStep > 0 ? (
              <Button
                type="button"
                variant="outline"
                disabled={isActivating}
                onClick={handleBack}
                className="rounded-full font-sans text-xs px-4 h-9 gap-1"
              >
                <ChevronLeft className="size-3.5" />
                Back
              </Button>
            ) : (
              <div />
            )}
          </div>
          <Button
            type="button"
            disabled={isActivating}
            onClick={handleNext}
            className="rounded-full bg-[#f5a623] hover:bg-[#e09510] text-black font-sans font-semibold text-xs px-5 h-9 gap-1.5 shadow-xs transition-colors"
          >
            {currentStep === totalSteps - 1 ? (
              <>
                {isActivating ? "Activating..." : "Launch Voice Agent"}
                <ArrowRight className="size-3.5" />
              </>
            ) : (
              <>
                Continue
                <ChevronRight className="size-3.5" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default HeadlessOnboardingDemo
