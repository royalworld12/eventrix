'use server'

import { v2 as cloudinary } from "cloudinary";
import connectToDatabase from "../mongodb";
import { Event, serializeEvent, type SerializedEvent } from "@/database/event.model";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const getSimiliarEventsBySlug = async (slug: string): Promise<SerializedEvent[]> => {
    try {

        await connectToDatabase();

        const event = await Event.findOne({ slug });

        if (!event) return [];

        const similarEvents = await Event.find({ _id: { $ne: event._id, }, tags: { $in: event.tags } })

        // `EventCard` is a Client Component, so the `ObjectId`/`Date` values Mongoose returns are
        // flattened first: React only accepts plain objects as props from a Server Component.
        return similarEvents.map((similarEvent) => serializeEvent(similarEvent));

    } catch {
        return [];
    }
}

export const createEventAction = async (formData: FormData) => {
    try {
        await connectToDatabase();

        let eventData: Record<string, any>;
        try {
            eventData = Object.fromEntries(formData.entries());
        } catch {
            return { success: false, error: "Failed to parse form data" };
        }

        const file = formData.get("image") as File | null;
        if (!file || typeof file === "string" || file.size === 0) {
            return { success: false, error: "Event image is required" };
        }

        let tags: string[] = [];
        let agenda: string[] = [];

        try {
            const rawTags = formData.get("tags");
            if (typeof rawTags === "string" && rawTags.trim()) {
                tags = rawTags.startsWith("[")
                    ? JSON.parse(rawTags)
                    : rawTags.split(",").map((t) => t.trim()).filter(Boolean);
            }
        } catch {
            tags = [];
        }

        try {
            const rawAgenda = formData.get("agenda");
            if (typeof rawAgenda === "string" && rawAgenda.trim()) {
                agenda = rawAgenda.startsWith("[")
                    ? JSON.parse(rawAgenda)
                    : rawAgenda.split("\n").map((a) => a.trim()).filter(Boolean);
            }
        } catch {
            agenda = [];
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const uploadResult = await new Promise((resolve, reject) => {
            cloudinary.uploader
                .upload_stream(
                    { folder: "eventrix", resource_type: "image" },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                )
                .end(buffer);
        });

        eventData.image = (uploadResult as { secure_url: string }).secure_url;

        const createdEvent = await Event.create({
            ...eventData,
            tags,
            agenda,
        });

        return {
            success: true,
            event: serializeEvent(createdEvent),
        };
    } catch (error) {
        console.error("Error creating event:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to create event",
        };
    }
};
