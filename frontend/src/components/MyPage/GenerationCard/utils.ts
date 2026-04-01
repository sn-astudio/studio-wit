export function getAspectStyle(aspectRatio: string | null): string {
  switch (aspectRatio) {
    case "9:16":
      return "9/16";
    case "1:1":
      return "1/1";
    case "16:9":
    default:
      return "16/9";
  }
}

export async function downloadFile(url: string, filename: string) {
  const { getAccessToken } = await import("@/services/api");

  const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  const proxyUrl = `${BASE_URL}/api/video/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;

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
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    }, 100);
  } catch {
    window.open(url, "_blank");
  }
}

export function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  const diffMonth = Math.floor(diffDay / 30);
  return `${diffMonth}mo ago`;
}
