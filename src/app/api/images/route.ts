import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { GalleryImage } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || "";

    let dbQuery = supabase
      .from("gallery_images")
      .select("*")
      .order("created_at", { ascending: false });

    if (query.trim()) {
      dbQuery = dbQuery.ilike("title", `%${query.trim()}%`);
    }

    const { data, error } = await dbQuery;

    if (error) throw error;

    return NextResponse.json(data as GalleryImage[]);
  } catch (error) {
    console.error("Error fetching images:", error);
    return NextResponse.json(
      { error: "Failed to fetch images" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, image_url } = body;

    if (!title || !image_url) {
      return NextResponse.json(
        { error: "Title and image_url are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("gallery_images")
      .insert([{ title, description: description || "", image_url }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data as GalleryImage, { status: 201 });
  } catch (error) {
    console.error("Error creating image:", error);
    return NextResponse.json(
      { error: "Failed to create image" },
      { status: 500 }
    );
  }
}