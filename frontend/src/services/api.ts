import type { Church, ChurchDetail, ApiResponse } from '../types';

const API_URL = import.meta.env.VITE_API_URL || '';

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
