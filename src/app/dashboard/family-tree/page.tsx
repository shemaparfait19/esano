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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { v4 as uuidv4 } from "uuid";
import { db } from "@/lib/firebase";
import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Pencil, User, Users, Heart, Baby, Crown, Sparkles, MapPin, Phone, Mail, Edit, Trash2 } from "lucide-react";
import Link from "next/link";

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


  // Organize family members by relationship to current user
  const organizeFamilyHierarchy = () => {
    if (members.length === 0) return null;

    const parents: FamilyTreeMember[] = [];
    const siblings: FamilyTreeMember[] = [];
    const otherRelatives: { [key: string]: FamilyTreeMember[] } = {};

    // Since we're now syncing from relatives data, we can access the relationshipToUser
    // For now, we'll use the edge relations which are mapped from relationshipToUser
    edges.forEach(edge => {
      const member = members.find(m => m.id === edge.toId);
      if (!member) return;

      // Check relationship type - use the actual relation values from the type
      if (edge.relation === 'parent') {
        if (!parents.find(p => p.id === member.id)) {
          parents.push(member);
        }
      } else if (edge.relation === 'sibling') {
        if (!siblings.find(s => s.id === member.id)) {
          siblings.push(member);
        }
      } else {
        // Other relationships (spouse, grandparent, grandchild, cousin)
        const relationKey = edge.relation;
        if (!otherRelatives[relationKey]) {
          otherRelatives[relationKey] = [];
        }
        if (!otherRelatives[relationKey].find(r => r.id === member.id)) {
          otherRelatives[relationKey].push(member);
        }
      }
    });

    return {
      parents,
      siblings,
      otherRelatives,
    };
  };

  const familyHierarchy = organizeFamilyHierarchy();

  // Profile View Modal
  const [viewingProfile, setViewingProfile] = useState<FamilyTreeMember | null>(null);
  const [openProfile, setOpenProfile] = useState(false);

  // Edit Modal
  const [editingMember, setEditingMember] = useState<FamilyTreeMember | null>(null);
  const [openEdit, setOpenEdit] = useState(false);
  const [editForm, setEditForm] = useState<Partial<FamilyTreeMember>>({});

  // Delete Confirmation
  const [deletingMember, setDeletingMember] = useState<FamilyTreeMember | null>(null);
  const [openDelete, setOpenDelete] = useState(false);

  useEffect(() => {
    if (editingMember) {
      setEditForm({ ...editingMember });
    }
  }, [editingMember]);

  const openProfileView = (member: FamilyTreeMember) => {
    setViewingProfile(member);
    setOpenProfile(true);
  };

  // Family Member Card Component
  const FamilyMemberCard = ({ member, label, isParent = false }: { member: FamilyTreeMember; label?: string; isParent?: boolean }) => (
    <div className="flex flex-col items-center space-y-2 p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer" onClick={() => openProfileView(member)}>
      <div className="relative">
        <img
          src={member.photoUrl || `https://picsum.photos/seed/${member.id}/80`}
          alt={member.fullName}
          className={`rounded-full object-cover border-2 shadow-md ${isParent ? 'w-20 h-20 border-primary' : 'w-16 h-16 border-muted'}`}
        />
        {label && (
          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap">
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
      <div className="flex space-x-1 mt-2">
        <Button
          size="sm"
          variant="outline"
          className="h-6 w-6 p-0"
          onClick={(e) => {
            e.stopPropagation();
            setEditingMember(member);
            setOpenEdit(true);
          }}
        >
          <Edit className="h-3 w-3" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            setDeletingMember(member);
            setOpenDelete(true);
          }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
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
        <Link href="/dashboard/relatives">
          <Button>Add Relative</Button>
        </Link>
      </div>

      {!familyHierarchy || (familyHierarchy.parents.length === 0 && familyHierarchy.siblings.length === 0 && Object.keys(familyHierarchy.otherRelatives).length === 0) ? (
        <Card>
          <CardContent className="text-center py-12">
            <User className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Family Data</h3>
            <p className="text-muted-foreground mb-6">
              Add detailed family information in the Relatives section. Your family tree will display here once you have relatives added.
            </p>
            <Link href="/dashboard/relatives">
              <Button>Add Family Information</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Parents Section - Father and Mother side by side */}
          {familyHierarchy.parents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="font-headline text-xl text-primary flex items-center gap-2">
                  <Crown className="h-5 w-5" />
                  Parents
                </CardTitle>
                <CardDescription>
                  Your direct parents and guardians
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center items-center gap-8">
                  {(() => {
                    // Find father and mother from family heads and parents
                    const father = familyHierarchy.parents.find(p =>
                      members.find(m => m.id === p.id)?.fullName?.toLowerCase().includes('father') ||
                      p.fullName?.toLowerCase().includes('father')
                    );
                    const mother = familyHierarchy.parents.find(p =>
                      members.find(m => m.id === p.id)?.fullName?.toLowerCase().includes('mother') ||
                      p.fullName?.toLowerCase().includes('mother')
                    );

                    // If we can't determine father/mother by name, just show them in order
                    const parentsToShow: { parent: FamilyTreeMember; label: string }[] = [];
                    if (father) parentsToShow.push({ parent: father, label: "Father" });
                    if (mother) parentsToShow.push({ parent: mother, label: "Mother" });

                    // Add any remaining parents
                    familyHierarchy.parents.forEach(parent => {
                      if (!parentsToShow.find(p => p.parent.id === parent.id)) {
                        parentsToShow.push({ parent, label: "Parent" });
                      }
                    });

                    return parentsToShow.map(({ parent, label }) => (
                      <FamilyMemberCard
                        key={parent.id}
                        member={parent}
                        label={label}
                        isParent={true}
                      />
                    ));
                  })()}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Siblings Section */}
          {familyHierarchy.siblings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="font-headline text-xl text-primary flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Siblings
                </CardTitle>
                <CardDescription>
                  Your brothers and sisters
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {familyHierarchy.siblings.map((sibling) => (
                    <FamilyMemberCard
                      key={sibling.id}
                      member={sibling}
                      label="Sibling"
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Other Relatives Sections */}
          {Object.entries(familyHierarchy.otherRelatives).map(([relation, relatives]) => (
            relatives.length > 0 && (
              <Card key={relation}>
                <CardHeader>
                  <CardTitle className="font-headline text-xl text-primary flex items-center gap-2 capitalize">
                    {relation === 'spouse' && <Heart className="h-5 w-5" />}
                    {relation === 'grandparent' && <Crown className="h-5 w-5" />}
                    {relation === 'grandchild' && <Baby className="h-5 w-5" />}
                    {relation === 'cousin' && <Users className="h-5 w-5" />}
                    {relation.replace('-', ' ')}
                  </CardTitle>
                  <CardDescription>
                    Your {relation.replace('-', ' ')}
                    {relatives.length > 1 ? 's' : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {relatives.map((relative) => (
                      <FamilyMemberCard
                        key={relative.id}
                        member={relative}
                        label={relation.replace('-', ' ')}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          ))}
        </div>
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
              {familyHierarchy && (
                <div className="space-y-3">
                  <h4 className="font-medium text-primary flex items-center gap-2">
                    <Heart className="h-4 w-4" />
                    Family Information
                  </h4>
                  <div className="pl-6 space-y-2">
                    {/* Parents */}
                    {familyHierarchy.parents.length > 0 && (
                      <div>
                        <span className="text-sm font-medium">Parents:</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {familyHierarchy.parents.map(parent => (
                            <span key={parent.id} className="text-sm bg-muted px-2 py-1 rounded">
                              {parent.fullName}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Siblings */}
                    {familyHierarchy.siblings.length > 0 && (
                      <div>
                        <span className="text-sm font-medium">Siblings:</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {familyHierarchy.siblings.map(sibling => (
                            <span key={sibling.id} className="text-sm bg-muted px-2 py-1 rounded">
                              {sibling.fullName}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Other Relationships */}
                    {Object.entries(familyHierarchy.otherRelatives).map(([relation, relatives]) => (
                      relatives.length > 0 && (
                        <div key={relation}>
                          <span className="text-sm font-medium capitalize">{relation.replace('-', ' ')}:</span>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {relatives.map(relative => (
                              <span key={relative.id} className="text-sm bg-muted px-2 py-1 rounded">
                                {relative.fullName}
                              </span>
                            ))}
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Member Modal */}
      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Family Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={editForm.fullName || ''}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="gender">Gender</Label>
                <Select
                  value={editForm.gender || ''}
                  onValueChange={(value) => setEditForm({ ...editForm, gender: value as "male" | "female" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="birthDate">Birth Date</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={editForm.birthDate || ''}
                  onChange={(e) => setEditForm({ ...editForm, birthDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="birthPlace">Birth Place</Label>
                <Input
                  id="birthPlace"
                  value={editForm.birthPlace || ''}
                  onChange={(e) => setEditForm({ ...editForm, birthPlace: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="occupation">Occupation</Label>
              <Input
                id="occupation"
                value={editForm.occupation || ''}
                onChange={(e) => setEditForm({ ...editForm, occupation: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={editForm.notes || ''}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setOpenEdit(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!editingMember || !editForm.fullName) return;
                try {
                  const response = await fetch('/api/family-tree', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      type: 'member',
                      ownerUserId: user?.uid,
                      member: { ...editingMember, ...editForm },
                    }),
                  });
                  if (response.ok) {
                    toast({ title: "Member updated successfully" });
                    setOpenEdit(false);
                  } else {
                    toast({ title: "Failed to update member", variant: "destructive" });
                  }
                } catch (error) {
                  toast({ title: "Error updating member", variant: "destructive" });
                }
              }}
            >
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={openDelete} onOpenChange={setOpenDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Family Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deletingMember?.fullName}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deletingMember) return;
                try {
                  const response = await fetch(`/api/family-tree?ownerUserId=${user?.uid}&memberId=${deletingMember.id}`, {
                    method: 'DELETE',
                  });
                  if (response.ok) {
                    toast({ title: "Member deleted successfully" });
                    setOpenDelete(false);
                  } else {
                    toast({ title: "Failed to delete member", variant: "destructive" });
                  }
                } catch (error) {
                  toast({ title: "Error deleting member", variant: "destructive" });
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
