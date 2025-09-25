"use client";

import { useAuth } from "@/contexts/auth-context";
import { useEffect, useState } from "react";
import type {
  FamilyTree,
  FamilyTreeMember,
  FamilyTreeEdge,
  FamilyRelation,
} from "@/types/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { v4 as uuidv4 } from "uuid";
import { db } from "@/lib/firebase";
import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Pencil, User, Users, Heart, Baby, Crown, Sparkles, MapPin, Phone, Mail } from "lucide-react";

function sanitize<T>(value: T): T {
  if (Array.isArray(value)) return value.map((v) => sanitize(v)) as any;
  if (value && typeof value === "object") {
    const out: any = {};
    Object.entries(value as any).forEach(([k, v]) => {
      if (v === undefined) return;
      out[k] = sanitize(v as any);
    });
    return out;
  }
  return value;
}

const RELATIONS: (
  | FamilyRelation
  | "father"
  | "mother"
  | "aunt"
  | "uncle"
  | "niece"
  | "nephew"
  | "step-parent"
  | "step-child"
  | "guardian"
  | "other"
)[] = [
  "father",
  "mother",
  "parent",
  "child",
  "sibling",
  "spouse",
  "grandparent",
  "grandchild",
  "aunt",
  "uncle",
  "niece",
  "nephew",
  "cousin",
  "step-parent",
  "step-child",
  "guardian",
  "other",
];

