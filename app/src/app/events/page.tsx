"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { 
  Calendar, 
  Plus, 
  MapPin, 
  Trash2, 
  Edit2, 
  Download,
  ChevronLeft,
  X,
  Check,
  CalendarPlus
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { calendarProviders, type CalendarEvent } from "@/lib/calendar";

// Category configuration
const categories = [
  { id: "50.01", label: "Local Events", description: "Concerts, festivals, community events" },
  { id: "50.02", label: "Travel & Trips", description: "Vacations, flights, trips" },
  { id: "50.03", label: "Appointments", description: "Doctor, dentist, meetings" },
  { id: "50.04", label: "Holidays & Celebrations", description: "Birthdays, holidays, anniversaries" },
];

const categoryColors: Record<string, string> = {
  "50.01": "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  "50.02": "bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30",
  "50.03": "bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30",
  "50.04": "bg-rose-500/20 text-rose-700 dark:text-rose-400 border-rose-500/30",
};

// Format date for display
function formatEventDate(dateStr: string, allDay: boolean): string {
  const date = new Date(dateStr.includes("T") ? dateStr : dateStr + "T00:00:00");
  const options: Intl.DateTimeFormatOptions = { 
    weekday: "short", 
    month: "short", 
    day: "numeric",
    year: "numeric"
  };
  
  if (!allDay && dateStr.includes("T")) {
    return date.toLocaleDateString("en-US", options) + " at " + 
           date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  return date.toLocaleDateString("en-US", options);
}

// Check if date is in the past
function isPast(dateStr: string): boolean {
  const eventDate = new Date(dateStr.split("T")[0]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return eventDate < today;
}

// Check if date is today
function isToday(dateStr: string): boolean {
  const eventDate = dateStr.split("T")[0];
  const today = new Date().toISOString().split("T")[0];
  return eventDate === today;
}

type EventFormData = {
  title: string;
  description: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  allDay: boolean;
  location: string;
  jdCategory: string;
};

const emptyForm: EventFormData = {
  title: "",
  description: "",
  startDate: new Date().toISOString().split("T")[0],
  startTime: "09:00",
  endDate: "",
  endTime: "",
  allDay: true,
  location: "",
  jdCategory: "50.01",
};

export default function EventsPage() {
  const events = useQuery(api.events.getAll);
  const createEvent = useMutation(api.events.create);
  const updateEvent = useMutation(api.events.update);
  const deleteEvent = useMutation(api.events.remove);
  
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<Id<"events"> | null>(null);
  const [form, setForm] = useState<EventFormData>(emptyForm);
  const [filter, setFilter] = useState<"upcoming" | "past" | "all">("upcoming");
  
  // Sort and filter events
  const sortedEvents = events
    ? [...events]
        .sort((a, b) => a.startDate.localeCompare(b.startDate))
        .filter((e) => {
          if (filter === "upcoming") return !isPast(e.startDate);
          if (filter === "past") return isPast(e.startDate);
          return true;
        })
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Build start date/time
    let startDate = form.startDate;
    if (!form.allDay && form.startTime) {
      startDate = `${form.startDate}T${form.startTime}:00`;
    }
    
    // Build end date/time
    let endDate: string | undefined;
    if (form.endDate) {
      endDate = form.endDate;
      if (!form.allDay && form.endTime) {
        endDate = `${form.endDate}T${form.endTime}:00`;
      }
    }
    
    const eventData = {
      title: form.title,
      description: form.description || undefined,
      startDate,
      endDate,
      allDay: form.allDay,
      location: form.location || undefined,
      jdCategory: form.jdCategory,
    };
    
    if (editingId) {
      await updateEvent({ id: editingId, ...eventData });
    } else {
      await createEvent(eventData);
    }
    
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleEdit = (event: NonNullable<typeof events>[0]) => {
    const hasTime = event.startDate.includes("T");
    setForm({
      title: event.title,
      description: event.description || "",
      startDate: event.startDate.split("T")[0],
      startTime: hasTime ? event.startDate.split("T")[1]?.substring(0, 5) || "09:00" : "09:00",
      endDate: event.endDate?.split("T")[0] || "",
      endTime: event.endDate?.includes("T") ? event.endDate.split("T")[1]?.substring(0, 5) || "" : "",
      allDay: event.allDay,
      location: event.location || "",
      jdCategory: event.jdCategory,
    });
    setEditingId(event._id);
    setShowForm(true);
  };

  const handleDelete = async (id: Id<"events">) => {
    if (confirm("Delete this event?")) {
      await deleteEvent({ id });
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  return (
    <main className="p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-muted-foreground hover:text-foreground">
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-2">
              <Calendar className="h-6 w-6" />
              <h1 className="text-2xl font-bold">Events</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a 
              href="/api/events?format=ics" 
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              title="Export all events to ICS"
            >
              <Download className="h-4 w-4" />
              Export ICS
            </a>
            <Button onClick={() => setShowForm(true)} disabled={showForm}>
              <Plus className="h-4 w-4 mr-1" />
              Add Event
            </Button>
          </div>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <Card className="border-primary/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">
                {editingId ? "Edit Event" : "New Event"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="Event title"
                      required
                    />
                  </div>
                  
                  <div className="sm:col-span-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Optional details..."
                      rows={2}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="startDate">Start Date *</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={form.startDate}
                      onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="startTime">Start Time</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={form.startTime}
                      onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                      disabled={form.allDay}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={form.endDate}
                      onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="endTime">End Time</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={form.endTime}
                      onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                      disabled={form.allDay}
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="allDay"
                      checked={form.allDay}
                      onChange={(e) => setForm({ ...form, allDay: e.target.checked })}
                      className="rounded"
                    />
                    <Label htmlFor="allDay" className="font-normal cursor-pointer">
                      All day event
                    </Label>
                  </div>
                  
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={form.location}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                      placeholder="Optional location"
                    />
                  </div>
                  
                  <div className="sm:col-span-2">
                    <Label>Category *</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {categories.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setForm({ ...form, jdCategory: cat.id })}
                          className={`p-3 rounded-lg border text-left transition-all ${
                            form.jdCategory === cat.id 
                              ? categoryColors[cat.id] + " border-2" 
                              : "border-muted hover:border-muted-foreground/30"
                          }`}
                        >
                          <div className="font-medium text-sm">{cat.label}</div>
                          <div className="text-xs text-muted-foreground">{cat.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" onClick={handleCancel}>
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                  <Button type="submit">
                    <Check className="h-4 w-4 mr-1" />
                    {editingId ? "Update" : "Create"} Event
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
          {(["upcoming", "past", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filter === f 
                  ? "bg-background shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Events List */}
        {events === undefined ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Loading events...
            </CardContent>
          </Card>
        ) : sortedEvents.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-muted-foreground mb-4">
                {filter === "upcoming" 
                  ? "No upcoming events" 
                  : filter === "past" 
                  ? "No past events" 
                  : "No events yet"}
              </p>
              {!showForm && (
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add your first event
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {sortedEvents.map((event) => {
              const past = isPast(event.startDate);
              const today = isToday(event.startDate);
              const cat = categories.find((c) => c.id === event.jdCategory);
              
              return (
                <Card 
                  key={event._id} 
                  className={`transition-all ${
                    today 
                      ? "border-primary/50 bg-primary/5" 
                      : past 
                      ? "opacity-60" 
                      : ""
                  }`}
                >
                  <CardContent className="py-4">
                    <div className="flex items-start gap-4">
                      {/* Date block */}
                      <div className={`flex flex-col items-center justify-center min-w-[56px] py-2 px-3 rounded-lg ${
                        today 
                          ? "bg-primary text-primary-foreground" 
                          : past 
                          ? "bg-muted/50" 
                          : "bg-muted"
                      }`}>
                        <span className="text-xs font-medium uppercase">
                          {new Date(event.startDate.split("T")[0] + "T00:00:00").toLocaleDateString("en-US", { month: "short" })}
                        </span>
                        <span className="text-2xl font-bold leading-none">
                          {new Date(event.startDate.split("T")[0] + "T00:00:00").getDate()}
                        </span>
                        <span className="text-[10px] uppercase">
                          {new Date(event.startDate.split("T")[0] + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" })}
                        </span>
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold">{event.title}</h3>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryColors[event.jdCategory]}`}>
                                {cat?.label || event.jdCategory}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatEventDate(event.startDate, event.allDay)}
                              </span>
                              {event.endDate && (
                                <>
                                  <span className="text-xs text-muted-foreground">→</span>
                                  <span className="text-xs text-muted-foreground">
                                    {formatEventDate(event.endDate, event.allDay)}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          
                          {/* Actions */}
                          <div className="flex items-center gap-1">
                            {/* Add to Calendar dropdown */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  title="Add to calendar"
                                >
                                  <CalendarPlus className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Add to Calendar</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {calendarProviders.map((provider) => {
                                  const calEvent: CalendarEvent = {
                                    title: event.title,
                                    description: event.description,
                                    startDate: event.startDate,
                                    endDate: event.endDate,
                                    allDay: event.allDay,
                                    location: event.location,
                                  };
                                  const url = provider.generateUrl(calEvent);
                                  return (
                                    <DropdownMenuItem key={provider.id} asChild>
                                      <a 
                                        href={url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="cursor-pointer"
                                      >
                                        {provider.name}
                                      </a>
                                    </DropdownMenuItem>
                                  );
                                })}
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleEdit(event)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDelete(event._id)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        {event.description && (
                          <p className="text-sm text-muted-foreground mt-2">
                            {event.description}
                          </p>
                        )}
                        
                        {event.location && (
                          <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {event.location}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}


