export type ApiHealthStatus = "unknown" | "checking" | "online" | "degraded" | "offline";

const HEARTBEAT_URL = "/api/heartbeat";

export async function fetchApiHealth(): Promise<ApiHealthStatus> {
  try {
    const res = await fetch(HEARTBEAT_URL, { method: "GET" });
    if (res.ok) {
      return "online";
    }
    return "degraded";
  } catch (err) {
    console.warn("Heartbeat check failed", err);
    return "offline";
  }
}
