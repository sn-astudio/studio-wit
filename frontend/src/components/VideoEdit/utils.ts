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

/** blob으로 다운로드하는 헬퍼 */
async function fetchAndDownload(fetchUrl: string, name: string, headers?: Record<string, string>): Promise<boolean> {
  const res = await fetch(fetchUrl, headers ? { headers } : undefined);
  if (!res.ok) return false;
  const blob = await res.blob();
  if (blob.type === "application/json" || blob.size < 1000) return false;
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
  return true;
}

/** 비디오 다운로드: CDN 직접 → 프록시 → 새 탭 순으로 시도 */
export async function downloadVideo(url: string, filename?: string) {
  const name = filename ?? `video_${Date.now()}.mp4`;

  // 1차: CDN URL에서 직접 blob 다운로드
  try {
    if (await fetchAndDownload(url, name)) return;
  } catch { /* fallthrough */ }

  // 2차: 백엔드 프록시 경유
  try {
    const proxyUrl = `${BASE_URL}/api/video/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(name)}`;
    const headers: Record<string, string> = {};
    const token = getAccessToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (await fetchAndDownload(proxyUrl, name, headers)) return;
  } catch { /* fallthrough */ }

  // 3차: 새 탭에서 열기
  window.open(url, "_blank");
}
