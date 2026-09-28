import connectToDatabase from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { Event, serializeEvent } from "@/database/event.model";
import {v2 as cloudinary} from "cloudinary";


export async function POST(request: NextRequest) {
  try {
    const db = await connectToDatabase();
    const formData = await request.formData();

    let event;

    try {
      event = Object.fromEntries(formData.entries());
    } catch (error) {
      return NextResponse.json({ message: "Invalid JSON data format", error: error instanceof Error ? error.message : String(error) }, { status: 400 });
    }

    const file = formData.get("image") as File | null;
    if (!file) {
      return NextResponse.json({ message: "Image file is required" }, { status: 400 });
    }

    let tags = JSON.parse(formData.get("tags") as string);
    let agenda = JSON.parse(formData.get("agenda") as string);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream({ resource_type: "image", folder: "eventrix" }, (error, result) => {
            if (error) {
                return reject(error);
            } else {
                resolve(result);
            }
        }).end(buffer);
    });

    event.image = (uploadResult as { secure_url: string }).secure_url;

    const createdEvent = await Event.create({ ...event, tags, agenda });
    return NextResponse.json({ message: "Event created successfully", event: createdEvent }, { status: 201 });
  } catch (error) {
    console.error("Error creating event:", error);
    return NextResponse.json({ message: "Event creation failed", error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function GET() {
    try {
        await connectToDatabase();
        const events = await Event.find().sort({ createdAt: -1 }).lean();
        return NextResponse.json({ message: "Events fetched successfully", events: events.map((event) => serializeEvent(event)) }, { status: 200 });

    } catch (e) {
        return NextResponse.json({ message: "Failed to fetch events", error: e instanceof Error ? e.message : String(e) }, { status: 500 });
    }
}