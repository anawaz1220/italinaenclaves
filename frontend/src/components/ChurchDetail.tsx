import { useState } from 'react';
import type { ChurchDetail as ChurchDetailType } from '../types';
import { getPhotoUrl } from '../services/api';
import './ChurchDetail.css';

interface ChurchDetailProps {
  church: ChurchDetailType | null;
  loading: boolean;
  onClose: () => void;
}

export function ChurchDetail({ church, loading, onClose }: ChurchDetailProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  if (!church && !loading) return null;

  const photos = church?.google_photos || [];
  const hasPhotos = photos.length > 0;

  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev + 1) % photos.length);
  };

  const prevPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

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
      ) : church ? (
        <>
          {hasPhotos && (
            <div className="church-photos">
              <img
                src={getPhotoUrl(church.id, photos[currentPhotoIndex].photo_reference, 600)}
                alt={church.name}
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
            <h2 className="church-name">{church.name}</h2>

            {church.formatted_address && (
              <p className="church-address">{church.formatted_address}</p>
            )}

            <div className="church-meta">
              {church.year_founded && (
                <div className="church-meta-item">
                  <span className="meta-label">Founded</span>
                  <span className="meta-value">{church.year_founded}</span>
                </div>
              )}

              {church.google_rating && (
                <div className="church-meta-item">
                  <span className="meta-label">Rating</span>
                  <span className="meta-value">
                    <span className="rating-star">★</span> {church.google_rating}
                  </span>
                </div>
              )}
            </div>

            {church.notes && (
              <div className="church-notes">
                <p>{church.notes}</p>
              </div>
            )}

            <div className="church-actions">
              {church.google_url && (
                <a
                  href={church.google_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="action-button action-button-primary"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  View on Google Maps
                </a>
              )}

              {church.website && (
                <a
                  href={church.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="action-button"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                  Website
                </a>
              )}

              {church.phone && (
                <a href={`tel:${church.phone}`} className="action-button">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  {church.phone}
                </a>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
