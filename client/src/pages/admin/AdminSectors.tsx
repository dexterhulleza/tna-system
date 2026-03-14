import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, ChevronDown, ChevronRight, Globe } from "lucide-react";

const SECTOR_ICONS: Record<string, string> = {
  ICT: "💻", MET: "⚙️", CAF: "🎨", HW: "❤️", BPS: "🏗️", TL: "🚗",
};

const emptySector = { id: undefined as number | undefined, name: "", code: "", description: "", iconName: "", colorClass: "", isActive: true, sortOrder: 0 };
const emptySkillArea = { id: undefined as number | undefined, sectorId: 0, name: "", code: "", description: "", isActive: true, sortOrder: 0 };

export default function AdminSectors() {
  const [expandedSector, setExpandedSector] = useState<number | null>(null);
  const [showSectorDialog, setShowSectorDialog] = useState(false);
  const [showSkillAreaDialog, setShowSkillAreaDialog] = useState(false);
  const [sectorForm, setSectorForm] = useState({ ...emptySector });
  const [skillAreaForm, setSkillAreaForm] = useState({ ...emptySkillArea });

  const { data: sectors, isLoading, refetch: refetchSectors } = trpc.sectors.list.useQuery({ activeOnly: false });
  const { data: skillAreas, refetch: refetchSkillAreas } = trpc.skillAreas.listBySector.useQuery(
    { sectorId: expandedSector!, activeOnly: false },
    { enabled: !!expandedSector }
  );

  const upsertSector = trpc.sectors.upsert.useMutation({
    onSuccess: () => { toast.success(sectorForm.id ? "Sector updated" : "Sector created"); refetchSectors(); setShowSectorDialog(false); },
    onError: (e) => toast.error(e.message),
  });
  const deleteSector = trpc.sectors.delete.useMutation({
    onSuccess: () => { toast.success("Sector deleted"); refetchSectors(); },
    onError: (e) => toast.error(e.message),
  });
  const upsertSkillArea = trpc.skillAreas.upsert.useMutation({
    onSuccess: () => { toast.success(skillAreaForm.id ? "Skill area updated" : "Skill area created"); refetchSkillAreas(); setShowSkillAreaDialog(false); },
    onError: (e) => toast.error(e.message),
  });
  const deleteSkillArea = trpc.skillAreas.delete.useMutation({
    onSuccess: () => { toast.success("Skill area deleted"); refetchSkillAreas(); },
    onError: (e) => toast.error(e.message),
  });

  const openCreateSector = () => { setSectorForm({ ...emptySector }); setShowSectorDialog(true); };
  const openEditSector = (s: any) => { setSectorForm({ id: s.id, name: s.name, code: s.code, description: s.description || "", iconName: s.iconName || "", colorClass: s.colorClass || "", isActive: s.isActive ?? true, sortOrder: s.sortOrder || 0 }); setShowSectorDialog(true); };
  const openCreateSkillArea = (sectorId: number) => { setSkillAreaForm({ ...emptySkillArea, sectorId }); setShowSkillAreaDialog(true); };
  const openEditSkillArea = (sa: any) => { setSkillAreaForm({ id: sa.id, sectorId: sa.sectorId, name: sa.name, code: sa.code, description: sa.description || "", isActive: sa.isActive ?? true, sortOrder: sa.sortOrder || 0 }); setShowSkillAreaDialog(true); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Manage Sectors & Skill Areas</h1>
          <p className="text-muted-foreground text-sm mt-1">Configure WorldSkills sectors and their skill areas</p>
        </div>
        <Button onClick={openCreateSector}>
          <Plus className="mr-2 w-4 h-4" />
          Add Sector
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-3">
          {sectors?.map((sector: any) => (
            <Card key={sector.id} className={!sector.isActive ? "opacity-60" : ""}>
              <CardContent className="p-0">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedSector(expandedSector === sector.id ? null : sector.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-xl">
                      {SECTOR_ICONS[sector.code] || <Globe className="w-5 h-5 text-primary" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{sector.name}</span>
                        <Badge variant="outline" className="text-xs">{sector.code}</Badge>
                        {!sector.isActive && <Badge variant="outline" className="text-xs text-muted-foreground">Inactive</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">{sector.description || "No description"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); openEditSector(sector); }}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); if (confirm("Delete this sector?")) deleteSector.mutate({ id: sector.id }); }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                    {expandedSector === sector.id ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>

                {expandedSector === sector.id && (
                  <div className="border-t bg-muted/20 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-foreground">Skill Areas</h4>
                      <Button size="sm" variant="outline" onClick={() => openCreateSkillArea(sector.id)}>
                        <Plus className="mr-1 w-3 h-3" />
                        Add Skill Area
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {skillAreas?.map((sa: any) => (
                        <div key={sa.id} className="flex items-center justify-between p-3 bg-background rounded-lg border">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-foreground">{sa.name}</span>
                              <Badge variant="outline" className="text-xs">{sa.code}</Badge>
                              {!sa.isActive && <Badge variant="outline" className="text-xs text-muted-foreground">Inactive</Badge>}
                            </div>
                            {sa.description && <p className="text-xs text-muted-foreground mt-0.5">{sa.description}</p>}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="ghost" onClick={() => openEditSkillArea(sa)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive"
                              onClick={() => { if (confirm("Delete this skill area?")) deleteSkillArea.mutate({ id: sa.id }); }}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      {(!skillAreas || skillAreas.length === 0) && (
                        <p className="text-xs text-muted-foreground text-center py-4">No skill areas yet. Add one above.</p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Sector Dialog */}
      <Dialog open={showSectorDialog} onOpenChange={setShowSectorDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">{sectorForm.id ? "Edit Sector" : "Create Sector"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <Input value={sectorForm.name} onChange={(e) => setSectorForm({ ...sectorForm, name: e.target.value })} placeholder="e.g., Information and Communication Technology" />
              </div>
              <div className="space-y-1.5">
                <Label>Code *</Label>
                <Input value={sectorForm.code} onChange={(e) => setSectorForm({ ...sectorForm, code: e.target.value.toUpperCase() })} placeholder="e.g., ICT" maxLength={10} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={sectorForm.description} onChange={(e) => setSectorForm({ ...sectorForm, description: e.target.value })} rows={2} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={sectorForm.isActive} onCheckedChange={(c) => setSectorForm({ ...sectorForm, isActive: c })} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSectorDialog(false)}>Cancel</Button>
            <Button onClick={() => upsertSector.mutate(sectorForm)} disabled={upsertSector.isPending}>
              {upsertSector.isPending ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : null}
              {sectorForm.id ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Skill Area Dialog */}
      <Dialog open={showSkillAreaDialog} onOpenChange={setShowSkillAreaDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">{skillAreaForm.id ? "Edit Skill Area" : "Create Skill Area"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <Input value={skillAreaForm.name} onChange={(e) => setSkillAreaForm({ ...skillAreaForm, name: e.target.value })} placeholder="e.g., Web Technologies" />
              </div>
              <div className="space-y-1.5">
                <Label>Code *</Label>
                <Input value={skillAreaForm.code} onChange={(e) => setSkillAreaForm({ ...skillAreaForm, code: e.target.value.toUpperCase() })} placeholder="e.g., WEB" maxLength={10} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={skillAreaForm.description} onChange={(e) => setSkillAreaForm({ ...skillAreaForm, description: e.target.value })} rows={2} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={skillAreaForm.isActive} onCheckedChange={(c) => setSkillAreaForm({ ...skillAreaForm, isActive: c })} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSkillAreaDialog(false)}>Cancel</Button>
            <Button onClick={() => upsertSkillArea.mutate(skillAreaForm)} disabled={upsertSkillArea.isPending}>
              {upsertSkillArea.isPending ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : null}
              {skillAreaForm.id ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
