import { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { MapContainer } from './components/Map';
import { ChurchDetail } from './components/ChurchDetail';
import { useChurches, useChurchDetail } from './hooks/useChurches';
import type { Church } from './types';
import './App.css';

function App() {
  const { churches, loading, error } = useChurches();
  const [selectedChurchId, setSelectedChurchId] = useState<number | null>(null);
  const [selectedChurch, setSelectedChurch] = useState<Church | null>(null);

  const { church: churchDetail, loading: detailLoading } = useChurchDetail(selectedChurchId);

  const handleSelectChurch = useCallback((church: Church) => {
    setSelectedChurch(church);
    setSelectedChurchId(church.id);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedChurchId(null);
    setSelectedChurch(null);
  }, []);

  if (error) {
    return (
      <div className="app-error">
        <h2>Unable to load churches</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Try Again</button>
      </div>
    );
  }

  return (
    <div className="app">
      <Header />

      <main className="app-main">
        {loading ? (
          <div className="app-loading">
            <div className="spinner" />
            <p>Loading churches...</p>
          </div>
        ) : (
          <MapContainer
            churches={churches}
            selectedChurch={selectedChurch}
            onSelectChurch={handleSelectChurch}
          />
        )}

        <ChurchDetail
          church={churchDetail}
          loading={detailLoading}
          onClose={handleCloseDetail}
        />
      </main>
    </div>
  );
}

export default App;
