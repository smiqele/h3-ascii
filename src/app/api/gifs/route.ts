import { list } from "@vercel/blob";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { blobs } = await list({ prefix: "gifs/" });

    // фильтруем только настоящие файлы (исключаем "gifs/")
    const urls = blobs
      .filter((b) => !b.pathname.endsWith("/"))
      .map((b) => b.url);

    return NextResponse.json(urls);
  } catch (error) {
    console.error("Failed to list blobs:", error);
    return NextResponse.json(
      { error: "Failed to list blobs" },
      { status: 500 }
    );
  }
}