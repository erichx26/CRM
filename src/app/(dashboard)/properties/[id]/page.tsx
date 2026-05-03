"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
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
  ChevronLeft,
  ChevronRight,
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
    propertyType: "",
    beds: "",
    baths: "",
    squareFeet: "",
    lotSize: "",
    yearBuilt: "",
    mlsNumber: "",
    source: "",
    price: "",
  });
  const [newNote, setNewNote] = useState("");
  const [showContactForm, setShowContactForm] = useState(false);
  const [editingContact, setEditingContact] = useState<string | null>(null);
  const [contactForm, setContactForm] = useState({ ownerName: "", emails: "", phones: "" });
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editNoteContent, setEditNoteContent] = useState("");
  const [lightboxIndex, setLightboxIndex] = useState<number>(0);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const photosSectionRef = useRef<HTMLDivElement>(null);

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
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      for (const file of files) {
        formData.append("files", file);
      }
      const res = await fetch(`/api/properties/${id}/photos`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to upload photos");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property", id] });
    },
  });

  const deletePhotoMutation = useMutation({
    mutationFn: async (photoId: string) => {
      const res = await fetch(`/api/properties/${id}/photos?photoId=${photoId}`, { method: "DELETE" });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to delete photo");
      }
      return res.json().catch(() => ({}));
    },
  });

  const deleteAllPhotosMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/properties/${id}/photos?deleteAll=true`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete all photos");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property", id] });
      setSelectedPhotos(new Set());
      setSelectMode(false);
    },
  });

  const handleDeleteSelected = async () => {
    for (const pid of selectedPhotos) {
      await deletePhotoMutation.mutateAsync(pid);
    }
    queryClient.invalidateQueries({ queryKey: ["property", id] });
    setSelectedPhotos(new Set());
    setSelectMode(false);
  };

  const setThumbnailMutation = useMutation({
    mutationFn: async (photoId: string) => {
      await fetch(`/api/properties/${id}/photos/set-thumbnail`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoId }),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["property", id] }),
  });

  const updateContactMutation = useMutation({
    mutationFn: async ({ contactId, ownerName, emails, phones }: { contactId: string; ownerName: string; emails: string; phones: string }) => {
      const res = await fetch(`/api/properties/${id}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerName,
          emails: JSON.stringify(emails.split(",").map((e: string) => e.trim()).filter(Boolean)),
          phones: JSON.stringify(phones.split(",").map((p: string) => p.trim()).filter(Boolean)),
          updateId: contactId,
        }),
      });
      if (!res.ok) throw new Error("Failed to update contact");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property", id] });
      setEditingContact(null);
      setContactForm({ ownerName: "", emails: "", phones: "" });
      setShowContactForm(false);
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: async ({ noteId, content }: { noteId: string; content: string }) => {
      const res = await fetch(`/api/properties/${id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, updateId: noteId }),
      });
      if (!res.ok) throw new Error("Failed to update note");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property", id] });
      setEditingNote(null);
      setEditNoteContent("");
    },
  });

  const deleteContactMutation = useMutation({
    mutationFn: async (contactId: string) => {
      const res = await fetch(`/api/properties/${id}/contacts?contactId=${contactId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete contact");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["property", id] }),
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const res = await fetch(`/api/properties/${id}/notes?noteId=${noteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete note");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property", id] });
      setEditingNote(null);
      setEditNoteContent("");
    },
  });

  const photos = (property as any)?.photos || [];
  const thumbnailPhoto = photos.find((p: { isThumbnail?: boolean }) => p.isThumbnail) || photos[0];

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
        propertyType: property.propertyType || "",
        beds: property.beds != null ? String(property.beds) : "",
        baths: property.baths != null ? String(property.baths) : "",
        squareFeet: property.squareFeet != null ? String(property.squareFeet) : "",
        lotSize: property.lotSize != null ? String(property.lotSize) : "",
        yearBuilt: property.yearBuilt != null ? String(property.yearBuilt) : "",
        mlsNumber: property.mlsNumber || "",
        source: property.source || "",
        price: property.price != null ? String(property.price) : "",
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
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#94a3b8] mb-1.5">Type</label>
                    <input
                      type="text"
                      value={form.propertyType}
                      onChange={(e) => setForm({ ...form, propertyType: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[#161d2e] border border-[#1e2738] rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#94a3b8] mb-1.5">Beds</label>
                    <input
                      type="number"
                      value={form.beds}
                      onChange={(e) => setForm({ ...form, beds: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[#161d2e] border border-[#1e2738] rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#94a3b8] mb-1.5">Baths</label>
                    <input
                      type="number"
                      step="0.5"
                      value={form.baths}
                      onChange={(e) => setForm({ ...form, baths: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[#161d2e] border border-[#1e2738] rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#94a3b8] mb-1.5">Sq Ft</label>
                    <input
                      type="number"
                      value={form.squareFeet}
                      onChange={(e) => setForm({ ...form, squareFeet: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[#161d2e] border border-[#1e2738] rounded-lg text-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#94a3b8] mb-1.5">Lot Size</label>
                    <input
                      type="number"
                      value={form.lotSize}
                      onChange={(e) => setForm({ ...form, lotSize: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[#161d2e] border border-[#1e2738] rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#94a3b8] mb-1.5">Year Built</label>
                    <input
                      type="number"
                      value={form.yearBuilt}
                      onChange={(e) => setForm({ ...form, yearBuilt: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[#161d2e] border border-[#1e2738] rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#94a3b8] mb-1.5">MLS#</label>
                    <input
                      type="text"
                      value={form.mlsNumber}
                      onChange={(e) => setForm({ ...form, mlsNumber: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[#161d2e] border border-[#1e2738] rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#94a3b8] mb-1.5">Price</label>
                    <input
                      type="number"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
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
                  <div className="flex gap-4">
                    {(thumbnailPhoto || photos.length > 0) && (
                      <div className="relative w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden border border-[#1e2738]">
                        <img
                          src={thumbnailPhoto?.url || photos[0]?.url}
                          alt="Thumbnail"
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => {
                            if (thumbnailPhoto?.isThumbnail) {
                              setSelectMode(true);
                              setTimeout(() => photosSectionRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
                            } else if (photos.length > 0) {
                              setThumbnailMutation.mutate(photos[0].id);
                            }
                          }}
                          className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-[#3b82f6]/80 text-white text-[10px] rounded hover:bg-[#3b82f6]"
                        >
                          {thumbnailPhoto?.isThumbnail ? "Edit" : "Set"}
                        </button>
                      </div>
                    )}
                    <div>
                      <h1 className="text-xl font-semibold">{property.addressRaw}</h1>
                      <p className="text-[#94a3b8]">
                        {[property.city, property.state, property.zip].filter(Boolean).join(", ")}
                      </p>
                    </div>
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

                <div className="flex items-center gap-4 text-sm text-[#94a3b8]">
                  <span>Added: {new Date(property.createdAt).toLocaleDateString()}</span>
                  {property.followUpDate && (
                    <span className="text-[#f59e0b] flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Follow-up: {new Date(property.followUpDate).toLocaleDateString()}
                    </span>
                  )}
                </div>

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
              {!showContactForm && (
                <button
                  onClick={() => {
                    setContactForm({ ownerName: "", emails: "", phones: "" });
                    setEditingContact("");
                    setShowContactForm(true);
                  }}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-[#3b82f6]/10 text-[#3b82f6] rounded-md hover:bg-[#3b82f6]/20"
                >
                  <Plus className="w-3 h-3" />
                  Add
                </button>
              )}
            </div>

            {showContactForm && (
              <div className="mb-4 p-4 bg-[#161d2e] rounded-lg border border-[#1e2738]">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium">{editingContact ? "Edit Contact" : "New Contact"}</p>
                  <button onClick={() => { setShowContactForm(false); setEditingContact(""); }} className="text-[#94a3b8] hover:text-white">
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
                    onClick={() => {
                      if (editingContact) {
                        updateContactMutation.mutate({ contactId: editingContact, ...contactForm });
                      } else {
                        addContactMutation.mutate(contactForm);
                      }
                    }}
                    disabled={addContactMutation.isPending || updateContactMutation.isPending}
                    className="w-full px-3 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-sm font-medium rounded-lg disabled:opacity-50"
                  >
                    {addContactMutation.isPending || updateContactMutation.isPending ? "Saving..." : "Save Contact"}
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
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
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
                      <div className="flex gap-1 ml-2">
                        <button
                          onClick={() => {
                            if (confirm("Delete this contact?")) deleteContactMutation.mutate(contact.id);
                          }}
                          className="px-2 py-1 text-xs bg-[#ef4444]/10 text-[#ef4444] rounded hover:bg-[#ef4444]/20"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => {
                            setEditingContact(contact.id);
                            setContactForm({
                              ownerName: contact.ownerName || "",
                              emails: parseJsonField<string[]>(contact.emails, []).join(", "),
                              phones: parseJsonField<string[]>(contact.phones, []).join(", "),
                            });
                            setShowContactForm(true);
                          }}
                          className="px-2 py-1 text-xs bg-[#3b82f6]/10 text-[#3b82f6] rounded hover:bg-[#3b82f6]/20"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="glass-card p-6">
            <h2 className="font-semibold mb-4">Notes</h2>
            <div className="mb-4">
              <div className="flex gap-2">
                {editingNote ? (
                  <>
                    <textarea
                      value={editNoteContent}
                      onChange={(e) => setEditNoteContent(e.target.value)}
                      className="flex-1 px-4 py-2.5 bg-[#161d2e] border border-[#1e2738] rounded-lg text-white placeholder-[#94a3b8] resize-none"
                      rows={3}
                    />
                    <button
                      onClick={() => updateNoteMutation.mutate({ noteId: editingNote, content: editNoteContent })}
                      disabled={updateNoteMutation.isPending}
                      className="px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => { setEditingNote(null); setEditNoteContent(""); }}
                      className="px-4 py-2 border border-[#1e2738] text-[#94a3b8] hover:text-white rounded-lg"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {[...notes].reverse().map((n: { id: string; content: string; createdBy: { name: string }; createdAt: string }) => (
                <div key={n.id} className="p-3 bg-[#161d2e] rounded-lg group">
                  <div className="flex items-start justify-between">
                    <p className="text-sm whitespace-pre-wrap text-[#94a3b8] flex-1">
                      [{n.createdBy?.name?.split(' ').map((w: string) => w[0]).join('').toUpperCase()} {new Date(n.createdAt).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' })} {new Date(n.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}]: {n.content}
                    </p>
                    <div className="flex gap-1 ml-2">
                      <button
                        onClick={() => { if (confirm("Delete this note?")) deleteNoteMutation.mutate(n.id); }}
                        className="px-2 py-1 text-xs bg-[#ef4444]/10 text-[#ef4444] rounded opacity-0 group-hover:opacity-100 hover:bg-[#ef4444]/20"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => { setEditingNote(n.id); setEditNoteContent(n.content); }}
                        className="px-2 py-1 text-xs bg-[#3b82f6]/10 text-[#3b82f6] rounded opacity-0 group-hover:opacity-100 hover:bg-[#3b82f6]/20"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Photos */}
          <div ref={photosSectionRef} className="glass-card p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Photos {photos.length > 0 && `(${photos.length})`}</h2>
              <div className="flex gap-2">
                {selectMode ? (
                  <>
                    <button
                      onClick={() => {
                        const newSet = new Set<string>();
                        photos.forEach((p: { id: string }) => newSet.add(p.id));
                        setSelectedPhotos(newSet);
                      }}
                      className="px-2 py-1 text-xs bg-[#3b82f6]/10 text-[#3b82f6] rounded-md hover:bg-[#3b82f6]/20"
                    >
                      Select All
                    </button>
                    <button
                      onClick={() => {
                        if (selectedPhotos.size === 1) {
                          setThumbnailMutation.mutate(Array.from(selectedPhotos)[0]);
                          setSelectMode(false);
                          setSelectedPhotos(new Set());
                        }
                      }}
                      disabled={selectedPhotos.size !== 1}
                      className="px-2 py-1 text-xs bg-[#22c55e]/10 text-[#22c55e] rounded-md hover:bg-[#22c55e]/20 disabled:opacity-50"
                    >
                      Set Thumbnail
                    </button>
                    <button
                      onClick={handleDeleteSelected}
                      disabled={selectedPhotos.size === 0 || deletePhotoMutation.isPending}
                      className="px-2 py-1 text-xs bg-[#ef4444]/10 text-[#ef4444] rounded-md hover:bg-[#ef4444]/20 disabled:opacity-50"
                    >
                      Delete Selected ({selectedPhotos.size})
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Delete all photos?")) deleteAllPhotosMutation.mutate();
                      }}
                      disabled={deleteAllPhotosMutation.isPending}
                      className="px-2 py-1 text-xs bg-[#ef4444]/10 text-[#ef4444] rounded-md hover:bg-[#ef4444]/20 disabled:opacity-50"
                    >
                      Delete All
                    </button>
                    <button
                      onClick={() => { setSelectMode(false); setSelectedPhotos(new Set()); }}
                      className="px-2 py-1 text-xs bg-[#94a3b8]/10 text-[#94a3b8] rounded-md hover:bg-[#94a3b8]/20"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    {photos.length > 0 && (
                      <button
                        onClick={() => {
                          setSelectMode(true);
                          setTimeout(() => photosSectionRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
                        }}
                        className="px-2 py-1 text-xs bg-[#3b82f6]/10 text-white rounded-md hover:bg-[#3b82f6]/20"
                      >
                        Edit
                      </button>
                    )}
                    <label className="flex items-center gap-1 px-2 py-1 text-xs bg-[#3b82f6]/10 text-[#3b82f6] rounded-md hover:bg-[#3b82f6]/20 cursor-pointer">
                      <Plus className="w-3 h-3" />
                      <span>Add Photos</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          if (files.length) photoMutation.mutate(files);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </>
                )}
              </div>
            </div>
            {photos.length === 0 ? (
              <label className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-[#1e2738] rounded-lg cursor-pointer hover:border-[#3b82f6]/50 transition-colors">
                <Upload className="w-8 h-8 text-[#94a3b8] mb-2" />
                <span className="text-sm text-[#94a3b8]">Click to upload photos</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length) photoMutation.mutate(files);
                    e.target.value = "";
                  }}
                />
              </label>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-2" style={{ maxWidth: 'calc(5 * 180px + 4 * 8px)' }}>
                {photos.map((photo: { id: string; url: string; filename: string }, index: number) => (
                  <div
                    key={photo.id}
                    className={`relative flex-shrink-0 w-[168px] h-[168px] rounded-lg overflow-hidden border transition-colors ${selectMode ? 'cursor-pointer' : 'hover:border-[#3b82f6]'} ${selectedPhotos.has(photo.id) ? 'border-[#ef4444] ring-2 ring-[#ef4444]' : 'border-[#1e2738]'}`}
                  >
                    {selectMode && (
                      <div className={`absolute top-2 left-2 z-10 w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedPhotos.has(photo.id) ? 'bg-[#ef4444] border-[#ef4444]' : 'bg-transparent border-white'}`}>
                        {selectedPhotos.has(photo.id) && <span className="text-white text-xs">✓</span>}
                      </div>
                    )}
                    <button
                      onClick={() => {
                        if (selectMode) {
                          const newSet = new Set(selectedPhotos);
                          if (newSet.has(photo.id)) newSet.delete(photo.id);
                          else newSet.add(photo.id);
                          setSelectedPhotos(newSet);
                        } else {
                          setLightboxPhoto(photo.url);
                          setLightboxIndex(index);
                        }
                      }}
                      className="w-full h-full"
                    >
                      <img
                        src={photo.url}
                        alt={photo.filename}
                        className="w-full h-full object-cover"
                      />
                      {!selectMode && (
                        <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                          <ImageIcon className="w-6 h-6 text-white" />
                        </div>
                      )}
                    </button>
                  </div>
                ))}
                {!selectMode && (
                  <label className="flex-shrink-0 flex flex-col items-center justify-center w-[168px] h-[168px] border-2 border-dashed border-[#1e2738] rounded-lg cursor-pointer hover:border-[#3b82f6]/50 transition-colors">
                    <Plus className="w-6 h-6 text-[#94a3b8]" />
                    <span className="text-xs text-[#94a3b8] mt-1">Add</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length) photoMutation.mutate(files);
                        e.target.value = "";
                      }}
                    />
                  </label>
                )}
              </div>
            )}
            {(photoMutation.isPending || deletePhotoMutation.isPending || deleteAllPhotosMutation.isPending) && (
              <p className="text-sm text-[#94a3b8] mt-2">Processing...</p>
            )}
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
          <button
            className="absolute left-4 p-2 text-white/70 hover:text-white transition-colors"
            onClick={(e) => { e.stopPropagation(); setLightboxIndex((lightboxIndex - 1 + photos.length) % photos.length); setLightboxPhoto(photos[lightboxIndex].url); }}
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <button
            className="absolute right-4 p-2 text-white/70 hover:text-white transition-colors"
            onClick={(e) => { e.stopPropagation(); setLightboxIndex((lightboxIndex + 1) % photos.length); setLightboxPhoto(photos[lightboxIndex].url); }}
          >
            <ChevronRight className="w-8 h-8" />
          </button>
          <img
            src={lightboxPhoto}
            alt="Full size"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/50 text-sm">
            {lightboxIndex + 1} / {photos.length}
          </p>
        </div>
      )}
    </div>
  );
}
