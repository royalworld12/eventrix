import connectToDatabase from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { Event, serializeEvent } from "@/database/event.model";


type RouteParams = {
    params: Promise<{ slug: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {

        const {slug} = await params;

        if (!slug || typeof slug !== "string" || slug.trim() === "") {
            return NextResponse.json({ message: "Slug is required" }, { status: 400 });
        }

        await connectToDatabase();

        const sanitizedSlug = slug.trim().toLocaleLowerCase();

        const event = await Event.findOne({ slug: sanitizedSlug }).lean();
    
        if (!event) {
            return NextResponse.json({ message: "Event not found" }, { status: 404 });
        }
        return NextResponse.json({ message: "Event fetched successfully", event: serializeEvent(event) }, { status: 200 });
    } catch (error) {
        console.error("Error fetching event:", error);
        return NextResponse.json({ message: "Failed to fetch event", error: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}