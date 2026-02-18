import type {
  AssetDetailResponse,
  PagingMeta,
  AssetRow,
  AssetSapMismatchRow,
  LoginBeginResponse,
  LoginResponse,
  PagedRows,
  PlantAccess,
  StocktakeWorkspaceData,
} from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_ASSET_API_URL ?? "http://localhost:3001";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

type RequestOptions = RequestInit & {
  sessionId?: string;
};

function buildApiUrl(path: string) {
  return `${API_BASE}${path}`;
}

async function requestJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  const sid = typeof options.sessionId === "string" ? options.sessionId.trim() : "";
  if (sid) {
    headers.set("x-session-id", sid);
  }

  const response = await fetch(buildApiUrl(path), {
    ...options,
    headers,
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || (payload && payload.ok === false)) {
    throw new ApiError(
      payload?.message || `API error (${response.status})`,
      response.status,
    );
  }

  return payload as T;
}

async function requestForm<T>(path: string, sessionId: string, form: FormData, method: "POST" | "PUT" = "POST") {
  const headers = new Headers();
  const sid = String(sessionId || "").trim();
  if (sid) headers.set("x-session-id", sid);

  const response = await fetch(buildApiUrl(path), {
    method,
    headers,
    body: form,
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || (payload && payload.ok === false)) {
    throw new ApiError(payload?.message || `API error (${response.status})`, response.status);
  }

  return payload as T;
}

export async function authBegin(email: string): Promise<LoginBeginResponse> {
  return requestJson<LoginBeginResponse>("/auth/begin", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function authLogin(
  email: string,
  password: string,
  plantId?: string,
): Promise<LoginResponse> {
  return requestJson<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      plantId: plantId || undefined,
    }),
  });
}

export async function authMe(sessionId: string) {
  return requestJson<{ ok: boolean; data: unknown }>("/auth/me", {
    method: "GET",
    sessionId,
  });
}

export async function authSwitchPlant(sessionId: string, plantId: string) {
  return requestJson<{ ok: boolean; data: PlantAccess }>("/auth/switch-plant", {
    method: "POST",
    sessionId,
    body: JSON.stringify({ plantId }),
  });
}

export async function authLogout(sessionId: string) {
  return requestJson<{ ok: boolean; data: unknown }>("/auth/logout", {
    method: "POST",
    sessionId,
    body: JSON.stringify({ reason: "logout from frontend" }),
  });
}

function toPaging(raw: PagingMeta | undefined): PagingMeta {
  if (!raw) {
    return { page: 1, pageSize: 50, totalRows: 0, totalPages: 0 };
  }

  return {
    page: Number(raw.page || 1),
    pageSize: Number(raw.pageSize || 50),
    totalRows: Number(raw.totalRows || 0),
    totalPages: Number(raw.totalPages || 0),
  };
}

type PagedApiResponse<T> = {
  ok: boolean;
  rows: T[];
  paging: PagingMeta;
};

export async function getAssets(
  sessionId: string,
  { page = 1, pageSize = 50, search = "" }: { page?: number; pageSize?: number; search?: string } = {}
): Promise<PagedRows<AssetRow>> {
  const qp = new URLSearchParams();
  qp.set("page", String(page));
  qp.set("pageSize", String(pageSize));
  if (search.trim()) qp.set("search", search.trim());

  const response = await requestJson<PagedApiResponse<AssetRow>>(`/assets?${qp.toString()}`, {
    method: "GET",
    sessionId,
  });

  return {
    rows: response.rows || [],
    paging: toPaging(response.paging),
  };
}

export async function getAssetsNoImage(
  sessionId: string,
  { page = 1, pageSize = 50, search = "" }: { page?: number; pageSize?: number; search?: string } = {}
): Promise<PagedRows<AssetRow>> {
  const qp = new URLSearchParams();
  qp.set("page", String(page));
  qp.set("pageSize", String(pageSize));
  if (search.trim()) qp.set("search", search.trim());

  const response = await requestJson<PagedApiResponse<AssetRow>>(
    `/assets/no-image?${qp.toString()}`,
    {
      method: "GET",
      sessionId,
    },
  );

  return {
    rows: response.rows || [],
    paging: toPaging(response.paging),
  };
}

export async function getAssetDetail(sessionId: string, assetId: string) {
  return requestJson<AssetDetailResponse>(`/assets/${assetId}`, {
    method: "GET",
    sessionId,
  });
}

