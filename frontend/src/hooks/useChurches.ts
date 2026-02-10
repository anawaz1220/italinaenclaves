import { useState, useEffect, useCallback } from 'react';
import type { Church, ChurchDetail } from '../types';
import { fetchChurches, fetchChurchById, searchChurches } from '../services/api';

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

export function useChurchDetail(id: number | null) {
  const [church, setChurch] = useState<ChurchDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id === null) {
      setChurch(null);
      return;
    }

    setLoading(true);
    fetchChurchById(id)
      .then(setChurch)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  return { church, loading, error };
}

export function useSearch() {
  const [results, setResults] = useState<Church[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const data = await searchChurches(query);
      setResults(data);
    } catch (err) {
      console.error('Search error:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
  }, []);

  return { results, loading, search, clearResults };
}
