import { useState, useEffect } from 'react';
import type { EnclaveDetail as EnclaveDetailType } from '../types';
import { getEnclavePhotoUrl } from '../services/api';
import './ChurchDetail.css'; // reuse same styles

interface EnclaveDetailProps {
  enclave: EnclaveDetailType | null;
  loading: boolean;
  onClose: () => void;
}

export function EnclaveDetail({ enclave, loading, onClose }: EnclaveDetailProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  useEffect(() => {
    setCurrentPhotoIndex(0);
  }, [enclave?.id]);

  if (!enclave && !loading) return null;

  const photos = enclave?.google_photos || [];
  const hasPhotos = photos.length > 0;

  const nextPhoto = () => setCurrentPhotoIndex((prev) => (prev + 1) % photos.length);
  const prevPhoto = () => setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);

  return (
    <div className="church-detail">
      <button className="church-detail-close" onClick={onClose}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>

      {loading ? (
        <div className="church-detail-loading">
          <div className="spinner" />
        </div>
      ) : enclave ? (
        <>
          {hasPhotos && (
            <div className="church-photos">
              <img
                src={getEnclavePhotoUrl(enclave.id, photos[currentPhotoIndex].photo_reference, 600)}
                alt={enclave.name}
                className="church-photo"
              />
              {photos.length > 1 && (
                <>
                  <button className="photo-nav photo-nav-prev" onClick={prevPhoto}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                  </button>
                  <button className="photo-nav photo-nav-next" onClick={nextPhoto}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </button>
                  <div className="photo-dots">
                    {photos.map((_, index) => (
                      <span
                        key={index}
                        className={`photo-dot ${index === currentPhotoIndex ? 'active' : ''}`}
                        onClick={() => setCurrentPhotoIndex(index)}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="church-info">
            <h2 className="church-name">{enclave.name}</h2>

            {enclave.formatted_address && (
              <p className="church-address">{enclave.formatted_address}</p>
            )}

            <div className="church-meta">
              {enclave.region && (
                <div className="church-meta-item">
                  <span className="meta-label">Region</span>
                  <span className="meta-value">{enclave.region}</span>
                </div>
              )}
            </div>

            {enclave.notes && (
              <div className="church-notes">
                <p>{enclave.notes}</p>
              </div>
            )}

            <div className="church-actions">
              {enclave.google_url && (
                <a href={enclave.google_url} target="_blank" rel="noopener noreferrer" className="action-button">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  View on Google Maps
                </a>
              )}

              {enclave.enclave_page_url && (
                <a href={enclave.enclave_page_url} target="_blank" rel="noopener noreferrer" className="action-button">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                  Visit Page
                </a>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
