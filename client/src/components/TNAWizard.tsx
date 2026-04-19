import { useState, useEffect, useRef } from "react";
import React from "react";
import { useLocation } from "wouter";
import { CheckCircle2, AlertCircle, Lock, ChevronRight, ChevronLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface WizardStep {
  id: number;
  label: string;
  shortLabel: string;
  hint: string;
  done: boolean;
  link: string;
  actionLabel: string;
  description: string;
  /** Optional inline content rendered between description and action button */
  inlineContent?: React.ReactNode;
}

interface TNAWizardProps {
  steps: WizardStep[];
  onComplete?: () => void;
}

type StepState = "completed" | "current" | "upcoming" | "locked";

function getStepState(steps: WizardStep[], idx: number, activeStep: number): StepState {
  const step = steps[idx];
  if (step.done) return "completed";
  if (idx === activeStep) return "current";
  // A step is locked if the previous step is not done
  if (idx > 0 && !steps[idx - 1].done) return "locked";
  return "upcoming";
}

export default function TNAWizard({ steps, onComplete }: TNAWizardProps) {
  const [, navigate] = useLocation();
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Find the first incomplete step as the default active step
  const firstIncomplete = steps.findIndex((s) => !s.done);
  // If all done, default to last step; otherwise go to first incomplete
  const [activeStep, setActiveStep] = useState(firstIncomplete === -1 ? steps.length - 1 : firstIncomplete);
  const [confirmingComplete, setConfirmingComplete] = useState(false);

  // Auto-advance: when a step becomes done, move to the next incomplete step
  useEffect(() => {
    const firstIncomplete = steps.findIndex((s) => !s.done);
    if (firstIncomplete !== -1 && firstIncomplete > activeStep) {
      setActiveStep(firstIncomplete);
      // Smooth scroll to the step content
      setTimeout(() => {
        stepRefs.current[firstIncomplete]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 100);
    }
  }, [steps.map((s) => s.done).join(",")]);

  const completedCount = steps.filter((s) => s.done).length;
  const allDone = completedCount === steps.length;
  const progressPct = Math.round((completedCount / steps.length) * 100);

  function handleStepClick(idx: number) {
    const state = getStepState(steps, idx, activeStep);
    // Allow clicking completed steps (for editing) and current step
    if (state === "locked") return;
    setActiveStep(idx);
  }

  function handleBack() {
    if (activeStep > 0) setActiveStep(activeStep - 1);
  }

  function handleNext() {
    if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1);
    }
  }

  function handleGoToAction() {
    navigate(steps[activeStep].link);
  }

  const currentStep = steps[activeStep];
  const isLastStep = activeStep === steps.length - 1;
  const canGoNext = activeStep < steps.length - 1;
  const canGoBack = activeStep > 0;

  return (
    <div className="space-y-0">
      {/* ── Desktop: Horizontal Step Tabs ── */}
      <div className="hidden md:block">
        <div className="flex items-stretch border border-border rounded-xl overflow-hidden bg-card">
          {steps.map((step, idx) => {
            const state = getStepState(steps, idx, activeStep);
            const isActive = idx === activeStep;
            const isLast = idx === steps.length - 1;

            return (
              <button
                key={step.id}
                onClick={() => handleStepClick(idx)}
                disabled={state === "locked"}
                aria-current={isActive ? "step" : undefined}
                className={cn(
                  "relative flex-1 flex flex-col items-center gap-1 px-2 py-3 text-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  !isLast && "border-r border-border",
                  state === "locked" && "cursor-not-allowed opacity-40",
                  state === "completed" && !isActive && "cursor-pointer hover:bg-green-50/50 dark:hover:bg-green-950/20",
                  state === "upcoming" && !isActive && "cursor-pointer hover:bg-muted/50",
                  isActive && "bg-primary/5 border-b-2 border-b-primary",
                )}
              >
                {/* Step icon */}
                <div className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold transition-colors",
                  state === "completed" && "bg-green-500 text-white",
                  state === "current" && "bg-primary text-primary-foreground ring-2 ring-primary/30",
                  state === "upcoming" && "bg-muted text-muted-foreground",
                  state === "locked" && "bg-muted/50 text-muted-foreground/50",
                )}>
                  {state === "completed" ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : state === "locked" ? (
                    <Lock className="w-3 h-3" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>

                {/* Label */}
                <span className={cn(
                  "text-[11px] font-medium leading-tight",
                  isActive ? "text-primary" : state === "completed" ? "text-green-700 dark:text-green-400" : "text-muted-foreground",
                )}>
                  {step.shortLabel}
                </span>

                {/* Active indicator bar */}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Mobile: Progress Bar + Current Step Title ── */}
      <div className="md:hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-foreground">
            Step {activeStep + 1} of {steps.length}
          </span>
          <Badge variant={allDone ? "default" : "secondary"} className="text-xs">
            {completedCount}/{steps.length} Done
          </Badge>
        </div>
        {/* Progress bar */}
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-2">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        {/* Step dots */}
        <div className="flex items-center gap-1.5 mb-3">
          {steps.map((step, idx) => {
            const state = getStepState(steps, idx, activeStep);
            return (
              <button
                key={step.id}
                onClick={() => handleStepClick(idx)}
                disabled={state === "locked"}
                className={cn(
                  "rounded-full transition-all duration-200 flex-shrink-0",
                  idx === activeStep ? "w-6 h-2.5 bg-primary" : state === "completed" ? "w-2.5 h-2.5 bg-green-500" : "w-2.5 h-2.5 bg-muted",
                  state === "locked" && "opacity-40 cursor-not-allowed",
                )}
                aria-label={`Step ${step.id}: ${step.label}`}
              />
            );
          })}
        </div>
        {/* Current step title on mobile */}
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {currentStep.shortLabel}
        </p>
      </div>

      {/* ── Step Content Panel ── */}
      <div
        ref={(el) => { stepRefs.current[activeStep] = el; }}
        className="border border-border rounded-xl bg-card mt-3 overflow-hidden"
      >
        {/* Step header */}
        <div className={cn(
          "flex items-start gap-3 p-4 border-b border-border",
          currentStep.done ? "bg-green-50/50 dark:bg-green-950/20" : "bg-muted/30",
        )}>
          <div className={cn(
            "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold",
            currentStep.done ? "bg-green-500 text-white" : "bg-primary text-primary-foreground",
          )}>
            {currentStep.done ? <CheckCircle2 className="w-5 h-5" /> : activeStep + 1}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-foreground text-base leading-tight">{currentStep.label}</h3>
              {currentStep.done && (
                <Badge variant="outline" className="text-xs text-green-700 border-green-300 bg-green-50 dark:bg-green-950/30 dark:text-green-400">
                  ✓ Complete
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{currentStep.hint}</p>
          </div>
        </div>

        {/* Step body */}
        <div className="p-4">
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{currentStep.description}</p>

          {/* Inline content (e.g. Create Group form for Step 1) */}
          {currentStep.inlineContent && (
            <div className="mb-4">
              {currentStep.inlineContent}
            </div>
          )}

          {/* Final step confirmation */}
          {isLastStep && currentStep.done && !confirmingComplete ? (
            <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 p-4 mb-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-green-800 dark:text-green-300">All steps complete!</p>
                  <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">
                    Your TNA campaign is fully set up. Review the training plan and confirm to finalize.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {/* Action button */}
          <Button
            onClick={handleGoToAction}
            variant={currentStep.done ? "outline" : "default"}
            size="sm"
            className="gap-2"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {currentStep.done ? `Review: ${currentStep.actionLabel}` : currentStep.actionLabel}
          </Button>
        </div>

        {/* ── Navigation Controls ── */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            disabled={!canGoBack}
            className="gap-1.5"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>

          <span className="text-xs text-muted-foreground hidden sm:block">
            {completedCount} of {steps.length} steps complete
          </span>

          {isLastStep ? (
            allDone ? (
              <Button
                size="sm"
                onClick={() => {
                  setConfirmingComplete(true);
                  onComplete?.();
                  navigate(steps[steps.length - 1].link);
                }}
                className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
              >
                View Training Plan
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button size="sm" variant="outline" disabled className="gap-1.5 opacity-50">
                View Training Plan
                <Lock className="w-3.5 h-3.5" />
              </Button>
            )
          ) : (
            <Button
              size="sm"
              onClick={handleNext}
              disabled={!canGoNext}
              className="gap-1.5"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* ── All Steps Overview (collapsed list) ── */}
      <details className="group mt-3">
        <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 select-none list-none">
          <ChevronRight className="w-3.5 h-3.5 group-open:rotate-90 transition-transform" />
          View all steps overview
        </summary>
        <div className="mt-2 border border-border rounded-lg overflow-hidden divide-y divide-border/50">
          {steps.map((step, idx) => {
            const state = getStepState(steps, idx, activeStep);
            const isActive = idx === activeStep;
            return (
              <button
                key={step.id}
                onClick={() => handleStepClick(idx)}
                disabled={state === "locked"}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                  state === "locked" ? "cursor-not-allowed opacity-40 bg-muted/20" : "hover:bg-muted/40 cursor-pointer",
                  isActive && "bg-primary/5",
                )}
              >
                <div className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold",
                  state === "completed" ? "bg-green-500 text-white" : state === "current" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                )}>
                  {state === "completed" ? <CheckCircle2 className="w-3 h-3" /> : state === "locked" ? <Lock className="w-2.5 h-2.5" /> : idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-xs font-medium truncate", isActive ? "text-primary" : state === "completed" ? "text-green-700 dark:text-green-400" : "text-muted-foreground")}>
                    {step.label}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">{step.hint}</p>
                </div>
                {state === "completed" && <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />}
                {state === "current" && <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />}
                {state === "locked" && <AlertCircle className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      </details>
    </div>
  );
}
