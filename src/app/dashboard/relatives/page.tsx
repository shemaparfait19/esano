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
import { Users, UserPlus, Crown, Heart, Baby, Plus } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import Link from 'next/link';

interface FamilyHead {
  id: string;
  name: string;
  relationship: string; // e.g., "father", "grandfather", "great-grandfather"
}

interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
  relationshipToUser: string; // Direct relationship to current user
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
  const [memberRelationshipToUser, setMemberRelationshipToUser] = useState('');
  const [connectedToHead, setConnectedToHead] = useState('');
  const [memberBirthPlace, setMemberBirthPlace] = useState('');
  const [memberBirthDate, setMemberBirthDate] = useState('');
  const [memberNotes, setMemberNotes] = useState('');

  // Load family data from Firestore
  useEffect(() => {
    if (!user) {
      console.log('No user found, setting loading to false');
      setLoading(false);
      return;
    }

    console.log('Loading family data for user:', user.uid);
    const familyDocRef = doc(db, 'familyData', user.uid);

    // Force immediate load of existing data
    const loadData = async () => {
      try {
        console.log('Force loading data for user:', user.uid);
        const snap = await getDoc(familyDocRef);
        console.log('Document exists:', snap.exists());
        if (snap.exists()) {
          const data = snap.data();
          console.log('Raw document data:', data);

          // Check if data has the expected structure
          const heads = data?.familyHeads || [];
          const members = data?.familyMembers || [];

          console.log('Extracted familyHeads:', heads, 'length:', heads.length);
          console.log('Extracted familyMembers:', members, 'length:', members.length);

          setFamilyHeads(heads);
          setFamilyMembers(members);
        } else {
          console.log('No document found, initializing empty arrays');
          setFamilyHeads([]);
          setFamilyMembers([]);
        }
      } catch (error) {
        console.error('Error loading family data:', error);
        setFamilyHeads([]);
        setFamilyMembers([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Set up real-time listener
    const unsubscribe = onSnapshot(familyDocRef, (snapshot) => {
      console.log('Real-time snapshot received, exists:', snapshot.exists());
      if (snapshot.exists()) {
        const data = snapshot.data();
        console.log('Real-time data:', data);

        const heads = data?.familyHeads || [];
        const members = data?.familyMembers || [];

        console.log('Real-time familyHeads:', heads, 'length:', heads.length);
        console.log('Real-time familyMembers:', members, 'length:', members.length);

        setFamilyHeads(heads);
        setFamilyMembers(members);
      } else {
        console.log('Real-time: no document exists');
        setFamilyHeads([]);
        setFamilyMembers([]);
      }
    }, (error) => {
      console.error('Real-time listener error:', error);
    });

    return () => unsubscribe();
  }, [user]);


  // Save family data to Firestore
  const saveFamilyData = async (heads: FamilyHead[], members: FamilyMember[]) => {
    if (!user) {
      console.error('No user found for saving family data');
      return;
    }

    try {
      console.log('Saving family data for user:', user.uid);
      console.log('Family heads:', heads);
      console.log('Family members:', members);

      const response = await fetch('/api/save-family-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          familyHeads: heads,
          familyMembers: members,
          userId: user.uid,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save');
      }

      console.log('Family data saved successfully');
      toast({
        title: 'Family information saved',
        description: 'Your family data has been saved successfully.',
      });
    } catch (error) {
      console.error('Error saving family data:', error);
      toast({
        title: 'Save failed',
        description: `Failed to save family information: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    }
  };

  // Add family head
  const addFamilyHead = async () => {
    if (!headName.trim()) {
      console.log('Head name is empty, not adding');
      return;
    }

    console.log('Adding family head:', headName, headRelationship);

    const newHead: FamilyHead = {
      id: uuidv4(),
      name: headName.trim(),
      relationship: headRelationship,
    };

    const updatedHeads = [...familyHeads, newHead];
    console.log('Updated heads:', updatedHeads);
    setFamilyHeads(updatedHeads);
    // Persist immediately so data remains across sessions
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
    if (!memberName.trim() || !memberRelationship.trim() || !memberRelationshipToUser.trim() || !connectedToHead) {
      console.log('Missing required fields:', {
        memberName: !!memberName.trim(),
        memberRelationship: !!memberRelationship.trim(),
        memberRelationshipToUser: !!memberRelationshipToUser.trim(),
        connectedToHead: !!connectedToHead
      });
      return;
    }

    console.log('Adding family member:', memberName, memberRelationshipToUser, connectedToHead);

    const newMember: FamilyMember = {
      id: uuidv4(),
      name: memberName.trim(),
      relationship: memberRelationship.trim(),
      relationshipToUser: memberRelationshipToUser.trim(),
      connectedTo: connectedToHead,
      birthPlace: memberBirthPlace.trim() || undefined,
      birthDate: memberBirthDate || undefined,
      notes: memberNotes.trim() || undefined,
    };

    const updatedMembers = [...familyMembers, newMember];
    console.log('Updated members:', updatedMembers);
    setFamilyMembers(updatedMembers);
    // Persist immediately so data remains across sessions
    await saveFamilyData(familyHeads, updatedMembers);

    // Reset form
    setMemberName('');
    setMemberRelationship('');
    setMemberRelationshipToUser('');
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

  // Get spouse for a family head
  const getSpouse = (head: FamilyHead) => {
    let spouseRelation = '';
    if (head.relationship === 'father') spouseRelation = 'mother';
    else if (head.relationship === 'grandfather') spouseRelation = 'grandmother';
    else if (head.relationship === 'great-grandfather') spouseRelation = 'great-grandmother';
    // Add more if needed

    return familyMembers.find(m => m.connectedTo === head.id && m.relationshipToUser === spouseRelation);
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

  // Calculate family data statistics
  const totalFamilyHeads = familyHeads.length;
  const totalFamilyMembers = familyMembers.length;
  const totalRelatives = totalFamilyHeads + totalFamilyMembers;

  // Debug information
  console.log('Current user ID:', user?.uid);
  console.log('Family heads count:', totalFamilyHeads);
  console.log('Family members count:', totalFamilyMembers);
  console.log('Family heads data:', familyHeads);
  console.log('Family members data:', familyMembers);

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

          {/* Debug Info */}
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="font-medium text-yellow-800">Debug Information:</h3>
            <p className="text-sm text-yellow-700">User ID: {user?.uid || 'Not logged in'}</p>
            <p className="text-sm text-yellow-700">Family Heads: {totalFamilyHeads}</p>
            <p className="text-sm text-yellow-700">Family Members: {totalFamilyMembers}</p>
            <p className="text-sm text-yellow-700">Total Relatives: {totalRelatives}</p>
            <details className="mt-2">
              <summary className="cursor-pointer text-sm text-yellow-700">View Raw Data</summary>
              <pre className="mt-2 text-xs bg-yellow-100 p-2 rounded overflow-auto max-h-40">
                Family Heads: {JSON.stringify(familyHeads, null, 2)}
                Family Members: {JSON.stringify(familyMembers, null, 2)}
              </pre>
            </details>
            <Button
              onClick={async () => {
                if (!user) return;
                console.log('Manual check for user:', user.uid);
                const familyDocRef = doc(db, 'familyData', user.uid);
                try {
                  const snap = await getDoc(familyDocRef);
                  console.log('Manual fetch result:', snap.exists());
                  if (snap.exists()) {
                    console.log('Manual fetch data:', snap.data());
                  }
                } catch (error) {
                  console.error('Manual fetch error:', error);
                }
              }}
              size="sm"
              variant="outline"
              className="mt-2"
            >
              Check Firestore Data
            </Button>
          </div>
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
                    <Label>Relationship to You</Label>
                    <Select value={memberRelationshipToUser} onValueChange={setMemberRelationshipToUser}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select relationship to you" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mother">Mother</SelectItem>
                        <SelectItem value="father">Father</SelectItem>
                        <SelectItem value="brother">Brother</SelectItem>
                        <SelectItem value="sister">Sister</SelectItem>
                        <SelectItem value="grandmother">Grandmother</SelectItem>
                        <SelectItem value="grandfather">Grandfather</SelectItem>
                        <SelectItem value="uncle">Uncle</SelectItem>
                        <SelectItem value="aunt">Aunt</SelectItem>
                        <SelectItem value="cousin">Cousin</SelectItem>
                        <SelectItem value="nephew">Nephew</SelectItem>
                        <SelectItem value="niece">Niece</SelectItem>
                        <SelectItem value="step-mother">Step Mother</SelectItem>
                        <SelectItem value="step-father">Step Father</SelectItem>
                        <SelectItem value="step-brother">Step Brother</SelectItem>
                        <SelectItem value="step-sister">Step Sister</SelectItem>
                        <SelectItem value="guardian">Guardian</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Relationship to Family Head</Label>
                    <Select value={memberRelationship} onValueChange={setMemberRelationship}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select relationship to family head" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="wife">Wife</SelectItem>
                        <SelectItem value="husband">Husband</SelectItem>
                        <SelectItem value="son">Son</SelectItem>
                        <SelectItem value="daughter">Daughter</SelectItem>
                        <SelectItem value="brother">Brother</SelectItem>
                        <SelectItem value="sister">Sister</SelectItem>
                        <SelectItem value="mother">Mother</SelectItem>
                        <SelectItem value="father">Father</SelectItem>
                        <SelectItem value="grandmother">Grandmother</SelectItem>
                        <SelectItem value="grandfather">Grandfather</SelectItem>
                        <SelectItem value="uncle">Uncle</SelectItem>
                        <SelectItem value="aunt">Aunt</SelectItem>
                        <SelectItem value="nephew">Nephew</SelectItem>
                        <SelectItem value="niece">Niece</SelectItem>
                        <SelectItem value="cousin">Cousin</SelectItem>
                        <SelectItem value="step-mother">Step Mother</SelectItem>
                        <SelectItem value="step-father">Step Father</SelectItem>
                        <SelectItem value="step-son">Step Son</SelectItem>
                        <SelectItem value="step-daughter">Step Daughter</SelectItem>
                        <SelectItem value="step-brother">Step Brother</SelectItem>
                        <SelectItem value="step-sister">Step Sister</SelectItem>
                        <SelectItem value="guardian">Guardian</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
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

      {/* Family Data Summary */}
      {(familyHeads.length > 0 || familyMembers.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-xl text-primary flex items-center gap-2">
              <Users className="h-5 w-5" />
              Your Family Data Progress
            </CardTitle>
            <CardDescription>
              Complete overview of all family information stored in your collection
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">{totalFamilyHeads}</div>
                <div className="text-sm text-muted-foreground">Family Heads</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {familyHeads.map(head => head.name).join(', ')}
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">{totalFamilyMembers}</div>
                <div className="text-sm text-muted-foreground">Family Members</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Connected relatives and extended family
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">{totalRelatives}</div>
                <div className="text-sm text-muted-foreground">Total Relatives</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Complete family network
                </div>
              </div>
            </div>

            {/* Detailed Family Data Display */}
            <div className="mt-6 space-y-4">
              <h4 className="font-medium text-primary">Stored Family Information:</h4>

              {familyHeads.length > 0 && (
                <div>
                  <h5 className="font-medium text-sm mb-2">Family Heads:</h5>
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                    {familyHeads.map((head) => (
                      <div key={head.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                        <Crown className="h-4 w-4 text-primary" />
                        <span className="text-sm">{head.name} ({head.relationship})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {familyMembers.length > 0 && (
                <div>
                  <h5 className="font-medium text-sm mb-2">Family Members:</h5>
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                    {familyMembers.map((member) => (
                      <div key={member.id} className="p-2 bg-muted/50 rounded">
                        <div className="flex items-center gap-2 mb-1">
                          {getRelationshipIcon(member.relationship)}
                          <span className="text-sm font-medium">{member.name}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {member.relationshipToUser}
                          {member.birthPlace && ` • Born in ${member.birthPlace}`}
                          {member.birthDate && ` • ${new Date(member.birthDate).toLocaleDateString()}`}
                        </div>
                        {member.notes && (
                          <div className="text-xs text-muted-foreground mt-1 italic">
                            {member.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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
              {familyHeads.map((head) => {
                const spouse = getSpouse(head);
                return (
                  <Card key={head.id} className="border-primary/20">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <Crown className="h-8 w-8 text-primary" />
                          <div>
                            <h3 className="font-semibold text-lg">{head.name}</h3>
                            <p className="text-sm text-muted-foreground capitalize">
                              {head.relationship.replace('-', ' ')}
                            </p>
                          </div>
                        </div>
                        {spouse && (
                          <div className="flex items-center gap-3">
                            <Heart className="h-6 w-6 text-pink-500" />
                            <div>
                              <h4 className="font-medium">{spouse.name}</h4>
                              <p className="text-sm text-muted-foreground">Spouse</p>
                            </div>
                          </div>
                        )}
                        <Button
                          size="sm"
                          onClick={() => {
                            setConnectedToHead(head.id);
                            setOpenAddMember(true);
                          }}
                          className="w-full"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Relative
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
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
                                  {member.relationshipToUser}
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

      {/* Empty State - First Time Setup */}
      {familyHeads.length === 0 && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* DNA Analysis Option */}
          <Link href="/dashboard/dna-analysis">
            <Card className="text-center hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader>
                <div className="mx-auto bg-blue-100 p-3 rounded-full w-fit">
                  <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <CardTitle className="font-headline text-xl text-primary mt-4">
                  Upload DNA Data
                </CardTitle>
                <CardDescription>
                  Upload your DNA file to automatically find and connect with relatives in our database.
                  This uses genetic analysis to discover family connections.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">
                  Go to DNA Analysis
                </Button>
              </CardContent>
            </Card>
          </Link>

          {/* Manual Family Input Option */}
          <Card className="text-center hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="mx-auto bg-green-100 p-3 rounded-full w-fit">
                <Users className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="font-headline text-xl text-primary mt-4">
                Add Family Members Manually
              </CardTitle>
              <CardDescription>
                Build your family tree manually by adding relatives and their relationships.
                Start with family heads (fathers) and connect all relatives to them.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => setOpenAddHead(true)}>
                <Crown className="h-4 w-4 mr-2" />
                Start Adding Family
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Save Button */}
      {(familyHeads.length > 0 || familyMembers.length > 0) && (
        <div className="flex justify-center mt-8">
          <Button onClick={() => saveFamilyData(familyHeads, familyMembers)}>
            Save Family Information
          </Button>
        </div>
      )}
    </div>
  );
}
