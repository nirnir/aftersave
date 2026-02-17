import { AuditEvent, Deal, Purchase, PurchaseListItem } from "../types/purchase";
import { getAuthHeaders } from "../auth/instantClient";

interface PurchaseDetailsResponse {
  status: string;
  purchase: Purchase;
  deals: Deal[];
  auditEvents: AuditEvent[];
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message =
      body && typeof body.error === "string"
        ? body.error
        : `Request failed with status ${response.status}`;
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export async function fetchPurchases(): Promise<PurchaseListItem[]> {
  const response = await fetch("/api/purchases", {
    headers: getAuthHeaders()
  });
  const body = await parseResponse<{ purchases: PurchaseListItem[] }>(response);
  return body.purchases;
}

export async function fetchPurchaseDetails(
  purchaseId: string
): Promise<PurchaseDetailsResponse> {
  const response = await fetch(`/api/purchases/${encodeURIComponent(purchaseId)}`, {
    headers: getAuthHeaders()
  });
  return parseResponse<PurchaseDetailsResponse>(response);
}

export async function updatePurchaseMonitoring(
  purchaseId: string,
  monitoringEnabled: boolean
): Promise<void> {
  const response = await fetch(
    `/api/purchases/${encodeURIComponent(purchaseId)}/monitoring`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify({ monitoring_enabled: monitoringEnabled })
    }
  );

  await parseResponse<{ ok: true }>(response);
}
