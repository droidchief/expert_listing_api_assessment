export interface Pagination {
  next_cursor: string | null;
  has_more: boolean;
  limit: number;
}

function meta(requestId: string) {
  return { request_id: requestId, server_time: new Date().toISOString() };
}

export function ok<T>(data: T, requestId: string) {
  return { data, meta: meta(requestId) };
}

export function page<T>(data: T[], pagination: Pagination, requestId: string) {
  return { data, pagination, meta: meta(requestId) };
}
