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

export function formatTimeAgo(dateStr: string): string {
  const normalized = dateStr.endsWith("Z") || dateStr.includes("+")
    ? dateStr
    : dateStr + "Z";
  const date = new Date(normalized);
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
