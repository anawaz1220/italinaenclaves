import { useState, useEffect, useCallback } from 'react';
import type { Church, ChurchDetail, Enclave, EnclaveDetail, SearchResult, SearchResultType } from '../types';
import {
  fetchChurches, fetchChurchById,
  fetchEnclaves, fetchEnclaveById,
  searchAll,
} from '../services/api';

export function useChurches() {
  const [churches, setChurches] = useState<Church[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchChurches()
      .then(setChurches)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return { churches, loading, error };
}

export function useEnclaves() {
  const [enclaves, setEnclaves] = useState<Enclave[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEnclaves()
      .then(setEnclaves)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return { enclaves, loading, error };
}

export function useChurchDetail(id: number | null) {
  const [church, setChurch] = useState<ChurchDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id === null) { setChurch(null); return; }
    setLoading(true);
    fetchChurchById(id)
      .then(setChurch)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  return { church, loading, error };
}

export function useEnclaveDetail(id: number | null) {
  const [enclave, setEnclave] = useState<EnclaveDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id === null) { setEnclave(null); return; }
    setLoading(true);
    fetchEnclaveById(id)
      .then(setEnclave)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  return { enclave, loading, error };
}

export function useSearch() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<SearchResultType | 'all'>('all');

  const search = useCallback(async (query: string) => {
    if (!query.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const data = await searchAll(query);
      setResults(data);
    } catch (err) {
      console.error('Search error:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearResults = useCallback(() => setResults([]), []);

  const filteredResults = filterType === 'all'
    ? results
    : results.filter((r) => r.type === filterType);

  return { results: filteredResults, allResults: results, loading, search, clearResults, filterType, setFilterType };
}
