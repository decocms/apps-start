/**
 * VTEX MasterData v2 API actions.
 * Generic CRUD operations on data entities.
 */
import { vtexFetch, vtexFetchResponse } from "../client";

function removeEmptyFields(obj: Record<string, any>): Record<string, any> {
  return Object.fromEntries(
    Object.entries(obj).filter(
      ([_, value]) => value !== "" && value !== undefined && value !== null,
    ),
  );
}

export interface CreateDocumentResult {
  DocumentId: string;
}

export async function createDocument(
  entity: string,
  data: Record<string, any>,
): Promise<CreateDocumentResult> {
  return vtexFetch<CreateDocumentResult>(
    `/api/dataentities/${entity}/documents`,
    { method: "POST", body: JSON.stringify(removeEmptyFields(data)) },
  );
}

export async function getDocument<T = unknown>(
  entity: string,
  documentId: string,
): Promise<T> {
  return vtexFetch<T>(
    `/api/dataentities/${entity}/documents/${documentId}`,
  );
}

export async function patchDocument(
  entity: string,
  documentId: string,
  data: Record<string, any>,
): Promise<void> {
  await vtexFetch<any>(
    `/api/dataentities/${entity}/documents/${documentId}`,
    { method: "PATCH", body: JSON.stringify(removeEmptyFields(data)) },
  );
}

export interface MasterDataSearchResult {
  id: string;
  accountId: string;
  accountName: string;
  dataEntityId: string;
  [key: string]: any;
}

/**
 * Simple search — kept for backward compat.
 */
export async function searchDocuments<T = MasterDataSearchResult>(
  entity: string,
  filter: string,
): Promise<T[]> {
  return vtexFetch<T[]>(
    `/api/dataentities/${entity}/search?_where=${encodeURIComponent(filter)}`,
  );
}

/**
 * Full MasterData search with pagination, field selection, and sorting.
 * Ported from deco-cx/apps vtex/loaders/masterdata/searchDocuments.ts
 *
 * @see https://developers.vtex.com/docs/api-reference/masterdata-api#get-/api/dataentities/-acronym-/search
 */
export interface SearchDocumentsOpts {
  acronym: string;
  fields?: string;
  where?: string;
  sort?: string;
  /** @default 10 (max 100) */
  take?: number;
  /** @default 0 */
  skip?: number;
  /** Auth cookie header for authenticated queries */
  cookieHeader?: string;
}

export async function searchDocumentsFull<T = Record<string, unknown>>(
  opts: SearchDocumentsOpts,
): Promise<T[]> {
  const { acronym, fields, where, sort, skip = 0, take = 10, cookieHeader } = opts;
  const from = Math.max(skip, 0);
  const to = from + Math.min(100, take);

  const params = new URLSearchParams();
  if (fields) params.set("_fields", fields);
  if (where) params.set("_where", where);
  if (sort) params.set("_sort", sort);

  const headers: Record<string, string> = {
    accept: "application/vnd.vtex.ds.v10+json",
    "content-type": "application/json",
    "REST-Range": `resources=${from}-${to}`,
  };
  if (cookieHeader) headers["cookie"] = cookieHeader;

  return vtexFetchResponse(
    `/api/dataentities/${acronym}/search?${params}`,
    { headers },
  ).then((res) => res.json());
}
