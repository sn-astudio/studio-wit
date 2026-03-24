/** aspect_ratio 문자열 → grid span 클래스 */
export function getGridSpan(aspectRatio: string | null): string {
  switch (aspectRatio) {
    case "9:16":
      return "row-span-2";
    case "16:9":
    case "1:1":
    default:
      return "col-span-1";
  }
}

/** aspect_ratio → CSS aspect-ratio 값 */
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

/** 날짜 문자열 → 상대 시간 표시 */
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
  return `${diffDay}d ago`;
}
