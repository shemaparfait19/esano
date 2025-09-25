"use client";

import { useAuth } from "@/contexts/auth-context";
import { useEffect, useState } from "react";
import type {
  FamilyTree,
  FamilyTreeMember,
  FamilyTreeEdge,
  FamilyRelation,
} from "@/types/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Pencil, User, Users, Heart, Baby, Crown, Sparkles } from "lucide-react";

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

  // Build hierarchical tree structure
  const buildTreeStructure = () => {
    if (members.length === 0) return null;

    const memberMap = new Map(members.map(m => [m.id, m]));
    const childrenMap = new Map<string, string[]>();
    const spousesMap = new Map<string, string[]>();

    // Build relationship maps
    edges.forEach(edge => {
      if (edge.relation === 'parent' || edge.relation === 'child') {
        const parent = edge.relation === 'parent' ? edge.fromId : edge.toId;
        const child = edge.relation === 'parent' ? edge.toId : edge.fromId;

        if (!childrenMap.has(parent)) childrenMap.set(parent, []);
        childrenMap.get(parent)!.push(child);
      } else if (edge.relation === 'spouse') {
        [edge.fromId, edge.toId].forEach(id => {
          if (!spousesMap.has(id)) spousesMap.set(id, []);
          spousesMap.get(id)!.push(id === edge.fromId ? edge.toId : edge.fromId);
        });
      }
    });

    // Find root (person with no parents)
    const hasParents = new Set();
    edges.forEach(edge => {
      if (edge.relation === 'parent') hasParents.add(edge.toId);
      else if (edge.relation === 'child') hasParents.add(edge.fromId);
    });

    const rootId = members.find(m => !hasParents.has(m.id))?.id || members[0]?.id;
    if (!rootId) return null;

    // Build tree recursively
    const buildNode = (id: string, level = 0): any => {
      const member = memberMap.get(id);
      if (!member) return null;

      const children = (childrenMap.get(id) || []).map(childId => buildNode(childId, level + 1));
      const spouses = (spousesMap.get(id) || []).map(spouseId => memberMap.get(spouseId)).filter(Boolean);

      return {
        ...member,
        level,
        children,
        spouses,
      };
    };

    return buildNode(rootId);
  };

  const treeStructure = buildTreeStructure();

  // Get relationship icon
  const getRelationIcon = (relation: string) => {
    switch (relation) {
      case 'parent': return <Crown className="h-4 w-4 text-blue-500" />;
      case 'child': return <Baby className="h-4 w-4 text-green-500" />;
      case 'spouse': return <Heart className="h-4 w-4 text-red-500" />;
      case 'sibling': return <Users className="h-4 w-4 text-purple-500" />;
      default: return <Sparkles className="h-4 w-4 text-gray-500" />;
    }
  };

  // Tree Node Component
  const TreeNode = ({ node, isLast = false }: { node: any; isLast?: boolean }) => {
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div className="flex flex-col items-center">
        {/* Node Content */}
        <div className="flex flex-col items-center space-y-2 mb-4">
          {/* Profile Image */}
          <div className="relative">
            <img
              src={node.photoUrl || `https://picsum.photos/seed/${node.id}/80`}
              alt={node.fullName}
              className="w-16 h-16 rounded-full object-cover border-2 border-primary shadow-md"
            />
            <Button
              size="icon"
              variant="outline"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-background border shadow-md"
              onClick={() => openEditMember(node)}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </div>

          {/* Name and Info */}
          <div className="text-center max-w-32">
            <div className="font-medium text-sm leading-tight">{node.fullName}</div>
            {node.birthPlace && (
              <div className="text-xs text-muted-foreground mt-1">{node.birthPlace}</div>
            )}
          </div>
        </div>

        {/* Spouses */}
        {node.spouses && node.spouses.length > 0 && (
          <div className="flex items-center space-x-4 mb-4">
            {node.spouses.map((spouse: FamilyTreeMember) => (
              <div key={spouse.id} className="flex flex-col items-center space-y-2">
                <div className="flex items-center space-x-1">
                  {getRelationIcon('spouse')}
                  <span className="text-xs text-muted-foreground">Spouse</span>
                </div>
                <img
                  src={spouse.photoUrl || `https://picsum.photos/seed/${spouse.id}/60`}
                  alt={spouse.fullName}
                  className="w-12 h-12 rounded-full object-cover border-2 border-muted"
                />
                <div className="text-center max-w-24">
                  <div className="font-medium text-xs leading-tight">{spouse.fullName}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Children */}
        {hasChildren && (
          <div className="relative">
            {/* Vertical line from parent */}
            <div className="w-px h-8 bg-border mx-auto"></div>

            {/* Horizontal line to children */}
            <div className="flex items-center justify-center space-x-8 relative">
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-px bg-border"></div>

              {node.children.map((child: any, index: number) => (
                <div key={child.id} className="flex flex-col items-center">
                  {/* Vertical line to child */}
                  <div className="w-px h-8 bg-border"></div>

                  {/* Child node */}
                  <TreeNode node={child} isLast={index === node.children.length - 1} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

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
            Family Tree
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            View your organized family hierarchy. Click the edit button on any person to update their information.
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

      {!treeStructure ? (
        <Card>
          <CardContent className="text-center py-12">
            <User className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Family Tree Yet</h3>
            <p className="text-muted-foreground mb-6">
              Start building your family tree by adding your first relative.
            </p>
            <Button onClick={() => setOpenAdd(true)}>Add First Person</Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-8">
            <div className="flex justify-center">
              <div className="max-w-6xl w-full overflow-x-auto">
                <TreeNode node={treeStructure} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
