import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bike, Search, Package, AlertTriangle, CircleX, Plus, MapPin, RefreshCw, X, Boxes, LoaderCircle } from 'lucide-react';
import api from './services/api.js';

const emptyForm = { productCode: '', name: '', category: 'Other', manufacturer: '', manufacturerPartNumber: '', purchasePrice: '', sellingPrice: '', stock: '0', minimumStock: '2', compatibleBikesText: '', rack: '', shelf: '', box: '' };
const demoProducts = [
  { productCode: 'DEMO-BRK-001', name: 'Front Brake Shoe', category: 'Brakes', manufacturer: 'Example Parts Co.', manufacturerPartNumber: 'EX-BRK-01', purchasePrice: 120, sellingPrice: 160, stock: 8, minimumStock: 3, compatibleBikes: [{ brand: 'Honda', model: 'Activa 6G' }, { brand: 'Honda', model: 'Activa 5G' }], locations: [{ rack: 'B', shelf: '03', box: '01', quantity: 8 }] },
  { productCode: 'DEMO-FLT-002', name: 'Air Filter', category: 'Filters', manufacturer: 'Example Parts Co.', manufacturerPartNumber: 'EX-FLT-02', purchasePrice: 80, sellingPrice: 120, stock: 3, minimumStock: 5, compatibleBikes: [{ brand: 'Honda', model: 'Activa 6G' }], locations: [{ rack: 'C', shelf: '02', box: '01', quantity: 3 }] },
  { productCode: 'DEMO-CBL-003', name: 'Clutch Cable', category: 'Cables', manufacturer: 'Example Parts Co.', manufacturerPartNumber: 'EX-CBL-03', purchasePrice: 70, sellingPrice: 100, stock: 0, minimumStock: 4, compatibleBikes: [{ brand: 'Hero', model: 'Splendor Plus' }], locations: [{ rack: 'A', shelf: '01', box: '02', quantity: 0 }] },
  { productCode: 'DEMO-SPK-004', name: 'Spark Plug', category: 'Electrical', manufacturer: 'Example Parts Co.', manufacturerPartNumber: 'EX-SPK-04', purchasePrice: 55, sellingPrice: 85, stock: 16, minimumStock: 5, compatibleBikes: [{ brand: 'Bajaj', model: 'Pulsar 150' }, { brand: 'TVS', model: 'Apache RTR 160' }], locations: [{ rack: 'D', shelf: '01', box: '02', quantity: 16 }] },
];
const statusOf = p => p.stock === 0 ? 'Out of stock' : p.stock <= p.minimumStock ? 'Low stock' : 'In stock';
const bikeLabel = b => [b.brand, b.model, b.variant].filter(Boolean).join(' ');
const locationLabel = locations => locations?.length ? locations.map(l => `Rack ${l.rack}${l.shelf ? ` · Shelf ${l.shelf}` : ''}${l.box ? ` · Box ${l.box}` : ''}${locations.length > 1 ? ` (${l.quantity} units)` : ''}`).join(' / ') : 'Location not set';

