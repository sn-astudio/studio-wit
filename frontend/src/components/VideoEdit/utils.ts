/** 비디오 URL을 fetch → blob → 로컬 다운로드 */
export async function downloadVideo(url: string, filename?: string) {
  const res = await fetch(url);
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename ?? `video_${Date.now()}.mp4`;
  document.body.appendChild(a);
  a.click();

  // cleanup
  setTimeout(() => {
    URL.revokeObjectURL(blobUrl);
    document.body.removeChild(a);
  }, 100);
}
