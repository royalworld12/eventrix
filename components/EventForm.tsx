'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import posthog from "posthog-js";

const MODE_OPTIONS = [
  { value: "online", label: "Online" },
  { value: "offline", label: "In-Person (Offline)" },
  { value: "hybrid", label: "Hybrid" },
] as const;

export default function EventForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    overview: "",
    venue: "",
    location: "",
    date: "",
    time: "",
    mode: "online" as "online" | "offline" | "hybrid",
    audience: "",
    organizer: "",
    tags: "",
    agenda: "",
  });

  const [imageFile, setImageFile] = useState<File | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!imageFile) {
      setError("Please select a cover image for the event.");
      return;
    }

    setSubmitting(true);

    try {
      const tagsArray = formData.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const agendaArray = formData.agenda
        .split("\n")
        .map((a) => a.trim())
        .filter(Boolean);

      const payload = new FormData();
      payload.append("title", formData.title.trim());
      payload.append("description", formData.description.trim());
      payload.append("overview", formData.overview.trim());
      payload.append("venue", formData.venue.trim());
      payload.append("location", formData.location.trim());
      payload.append("date", formData.date.trim());
      payload.append("time", formData.time.trim());
      payload.append("mode", formData.mode);
      payload.append("audience", formData.audience.trim());
      payload.append("organizer", formData.organizer.trim());
      payload.append("tags", JSON.stringify(tagsArray));
      payload.append("agenda", JSON.stringify(agendaArray));
      payload.append("image", imageFile);

      const res = await fetch("/api/events", {
        method: "POST",
        body: payload,
      });

      const data = await res.json();

      if (!res.ok) {
        // `data.error` carries the Mongoose detail on 500s; `data.message` on 400s.
        throw new Error(data.error || data.message || "Failed to create event");
      }

      if (process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN && process.env.NEXT_PUBLIC_POSTHOG_HOST) {
        posthog.capture("event_created", {
          title: formData.title,
          slug: data.event?.slug,
          mode: formData.mode,
        });
      }

      const targetSlug = data.event?.slug;
      if (targetSlug) {
        router.push(`/events/${targetSlug}`);
      } else {
        router.push("/events");
      }
    } catch (err) {
      console.error("Create event failed:", err);
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      if (process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN && process.env.NEXT_PUBLIC_POSTHOG_HOST) {
        posthog.captureException(err);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8 w-full max-w-3xl mx-auto">
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Basic Info */}
      <div className="bg-dark-100 border border-dark-200 card-shadow rounded-[10px] p-6 flex flex-col gap-6">
        <h2 className="text-xl font-bold font-schibsted-grotesk text-white">Event Information</h2>

        <div className="flex flex-col gap-2">
          <label htmlFor="title" className="text-light-100 text-sm font-medium">
            Event Title <span className="text-primary">*</span>
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            value={formData.title}
            onChange={handleChange}
            placeholder="e.g. Next.js Conf 2026"
            className="bg-dark-200 text-white rounded-[6px] px-4 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="description" className="text-light-100 text-sm font-medium">
            Short Description <span className="text-primary">*</span>
          </label>
          <input
            id="description"
            name="description"
            type="text"
            required
            value={formData.description}
            onChange={handleChange}
            placeholder="A short punchy tagline for the event card"
            className="bg-dark-200 text-white rounded-[6px] px-4 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="overview" className="text-light-100 text-sm font-medium">
            Full Overview <span className="text-primary">*</span>
          </label>
          <textarea
            id="overview"
            name="overview"
            required
            rows={4}
            value={formData.overview}
            onChange={handleChange}
            placeholder="Detailed description of what attendees can expect..."
            className="bg-dark-200 text-white rounded-[6px] px-4 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none resize-vertical"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="image" className="text-light-100 text-sm font-medium">
            Cover Image <span className="text-primary">*</span>
          </label>
          <input
            id="image"
            name="image"
            type="file"
            accept="image/*"
            required
            onChange={handleImageChange}
            className="bg-dark-200 text-light-200 rounded-[6px] px-4 py-2 text-sm border border-transparent focus:border-primary focus:outline-none file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-black hover:file:bg-primary/90 file:cursor-pointer cursor-pointer"
          />
          {imagePreview && (
            <div className="mt-3 relative w-full h-48 rounded-lg overflow-hidden border border-dark-200">
              <Image
                src={imagePreview}
                alt="Image Preview"
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          )}
        </div>
      </div>

      {/* Date, Time & Location */}
      <div className="bg-dark-100 border border-dark-200 card-shadow rounded-[10px] p-6 flex flex-col gap-6">
        <h2 className="text-xl font-bold font-schibsted-grotesk text-white">Date & Location</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="date" className="text-light-100 text-sm font-medium">
              Date (YYYY-MM-DD or Month Day, Year) <span className="text-primary">*</span>
            </label>
            <input
              id="date"
              name="date"
              type="text"
              required
              value={formData.date}
              onChange={handleChange}
              placeholder="e.g. 2026-10-15 or October 15, 2026"
              className="bg-dark-200 text-white rounded-[6px] px-4 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="time" className="text-light-100 text-sm font-medium">
              Time <span className="text-primary">*</span>
            </label>
            <input
              id="time"
              name="time"
              type="text"
              required
              value={formData.time}
              onChange={handleChange}
              placeholder="e.g. 10:00 AM - 4:00 PM"
              className="bg-dark-200 text-white rounded-[6px] px-4 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="mode" className="text-light-100 text-sm font-medium">
              Mode <span className="text-primary">*</span>
            </label>
            <select
              id="mode"
              name="mode"
              value={formData.mode}
              onChange={handleChange}
              className="bg-dark-200 text-white rounded-[6px] px-4 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none"
            >
              {MODE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="venue" className="text-light-100 text-sm font-medium">
              Venue <span className="text-primary">*</span>
            </label>
            <input
              id="venue"
              name="venue"
              type="text"
              required
              value={formData.venue}
              onChange={handleChange}
              placeholder="e.g. Moscone Center or Zoom"
              className="bg-dark-200 text-white rounded-[6px] px-4 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="location" className="text-light-100 text-sm font-medium">
              Location <span className="text-primary">*</span>
            </label>
            <input
              id="location"
              name="location"
              type="text"
              required
              value={formData.location}
              onChange={handleChange}
              placeholder="e.g. San Francisco, CA"
              className="bg-dark-200 text-white rounded-[6px] px-4 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Target & Organizer */}
      <div className="bg-dark-100 border border-dark-200 card-shadow rounded-[10px] p-6 flex flex-col gap-6">
        <h2 className="text-xl font-bold font-schibsted-grotesk text-white">Audience & Organizer</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="audience" className="text-light-100 text-sm font-medium">
              Target Audience <span className="text-primary">*</span>
            </label>
            <input
              id="audience"
              name="audience"
              type="text"
              required
              value={formData.audience}
              onChange={handleChange}
              placeholder="e.g. Frontend Developers, Designers"
              className="bg-dark-200 text-white rounded-[6px] px-4 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="organizer" className="text-light-100 text-sm font-medium">
              Organizer <span className="text-primary">*</span>
            </label>
            <input
              id="organizer"
              name="organizer"
              type="text"
              required
              value={formData.organizer}
              onChange={handleChange}
              placeholder="e.g. Vercel Inc."
              className="bg-dark-200 text-white rounded-[6px] px-4 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="tags" className="text-light-100 text-sm font-medium">
            Tags (comma separated) <span className="text-primary">*</span>
          </label>
          <input
            id="tags"
            name="tags"
            type="text"
            required
            value={formData.tags}
            onChange={handleChange}
            placeholder="e.g. Next.js, React, Web Development, AI"
            className="bg-dark-200 text-white rounded-[6px] px-4 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="agenda" className="text-light-100 text-sm font-medium">
            Agenda (one item per line) <span className="text-primary">*</span>
          </label>
          <textarea
            id="agenda"
            name="agenda"
            required
            rows={5}
            value={formData.agenda}
            onChange={handleChange}
            placeholder={`Opening Keynote - 10:00 AM\nBuilding with Server Components - 11:30 AM\nLunch & Networking - 1:00 PM\nClosing Remarks - 4:00 PM`}
            className="bg-dark-200 text-white rounded-[6px] px-4 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none resize-vertical"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed w-full cursor-pointer items-center justify-center rounded-[6px] px-6 py-3.5 text-lg font-semibold text-black transition-all"
      >
        {submitting ? "Creating Event..." : "Publish Event"}
      </button>
    </form>
  );
}
