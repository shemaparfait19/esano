"use client";

import { useAuth } from "@/contexts/auth-context";
import { useEffect, useState } from "react";
// import { getMyConnectionRequests, respondToConnectionRequest } from "@/app/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function NotificationsPage() {
  const { user } = useAuth();
  const [incoming, setIncoming] = useState<any[]>([]);
  const [outgoing, setOutgoing] = useState<any[]>([]);

  useEffect(() => {
    let ignore = false;
    async function load() {
      if (!user) return;
      const res = await fetch(`/api/requests?userId=${user.uid}`);
      const { incoming, outgoing } = await res.json();
      if (!ignore) {
        setIncoming(incoming);
        setOutgoing(outgoing);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [user]);

  const act = async (id: string, status: "accepted" | "declined") => {
    await fetch("/api/requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (!user) return;
    const res = await fetch(`/api/requests?userId=${user.uid}`);
    const data = await res.json();
    setIncoming(data.incoming);
    setOutgoing(data.outgoing);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-bold text-primary md:text-4xl">
          Notifications
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Manage your connection requests.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-xl text-primary">
              Incoming Requests
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {incoming.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No incoming requests.
              </p>
            )}
            {incoming.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between border p-3 rounded-md"
              >
                <div>
                  <div className="font-medium">From: {r.fromUserId}</div>
                  <div className="text-sm text-muted-foreground">
                    Request ID: {r.id}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => act(r.id, "accepted")}>
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => act(r.id, "declined")}
                  >
                    Decline
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-xl text-primary">
              Outgoing Requests
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {outgoing.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No outgoing requests.
              </p>
            )}
            {outgoing.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between border p-3 rounded-md"
              >
                <div>
                  <div className="font-medium">To: {r.toUserId}</div>
                  <div className="text-sm text-muted-foreground">
                    Request ID: {r.id}
                  </div>
                </div>
                <div className="text-xs">Pending</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
