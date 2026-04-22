import React, { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  SlidersHorizontal,
  Save,
  Info,
  CheckCircle2,
  AlertTriangle,
  User,
  UserCheck,
  BarChart3,
} from "lucide-react";

function WeightSlider({
  label,
  description,
  icon: Icon,
  value,
  onChange,
  color,
}: {
  label: string;
  description: string;
  icon: React.ElementType;
  value: number;
  onChange: (v: number) => void;
  color: string;
}) {
  const pct = Math.round(value * 100);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900">{label}</p>
            <p className="text-xs text-slate-500">{description}</p>
          </div>
        </div>
        <Badge variant="outline" className="text-base font-bold min-w-[56px] justify-center">
          {pct}%
        </Badge>
      </div>
      <Slider
        min={0}
        max={100}
        step={5}
        value={[pct]}
        onValueChange={([v]) => onChange(v / 100)}
        className="w-full"
      />
    </div>
  );
}

export default function AdminScoringWeights() {
  const { data: weights, isLoading, refetch } = trpc.scoringWeights.get.useQuery();
  const updateMutation = trpc.scoringWeights.update.useMutation({
    onSuccess: () => {
      toast.success("Scoring weights saved successfully.");
      refetch();
    },
    onError: (err) => {
      toast.error(err.message ?? "Failed to save scoring weights.");
    },
  });

  const [selfWeight, setSelfWeight] = useState(0.5);
  const [supervisorWeight, setSupervisorWeight] = useState(0.3);
  const [kpiWeight, setKpiWeight] = useState(0.2);
  const [requireSupervisorValidation, setRequireSupervisorValidation] = useState(false);
  const [fallbackToSelfOnly, setFallbackToSelfOnly] = useState(true);

  // Sync state from fetched data
  useEffect(() => {
    if (weights) {
      setSelfWeight(weights.selfWeight);
      setSupervisorWeight(weights.supervisorWeight);
      setKpiWeight(weights.kpiWeight);
      setRequireSupervisorValidation(weights.requireSupervisorValidation);
      setFallbackToSelfOnly(weights.fallbackToSelfOnly);
    }
  }, [weights]);

  const total = selfWeight + supervisorWeight + kpiWeight;
  const totalPct = Math.round(total * 100);
  const isValid = Math.abs(total - 1.0) <= 0.001;

  // Normalize to exactly 1.0 when saving
  const handleSave = () => {
    if (!isValid) {
      toast.error(`Weights must sum to 100% (currently ${totalPct}%).`);
      return;
    }
    updateMutation.mutate({
      selfWeight,
      supervisorWeight,
      kpiWeight,
      requireSupervisorValidation,
      fallbackToSelfOnly,
    });
  };

  // Quick-set presets
  const applyPreset = (preset: "self-only" | "balanced" | "supervisor-heavy") => {
    if (preset === "self-only") {
      setSelfWeight(1.0);
      setSupervisorWeight(0.0);
      setKpiWeight(0.0);
    } else if (preset === "balanced") {
      setSelfWeight(0.5);
      setSupervisorWeight(0.3);
      setKpiWeight(0.2);
    } else if (preset === "supervisor-heavy") {
      setSelfWeight(0.3);
      setSupervisorWeight(0.5);
      setKpiWeight(0.2);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-sm">
            <SlidersHorizontal className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Scoring Weights</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Configure how self-assessment, supervisor validation, and KPI scores are combined.
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={!isValid || updateMutation.isPending} className="gap-2 flex-shrink-0">
          <Save className="w-4 h-4" />
          {updateMutation.isPending ? "Saving…" : "Save Changes"}
        </Button>
      </div>

      {/* Weight sum indicator */}
      {!isValid && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Weights must sum to exactly 100%. Currently: <strong>{totalPct}%</strong>.
            Adjust the sliders below.
          </AlertDescription>
        </Alert>
      )}
      {isValid && (
        <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertDescription>
            Weights sum to 100% — ready to save.
          </AlertDescription>
        </Alert>
      )}

      {/* Presets */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick Presets</CardTitle>
          <CardDescription>Apply a common weighting configuration as a starting point.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => applyPreset("self-only")}>
            Self Only (100%)
          </Button>
          <Button variant="outline" size="sm" onClick={() => applyPreset("balanced")}>
            Balanced (50/30/20)
          </Button>
          <Button variant="outline" size="sm" onClick={() => applyPreset("supervisor-heavy")}>
            Supervisor-Heavy (30/50/20)
          </Button>
        </CardContent>
      </Card>

      {/* Weight sliders */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Source Weights</CardTitle>
              <CardDescription>Drag each slider to set the contribution of each score source.</CardDescription>
            </div>
            <Badge
              variant={isValid ? "default" : "destructive"}
              className="text-sm font-bold"
            >
              Total: {totalPct}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <WeightSlider
            label="Self-Assessment"
            description="Employee's own rating of their competency"
            icon={User}
            value={selfWeight}
            onChange={setSelfWeight}
            color="bg-blue-500"
          />
          <WeightSlider
            label="Supervisor Validation"
            description="Score submitted by the direct supervisor"
            icon={UserCheck}
            value={supervisorWeight}
            onChange={setSupervisorWeight}
            color="bg-violet-500"
          />
          <WeightSlider
            label="KPI / Performance Evidence"
            description="Objective performance indicator or evidence score"
            icon={BarChart3}
            value={kpiWeight}
            onChange={setKpiWeight}
            color="bg-amber-500"
          />

          {/* Visual bar */}
          <div className="mt-2">
            <p className="text-xs text-slate-500 mb-1.5">Weight distribution</p>
            <div className="flex h-4 rounded-full overflow-hidden">
              <div
                className="bg-blue-500 transition-all duration-200"
                style={{ width: `${Math.round(selfWeight * 100)}%` }}
              />
              <div
                className="bg-violet-500 transition-all duration-200"
                style={{ width: `${Math.round(supervisorWeight * 100)}%` }}
              />
              <div
                className="bg-amber-500 transition-all duration-200"
                style={{ width: `${Math.round(kpiWeight * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>Self {Math.round(selfWeight * 100)}%</span>
              <span>Supervisor {Math.round(supervisorWeight * 100)}%</span>
              <span>KPI {Math.round(kpiWeight * 100)}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validation options */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Validation Rules</CardTitle>
          <CardDescription>Control how the system handles missing supervisor or KPI data.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <Label htmlFor="require-supervisor" className="text-sm font-medium">
                Require Supervisor Validation
              </Label>
              <p className="text-xs text-slate-500">
                When enabled, a respondent's weighted score is only computed after their supervisor has submitted a validation score.
              </p>
            </div>
            <Switch
              id="require-supervisor"
              checked={requireSupervisorValidation}
              onCheckedChange={setRequireSupervisorValidation}
            />
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <Label htmlFor="fallback-self" className="text-sm font-medium">
                Fallback to Self-Assessment Only
              </Label>
              <p className="text-xs text-slate-500">
                When enabled and supervisor validation is missing, the system uses only the self-assessment score instead of waiting.
                Disable this to show scores as "pending" until all sources are available.
              </p>
            </div>
            <Switch
              id="fallback-self"
              checked={fallbackToSelfOnly}
              onCheckedChange={setFallbackToSelfOnly}
            />
          </div>
        </CardContent>
      </Card>

      {/* Formula explanation */}
      <Card className="bg-slate-50 border-slate-200">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-slate-500" />
            <CardTitle className="text-sm text-slate-600">How the Weighted Score is Calculated</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-slate-500 leading-relaxed">
            The weighted score formula is:
          </p>
          <pre className="mt-2 text-xs bg-white border border-slate-200 rounded-md p-3 text-slate-700 overflow-x-auto">
{`weightedScore =
  (selfScore × ${Math.round(selfWeight * 100)}%)
  + (supervisorScore × ${Math.round(supervisorWeight * 100)}%)
  + (kpiScore × ${Math.round(kpiWeight * 100)}%)`}
          </pre>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            If a source is unavailable and <strong>Fallback to Self-Assessment Only</strong> is enabled,
            only the self-assessment score is used. Otherwise, available sources are re-weighted proportionally.
          </p>
        </CardContent>
      </Card>

      {/* Last updated */}
      {weights?.updatedAt && (
        <p className="text-xs text-slate-400 text-right">
          Last updated: {new Date(weights.updatedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