export default function App() {
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [metrics, setMetrics] = useState({ products: 0, units: 0, low: 0, out: 0 });
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  const loadMetrics = useCallback(async () => {
    try {
      const { data } = await api.get('/products/stats');
      setMetrics(data);
    } catch {
      // Keep dashboard available even if the stats endpoint isn't available yet.
    }
  }, []);

  const loadProducts = useCallback(async (search = query, status = statusFilter) => {
    setLoading(true); setApiError('');
    try {
      const params = { limit: 200 };
      if (search.trim()) params.q = search.trim();
      if (status === 'low') params.status = 'low-stock';
      if (status === 'out') params.status = 'out-of-stock';
      const { data } = await api.get('/products', { params });
      setProducts(data.products || []);
    } catch (error) {
      setApiError(error.response?.data?.message || 'Could not connect to the API. Start the backend and check MongoDB configuration.');
      setProducts([]);
    } finally { setLoading(false); }
  }, [query, statusFilter]);

  useEffect(() => { loadMetrics(); }, [loadMetrics]);
  useEffect(() => {
    const timer = setTimeout(() => loadProducts(query, statusFilter), 250);
    return () => clearTimeout(timer);
  }, [query, statusFilter, loadProducts]);

  async function createProduct(event) {
    event.preventDefault(); setSaving(true); setNotice('');
    const compatibleBikes = form.compatibleBikesText.split('\n').map(line => line.trim()).filter(Boolean).map(line => {
      const [brand = '', ...modelParts] = line.split(',');
      return { brand: brand.trim(), model: modelParts.join(',').trim() };
    }).filter(b => b.brand && b.model);
    const stock = Number(form.stock) || 0;
    const locations = form.rack.trim() ? [{ rack: form.rack.trim(), shelf: form.shelf.trim(), box: form.box.trim(), quantity: stock }] : [];
    const payload = { productCode: form.productCode.trim(), name: form.name.trim(), category: form.category.trim() || 'Other', manufacturer: form.manufacturer.trim(), manufacturerPartNumber: form.manufacturerPartNumber.trim(), purchasePrice: Number(form.purchasePrice) || 0, sellingPrice: Number(form.sellingPrice) || 0, stock, minimumStock: Number(form.minimumStock) || 0, compatibleBikes, locations };
    try {
      await api.post('/products', payload);
      setNotice('Product added successfully.'); setForm(emptyForm); setModalOpen(false); await loadProducts('', 'all'); await loadMetrics();
      setQuery(''); setStatusFilter('all');
    } catch (error) { setNotice(error.response?.data?.message || 'Could not save product. Check the API connection.'); }
    finally { setSaving(false); }
  }

  async function loadDemoProducts() {
    setNotice('');
    try {
      for (const product of demoProducts) {
        try { await api.post('/products', product); }
        catch (error) { if (error.response?.status !== 409) throw error; }
      }
      setNotice('Demo products added. Existing demo product codes were skipped.'); setQuery(''); setStatusFilter('all'); await loadProducts('', 'all'); await loadMetrics();
    } catch (error) { setNotice(error.response?.data?.message || 'Could not load demo products. Check the backend.'); }
  }

  return <div className="min-h-screen pb-24 md:pb-8">
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur"><div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6"><div className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white"><Bike size={23}/></div><div className="min-w-0"><p className="truncate text-base font-extrabold tracking-tight text-slate-900">Ajay BikeParts</p><p className="text-xs text-slate-500">Spare parts · Stock · Rack finder</p></div></div><button onClick={() => setModalOpen(true)} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"><Plus size={17}/><span className="hidden sm:inline">Add product</span><span className="sm:hidden">Add</span></button></div></header>

    <main className="mx-auto max-w-6xl space-y-6 px-4 py-5 sm:px-6 sm:py-8">
      <section className="overflow-hidden rounded-3xl bg-slate-900 p-5 text-white sm:p-8"><div className="max-w-2xl"><div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-200"><Search size={14}/> Mobile-first shop inventory</div><h1 className="text-2xl font-extrabold tracking-tight sm:text-4xl">Find the right part.<br className="hidden sm:block"/> Go straight to its rack.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">Search by bike name, spare-part name, or product code. Check stock and storage location before walking around the shop.</p></div><div className="mt-6 flex items-center gap-2 rounded-2xl bg-white p-2 shadow-lg"><Search className="ml-2 shrink-0 text-slate-500" size={21}/><input value={query} onChange={e => setQuery(e.target.value)} aria-label="Search bike model or spare part" placeholder="Try ‘Activa 6G’ or ‘Brake Shoe’" className="min-w-0 flex-1 border-0 bg-transparent px-1 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 sm:text-base"/><button onClick={() => setQuery('')} aria-label="Clear search" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X size={18}/></button></div><p className="mt-2 text-xs text-slate-400">Searches part names, product codes, manufacturer numbers, categories, and compatible bike models.</p></section>

      {apiError && <section className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">Backend connection needed</p><p className="mt-1">{apiError}</p></div><button onClick={() => {loadProducts();loadMetrics();}} className="inline-flex items-center justify-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-2 font-semibold"><RefreshCw size={15}/> Retry</button></section>}
      {notice && <div role="status" className="flex items-start justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900"><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss message"><X size={17}/></button></div>}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Metric icon={<Package size={19}/>} label="Product types" value={metrics.products.toLocaleString()} note="Distinct product codes"/><Metric icon={<Boxes size={19}/>} label="Units in stock" value={metrics.units.toLocaleString()} note="Across all products"/><Metric icon={<AlertTriangle size={19}/>} label="Low stock" value={metrics.low.toLocaleString()} note="At or below minimum"/><Metric icon={<CircleX size={19}/>} label="Out of stock" value={metrics.out.toLocaleString()} note="Needs restocking"/></section>

      <section className="space-y-4"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h2 className="text-xl font-extrabold text-slate-900">Spare parts inventory</h2><p className="mt-1 text-sm text-slate-500">{visibleCount(products)} result{visibleCount(products) === 1 ? '' : 's'} · check compatibility and rack location</p></div><div className="flex flex-wrap gap-2"><FilterButton active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>All parts</FilterButton><FilterButton active={statusFilter === 'low'} onClick={() => setStatusFilter('low')}>Low stock</FilterButton><FilterButton active={statusFilter === 'out'} onClick={() => setStatusFilter('out')}>Out of stock</FilterButton></div></div>
        {loading ? <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-12 text-sm text-slate-500"><LoaderCircle className="animate-spin" size={18}/> Searching inventory…</div> : products.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><Package size={23}/></div><h3 className="mt-4 font-bold text-slate-900">{query || statusFilter !== 'all' ? 'No matching spare parts' : 'Your inventory is ready to start'}</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{query || statusFilter !== 'all' ? 'Try another bike model or part name, or clear the stock filter.' : 'Add your first real product, or load clearly marked demo products to test the search.'}</p><div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row"><button onClick={() => setModalOpen(true)} className="rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700">Add first product</button><button onClick={loadDemoProducts} className="rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50">Load demo products</button></div></div> : <div className="grid gap-3 md:grid-cols-2">{products.map(product => <ProductCard key={product._id || product.productCode} product={product}/>)}</div>}
        {products.length > 0 && <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-slate-500">Demo product codes start with DEMO- and are examples only.</p><div className="flex gap-2"><button onClick={loadDemoProducts} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Load demo products</button><button onClick={() => {loadProducts();loadMetrics();}} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><RefreshCw size={13}/> Refresh</button></div></div>}
      </section><footer className="border-t border-slate-200 pt-4 text-center text-xs text-slate-500">Ajay BikeParts · Starter version · Verify compatibility before recommending parts</footer>
    </main>

    <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-3 border-t border-slate-200 bg-white px-2 pb-[env(safe-area-inset-bottom)] pt-2 md:hidden"><button onClick={() => {setStatusFilter('all');window.scrollTo({top:0,behavior:'smooth'});}} className="flex flex-col items-center gap-1 py-2 text-xs font-semibold text-blue-700"><Search size={19}/>Find parts</button><button onClick={() => {setStatusFilter('low');window.scrollTo({top:450,behavior:'smooth'});}} className="flex flex-col items-center gap-1 py-2 text-xs font-medium text-slate-600"><AlertTriangle size={19}/>Low stock</button><button onClick={() => setModalOpen(true)} className="flex flex-col items-center gap-1 py-2 text-xs font-medium text-slate-600"><Plus size={19}/>Add product</button></nav>

    {modalOpen && <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/50 sm:items-center sm:p-4" onMouseDown={e => {if(e.target === e.currentTarget) setModalOpen(false);}}><section role="dialog" aria-modal="true" aria-labelledby="add-product-title" className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-7"><div className="mb-5 flex items-start justify-between gap-3"><div><h2 id="add-product-title" className="text-xl font-extrabold text-slate-900">Add spare part</h2><p className="mt-1 text-sm text-slate-500">One product code, multiple compatible bikes, one shared stock count.</p></div><button onClick={() => setModalOpen(false)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100" aria-label="Close form"><X/></button></div><form onSubmit={createProduct} className="grid gap-4 sm:grid-cols-2">
      <Field label="Product code / SKU *"><input required value={form.productCode} onChange={e => setForm({...form,productCode:e.target.value})} placeholder="e.g. BRK-0001" className={inputClass}/></Field><Field label="Spare-part name *"><input required value={form.name} onChange={e => setForm({...form,name:e.target.value})} placeholder="e.g. Front Brake Shoe" className={inputClass}/></Field><Field label="Category"><input value={form.category} onChange={e => setForm({...form,category:e.target.value})} placeholder="Brakes, filters…" className={inputClass}/></Field><Field label="Manufacturer / brand"><input value={form.manufacturer} onChange={e => setForm({...form,manufacturer:e.target.value})} placeholder="Part manufacturer" className={inputClass}/></Field><Field label="Manufacturer part number"><input value={form.manufacturerPartNumber} onChange={e => setForm({...form,manufacturerPartNumber:e.target.value})} placeholder="Optional part number" className={inputClass}/></Field><Field label="Purchase price (₹)"><input type="number" min="0" step="0.01" value={form.purchasePrice} onChange={e => setForm({...form,purchasePrice:e.target.value})} className={inputClass}/></Field><Field label="Selling price (₹)"><input type="number" min="0" step="0.01" value={form.sellingPrice} onChange={e => setForm({...form,sellingPrice:e.target.value})} className={inputClass}/></Field><Field label="Opening stock *"><input required type="number" min="0" step="1" value={form.stock} onChange={e => setForm({...form,stock:e.target.value})} className={inputClass}/></Field><Field label="Minimum stock alert"><input type="number" min="0" step="1" value={form.minimumStock} onChange={e => setForm({...form,minimumStock:e.target.value})} className={inputClass}/></Field>
      <div className="sm:col-span-2"><Field label="Compatible bikes (one per line: Brand, Model)"><textarea rows="3" value={form.compatibleBikesText} onChange={e => setForm({...form,compatibleBikesText:e.target.value})} placeholder={'Honda, Activa 6G\nHonda, Activa 5G'} className={inputClass}/></Field><p className="mt-1 text-xs text-slate-500">Only enter models after verifying compatibility. Stock is shared across all compatible bikes.</p></div><div className="sm:col-span-2"><p className="mb-2 text-sm font-bold text-slate-800">Storage location</p><div className="grid grid-cols-3 gap-3"><Field label="Rack"><input value={form.rack} onChange={e => setForm({...form,rack:e.target.value})} placeholder="B" className={inputClass}/></Field><Field label="Shelf"><input value={form.shelf} onChange={e => setForm({...form,shelf:e.target.value})} placeholder="03" className={inputClass}/></Field><Field label="Box"><input value={form.box} onChange={e => setForm({...form,box:e.target.value})} placeholder="01" className={inputClass}/></Field></div></div><div className="sm:col-span-2 flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end"><button type="button" onClick={() => setModalOpen(false)} className="rounded-xl border border-slate-200 px-5 py-3 font-semibold text-slate-700">Cancel</button><button disabled={saving} type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white disabled:opacity-60">{saving && <LoaderCircle size={17} className="animate-spin"/>}{saving ? 'Saving…' : 'Save product'}</button></div>
    </form></section></div>}
  </div>;
}

function visibleCount(list) { return list.length; }
const inputClass = 'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100';
function Field({label,children}) { return <label className="block text-sm font-semibold text-slate-700">{label}{children}</label>; }
function FilterButton({active,onClick,children}) { return <button onClick={onClick} className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${active ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>{children}</button>; }
function Metric({icon,label,value,note}) { return <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold text-slate-500 sm:text-sm">{label}</span><span className="text-slate-400">{icon}</span></div><p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{value}</p><p className="mt-1 text-xs text-slate-500">{note}</p></article>; }
function ProductCard({product}) { const status = statusOf(product); const styles = status === 'In stock' ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' : status === 'Low stock' ? 'bg-amber-50 text-amber-800 ring-amber-600/20' : 'bg-rose-50 text-rose-700 ring-rose-600/20'; const bikes = (product.compatibleBikes || []).map(bikeLabel).filter(Boolean); return <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 sm:p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="break-words text-base font-bold text-slate-900">{product.name}</p><p className="mt-1 text-xs font-medium text-slate-500">{product.productCode}{product.manufacturer ? ` · ${product.manufacturer}` : ''}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${styles}`}>{status}</span></div><div className="mt-4 rounded-xl bg-slate-50 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Compatible bike models</p>{bikes.length ? <div className="mt-2 flex flex-wrap gap-1.5">{bikes.map((bike,index)=><span key={`${bike}-${index}`} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700">{bike}</span>)}</div> : <p className="mt-2 text-sm text-slate-500">Compatibility not entered — verify before recommending.</p>}</div><div className="mt-4 grid grid-cols-2 gap-3"><div><p className="text-xs text-slate-500">Available quantity</p><p className="mt-1 text-2xl font-extrabold text-slate-900">{product.stock}<span className="ml-1 text-xs font-medium text-slate-500">units</span></p><p className="mt-1 text-xs text-slate-500">Minimum: {product.minimumStock}</p></div><div><p className="text-xs text-slate-500">Selling price</p><p className="mt-1 text-xl font-bold text-slate-900">₹{Number(product.sellingPrice || 0).toLocaleString('en-IN')}</p><p className="mt-1 text-xs text-slate-500">{product.category || 'Other'}</p></div></div><div className="mt-4 flex items-start gap-2 border-t border-slate-100 pt-3"><MapPin size={17} className="mt-0.5 shrink-0 text-blue-600"/><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Rack location</p><p className="mt-1 text-sm font-bold text-slate-900">{locationLabel(product.locations)}</p></div></div></article>; }
