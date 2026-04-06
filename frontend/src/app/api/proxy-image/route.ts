import { NextRequest, NextResponse } from "next/server";

const CDN_URL = process.env.NEXT_PUBLIC_CDN_URL ?? "";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url || !CDN_URL || !url.startsWith(CDN_URL.replace(/\/+$/, ""))) {
    return NextResponse.json(
      { error: "허용되지 않는 URL입니다." },
      { status: 400 },
    );
  }

  const resp = await fetch(url);
  if (!resp.ok) {
    return NextResponse.json(
      { error: "이미지를 가져올 수 없습니다." },
      { status: resp.status },
    );
  }

  const contentType = resp.headers.get("content-type") ?? "image/png";
  const body = await resp.arrayBuffer();

  return new NextResponse(body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
