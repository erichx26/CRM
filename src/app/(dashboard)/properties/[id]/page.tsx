"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
  ArrowLeft,
  MapPin,
  ExternalLink,
  Calendar,
  Save,
  Trash2,
  Edit2,
  MessageSquare,
  Phone,
  Mail,
  User,
  Plus,
  X,
  Image as ImageIcon,
  Upload,
} from "lucide-react";

async function fetchProperty(id: string) {
  const res = await fetch(`/api/properties/${id}`);
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

const statusColors: Record<string, string> = {
  NEW: "bg-[#22c55e]/10 text-[#22c55e]",
  CONTACTED: "bg-[#3b82f6]/10 text-[#3b82f6]",
  NEGOTIATING: "bg-[#f59e0b]/10 text-[#f59e0b]",
  CLOSED: "bg-[#8b5cf6]/10 text-[#8b5cf6]",
  DEAD: "bg-[#94a3b8]/10 text-[#94a3b8]",
};

const priorityColors: Record<string, string> = {
  HIGH: "text-[#ef4444]",
  MEDIUM: "text-[#f59e0b]",
  LOW: "text-[#22c55e]",
};

function parseJsonField<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export default function PropertyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params.id as string;

  const { data: property, isLoading } = useQuery({
    queryKey: ["property", id],
    queryFn: () => fetchProperty(id),
  });

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    addressRaw: "",
    city: "",
    state: "",
    zip: "",
    status: "",
    priority: "",
    followUpDate: "",
  });
  const [newNote, setNewNote] = useState("");
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactForm, setContactForm] = useState({ ownerName: "", emails: "", phones: "" });
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);

  const updateMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await fetch(`/api/properties/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: (data) => {
      console.log("Update success:", data);
      queryClient.invalidateQueries({ queryKey: ["property", id] });
      setEditing(false);
    },
    onError: (error) => {
      console.log("Update error:", error);
    },
  });

  const noteMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(`/api/properties/${id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed to add note");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property", id] });
      setNewNote("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/properties/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      router.push("/properties");
    },
  });

  const addContactMutation = useMutation({
    mutationFn: async (data: typeof contactForm) => {
      const res = await fetch(`/api/properties/${id}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerName: data.ownerName,
          emails: JSON.stringify(data.emails.split(",").map((e: string) => e.trim()).filter(Boolean)),
          phones: JSON.stringify(data.phones.split(",").map((p: string) => p.trim()).filter(Boolean)),
        }),
      });
      if (!res.ok) throw new Error("Failed to add contact");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property", id] });
      setShowContactForm(false);
      setContactForm({ ownerName: "", emails: "", phones: "" });
    },
  });

  const photoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/properties/${id}/photos`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to upload photo");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property", id] });
    },
  });

  const photos = (property as any)?.photos || [];

  useEffect(() => {
    if (property && !editing) {
      setForm({
        addressRaw: property.addressRaw,
        city: property.city || "",
        state: property.state || "",
        zip: property.zip || "",
        status: property.status,
        priority: property.priority,
        followUpDate: property.followUpDate
          ? new Date(property.followUpDate).toISOString().split("T")[0]
          : "",
      });
    }
  }, [property, editing]);

  if (isLoading) {
    return <div className="p-8 text-center text-[#94a3b8]">Loading...</div>;
  }

  if (!property) {
    return <div className="p-8 text-center text-[#94a3b8]">Property not found</div>;
  }

  const contacts = property.contacts || [];
  const notes = property.notes || [];
  const activities = property.activities || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href="/properties" className="inline-flex items-center gap-2 text-sm text-[#94a3b8] hover:text-white">
          <ArrowLeft className="w-4 h-4" />
          Back to Properties
        </Link>
        <div className="flex gap-2">
          {!editing && (
            <>
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 px-3 py-2 bg-[#161d2e] border border-[#1e2738] text-sm font-medium rounded-lg hover:bg-[#1e2738] transition-all"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={() => {
                  if (confirm("Delete this property?")) {
                    deleteMutation.mutate();
                  }
                }}
                className="flex items-center gap-2 px-3 py-2 bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#ef4444] text-sm font-medium rounded-lg hover:bg-[#ef4444]/20 transition-all"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Property Details */}
          <div className="glass-card p-6">
            {editing ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  updateMutation.mutate(form);
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-[#94a3b8] mb-1.5">Address</label>
                  <input
                    type="text"
                    value={form.addressRaw}
                    onChange={(e) => setForm({ ...form, addressRaw: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#161d2e] border border-[#1e2738] rounded-lg text-white"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#94a3b8] mb-1.5">City</label>
                    <input
                      type="text"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[#161d2e] border border-[#1e2738] rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#94a3b8] mb-1.5">State</label>
                    <input
                      type="text"
                      value={form.state}
                      onChange={(e) => setForm({ ...form, state: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[#161d2e] border border-[#1e2738] rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#94a3b8] mb-1.5">ZIP</label>
                    <input
                      type="text"
                      value={form.zip}
                      onChange={(e) => setForm({ ...form, zip: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[#161d2e] border border-[#1e2738] rounded-lg text-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#94a3b8] mb-1.5">Status</label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[#161d2e] border border-[#1e2738] rounded-lg text-white"
                    >
                      <option value="NEW">New</option>
                      <option value="CONTACTED">Contacted</option>
                      <option value="NEGOTIATING">Negotiating</option>
                      <option value="CLOSED">Closed</option>
                      <option value="DEAD">Dead</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#94a3b8] mb-1.5">Priority</label>
                    <select
                      value={form.priority}
                      onChange={(e) => setForm({ ...form, priority: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[#161d2e] border border-[#1e2738] rounded-lg text-white"
                    >
                      <option value="HIGH">High</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="LOW">Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#94a3b8] mb-1.5">Follow-up</label>
                    <input
                      type="date"
                      value={form.followUpDate}
                      onChange={(e) => setForm({ ...form, followUpDate: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[#161d2e] border border-[#1e2738] rounded-lg text-white"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="px-4 py-2 border border-[#1e2738] text-[#94a3b8] hover:text-white rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-medium rounded-lg"
                  >
                    <Save className="w-4 h-4" />
                    {updateMutation.isPending ? "Saving..." : "Save"}
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-xl font-semibold">{property.addressRaw}</h1>
                    <p className="text-[#94a3b8]">
                      {[property.city, property.state, property.zip].filter(Boolean).join(", ")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${statusColors[property.status]}`}>
                      {property.status}
                    </span>
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${priorityColors[property.priority]}`}>
                      {property.priority}
                    </span>
                  </div>
                </div>

                {/* External Links */}
                <div className="flex gap-3 mb-4">
                  {property.redfinUrl && (
                    <a
                      href={property.redfinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-1.5 bg-[#161d2e] rounded-lg text-sm text-[#94a3b8] hover:text-white"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Redfin
                    </a>
                  )}
                  {property.mapsUrl && (
                    <a
                      href={property.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-1.5 bg-[#161d2e] rounded-lg text-sm text-[#94a3b8] hover:text-white"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Google Maps
                    </a>
                  )}
                </div>

                {property.followUpDate && (
                  <div className="flex items-center gap-2 text-sm text-[#f59e0b]">
                    <Calendar className="w-4 h-4" />
                    Follow-up: {new Date(property.followUpDate).toLocaleDateString()}
                  </div>
                )}

                {/* Property Details */}
                {(property.propertyType || property.beds || property.baths || property.squareFeet || property.lotSize || property.yearBuilt) && (
                  <div className="mt-4 p-4 bg-[#161d2e] rounded-lg">
                    <p className="text-xs text-[#94a3b8] mb-2">Property Details</p>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-4 text-sm">
                      {property.propertyType && (
                        <div>
                          <p className="text-[#94a3b8] text-xs">Type</p>
                          <p className="font-medium">{property.propertyType}</p>
                        </div>
                      )}
                      {property.beds != null && (
                        <div>
                          <p className="text-[#94a3b8] text-xs">Beds</p>
                          <p className="font-medium">{property.beds}</p>
                        </div>
                      )}
                      {property.baths != null && (
                        <div>
                          <p className="text-[#94a3b8] text-xs">Baths</p>
                          <p className="font-medium">{property.baths}</p>
                        </div>
                      )}
                      {property.squareFeet != null && (
                        <div>
                          <p className="text-[#94a3b8] text-xs">Sq Ft</p>
                          <p className="font-medium">{property.squareFeet.toLocaleString()}</p>
                        </div>
                      )}
                      {property.lotSize != null && (
                        <div>
                          <p className="text-[#94a3b8] text-xs">Lot Size</p>
                          <p className="font-medium">{property.lotSize.toLocaleString()}</p>
                        </div>
                      )}
                      {property.yearBuilt != null && (
                        <div>
                          <p className="text-[#94a3b8] text-xs">Year Built</p>
                          <p className="font-medium">{property.yearBuilt}</p>
                        </div>
                      )}
                    </div>
                    {(property.mlsNumber || property.source || property.price != null) && (
                      <div className="grid grid-cols-3 gap-4 text-sm mt-3 pt-3 border-t border-[#1e2738]">
                        {property.mlsNumber && (
                          <div>
                            <p className="text-[#94a3b8] text-xs">MLS#</p>
                            <p className="font-medium">{property.mlsNumber}</p>
                          </div>
                        )}
                        {property.source && (
                          <div>
                            <p className="text-[#94a3b8] text-xs">Source</p>
                            <p className="font-medium">{property.source}</p>
                          </div>
                        )}
                        {property.price != null && (
                          <div>
                            <p className="text-[#94a3b8] text-xs">Price</p>
                            <p className="font-medium text-[#22c55e]">${property.price.toLocaleString()}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Contacts */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Owner / Contact Info</h2>
              <button
                onClick={() => setShowContactForm(true)}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-[#3b82f6]/10 text-[#3b82f6] rounded-md hover:bg-[#3b82f6]/20"
              >
                <Plus className="w-3 h-3" />
                Add
              </button>
            </div>

            {showContactForm && (
              <div className="mb-4 p-4 bg-[#161d2e] rounded-lg border border-[#1e2738]">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium">New Contact</p>
                  <button onClick={() => setShowContactForm(false)} className="text-[#94a3b8] hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Owner name"
                    value={contactForm.ownerName}
                    onChange={(e) => setContactForm({ ...contactForm, ownerName: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0f1520] border border-[#1e2738] rounded-lg text-white text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Emails (comma separated)"
                    value={contactForm.emails}
                    onChange={(e) => setContactForm({ ...contactForm, emails: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0f1520] border border-[#1e2738] rounded-lg text-white text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Phones (comma separated)"
                    value={contactForm.phones}
                    onChange={(e) => setContactForm({ ...contactForm, phones: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0f1520] border border-[#1e2738] rounded-lg text-white text-sm"
                  />
                  <button
                    onClick={() => addContactMutation.mutate(contactForm)}
                    disabled={addContactMutation.isPending}
                    className="w-full px-3 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-sm font-medium rounded-lg disabled:opacity-50"
                  >
                    {addContactMutation.isPending ? "Saving..." : "Save Contact"}
                  </button>
                </div>
              </div>
            )}

            {contacts.length === 0 && !showContactForm ? (
              <p className="text-sm text-[#94a3b8]">No contact information yet.</p>
            ) : (
              <div className="space-y-4">
                {contacts.map((contact: { id: string; ownerName?: string; emails: string; phones: string }) => (
                  <div key={contact.id} className="p-4 bg-[#161d2e] rounded-lg">
                    {contact.ownerName && (
                      <div className="flex items-center gap-2 mb-2">
                        <User className="w-4 h-4 text-[#94a3b8]" />
                        <span className="font-medium">{contact.ownerName}</span>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      {parseJsonField<string[]>(contact.emails, []).length > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-4 h-4 text-[#94a3b8]" />
                          <span className="text-[#94a3b8]">{parseJsonField<string[]>(contact.emails, []).join(", ")}</span>
                        </div>
                      )}
                      {parseJsonField<string[]>(contact.phones, []).length > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-4 h-4 text-[#94a3b8]" />
                          <span className="text-[#94a3b8]">{parseJsonField<string[]>(contact.phones, []).join(", ")}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Photos */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Photos</h2>
              <label className="flex items-center gap-1 px-2 py-1 text-xs bg-[#3b82f6]/10 text-[#3b82f6] rounded-md hover:bg-[#3b82f6]/20 cursor-pointer">
                <Plus className="w-3 h-3" />
                <span>Add Photo</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) photoMutation.mutate(file);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            {photos.length === 0 ? (
              <label className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-[#1e2738] rounded-lg cursor-pointer hover:border-[#3b82f6]/50 transition-colors">
                <Upload className="w-8 h-8 text-[#94a3b8] mb-2" />
                <span className="text-sm text-[#94a3b8]">Click to upload a photo</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) photoMutation.mutate(file);
                    e.target.value = "";
                  }}
                />
              </label>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {photos.map((photo: { id: string; url: string; filename: string }) => (
                  <button
                    key={photo.id}
                    onClick={() => setLightboxPhoto(photo.url)}
                    className="relative aspect-square rounded-lg overflow-hidden border border-[#1e2738] hover:border-[#3b82f6] transition-colors group"
                  >
                    <img
                      src={photo.url}
                      alt={photo.filename}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-white" />
                    </div>
                  </button>
                ))}
                <label className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-[#1e2738] rounded-lg cursor-pointer hover:border-[#3b82f6]/50 transition-colors">
                  <Plus className="w-6 h-6 text-[#94a3b8]" />
                  <span className="text-xs text-[#94a3b8] mt-1">Add</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) photoMutation.mutate(file);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            )}
            {photoMutation.isPending && (
              <p className="text-sm text-[#94a3b8] mt-2">Uploading...</p>
            )}
          </div>

          {/* Notes */}
          <div className="glass-card p-6">
            <h2 className="font-semibold mb-4">Notes</h2>
            <div className="mb-4">
              <div className="flex gap-2">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note..."
                  className="flex-1 px-4 py-2.5 bg-[#161d2e] border border-[#1e2738] rounded-lg text-white placeholder-[#94a3b8] resize-none"
                  rows={3}
                />
                <button
                  onClick={() => newNote.trim() && noteMutation.mutate(newNote)}
                  disabled={!newNote.trim() || noteMutation.isPending}
                  className="px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg disabled:opacity-50"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="space-y-3">
              {notes.map((note: { id: string; content: string; createdBy: { name: string }; createdAt: string }) => (
                <div key={note.id} className="p-4 bg-[#161d2e] rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                  <p className="text-xs text-[#94a3b8] mt-2">
                    {note.createdBy?.name} • {new Date(note.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Activity Timeline */}
        <div className="glass-card p-6">
          <h2 className="font-semibold mb-4">Activity</h2>
          <div className="space-y-4">
            {activities.map((activity: { id: string; action: string; details?: string; user: { name: string }; createdAt: string }) => (
              <div key={activity.id} className="flex gap-3">
                <div className="w-2 h-2 mt-2 rounded-full bg-[#3b82f6]" />
                <div>
                  <p className="text-sm">{activity.details || activity.action}</p>
                  <p className="text-xs text-[#94a3b8]">
                    {activity.user?.name} • {new Date(activity.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxPhoto(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors"
            onClick={() => setLightboxPhoto(null)}
          >
            <X className="w-8 h-8" />
          </button>
          <img
            src={lightboxPhoto}
            alt="Full size"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
