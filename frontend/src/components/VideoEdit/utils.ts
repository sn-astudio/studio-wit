import { getAccessToken } from "@/services/api";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/** 외부 URL을 fetch → Blob → 다운로드 (크로스 도메인 대응) */
async function downloadBlob(url: string, filename: string) {
  const headers: Record<string, string> = {};
  const token = getAccessToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);

  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  }, 100);
}

/** 이미지 URL을 Blob으로 받아 다운로드 (크로스 도메인 download 속성 문제 해결) */
export async function downloadImage(url: string, filename?: string) {
  const name = filename ?? `image_${Date.now()}.png`;
  try {
    await downloadBlob(url, name);
  } catch {
    // fallback: fetch 실패 시 프록시 경유 시도
    const proxyUrl = `${BASE_URL}/api/video/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(name)}`;
    try {
      await downloadBlob(proxyUrl, name);
    } catch {
      // 최종 fallback: 새 탭에서 열기
      window.open(url, "_blank");
    }
  }
}

/** 비디오 URL을 백엔드 프록시를 통해 다운로드 */
export async function downloadVideo(url: string, filename?: string) {
  const name = filename ?? `video_${Date.now()}.mp4`;
  const proxyUrl = `${BASE_URL}/api/video/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(name)}`;

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
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    }, 100);
  } catch {
    // fallback: 직접 URL 다운로드 시도
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => document.body.removeChild(a), 100);
  }
}
