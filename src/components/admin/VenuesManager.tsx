"use client";

import { useState } from "react";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import type { AdminVenue } from "@/lib/admin-data";
import type { VenueInput } from "@/lib/validation";
import { Button, FormNotice } from "@/components/ui/form";
import { VenueForm } from "@/components/admin/VenueForm";

export function VenuesManager({ initial }: { initial: AdminVenue[] }) {
  const [venues, setVenues] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function create(values: VenueInput) {
    const res = await fetch("/api/admin/venues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error ?? "Could not create the venue.");
    setVenues((list) =>
      [...list, body.venue as AdminVenue].sort((a, b) => a.name.localeCompare(b.name))
    );
    setAdding(false);
  }

  async function update(id: string, values: VenueInput) {
    const res = await fetch(`/api/admin/venues/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error ?? "Could not save the venue.");
    setVenues((list) => list.map((v) => (v.id === id ? (body.venue as AdminVenue) : v)));
    setEditingId(null);
  }

  async function remove(venue: AdminVenue) {
    setError(null);
    if (!window.confirm(`Remove ${venue.name}? This can't be undone.`)) return;
    const res = await fetch(`/api/admin/venues/${venue.id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not remove the venue.");
      return;
    }
    setVenues((list) => list.filter((v) => v.id !== venue.id));
  }

  return (
    <div className="space-y-4">
      {error && <FormNotice tone="error">{error}</FormNotice>}

      {venues.length === 0 && !adding && (
        <p className="rounded-xl bg-blue-pale px-4 py-3 text-sm font-semibold text-blue-dark">
          No venues yet — add the first one.
        </p>
      )}

      <ul className="space-y-3">
        {venues.map((venue) =>
          editingId === venue.id ? (
            <li key={venue.id} className="rounded-xl border border-line p-4">
              <VenueForm
                initial={venue}
                submitLabel="Save changes"
                onSubmit={(values) => update(venue.id, values)}
                onCancel={() => setEditingId(null)}
              />
            </li>
          ) : (
            <li
              key={venue.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-line p-4"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-blue-pale">
                  <MapPin className="h-4.5 w-4.5 text-blue" aria-hidden />
                </span>
                <div>
                  <p className="font-extrabold text-black">{venue.name}</p>
                  <p className="mt-0.5 text-sm text-mid">
                    {[venue.address, venue.postcode].filter(Boolean).join(", ") ||
                      "No address on file"}
                  </p>
                  {venue.default_capacity !== null && (
                    <p className="mt-0.5 text-sm text-muted">
                      Default capacity {venue.default_capacity}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAdding(false);
                    setEditingId(venue.id);
                  }}
                  className="flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-bold text-mid transition-colors hover:bg-blue-pale hover:text-blue"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => remove(venue)}
                  className="flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-bold text-mid transition-colors hover:bg-red-soft hover:text-red-dark"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden /> Remove
                </button>
              </div>
            </li>
          )
        )}
      </ul>

      {adding ? (
        <div className="rounded-xl border border-line p-4">
          <VenueForm
            submitLabel="Add venue"
            onSubmit={create}
            onCancel={() => setAdding(false)}
          />
        </div>
      ) : (
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setEditingId(null);
            setAdding(true);
          }}
          className="flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" aria-hidden /> Add a venue
        </Button>
      )}
    </div>
  );
}
