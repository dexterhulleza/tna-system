import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Bot,
  Key,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronLeft,
  Settings2,
  AlertTriangle,
  Info,
  Eye,
  EyeOff,
} from "lucide-react";

const PROVIDER_OPTIONS = [
  {
    value: "builtin",
    label: "Built-in LLM (Default)",
    description: "Use the Manus platform's built-in AI. No API key required.",
    models: ["built-in"],
  },
  {
    value: "openai",
    label: "OpenAI",
    description: "Use your own OpenAI API key (GPT-4o, GPT-4 Turbo, GPT-3.5, etc.)",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo"],
  },
  {
    value: "custom",
    label: "Custom / OpenAI-Compatible",
    description: "Use any OpenAI-compatible API (Azure OpenAI, Together AI, Groq, Ollama, etc.)",
    models: ["gpt-4o", "gpt-4-turbo", "llama-3-70b", "mixtral-8x7b", "custom"],
  },
];

export default function AdminAISettings() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [provider, setProvider] = useState<"builtin" | "openai" | "custom">("builtin");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gpt-4o");
  const [baseUrl, setBaseUrl] = useState("");
  const [customModel, setCustomModel] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    modelUsed?: string;
  } | null>(null);

  const { data: settings, isLoading: loadingSettings, refetch } = trpc.aiConfig.getSettings.useQuery();

  const saveMutation = trpc.aiConfig.saveSettings.useMutation({
    onSuccess: () => {
      toast.success("AI settings saved", { description: "Your AI provider configuration has been updated." });
      refetch();
    },
    onError: (err) => {
      toast.error("Save failed", { description: err.message });
    },
  });

  const testMutation = trpc.aiConfig.testConnection.useMutation({
    onSuccess: (result) => {
      setTestResult(result);
    },
    onError: (err) => {
      setTestResult({ success: false, message: err.message });
    },
  });

  // Load saved settings into form
  useEffect(() => {
    if (settings) {
      setProvider(settings.provider as "builtin" | "openai" | "custom");
      setModel(settings.model || "gpt-4o");
      setBaseUrl(settings.baseUrl || "");
      // Don't load the API key value for security — only show if one is set
    }
  }, [settings]);

  const selectedProvider = PROVIDER_OPTIONS.find((p) => p.value === provider);
  const modelOptions = selectedProvider?.models ?? ["gpt-4o"];
  const isBuiltin = provider === "builtin";
  const isCustomModel = model === "custom";

  const effectiveModel = isCustomModel ? customModel : model;

  const handleSave = () => {
    if (!isBuiltin && !apiKey && !settings?.hasApiKey) {
      toast.error("API key required", { description: "Please enter an API key for the selected provider." });
      return;
    }
    saveMutation.mutate({
      provider,
      apiKey: apiKey || undefined,
      model: effectiveModel,
      baseUrl: baseUrl || undefined,
    });
  };

  const handleTest = () => {
    setTestResult(null);
    testMutation.mutate({
      provider,
      apiKey: apiKey || undefined,
      model: effectiveModel,
      baseUrl: baseUrl || undefined,
    });
  };

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <p className="text-muted-foreground">Admin access required.</p>
            <Button className="mt-4" onClick={() => navigate("/admin")}>Back to Admin</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} className="gap-2 text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" />
            Admin Panel
          </Button>
          <Separator orientation="vertical" className="h-5" />
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">AI Provider Settings</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Info Banner */}
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex gap-3">
              <Info className="h-5 w-5 text-blue-400 mt-0.5 shrink-0" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Configure the AI engine for TNA analysis and question generation</p>
                <p>By default, the system uses the built-in Manus LLM. You can switch to your own OpenAI account or any OpenAI-compatible provider for more control, higher rate limits, or specific model access.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Status */}
        {!loadingSettings && settings && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Bot className="h-4 w-4 text-primary" />
                Current Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Provider:</span>
                  <Badge variant={settings.provider === "builtin" ? "secondary" : "default"}>
                    {PROVIDER_OPTIONS.find((p) => p.value === settings.provider)?.label ?? settings.provider}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Model:</span>
                  <Badge variant="outline">{settings.model}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">API Key:</span>
                  <Badge variant={settings.hasApiKey ? "default" : "secondary"}>
                    {settings.hasApiKey ? "Configured" : "Not set"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Configuration Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Provider Configuration</CardTitle>
            <CardDescription>Select your AI provider and enter credentials</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Provider Selection */}
            <div className="space-y-2">
              <Label>AI Provider</Label>
              <div className="grid gap-3">
                {PROVIDER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setProvider(opt.value as "builtin" | "openai" | "custom");
                      setTestResult(null);
                      if (opt.value === "builtin") {
                        setModel("built-in");
                      } else if (opt.models[0]) {
                        setModel(opt.models[0]);
                      }
                    }}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      provider === opt.value
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-foreground">{opt.label}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">{opt.description}</p>
                      </div>
                      {provider === opt.value && (
                        <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* API Key (not shown for builtin) */}
            {!isBuiltin && (
              <div className="space-y-2">
                <Label htmlFor="apiKey" className="flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  API Key
                  {settings?.hasApiKey && (
                    <Badge variant="outline" className="text-xs font-normal">Key saved — enter new key to replace</Badge>
                  )}
                </Label>
                <div className="relative">
                  <Input
                    id="apiKey"
                    type={showApiKey ? "text" : "password"}
                    placeholder={settings?.hasApiKey ? "••••••••••••••••••••••••••••••••" : "sk-..."}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="pr-10 font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {provider === "openai" && (
                  <p className="text-xs text-muted-foreground">
                    Get your API key from{" "}
                    <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      platform.openai.com/api-keys
                    </a>
                  </p>
                )}
              </div>
            )}

            {/* Model Selection */}
            {!isBuiltin && (
              <div className="space-y-2">
                <Label>Model</Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {modelOptions.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m === "custom" ? "Custom model name..." : m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isCustomModel && (
                  <Input
                    placeholder="Enter model name (e.g. llama-3-70b-instruct)"
                    value={customModel}
                    onChange={(e) => setCustomModel(e.target.value)}
                    className="mt-2 font-mono text-sm"
                  />
                )}
              </div>
            )}

            {/* Base URL (for custom provider) */}
            {provider === "custom" && (
              <div className="space-y-2">
                <Label htmlFor="baseUrl">Base URL</Label>
                <Input
                  id="baseUrl"
                  type="url"
                  placeholder="https://api.together.xyz/v1"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  The base URL for your OpenAI-compatible API endpoint. Examples: Azure OpenAI, Together AI, Groq, Ollama (http://localhost:11434/v1).
                </p>
              </div>
            )}

            <Separator />

            {/* Test Connection Result */}
            {testResult && (
              <div
                className={`flex items-start gap-3 p-4 rounded-lg border ${
                  testResult.success
                    ? "border-green-500/30 bg-green-500/5 text-green-400"
                    : "border-red-500/30 bg-red-500/5 text-red-400"
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-medium">{testResult.success ? "Connection successful" : "Connection failed"}</p>
                  <p className="text-sm mt-0.5 opacity-80">{testResult.message}</p>
                  {testResult.modelUsed && (
                    <p className="text-xs mt-1 opacity-60">Model: {testResult.modelUsed}</p>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 flex-wrap">
              <Button
                variant="outline"
                onClick={handleTest}
                disabled={testMutation.isPending || (!isBuiltin && !apiKey && !settings?.hasApiKey)}
                className="gap-2"
              >
                {testMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Test Connection
              </Button>
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="gap-2"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Settings2 className="h-4 w-4" />
                )}
                Save Settings
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="border-yellow-500/20 bg-yellow-500/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5 shrink-0" />
              <div className="text-sm text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">Important notes</p>
                <p>API keys are stored securely in the database. Only admins can view or change these settings.</p>
                <p>The configured provider will be used for all AI features: Group Analysis reports and AI-generated survey questions.</p>
                <p>If the external provider fails, the system will log the error — it will <strong>not</strong> automatically fall back to the built-in LLM when an external key is configured.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
