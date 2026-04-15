import type { Church, ChurchDetail, Enclave, EnclaveDetail, ApiResponse, SearchResult } from '../types';

const API_URL = import.meta.env.VITE_API_URL || '';

// --- Churches ---
export async function fetchChurches(): Promise<Church[]> {
  const response = await fetch(`${API_URL}/api/churches`);
  if (!response.ok) throw new Error('Failed to fetch churches');
  const data: ApiResponse<Church[]> = await response.json();
  return data.data;
}

export async function fetchChurchById(id: number): Promise<ChurchDetail> {
  const response = await fetch(`${API_URL}/api/churches/${id}`);
  if (!response.ok) throw new Error('Failed to fetch church');
  return response.json();
}

export async function searchChurches(query: string): Promise<Church[]> {
  const response = await fetch(`${API_URL}/api/churches/search?q=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error('Failed to search churches');
  const data: ApiResponse<Church[]> = await response.json();
  return data.data;
}

export function getPhotoUrl(churchId: number, photoReference: string, maxWidth: number = 400): string {
  return `${API_URL}/api/churches/${churchId}/photo/${photoReference}?maxwidth=${maxWidth}`;
}

// --- Enclaves ---
export async function fetchEnclaves(): Promise<Enclave[]> {
  const response = await fetch(`${API_URL}/api/enclaves`);
  if (!response.ok) throw new Error('Failed to fetch enclaves');
  const data: ApiResponse<Enclave[]> = await response.json();
  return data.data;
}

export async function fetchEnclaveById(id: number): Promise<EnclaveDetail> {
  const response = await fetch(`${API_URL}/api/enclaves/${id}`);
  if (!response.ok) throw new Error('Failed to fetch enclave');
  return response.json();
}

export async function searchEnclaves(query: string): Promise<Enclave[]> {
  const response = await fetch(`${API_URL}/api/enclaves/search?q=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error('Failed to search enclaves');
  const data: ApiResponse<Enclave[]> = await response.json();
  return data.data;
}

export function getEnclavePhotoUrl(enclaveId: number, photoReference: string, maxWidth: number = 400): string {
  return `${API_URL}/api/enclaves/${enclaveId}/photo/${photoReference}?maxwidth=${maxWidth}`;
}

// --- Unified search ---
export async function searchAll(query: string): Promise<SearchResult[]> {
  const [churches, enclaves] = await Promise.all([
    searchChurches(query).catch(() => [] as Church[]),
    searchEnclaves(query).catch(() => [] as Enclave[]),
  ]);

  const churchResults: SearchResult[] = churches.map((c) => ({
    id: c.id, type: 'church', name: c.name, city: c.city, state: c.state,
    latitude: c.latitude, longitude: c.longitude,
  }));
  const enclaveResults: SearchResult[] = enclaves.map((e) => ({
    id: e.id, type: 'enclave', name: e.name, city: e.city, state: e.state,
    latitude: e.latitude, longitude: e.longitude,
  }));

  return [...churchResults, ...enclaveResults];
}
