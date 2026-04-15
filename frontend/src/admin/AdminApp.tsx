import { useState, useEffect } from 'react';
import './AdminApp.css';

const API_URL = import.meta.env.VITE_API_URL || '';
const ADMIN_KEY = 'admin_key';

function apiHeaders(key: string) {
  return { 'Content-Type': 'application/json', 'x-admin-key': key };
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface Stats {
  churches: { total: number; enriched: number; pending: number; failed: number };
  enclaves: { total: number; enriched: number; pending: number; failed: number };
}

interface RecordRow {
  id: number;
  name: string;
  city: string | null;
  state: string | null;
  enrichment_status: string;
  enrichment_error: string | null;
  enrichment_attempts: number;
  formatted_address: string | null;
  updated_at: string;
}

// ─── Eye icon (show/hide password) ───────────────────────────────────────────
function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

// ─── Login ────────────────────────────────────────────────────────────────────
function Login({ onLogin }: { onLogin: (key: string) => void }) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/admin/stats`, {
        headers: { 'x-admin-key': password },
      });
      if (res.ok) {
        localStorage.setItem(ADMIN_KEY, password);
        onLogin(password);
      } else {
        setError('Incorrect password');
      }
    } catch {
      setError('Could not connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login">
      <div className="admin-login-card">
        <h1>Italian Enclaves</h1>
        <h2>Admin Panel</h2>
        <form onSubmit={handleSubmit}>
          <div className="admin-username-row">
            <span className="admin-username-label">Username</span>
            <span className="admin-username-value">admin</span>
          </div>
          <div className="admin-password-row">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            <button
              type="button"
              className="admin-toggle-pw"
              onClick={() => setShowPassword(v => !v)}
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              <EyeIcon open={showPassword} />
            </button>
          </div>
          {error && <p className="admin-error">{error}</p>}
          <button type="submit" disabled={loading || !password}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Stats card ───────────────────────────────────────────────────────────────
function StatsCard({ label, stats, color }: { label: string; stats: Stats['churches']; color: string }) {
  return (
    <div className="stats-card" style={{ borderTopColor: color }}>
      <h3>{label}</h3>
      <div className="stats-grid">
        <div className="stat-item"><span className="stat-num">{stats.total}</span><span className="stat-lbl">Total</span></div>
        <div className="stat-item stat-green"><span className="stat-num">{stats.enriched}</span><span className="stat-lbl">Enriched</span></div>
        <div className="stat-item stat-yellow"><span className="stat-num">{stats.pending}</span><span className="stat-lbl">Pending</span></div>
        <div className="stat-item stat-red"><span className="stat-num">{stats.failed}</span><span className="stat-lbl">Failed</span></div>
      </div>
    </div>
  );
}

// ─── Sample CSV download helpers ──────────────────────────────────────────────
function downloadCSV(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const CHURCH_SAMPLE_CSV = `Church Name,Location Description,Year Founded,Notes
Our Lady of Loreto,"1 Bleecker St, New York, NY",1891,Founded by Italian immigrants
St. Anthony of Padua,"Sullivan St, New York, NY",1866,
Santa Maria Incoronata,"Chicago, IL",1899,Example notes here`;

const ENCLAVE_SAMPLE_CSV = `Neighborhood,Area,State,Region,Blurb Status,Notes,,,,,,,,Links
Little Italy,New York City,New York,East Coast,Active,A historic neighborhood,,,,,,,,https://en.wikipedia.org/wiki/Little_Italy_Manhattan
Federal Hill,Providence,Rhode Island,East Coast,Active,Known for Italian-American culture,,,,,,,,https://en.wikipedia.org/wiki/Federal_Hill_Providence`;

// ─── Upload section ───────────────────────────────────────────────────────────
function UploadSection({ adminKey }: { adminKey: string }) {
  const [churchFile, setChurchFile] = useState<File | null>(null);
  const [enclaveFile, setEnclaveFile] = useState<File | null>(null);
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const upload = async (file: File, type: 'churches' | 'enclaves') => {
    setLoading(true);
    setResult('');
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await fetch(`${API_URL}/api/admin/upload/${type}`, {
        method: 'POST',
        headers: { 'x-admin-key': adminKey },
        body: form,
      });
      const data = await res.json();
      if (res.ok) {
        setResult(`✓ ${type}: Inserted ${data.inserted}, Skipped ${data.skipped} duplicates`);
      } else {
        setResult(`✗ Error: ${data.error}`);
      }
    } catch (e: any) {
      setResult(`✗ ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-section">
      <h2>Upload Excel Data</h2>
      <div className="upload-grid">
        <div className="upload-box">
          <h3>Churches</h3>
          <p className="upload-hint">Columns: Church Name, Location, Year Founded, Notes</p>
          <button
            type="button"
            className="btn-sample"
            onClick={() => downloadCSV('churches-sample.csv', CHURCH_SAMPLE_CSV)}
          >
            Download Sample CSV
          </button>
          <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => setChurchFile(e.target.files?.[0] || null)} />
          <button disabled={!churchFile || loading} onClick={() => churchFile && upload(churchFile, 'churches')}>
            Upload Churches
          </button>
        </div>
        <div className="upload-box">
          <h3>Enclaves</h3>
          <p className="upload-hint">Columns: Neighborhood, Area, State, Region, Blurb Status, ..., Links</p>
          <button
            type="button"
            className="btn-sample"
            onClick={() => downloadCSV('enclaves-sample.csv', ENCLAVE_SAMPLE_CSV)}
          >
            Download Sample CSV
          </button>
          <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => setEnclaveFile(e.target.files?.[0] || null)} />
          <button disabled={!enclaveFile || loading} onClick={() => enclaveFile && upload(enclaveFile, 'enclaves')}>
            Upload Enclaves
          </button>
        </div>
      </div>
      {result && <div className={`upload-result ${result.startsWith('✓') ? 'success' : 'error'}`}>{result}</div>}
    </div>
  );
}

// ─── Pagination bar ───────────────────────────────────────────────────────────
function PaginationBar({
  page, pages, total, limit, onPageChange, onLimitChange, position
}: {
  page: number; pages: number; total: number; limit: number;
  onPageChange: (p: number) => void; onLimitChange: (l: number) => void;
  position: 'top' | 'bottom';
}) {
  return (
    <div className={`pagination pagination-${position}`}>
      <div className="pagination-left">
        <span className="pagination-info">
          {total === 0 ? '0 records' : `${page * limit + 1}–${Math.min((page + 1) * limit, total)} of ${total}`}
        </span>
        {position === 'top' && (
          <select
            className="pagination-limit"
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
          >
            <option value={10}>10 / page</option>
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </select>
        )}
      </div>
      <div className="pagination-right">
        <button disabled={page === 0} onClick={() => onPageChange(0)}>«</button>
        <button disabled={page === 0} onClick={() => onPageChange(page - 1)}>‹ Prev</button>
        <span>Page {page + 1} of {Math.max(pages, 1)}</span>
        <button disabled={page >= pages - 1} onClick={() => onPageChange(page + 1)}>Next ›</button>
        <button disabled={page >= pages - 1} onClick={() => onPageChange(pages - 1)}>»</button>
      </div>
    </div>
  );
}

type SortKey = 'id' | 'name' | 'city' | 'enrichment_status' | 'formatted_address';

// ─── Records table ────────────────────────────────────────────────────────────
function RecordsTable({ adminKey, type }: { adminKey: string; type: 'churches' | 'enclaves' }) {
  const [rows, setRows] = useState<RecordRow[]>([]);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(25);
  const [loading, setLoading] = useState(false);
  const [enrichMsg, setEnrichMsg] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('id');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');

  const handleSort = (col: SortKey) => {
    if (sortBy === col) {
      setSortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(col);
      setSortOrder('ASC');
    }
    setPage(0);
  };

  const SortTh = ({ col, children }: { col: SortKey; children: React.ReactNode }) => (
    <th
      className={`sortable ${sortBy === col ? 'sorted' : ''}`}
      onClick={() => handleSort(col)}
    >
      {children}
      <span className="sort-arrow">
        {sortBy === col ? (sortOrder === 'ASC' ? '↑' : '↓') : '↕'}
      </span>
    </th>
  );

  const fetchRows = async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: String(limit), offset: String(page * limit), sort: sortBy, order: sortOrder });
    if (statusFilter) params.set('status', statusFilter);
    if (search) params.set('q', search);
    try {
      const res = await fetch(`${API_URL}/api/admin/${type}?${params}`, { headers: { 'x-admin-key': adminKey } });
      const data = await res.json();
      setRows(data.data);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRows(); }, [type, statusFilter, search, page, limit, sortBy, sortOrder]);

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(0);
  };

  const deleteRow = async (id: number) => {
    if (!confirm('Delete this record?')) return;
    await fetch(`${API_URL}/api/admin/${type}/${id}`, { method: 'DELETE', headers: { 'x-admin-key': adminKey } });
    fetchRows();
  };

  const triggerEnrich = async () => {
    const res = await fetch(`${API_URL}/api/admin/enrich/${type}`, { method: 'POST', headers: apiHeaders(adminKey) });
    const data = await res.json();
    setEnrichMsg(data.message);
  };

  const pages = Math.ceil(total / limit);

  return (
    <div className="admin-section records-section">
      <div className="records-header">
        <h2>{type.charAt(0).toUpperCase() + type.slice(1)} Records <span className="records-count">({total})</span></h2>
        <button className="btn-enrich" onClick={triggerEnrich}>Re-enrich Failed/Pending</button>
      </div>
      {enrichMsg && <div className="enrich-msg">{enrichMsg}</div>}
      <div className="records-filters">
        <input type="text" placeholder="Search by name or location..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}>
          <option value="">All statuses</option>
          <option value="enriched">Enriched</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      <PaginationBar
        page={page} pages={pages} total={total} limit={limit}
        onPageChange={setPage} onLimitChange={handleLimitChange}
        position="top"
      />

      {loading ? <div className="admin-loading">Loading...</div> : (
        <div className="table-wrapper">
          <table className="records-table">
            <thead>
              <tr>
                <SortTh col="id">ID</SortTh>
                <SortTh col="name">Name</SortTh>
                <SortTh col="city">Location</SortTh>
                <SortTh col="enrichment_status">Status</SortTh>
                <SortTh col="formatted_address">Address</SortTh>
                <th>Error</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="col-id">{row.id}</td>
                  <td className="col-name" title={row.name}>{row.name}</td>
                  <td className="col-location" title={[row.city, row.state].filter(Boolean).join(', ')}>
                    {[row.city, row.state].filter(Boolean).join(', ')}
                  </td>
                  <td><span className={`status-badge status-${row.enrichment_status}`}>{row.enrichment_status}</span></td>
                  <td className="col-address" title={row.formatted_address || ''}>{row.formatted_address || '—'}</td>
                  <td className="col-error" title={row.enrichment_error || ''}>{row.enrichment_error ? row.enrichment_error.slice(0, 40) + (row.enrichment_error.length > 40 ? '…' : '') : '—'}</td>
                  <td><button className="btn-delete" onClick={() => deleteRow(row.id)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PaginationBar
        page={page} pages={pages} total={total} limit={limit}
        onPageChange={setPage} onLimitChange={handleLimitChange}
        position="bottom"
      />
    </div>
  );
}

// ─── Main Admin App ───────────────────────────────────────────────────────────
export function AdminApp() {
  const [adminKey, setAdminKey] = useState(() => localStorage.getItem(ADMIN_KEY) || '');
  const [stats, setStats] = useState<Stats | null>(null);
  const [tab, setTab] = useState<'dashboard' | 'upload' | 'churches' | 'enclaves'>('dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const fetchStats = async (key: string) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/stats`, { headers: { 'x-admin-key': key } });
      if (res.ok) setStats(await res.json());
    } catch {}
  };

  useEffect(() => {
    if (adminKey) fetchStats(adminKey);
  }, [adminKey]);

  const handleLogin = (key: string) => {
    setAdminKey(key);
    fetchStats(key);
  };

  const handleLogout = () => {
    localStorage.removeItem(ADMIN_KEY);
    setAdminKey('');
    setStats(null);
  };

  const handleTabChange = (t: typeof tab) => {
    setTab(t);
    setMobileNavOpen(false);
  };

  if (!adminKey) return <Login onLogin={handleLogin} />;

  return (
    <div className="admin-app">
      <header className="admin-header">
        <div className="admin-header-left">
          <h1>Italian Enclaves — Admin</h1>
        </div>
        <button
          className="admin-hamburger"
          onClick={() => setMobileNavOpen(v => !v)}
          aria-label="Toggle navigation"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <nav className={`admin-nav ${mobileNavOpen ? 'admin-nav-open' : ''}`}>
          <button className={tab === 'dashboard' ? 'active' : ''} onClick={() => handleTabChange('dashboard')}>Dashboard</button>
          <button className={tab === 'upload' ? 'active' : ''} onClick={() => handleTabChange('upload')}>Upload Data</button>
          <button className={tab === 'churches' ? 'active' : ''} onClick={() => handleTabChange('churches')}>Churches</button>
          <button className={tab === 'enclaves' ? 'active' : ''} onClick={() => handleTabChange('enclaves')}>Enclaves</button>
        </nav>
        <button className="admin-logout" onClick={handleLogout}>Logout</button>
      </header>

      <main className="admin-main">
        {tab === 'dashboard' && (
          <div>
            <h2>Overview</h2>
            {stats ? (
              <div className="stats-row">
                <StatsCard label="Churches" stats={stats.churches} color="#008c45" />
                <StatsCard label="Enclaves" stats={stats.enclaves} color="#dc2329" />
              </div>
            ) : <div className="admin-loading">Loading stats...</div>}
            <div className="dashboard-links">
              <button onClick={() => setTab('upload')}>→ Upload new data</button>
              <button onClick={() => setTab('churches')}>→ Review church records</button>
              <button onClick={() => setTab('enclaves')}>→ Review enclave records</button>
              <a href="/" target="_blank" rel="noopener noreferrer">→ View live map</a>
            </div>
          </div>
        )}
        {tab === 'upload' && <UploadSection adminKey={adminKey} />}
        {tab === 'churches' && <RecordsTable adminKey={adminKey} type="churches" />}
        {tab === 'enclaves' && <RecordsTable adminKey={adminKey} type="enclaves" />}
      </main>
    </div>
  );
}
