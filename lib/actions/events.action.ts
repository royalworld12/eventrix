'use server'

import connectToDatabase from "../mongodb";
import { Event, serializeEvent, type SerializedEvent } from "@/database/event.model";

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