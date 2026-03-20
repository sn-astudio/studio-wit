/** 비디오 URL을 다운로드 */
export async function downloadVideo(videoUrl: string): Promise<void> {
  try {
    const resp = await fetch(videoUrl);
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `video-${Date.now()}.mp4`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    window.open(videoUrl, "_blank");
  }
}
