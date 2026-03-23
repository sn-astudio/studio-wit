/** 이미지 URL을 다운로드 */
export async function downloadImage(imageUrl: string): Promise<void> {
  try {
    const resp = await fetch(imageUrl);
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `image-${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    window.open(imageUrl, "_blank");
  }
}
