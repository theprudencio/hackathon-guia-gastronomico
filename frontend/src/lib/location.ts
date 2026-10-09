import { api } from '../api/client';

/** Coordenadas -> "Cidade, UF" via API. Null se não der p/ resolver. */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await api<{ label: string }>(`/api/geocode/reverse?lat=${lat}&lng=${lng}`);
    return res.label;
  } catch {
    return null;
  }
}
