'use server'

import { Booking } from "@/database";
import connectToDatabase from "../mongodb";

type CreateBookingInput = {
    eventId: string;
    slug: string;
    email: string;
};

/**
 * Books a spot for `email` on the event identified by `eventId`.
 *
 * The `'use server'` directive above is what keeps this file out of the browser bundle: `BookEvent`
 * is a Client Component, so without it the bundler follows `Booking` -> `mongoose` and fails with
 * "Module not found: Can't resolve 'async_hooks'" (a Node built-in).
 *
 * Server Action return values are serialized for the client, so this returns a small DTO rather than
 * the Mongoose document: a hydrated document carries `ObjectId`/`Date` values (and document
 * internals) that React refuses to serialize across the Server -> Client boundary.
 */
export const createBooking = async ({ eventId, slug, email }: CreateBookingInput) => {
    try {
        await connectToDatabase();

        const booking = await Booking.create({ eventId, slug, email });

        return { success: true as const, bookingId: String(booking._id) };
    } catch (error) {
        console.error('create booking failed', error);

        // Only the message travels to the client; the full error (with its stack) stays in the
        // server logs.
        return {
            success: false as const,
            error: error instanceof Error ? error.message : String(error),
        };
    }
};