export async function getAssetsSapMismatch(
  sessionId: string,
  { page = 1, pageSize = 50, search = "" }: { page?: number; pageSize?: number; search?: string } = {},
): Promise<PagedRows<AssetSapMismatchRow>> {
  const qp = new URLSearchParams();
  qp.set("page", String(page));
  qp.set("pageSize", String(pageSize));
  if (search.trim()) qp.set("search", search.trim());

  const response = await requestJson<PagedApiResponse<AssetSapMismatchRow>>(
    `/assets/sap-mismatch?${qp.toString()}`,
    {
      method: "GET",
      sessionId,
    },
  );

  return {
    rows: response.rows || [],
    paging: toPaging(response.paging),
  };
}

export function toApiFileUrl(fileUrl: string) {
  const s = String(fileUrl || "").trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  return s.startsWith("/") ? buildApiUrl(s) : buildApiUrl(`/${s}`);
}

export async function uploadAssetImage(
  sessionId: string,
  assetId: string,
  file: File,
  { isPrimary = false }: { isPrimary?: boolean } = {}
) {
  const form = new FormData();
  form.append("image", file);
  form.append("isPrimary", isPrimary ? "1" : "0");

  return requestForm<{
    ok: boolean;
    image?: {
      AssetImageId?: string;
      AssetId?: string;
      FileUrl?: string;
      IsPrimary?: boolean;
      SortOrder?: number;
      UploadedAt?: string;
    } | null;
    file?: {
      provider?: string;
      fileUrl?: string;
    };
  }>(`/assets/${assetId}/images`, sessionId, form, "POST");
}

export async function getStocktakeWorkspace(
  sessionId: string,
  {
    year,
    statusCode = "",
    search = "",
  }: { year: number; statusCode?: string; search?: string }
): Promise<StocktakeWorkspaceData> {
  const qp = new URLSearchParams();
  qp.set("year", String(year));
  if (statusCode.trim()) qp.set("statusCode", statusCode.trim());
  if (search.trim()) qp.set("search", search.trim());

  const r = await requestJson<{ ok: boolean; data: StocktakeWorkspaceData }>(
    `/stocktake/workspace?${qp.toString()}`,
    {
      method: "GET",
      sessionId,
    }
  );
  return r.data;
}

export async function scanStocktakeAsset(
  sessionId: string,
  {
    year,
    assetId,
    statusCode,
    countMethod,
    noteText,
    image,
  }: {
    year: number;
    assetId: string;
    statusCode: string;
    countMethod?: "QR" | "BARCODE" | "MANUAL" | "EXCEL";
    noteText?: string;
    image: File;
  }
) {
  const form = new FormData();
  form.append("year", String(year));
  form.append("assetId", assetId);
  form.append("statusCode", statusCode);
  form.append("countMethod", countMethod || "QR");
  if (noteText?.trim()) form.append("noteText", noteText.trim());
  form.append("image", image);

  const r = await requestForm<{
    ok: boolean;
    data: {
      stocktakeId: string;
      stocktakeItemId: string;
      stocktakeItemImageId?: string | null;
      fileUrl?: string;
    };
  }>("/stocktake/scan", sessionId, form, "POST");

  return r.data;
}

export async function importStocktakeCounts(
  sessionId: string,
  {
    year,
    file,
    countMethod,
  }: {
    year: number;
    file: File;
    countMethod?: "QR" | "BARCODE" | "MANUAL" | "EXCEL";
  }
) {
  const form = new FormData();
  form.append("year", String(year));
  form.append("file", file);
  if (countMethod) form.append("countMethod", countMethod);

  const r = await requestForm<{
    ok: boolean;
    data: {
      stocktakeId: string;
      parsedRows: number;
      importedRows: number;
    };
  }>("/stocktake/import", sessionId, form, "POST");

  return r.data;
}

export async function closeStocktakeYear(sessionId: string, year: number) {
  const r = await requestJson<{
    ok: boolean;
    data: {
      plantId: string;
      stocktakeYear: number;
    };
  }>("/stocktake/close-year", {
    method: "POST",
    sessionId,
    body: JSON.stringify({ year }),
  });
  return r.data;
}

export async function openNextStocktakeYear(
  sessionId: string,
  { fromYear, toYear }: { fromYear: number; toYear?: number }
) {
  const r = await requestJson<{
    ok: boolean;
    data: {
      fromYear: number;
      toYear: number;
      newStocktakeId?: string | null;
    };
  }>("/stocktake/open-next-year", {
    method: "POST",
    sessionId,
    body: JSON.stringify({ fromYear, toYear }),
  });
  return r.data;
}
