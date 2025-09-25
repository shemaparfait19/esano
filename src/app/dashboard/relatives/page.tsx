'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { Users, UserPlus, Crown, Heart, Baby } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface FamilyHead {
  id: string;
  name: string;
  relationship: string; // e.g., "father", "grandfather", "great-grandfather"
}

interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
  connectedTo: string; // ID of the family head
  birthPlace?: string;
  birthDate?: string;
  notes?: string;
}

export default function RelativesPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  // State for family heads and members
  const [familyHeads, setFamilyHeads] = useState<FamilyHead[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [openAddHead, setOpenAddHead] = useState(false);
  const [openAddMember, setOpenAddMember] = useState(false);

  // Form states for adding family head
  const [headName, setHeadName] = useState('');
  const [headRelationship, setHeadRelationship] = useState('father');

  // Form states for adding family member
  const [memberName, setMemberName] = useState('');
  const [memberRelationship, setMemberRelationship] = useState('');
  const [connectedToHead, setConnectedToHead] = useState('');
  const [memberBirthPlace, setMemberBirthPlace] = useState('');
  const [memberBirthDate, setMemberBirthDate] = useState('');
  const [memberNotes, setMemberNotes] = useState('');

  // Load family data from Firestore
  useEffect(() => {
    if (!user) return;

    const familyDocRef = doc(db, 'familyData', user.uid);

    const unsubscribe = onSnapshot(familyDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setFamilyHeads(data.familyHeads || []);
        setFamilyMembers(data.familyMembers || []);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Save family data to Firestore
  const saveFamilyData = async (heads: FamilyHead[], members: FamilyMember[]) => {
    if (!user) return;

    try {
      await setDoc(doc(db, 'familyData', user.uid), {
        familyHeads: heads,
        familyMembers: members,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error saving family data:', error);
      toast({
        title: 'Save failed',
        description: 'Failed to save family information',
        variant: 'destructive',
      });
    }
  };

  // Add family head
  const addFamilyHead = async () => {
    if (!headName.trim()) return;

    const newHead: FamilyHead = {
      id: uuidv4(),
      name: headName.trim(),
      relationship: headRelationship,
    };

    const updatedHeads = [...familyHeads, newHead];
    setFamilyHeads(updatedHeads);
    await saveFamilyData(updatedHeads, familyMembers);

    // Reset form
    setHeadName('');
    setHeadRelationship('father');
    setOpenAddHead(false);

    toast({
      title: 'Family head added',
      description: `${newHead.name} has been added as a family head.`,
    });
  };

  // Add family member
  const addFamilyMember = async () => {
    if (!memberName.trim() || !memberRelationship.trim() || !connectedToHead) return;

    const newMember: FamilyMember = {
      id: uuidv4(),
      name: memberName.trim(),
      relationship: memberRelationship.trim(),
      connectedTo: connectedToHead,
      birthPlace: memberBirthPlace.trim() || undefined,
      birthDate: memberBirthDate || undefined,
      notes: memberNotes.trim() || undefined,
    };

    const updatedMembers = [...familyMembers, newMember];
    setFamilyMembers(updatedMembers);
    await saveFamilyData(familyHeads, updatedMembers);

    // Reset form
    setMemberName('');
    setMemberRelationship('');
    setConnectedToHead('');
    setMemberBirthPlace('');
    setMemberBirthDate('');
    setMemberNotes('');
    setOpenAddMember(false);

    toast({
      title: 'Family member added',
      description: `${newMember.name} has been added to your family tree.`,
    });
  };

  // Get relationship icon
  const getRelationshipIcon = (relationship: string) => {
    if (relationship.includes('father') || relationship.includes('grandfather')) {
      return <Crown className="h-4 w-4 text-blue-500" />;
    }
    if (relationship.includes('mother') || relationship.includes('grandmother')) {
      return <Heart className="h-4 w-4 text-pink-500" />;
    }
    if (relationship.includes('child') || relationship.includes('son') || relationship.includes('daughter')) {
      return <Baby className="h-4 w-4 text-green-500" />;
    }
    return <Users className="h-4 w-4 text-purple-500" />;
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="font-headline text-3xl font-bold text-primary md:text-4xl">
            Family Information
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Loading your family information...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold text-primary md:text-4xl">
            Family Information
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Build your comprehensive family tree from 3rd generation ancestry to your immediate family.
            Start by adding family heads (fathers), then connect relatives to them.
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={openAddHead} onOpenChange={setOpenAddHead}>
            <DialogTrigger asChild>
              <Button>
                <Crown className="h-4 w-4 mr-2" />
                Add Family Head
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Family Head</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4">
                <div>
                  <Label>Full Name</Label>
                  <Input
                    value={headName}
                    onChange={(e) => setHeadName(e.target.value)}
                    placeholder="Enter the full name"
                  />
                </div>
                <div>
                  <Label>Relationship to You</Label>
                  <Select value={headRelationship} onValueChange={setHeadRelationship}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select relationship" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="father">Father</SelectItem>
                      <SelectItem value="grandfather">Grandfather</SelectItem>
                      <SelectItem value="great-grandfather">Great Grandfather</SelectItem>
                      <SelectItem value="great-great-grandfather">Great Great Grandfather</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setOpenAddHead(false)}>
                    Cancel
                  </Button>
                  <Button onClick={addFamilyHead}>Add Family Head</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {familyHeads.length > 0 && (
            <Dialog open={openAddMember} onOpenChange={setOpenAddMember}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Relative
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Family Member</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4">
                  <div>
                    <Label>Full Name</Label>
                    <Input
                      value={memberName}
                      onChange={(e) => setMemberName(e.target.value)}
                      placeholder="Enter the full name"
                    />
                  </div>
                  <div>
                    <Label>Connect To Family Head</Label>
                    <Select value={connectedToHead} onValueChange={setConnectedToHead}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select family head" />
                      </SelectTrigger>
                      <SelectContent>
                        {familyHeads.map((head) => (
                          <SelectItem key={head.id} value={head.id}>
                            {head.name} ({head.relationship})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Relationship to Family Head</Label>
                    <Input
                      value={memberRelationship}
                      onChange={(e) => setMemberRelationship(e.target.value)}
                      placeholder="e.g., wife, son, daughter, brother, sister"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Birth Place (Optional)</Label>
                      <Input
                        value={memberBirthPlace}
                        onChange={(e) => setMemberBirthPlace(e.target.value)}
                        placeholder="City, Country"
                      />
                    </div>
                    <div>
                      <Label>Birth Date (Optional)</Label>
                      <Input
                        type="date"
                        value={memberBirthDate}
                        onChange={(e) => setMemberBirthDate(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Notes (Optional)</Label>
                    <Input
                      value={memberNotes}
                      onChange={(e) => setMemberNotes(e.target.value)}
                      placeholder="Additional information"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setOpenAddMember(false)}>
                      Cancel
                    </Button>
                    <Button onClick={addFamilyMember}>Add Family Member</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Family Heads Section */}
      {familyHeads.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-xl text-primary flex items-center gap-2">
              <Crown className="h-5 w-5" />
              Family Heads
            </CardTitle>
            <CardDescription>
              These are the patriarchs/fathers who serve as the foundation of your family tree.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {familyHeads.map((head) => (
                <Card key={head.id} className="border-primary/20">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Crown className="h-8 w-8 text-primary" />
                      <div>
                        <h3 className="font-semibold text-lg">{head.name}</h3>
                        <p className="text-sm text-muted-foreground capitalize">
                          {head.relationship.replace('-', ' ')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Family Members Section */}
      {familyMembers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-xl text-primary flex items-center gap-2">
              <Users className="h-5 w-5" />
              Family Members
            </CardTitle>
            <CardDescription>
              All relatives connected to your family heads.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {familyHeads.map((head) => {
                const connectedMembers = familyMembers.filter(m => m.connectedTo === head.id);
                if (connectedMembers.length === 0) return null;

                return (
                  <div key={head.id} className="space-y-3">
                    <h3 className="font-medium text-primary flex items-center gap-2">
                      <Crown className="h-4 w-4" />
                      Connected to {head.name} ({head.relationship})
                    </h3>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 pl-6">
                      {connectedMembers.map((member) => (
                        <Card key={member.id} className="border-muted">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              {getRelationshipIcon(member.relationship)}
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium truncate">{member.name}</h4>
                                <p className="text-sm text-muted-foreground capitalize">
                                  {member.relationship}
                                </p>
                                {member.birthPlace && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Born in {member.birthPlace}
                                  </p>
                                )}
                                {member.birthDate && (
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(member.birthDate).toLocaleDateString()}
                                  </p>
                                )}
                                {member.notes && (
                                  <p className="text-xs text-muted-foreground mt-1 italic">
                                    {member.notes}
                                  </p>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {familyHeads.length === 0 && (
        <Card className="text-center">
          <CardHeader>
            <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="font-headline text-2xl text-primary mt-4">
              Start Building Your Family Tree
            </CardTitle>
            <CardDescription>
              Begin by adding your father or grandfather as the head of the family.
              Then connect all other relatives to these family heads.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setOpenAddHead(true)}>
              <Crown className="h-4 w-4 mr-2" />
              Add First Family Head
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
