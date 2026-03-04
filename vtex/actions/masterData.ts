/**
 * VTEX MasterData v2 API actions.
 * Generic CRUD operations on data entities.
 */
import { vtexFetch } from "../client";

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

export async function searchDocuments<T = MasterDataSearchResult>(
  entity: string,
  filter: string,
): Promise<T[]> {
  return vtexFetch<T[]>(
    `/api/dataentities/${entity}/search?_where=${encodeURIComponent(filter)}`,
  );
}
