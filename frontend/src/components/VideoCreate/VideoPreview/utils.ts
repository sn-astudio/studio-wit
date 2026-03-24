import { getAccessToken } from "@/services/api";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/** 비디오 URL을 백엔드 프록시를 통해 다운로드 */
export async function downloadVideo(videoUrl: string): Promise<void> {
  const name = `video-${Date.now()}.mp4`;
  const proxyUrl = `${BASE_URL}/api/video/download?url=${encodeURIComponent(videoUrl)}&filename=${encodeURIComponent(name)}`;

  const headers: Record<string, string> = {};
  const token = getAccessToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(proxyUrl, { headers });
    if (!res.ok) throw new Error(`Download failed: ${res.status}`);

    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
  } catch {
    window.open(videoUrl, "_blank");
  }
}
