export function getRealtimeUrl(): string {
  const configured = process.env.NEXT_PUBLIC_WS_URL;
  if (configured) return configured.replace(/\/$/, "");
  if (typeof window === "undefined") return "ws://localhost:1234";
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.hostname}:1234`;
}
