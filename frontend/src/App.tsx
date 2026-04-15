import { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { MapContainer } from './components/Map';
import { ChurchDetail } from './components/ChurchDetail';
import { EnclaveDetail } from './components/EnclaveDetail';
import { useChurches, useEnclaves, useChurchDetail, useEnclaveDetail } from './hooks/useChurches';
import type { Church, Enclave } from './types';
import './App.css';

type SelectedItem =
  | { type: 'church'; item: Church }
  | { type: 'enclave'; item: Enclave }
  | null;

function App() {
  const { churches, loading: churchesLoading, error: churchesError } = useChurches();
  const { enclaves, loading: enclavesLoading } = useEnclaves();

  const [selected, setSelected] = useState<SelectedItem>(null);

  const selectedChurchId = selected?.type === 'church' ? selected.item.id : null;
  const selectedEnclaveId = selected?.type === 'enclave' ? selected.item.id : null;

  const { church: churchDetail, loading: churchDetailLoading } = useChurchDetail(selectedChurchId);
  const { enclave: enclaveDetail, loading: enclaveDetailLoading } = useEnclaveDetail(selectedEnclaveId);

  const handleSelectChurch = useCallback((church: Church) => {
    setSelected({ type: 'church', item: church });
  }, []);

  const handleSelectEnclave = useCallback((enclave: Enclave) => {
    setSelected({ type: 'enclave', item: enclave });
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelected(null);
  }, []);

  const loading = churchesLoading || enclavesLoading;

  if (churchesError) {
    return (
      <div className="app-error">
        <h2>Unable to load map data</h2>
        <p>{churchesError}</p>
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
            <p>Loading map...</p>
          </div>
        ) : (
          <MapContainer
            churches={churches}
            enclaves={enclaves}
            selectedChurch={selected?.type === 'church' ? selected.item : null}
            selectedEnclave={selected?.type === 'enclave' ? selected.item : null}
            onSelectChurch={handleSelectChurch}
            onSelectEnclave={handleSelectEnclave}
          />
        )}

        <ChurchDetail
          church={churchDetail}
          loading={churchDetailLoading}
          onClose={handleCloseDetail}
        />

        <EnclaveDetail
          enclave={enclaveDetail}
          loading={enclaveDetailLoading}
          onClose={handleCloseDetail}
        />
      </main>
    </div>
  );
}

export default App;
