export type ApiError = {
  message: string;
  status: number;
  errors?: Array<{
    field: string;
    message: string;
  }>;
};

export type HealthResponse = {
  ok: boolean;
  service: string;
  database?: string;
};

export type Location = {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ClassificationTagSource = "manual" | "open_library";

export type ClassificationTag = {
  id: string;
  name: string;
  description: string | null;
  source: ClassificationTagSource;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BookReference = {
  id: string;
  name: string;
};

export type Book = {
  id: string;
  title: string;
  author: string | null;
  publisher: string | null;
  publishedDate: string | null;
  isbn: string | null;
  bookBarcode: string | null;
  managementBarcode: string | null;
  externalSource: string | null;
  externalId: string | null;
  location: BookReference | null;
  classificationTags: BookReference[];
  managementMemo: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BookFormRequest = {
  title: string;
  author?: string | null;
  publisher?: string | null;
  publishedDate?: string | null;
  isbn?: string | null;
  bookBarcode?: string | null;
  managementBarcode?: string | null;
  externalSource?: string | null;
  externalId?: string | null;
  locationId?: string | null;
  classificationTagIds?: string[];
  managementMemo?: string | null;
};

export type BookLookupResult = {
  title: string;
  author?: string;
  publisher?: string;
  publishedDate?: string;
  isbn?: string;
  externalSource: "open_library";
  externalId?: string;
  classificationTagCandidates: string[];
};

export type ListBooksQuery = {
  q?: string;
  locationId?: string;
  classificationTagId?: string;
  page?: number;
  limit?: number;
};

export type ListBooksResponse = {
  items: Book[];
  page: number;
  limit: number;
  total: number;
};

export type CreateLocationRequest = {
  name: string;
  description?: string;
  sortOrder?: number;
};

export type UpdateLocationRequest = Omit<Partial<CreateLocationRequest>, "description"> & {
  isActive?: boolean;
  description?: string | null;
};

export type CreateClassificationTagRequest = {
  name: string;
  description?: string;
  source?: ClassificationTagSource;
};

export type UpdateClassificationTagRequest = Omit<
  Partial<CreateClassificationTagRequest>,
  "description"
> & {
  isActive?: boolean;
  description?: string | null;
};

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

export function getApiBaseUrl() {
  return apiBaseUrl || "/api";
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...init?.headers
    },
    ...init
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as Partial<ApiError> | null;

    throw {
      message: payload?.message ?? `Request failed with status ${response.status}`,
      status: response.status,
      errors: payload?.errors
    } satisfies ApiError;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function getHealth() {
  return apiRequest<HealthResponse>("/api/health");
}

export function getBooks(query: ListBooksQuery = {}) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  }

  const search = params.toString();

  return apiRequest<ListBooksResponse>(`/api/books${search ? `?${search}` : ""}`);
}

export function getBook(id: string) {
  return apiRequest<Book>(`/api/books/${encodeURIComponent(id)}`);
}

export function createBook(payload: BookFormRequest) {
  return apiRequest<Book>("/api/books", {
    body: JSON.stringify(payload),
    method: "POST"
  });
}

export function updateBook(id: string, payload: BookFormRequest) {
  return apiRequest<Book>(`/api/books/${encodeURIComponent(id)}`, {
    body: JSON.stringify(payload),
    method: "PUT"
  });
}

export function deleteBook(id: string) {
  return apiRequest<void>(`/api/books/${encodeURIComponent(id)}`, {
    method: "DELETE"
  });
}

export function lookupBookByBarcode(bookBarcode: string) {
  return apiRequest<BookLookupResult>("/api/books/lookup", {
    body: JSON.stringify({ bookBarcode }),
    method: "POST"
  });
}

export function getLocations() {
  return apiRequest<{ items: Location[] }>("/api/locations");
}

export function createLocation(payload: CreateLocationRequest) {
  return apiRequest<Location>("/api/locations", {
    body: JSON.stringify(payload),
    method: "POST"
  });
}

export function updateLocation(id: string, payload: UpdateLocationRequest) {
  return apiRequest<Location>(`/api/locations/${encodeURIComponent(id)}`, {
    body: JSON.stringify(payload),
    method: "PUT"
  });
}

export function disableLocation(id: string) {
  return apiRequest<void>(`/api/locations/${encodeURIComponent(id)}`, {
    method: "DELETE"
  });
}

export function getClassificationTags() {
  return apiRequest<{ items: ClassificationTag[] }>("/api/classification-tags");
}

export function createClassificationTag(payload: CreateClassificationTagRequest) {
  return apiRequest<ClassificationTag>("/api/classification-tags", {
    body: JSON.stringify(payload),
    method: "POST"
  });
}

export function updateClassificationTag(id: string, payload: UpdateClassificationTagRequest) {
  return apiRequest<ClassificationTag>(`/api/classification-tags/${encodeURIComponent(id)}`, {
    body: JSON.stringify(payload),
    method: "PUT"
  });
}

export function disableClassificationTag(id: string) {
  return apiRequest<void>(`/api/classification-tags/${encodeURIComponent(id)}`, {
    method: "DELETE"
  });
}