export default function FamilyTreePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tree, setTree] = useState<FamilyTree | null>(null);
  const [loading, setLoading] = useState(true);

  // Add Relative Modal
  const [openAdd, setOpenAdd] = useState(false);
  const [addName, setAddName] = useState("");
  const [addBirthPlace, setAddBirthPlace] = useState("");
  const [addPhotoUrl, setAddPhotoUrl] = useState("");
  const [addRelation, setAddRelation] = useState<
    | FamilyRelation
    | "father"
    | "mother"
    | "aunt"
    | "uncle"
    | "niece"
    | "nephew"
    | "step-parent"
    | "step-child"
    | "guardian"
    | "other"
  >("child");
  const [addCustomRelation, setAddCustomRelation] = useState("");
  const [addLinkTo, setAddLinkTo] = useState<string>("");

  // Edit Member Modal
  const [openEdit, setOpenEdit] = useState(false);
  const [editMember, setEditMember] = useState<FamilyTreeMember | null>(null);
  const [editName, setEditName] = useState("");
  const [editBirthPlace, setEditBirthPlace] = useState("");
  const [editPhotoUrl, setEditPhotoUrl] = useState("");

  useEffect(() => {
    if (!user) return;
    const ref = doc(db, "familyTrees", user.uid);
    let unsub: any;
    (async () => {
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        const init: FamilyTree = {
          ownerUserId: user.uid,
          members: [],
          edges: [],
          updatedAt: new Date().toISOString(),
        };
        await setDoc(ref, sanitize(init), { merge: true });
        setTree(init);
      }
      unsub = onSnapshot(ref, (s) => {
        if (s.exists()) {
          const data = s.data() as FamilyTree;
          setTree(data);
        }
      });
      setLoading(false);
    })();
    return () => {
      if (unsub) unsub();
    };
  }, [user]);

  const members = tree?.members ?? [];
  const edges = tree?.edges ?? [];

  function memberById(id: string | undefined) {
    return members.find((m) => m.id === id);
  }


  // Build nuclear family structure
  const buildNuclearFamily = () => {
    if (members.length === 0) return null;

    const memberMap = new Map(members.map(m => [m.id, m]));
    const parentChildMap = new Map<string, string[]>();
    const spouseMap = new Map<string, string>();

    // Build relationship maps
    edges.forEach(edge => {
      if (edge.relation === 'parent') {
        const parentId = edge.fromId;
        const childId = edge.toId;
        if (!parentChildMap.has(parentId)) parentChildMap.set(parentId, []);
        parentChildMap.get(parentId)!.push(childId);
      } else if (edge.relation === 'child') {
        const parentId = edge.toId;
        const childId = edge.fromId;
        if (!parentChildMap.has(parentId)) parentChildMap.set(parentId, []);
        parentChildMap.get(parentId)!.push(childId);
      } else if (edge.relation === 'spouse') {
        spouseMap.set(edge.fromId, edge.toId);
        spouseMap.set(edge.toId, edge.fromId);
      }
    });

    // Find parents (people who have children)
    const parents = Array.from(parentChildMap.keys()).map(id => memberMap.get(id)).filter(Boolean);

    if (parents.length === 0) return null;

    // Get all children
    const allChildren = new Set<string>();
    parents.forEach(parent => {
      const children = parentChildMap.get(parent!.id) || [];
      children.forEach(childId => allChildren.add(childId));
    });

    const children = Array.from(allChildren).map(id => memberMap.get(id)).filter(Boolean);

    return {
      parents: parents as FamilyTreeMember[],
      children: children as FamilyTreeMember[],
      spouseMap,
      parentChildMap,
    };
  };

  const nuclearFamily = buildNuclearFamily();

  // Profile View Modal
  const [viewingProfile, setViewingProfile] = useState<FamilyTreeMember | null>(null);
  const [openProfile, setOpenProfile] = useState(false);

  const openProfileView = (member: FamilyTreeMember) => {
    setViewingProfile(member);
    setOpenProfile(true);
  };

  // Family Member Card Component
  const FamilyMemberCard = ({ member, label, isParent = false }: { member: FamilyTreeMember; label?: string; isParent?: boolean }) => (
    <div className="flex flex-col items-center space-y-2">
      <div
        className={`relative cursor-pointer hover:scale-105 transition-transform ${isParent ? 'ring-2 ring-primary ring-offset-2' : ''}`}
        onClick={() => openProfileView(member)}
      >
        <img
          src={member.photoUrl || `https://picsum.photos/seed/${member.id}/80`}
          alt={member.fullName}
          className={`rounded-full object-cover border-2 shadow-md ${isParent ? 'w-20 h-20 border-primary' : 'w-16 h-16 border-muted'}`}
        />
        {label && (
          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full font-medium">
            {label}
          </div>
        )}
      </div>
      <div className="text-center max-w-32">
        <div className={`font-medium text-sm leading-tight ${isParent ? 'text-primary' : ''}`}>
          {member.fullName}
        </div>
        {member.birthPlace && (
          <div className="text-xs text-muted-foreground mt-1">{member.birthPlace}</div>
        )}
      </div>
    </div>
  );

  // Helper functions for persisting data
  async function persistTree(next: FamilyTree) {
    if (!user) return;
    try {
      const updatedAt = new Date().toISOString();
      const payload = sanitize({ ...next, updatedAt });
      await setDoc(doc(db, "familyTrees", user.uid), payload, { merge: true });
      toast({ title: "Family tree updated" });
    } catch (e: any) {
      toast({
        title: "Save failed",
        description: e?.message ?? "Try again",
        variant: "destructive",
      });
    }
  }

  // Modal handlers
  function openEditMember(member: FamilyTreeMember) {
    setEditMember(member);
    setEditName(member.fullName);
    setEditBirthPlace(member.birthPlace ?? "");
    setEditPhotoUrl(member.photoUrl ?? "");
    setOpenEdit(true);
  }

  async function saveAddRelative() {
    if (!user || !tree || !addName.trim()) return;
    const baseMember: FamilyTreeMember = {
      id: uuidv4(),
      fullName: addName.trim(),
      birthPlace: addBirthPlace || undefined,
      photoUrl: addPhotoUrl || undefined,
    };

    const relType: string =
      addRelation === "other" ? addCustomRelation || "relative" : addRelation;
    const toParent = ["father", "mother", "parent"].includes(relType);

    let next: FamilyTree;
    if (addLinkTo && members.length > 0) {
      const edge: FamilyTreeEdge = {
        fromId: toParent ? baseMember.id : addLinkTo,
        toId: toParent ? addLinkTo : baseMember.id,
        relation: toParent ? "parent" : (relType as FamilyRelation),
      };
      next = {
        ...tree,
        members: [...tree.members, baseMember],
        edges: [...tree.edges, edge],
        updatedAt: new Date().toISOString(),
      };
    } else {
      // First person: just create the member without an edge
      next = {
        ...tree,
        members: [...tree.members, baseMember],
        updatedAt: new Date().toISOString(),
      };
    }

    setOpenAdd(false);
    setAddName("");
    setAddBirthPlace("");
    setAddPhotoUrl("");
    setAddCustomRelation("");
    setTree(next);
    await persistTree(next);
  }

  async function saveEditMember() {
    if (!tree || !editMember) return;
    const nextMembers = tree.members.map((m) =>
      m.id === editMember.id
        ? {
            ...m,
            fullName: editName.trim() || m.fullName,
            birthPlace: editBirthPlace || undefined,
            photoUrl: editPhotoUrl || undefined,
          }
        : m
    );
    const next = { ...tree, members: nextMembers };
    setOpenEdit(false);
    setTree(next);
    await persistTree(next);
  }

  async function deleteMember(id: string) {
    if (!tree) return;
    const nextMembers = tree.members.filter((m) => m.id !== id);
    const nextEdges = tree.edges.filter(
      (e) => e.fromId !== id && e.toId !== id
    );
    const next = {
      ...tree,
      members: nextMembers,
      edges: nextEdges,
    };
    setTree(next);
    await persistTree(next);
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="font-headline text-3xl font-bold text-primary md:text-4xl">
            Family Tree
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            View your organized family hierarchy.
          </p>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading family tree...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold text-primary md:text-4xl">
            My Family
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            View your nuclear family. Click on any family member to see their detailed profile.
          </p>
        </div>
        <Dialog open={openAdd} onOpenChange={setOpenAdd}>
          <DialogTrigger asChild>
            <Button>Add Relative</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Relative</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div>
                <Label>Name</Label>
                <Input
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Relation</Label>
                  <Select
                    value={addRelation}
                    onValueChange={(v) => setAddRelation(v as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select relation" />
                    </SelectTrigger>
                    <SelectContent>
                      {RELATIONS.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {members.length > 0 ? (
                  <div>
                    <Label>Link To</Label>
                    <Select value={addLinkTo} onValueChange={setAddLinkTo}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select person" />
                      </SelectTrigger>
                      <SelectContent>
                        {members.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div>
                    <Label>First person</Label>
                    <div className="text-xs text-muted-foreground mt-2">
                      This will create your first person in the tree. You can
                      link relatives later.
                    </div>
                  </div>
                )}
              </div>
              {addRelation === "other" && (
                <div>
                  <Label>Custom Relation</Label>
                  <Input
                    value={addCustomRelation}
                    onChange={(e) => setAddCustomRelation(e.target.value)}
                    placeholder="e.g., great-grandmother"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Birth Place (optional)</Label>
                  <Input
                    value={addBirthPlace}
                    onChange={(e) => setAddBirthPlace(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Photo URL (optional)</Label>
                  <Input
                    value={addPhotoUrl}
                    onChange={(e) => setAddPhotoUrl(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={saveAddRelative}>Save Relative</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!nuclearFamily ? (
        <Card>
          <CardContent className="text-center py-12">
            <User className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Family Data</h3>
            <p className="text-muted-foreground mb-6">
              Start building your family tree by adding your parents and siblings.
            </p>
            <Button onClick={() => setOpenAdd(true)}>Add Family Member</Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-xl text-primary text-center">
              My Family
            </CardTitle>
            <CardDescription className="text-center">
              Click on any family member to view their detailed profile
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <div className="flex flex-col items-center space-y-8">
              {/* Parents Section */}
              <div className="bg-muted/50 rounded-lg p-6 w-full max-w-2xl">
                <h3 className="text-lg font-medium text-center mb-6 text-primary">Parents</h3>
                <div className="flex justify-center items-center space-x-12">
                  {nuclearFamily.parents.map((parent, index) => {
                    // Determine if this is mother or father based on relationships
                    const spouseId = nuclearFamily.spouseMap.get(parent.id);
                    const isFemale = parent.fullName.toLowerCase().includes('mother') ||
                                   parent.fullName.toLowerCase().includes('mom') ||
                                   (spouseId && members.find(m => m.id === spouseId)?.fullName.toLowerCase().includes('father'));

                    return (
                      <FamilyMemberCard
                        key={parent.id}
                        member={parent}
                        label={isFemale ? "Mother" : "Father"}
                        isParent={true}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Connection Line */}
              {nuclearFamily.children.length > 0 && (
                <div className="flex flex-col items-center">
                  <div className="w-px h-8 bg-border"></div>
                  <Heart className="h-6 w-6 text-red-500 mb-2" />
                  <div className="w-px h-8 bg-border"></div>
                </div>
              )}

              {/* Children Section */}
              {nuclearFamily.children.length > 0 && (
                <div className="w-full max-w-4xl">
                  <h3 className="text-lg font-medium text-center mb-6 text-primary">Children & Siblings</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 justify-items-center">
                    {nuclearFamily.children.map((child) => (
                      <FamilyMemberCard
                        key={child.id}
                        member={child}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Profile View Modal */}
      <Dialog open={openProfile} onOpenChange={setOpenProfile}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">
              {viewingProfile?.fullName}
            </DialogTitle>
          </DialogHeader>
          {viewingProfile && (
            <div className="space-y-6">
              {/* Profile Image and Basic Info */}
              <div className="flex flex-col items-center space-y-4">
                <img
                  src={viewingProfile.photoUrl || `https://picsum.photos/seed/${viewingProfile.id}/120`}
                  alt={viewingProfile.fullName}
                  className="w-24 h-24 rounded-full object-cover border-4 border-primary"
                />
                <div className="text-center">
                  <h3 className="text-lg font-semibold">{viewingProfile.fullName}</h3>
                  {viewingProfile.birthPlace && (
                    <p className="text-muted-foreground flex items-center justify-center gap-1 mt-1">
                      <MapPin className="h-4 w-4" />
                      {viewingProfile.birthPlace}
                    </p>
                  )}
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-3">
                <h4 className="font-medium text-primary flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Contact Information
                </h4>
                <div className="grid gap-2 pl-6">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Email not available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Phone not available</span>
                  </div>
                </div>
              </div>

              {/* Residence Information */}
              <div className="space-y-3">
                <h4 className="font-medium text-primary flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Current Residence
                </h4>
                <div className="pl-6">
                  <p className="text-sm text-muted-foreground">
                    Residence information is available in your personal profile settings.
                    This helps others locate you for family gatherings and connections.
                  </p>
                </div>
              </div>

              {/* Social Media */}
              <div className="space-y-3">
                <h4 className="font-medium text-primary flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Social Media
                </h4>
                <div className="pl-6">
                  <p className="text-sm text-muted-foreground">Social media information not available</p>
                </div>
              </div>

              {/* Family Information */}
              {nuclearFamily && (
                <div className="space-y-3">
                  <h4 className="font-medium text-primary flex items-center gap-2">
                    <Heart className="h-4 w-4" />
                    Family Information
                  </h4>
                  <div className="pl-6 space-y-2">
                    {/* Parents */}
                    {nuclearFamily.parents.some(p => nuclearFamily.parentChildMap.get(p.id)?.includes(viewingProfile.id)) && (
                      <div>
                        <span className="text-sm font-medium">Parents:</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {nuclearFamily.parents
                            .filter(p => nuclearFamily.parentChildMap.get(p.id)?.includes(viewingProfile.id))
                            .map(parent => (
                              <span key={parent.id} className="text-sm bg-muted px-2 py-1 rounded">
                                {parent.fullName}
                              </span>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Spouse */}
                    {nuclearFamily.spouseMap.has(viewingProfile.id) && (
                      <div>
                        <span className="text-sm font-medium">Spouse:</span>
                        <span className="text-sm bg-muted px-2 py-1 rounded ml-2">
                          {members.find(m => m.id === nuclearFamily.spouseMap.get(viewingProfile.id))?.fullName}
                        </span>
                      </div>
                    )}

                    {/* Children */}
                    {nuclearFamily.parentChildMap.has(viewingProfile.id) && (
                      <div>
                        <span className="text-sm font-medium">Children:</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {nuclearFamily.parentChildMap.get(viewingProfile.id)?.map(childId => {
                            const child = members.find(m => m.id === childId);
                            return child ? (
                              <span key={child.id} className="text-sm bg-muted px-2 py-1 rounded">
                                {child.fullName}
                              </span>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}

                    {/* Siblings */}
                    {nuclearFamily.parents.some(p => {
                      const siblings = nuclearFamily.parentChildMap.get(p.id) || [];
                      return siblings.includes(viewingProfile.id) && siblings.length > 1;
                    }) && (
                      <div>
                        <span className="text-sm font-medium">Siblings:</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {nuclearFamily.parents.flatMap(p =>
                            (nuclearFamily.parentChildMap.get(p.id) || [])
                              .filter(childId => childId !== viewingProfile.id)
                              .map(childId => members.find(m => m.id === childId))
                              .filter(Boolean)
                          ).map(sibling => (
                            <span key={sibling!.id} className="text-sm bg-muted px-2 py-1 rounded">
                              {sibling!.fullName}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Person</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Birth Place</Label>
                <Input
                  value={editBirthPlace}
                  onChange={(e) => setEditBirthPlace(e.target.value)}
                />
              </div>
              <div>
                <Label>Photo URL</Label>
                <Input
                  value={editPhotoUrl}
                  onChange={(e) => setEditPhotoUrl(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpenEdit(false)}>
                Cancel
              </Button>
              <Button onClick={saveEditMember}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
