"use client";

import { useAuth } from "@/contexts/auth-context";
import { useEffect, useMemo, useState } from "react";
import {
  addFamilyMember,
  getFamilyTree,
  linkFamilyRelation,
} from "@/app/actions";
import type {
  FamilyTree,
  FamilyTreeMember,
  FamilyTreeEdge,
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

export default function FamilyTreePage() {
  const { user } = useAuth();
  const [tree, setTree] = useState<FamilyTree | null>(null);
  const [newName, setNewName] = useState("");
  const [newBirthPlace, setNewBirthPlace] = useState("");
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [relation, setRelation] = useState("parent");

  useEffect(() => {
    let ignore = false;
    async function load() {
      if (!user) return;
      const t = await getFamilyTree(user.uid);
      if (!ignore) setTree(t);
    }
    load();
    return () => {
      ignore = true;
    };
  }, [user]);

  const members = useMemo(() => tree?.members ?? [], [tree]);

  async function addMember() {
    if (!user || !newName.trim()) return;
    const member: FamilyTreeMember = {
      id: uuidv4(),
      fullName: newName.trim(),
      birthPlace: newBirthPlace || undefined,
    };
    const updated = await addFamilyMember(user.uid, member);
    setTree(updated);
    setNewName("");
    setNewBirthPlace("");
  }

  async function addRelation() {
    if (!user || !fromId || !toId || fromId === toId) return;
    const edge: FamilyTreeEdge = { fromId, toId, relation: relation as any };
    const updated = await linkFamilyRelation(user.uid, edge);
    setTree(updated);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-bold text-primary md:text-4xl">
          Family Tree
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Add relatives and link relationships. Changes save to the database
          automatically.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-xl text-primary">
            Add Member
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-3">
          <Input
            placeholder="Full name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Input
            placeholder="Birth place (optional)"
            value={newBirthPlace}
            onChange={(e) => setNewBirthPlace(e.target.value)}
          />
          <Button onClick={addMember}>Add</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-xl text-primary">
            Link Relationship
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <Select onValueChange={setFromId} value={fromId}>
            <SelectTrigger>
              <SelectValue placeholder="From member" />
            </SelectTrigger>
            <SelectContent>
              {members.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select onValueChange={setRelation} value={relation}>
            <SelectTrigger>
              <SelectValue placeholder="Relation" />
            </SelectTrigger>
            <SelectContent>
              {[
                "parent",
                "child",
                "sibling",
                "spouse",
                "grandparent",
                "grandchild",
                "cousin",
              ].map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select onValueChange={setToId} value={toId}>
            <SelectTrigger>
              <SelectValue placeholder="To member" />
            </SelectTrigger>
            <SelectContent>
              {members.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={addRelation}>Link</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-xl text-primary">
            Your Tree
          </CardTitle>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No members yet. Add your first family member above.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-3">
              {members.map((m) => (
                <div key={m.id} className="border rounded-md p-3">
                  <div className="font-medium">{m.fullName}</div>
                  {m.birthPlace && (
                    <div className="text-sm text-muted-foreground">
                      {m.birthPlace}
                    </div>
                  )}
                  <div className="mt-2 text-xs text-muted-foreground">
                    ID: {m.id}
                  </div>
                </div>
              ))}
            </div>
          )}
          {tree && tree.edges.length > 0 && (
            <div className="mt-6">
              <div className="font-semibold mb-2">Relationships</div>
              <div className="space-y-2">
                {tree.edges.map((e, idx) => (
                  <div key={idx} className="text-sm text-muted-foreground">
                    {e.fromId} — {e.relation} → {e.toId}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
