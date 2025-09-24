"use client";

import { useAuth } from "@/contexts/auth-context";
import { useEffect, useMemo, useRef, useState } from "react";
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

const DEFAULT_NODE = { x: 100, y: 100 };

export default function FamilyTreePage() {
  const { user } = useAuth();
  const [tree, setTree] = useState<FamilyTree | null>(null);
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [relation, setRelation] = useState<FamilyRelation>("parent");

  // Zoom / Pan
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const panRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  // Dragging Nodes
  const [dragId, setDragId] = useState<string | null>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    nodeX: number;
    nodeY: number;
  } | null>(null);

  // Add Relative Modal
  const [openAdd, setOpenAdd] = useState(false);
  const [addName, setAddName] = useState("");
  const [addBirthPlace, setAddBirthPlace] = useState("");
  const [addPhotoUrl, setAddPhotoUrl] = useState("");
  const [addRelation, setAddRelation] = useState<FamilyRelation>("child");
  const [addLinkTo, setAddLinkTo] = useState<string>("");

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
        await setDoc(ref, init, { merge: true });
        setTree(init);
      }
      unsub = onSnapshot(ref, (s) => {
        if (s.exists()) setTree(s.data() as FamilyTree);
      });
    })();
    return () => {
      if (unsub) unsub();
    };
  }, [user]);

  const members = useMemo(() => tree?.members ?? [], [tree]);

  function memberById(id: string | undefined) {
    return members.find((m) => m.id === id);
  }

  function assignIfMissingPosition(
    member: FamilyTreeMember,
    index: number
  ): FamilyTreeMember {
    if (typeof member.x === "number" && typeof member.y === "number")
      return member;
    const gridX = 120 + (index % 5) * 220;
    const gridY = 120 + Math.floor(index / 5) * 160;
    return { ...member, x: gridX, y: gridY };
  }

  async function persistTree(next: FamilyTree) {
    if (!user) return;
    await setDoc(
      doc(db, "familyTrees", user.uid),
      { ...next, updatedAt: new Date().toISOString() },
      { merge: true }
    );
  }

  // Node dragging handlers
  function onNodeMouseDown(e: React.MouseEvent, id: string) {
    if (!tree) return;
    const m = memberById(id);
    if (!m) return;
    setDragId(id);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      nodeX: m.x ?? DEFAULT_NODE.x,
      nodeY: m.y ?? DEFAULT_NODE.y,
    };
  }

  function onCanvasMouseMove(e: React.MouseEvent) {
    if (!dragId || !tree || !dragRef.current) return;
    const dx = (e.clientX - dragRef.current.startX) / scale;
    const dy = (e.clientY - dragRef.current.startY) / scale;
    const nextMembers = tree.members.map((m) =>
      m.id === dragId
        ? {
            ...m,
            x: Math.round(dragRef.current!.nodeX + dx),
            y: Math.round(dragRef.current!.nodeY + dy),
          }
        : m
    );
    setTree({ ...tree, members: nextMembers });
  }

  async function onCanvasMouseUp() {
    if (!dragId || !tree) return;
    setDragId(null);
    dragRef.current = null;
    await persistTree(tree);
  }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    const delta = -e.deltaY;
    const factor = delta > 0 ? 1.1 : 0.9;
    setScale((s) => Math.max(0.3, Math.min(2, s * factor)));
  }

  function onCanvasMouseDown(e: React.MouseEvent) {
    if ((e.target as HTMLElement).dataset["nodetype"]) return; // ignore if on node
    panRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: offset.x,
      originY: offset.y,
    };
  }

  function onCanvasPanMove(e: React.MouseEvent) {
    if (!panRef.current) return;
    const dx = e.clientX - panRef.current.startX;
    const dy = e.clientY - panRef.current.startY;
    setOffset({
      x: panRef.current.originX + dx,
      y: panRef.current.originY + dy,
    });
  }

  function onCanvasPanUp() {
    panRef.current = null;
  }

  // Add relative modal save
  async function saveAddRelative() {
    if (!user || !tree || !addName.trim() || !addLinkTo) return;
    const baseMember: FamilyTreeMember = {
      id: uuidv4(),
      fullName: addName.trim(),
      birthPlace: addBirthPlace || undefined,
      photoUrl: addPhotoUrl || undefined,
      x: (memberById(addLinkTo)?.x ?? DEFAULT_NODE.x) + 160,
      y: (memberById(addLinkTo)?.y ?? DEFAULT_NODE.y) + 0,
    };

    const edge: FamilyTreeEdge = {
      fromId: addRelation === "parent" ? baseMember.id : addLinkTo,
      toId: addRelation === "parent" ? addLinkTo : baseMember.id,
      relation: addRelation,
    };

    const updated: FamilyTree = {
      ...tree,
      members: [...tree.members, baseMember],
      edges: [...tree.edges, edge],
      updatedAt: new Date().toISOString(),
    };
    setOpenAdd(false);
    setAddName("");
    setAddBirthPlace("");
    setAddPhotoUrl("");
    setTree(updated);
    await persistTree(updated);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-bold text-primary md:text-4xl">
          Family Tree
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Drag people around, add relatives, and link relationships. Changes
          save automatically.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-xl text-primary">
            Board Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 items-center">
          <Button variant="outline" onClick={() => setScale(1)}>
            Reset Zoom
          </Button>
          <Button
            variant="outline"
            onClick={() => setScale((s) => Math.min(2, s * 1.1))}
          >
            Zoom In
          </Button>
          <Button
            variant="outline"
            onClick={() => setScale((s) => Math.max(0.3, s / 1.1))}
          >
            Zoom Out
          </Button>
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
                      onValueChange={(v) => setAddRelation(v as FamilyRelation)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select relation" />
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
                  </div>
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
                </div>
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
        </CardContent>
      </Card>

      <div
        className="relative h-[70vh] w-full border rounded-md overflow-hidden bg-background"
        onWheel={onWheel}
        onMouseDown={onCanvasMouseDown}
        onMouseMove={(e) => {
          onCanvasPanMove(e);
          onCanvasMouseMove(e);
        }}
        onMouseUp={() => {
          onCanvasPanUp();
          onCanvasMouseUp();
        }}
        onMouseLeave={() => {
          onCanvasPanUp();
          onCanvasMouseUp();
        }}
      >
        <div
          className="absolute inset-0 origin-top-left"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          }}
        >
          {/* Edges layer */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {(tree?.edges ?? []).map((e, idx) => {
              const a = assignIfMissingPosition(
                memberById(e.fromId) as any,
                idx
              );
              const b = assignIfMissingPosition(
                memberById(e.toId) as any,
                idx + 1
              );
              if (!a || !b) return null;
              const x1 = (a.x ?? DEFAULT_NODE.x) + 100; // center of card
              const y1 = (a.y ?? DEFAULT_NODE.y) + 40;
              const x2 = (b.x ?? DEFAULT_NODE.x) + 100;
              const y2 = (b.y ?? DEFAULT_NODE.y) + 40;
              return (
                <line
                  key={idx}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  strokeOpacity={0.5}
                />
              );
            })}
          </svg>

          {/* Nodes layer */}
          {(members ?? []).map((m, i) => {
            const mm = assignIfMissingPosition(m, i);
            const x = mm.x ?? DEFAULT_NODE.x;
            const y = mm.y ?? DEFAULT_NODE.y;
            return (
              <div
                key={mm.id}
                data-nodetype="person"
                className="absolute w-[200px] select-none"
                style={{ transform: `translate(${x}px, ${y}px)` }}
                onMouseDown={(e) => onNodeMouseDown(e, mm.id)}
              >
                <div className="rounded-lg border bg-card shadow-sm p-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        mm.photoUrl || `https://picsum.photos/seed/${mm.id}/80`
                      }
                      alt={mm.fullName}
                      className="h-12 w-12 rounded-full object-cover border"
                    />
                    <div>
                      <div className="font-medium leading-tight">
                        {mm.fullName}
                      </div>
                      {mm.birthPlace && (
                        <div className="text-xs text-muted-foreground">
                          {mm.birthPlace}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-xl text-primary">
            Quick Link Relationship
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
          <Select
            onValueChange={(v) => setRelation(v as FamilyRelation)}
            value={relation}
          >
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
          <Button
            onClick={async () => {
              if (!user || !tree || !fromId || !toId || fromId === toId) return;
              const edge: FamilyTreeEdge = { fromId, toId, relation };
              const dedup = tree.edges.filter(
                (e) =>
                  !(
                    e.fromId === fromId &&
                    e.toId === toId &&
                    e.relation === relation
                  )
              );
              const updated: FamilyTree = {
                ...tree,
                edges: [...dedup, edge],
                updatedAt: new Date().toISOString(),
              };
              setTree(updated);
              await persistTree(updated);
            }}
          >
            Link
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
