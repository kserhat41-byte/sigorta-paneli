// app.js - IndexedDB based offline sigorta panel (final)
const DB_NAME = 'sigorta_panel_db_v2';
const DB_VERSION = 1;
let db;

function openDB(){
  return new Promise((res, rej)=>{
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e)=>{
      const idb = e.target.result;
      if(!idb.objectStoreNames.contains('items')){
        const s = idb.createObjectStore('items', { keyPath: 'id' });
        s.createIndex('plaka','plaka',{unique:false});
        s.createIndex('updatedAt','updatedAt',{unique:false});
      }
      if(!idb.objectStoreNames.contains('photos')){
        const p = idb.createObjectStore('photos', { keyPath: 'id' });
        p.createIndex('itemId','itemId',{unique:false});
      }
    };
    req.onsuccess = ()=>{ db = req.result; res(db); };
    req.onerror = ()=> rej(req.error);
  });
}

function idbPut(store, val){
  return new Promise((res, rej)=>{
    const tx = db.transaction(store, 'readwrite');
    const s = tx.objectStore(store);
    const r = s.put(val);
    r.onsuccess = ()=> res(r.result);
    r.onerror = ()=> rej(r.error);
  });
}
function idbGet(store, key){
  return new Promise((res, rej)=>{
    const tx = db.transaction(store,'readonly');
    const s = tx.objectStore(store);
    const r = s.get(key);
    r.onsuccess = ()=> res(r.result);
    r.onerror = ()=> rej(r.error);
  });
}
function idbGetAll(store){
  return new Promise((res, rej)=>{
    const tx = db.transaction(store,'readonly');
    const s = tx.objectStore(store);
    const r = s.getAll();
    r.onsuccess = ()=> res(r.result);
    r.onerror = ()=> rej(r.error);
  });
}
function idbDelete(store, key){
  return new Promise((res, rej)=>{
    const tx = db.transaction(store,'readwrite');
    const s = tx.objectStore(store);
    const r = s.delete(key);
    r.onsuccess = ()=> res();
    r.onerror = ()=> rej(r.error);
  });
}

function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }
function qs(s){ return document.querySelector(s); }

const listEl = qs('#list');
const newBtn = qs('#newBtn');
const searchInput = qs('#search');
const placeholder = qs('#placeholder');
const editor = qs('#editor');
const plateTitle = qs('#plateTitle');
const metaInfo = qs('#metaInfo');
const statusSelect = qs('#statusSelect');
const plakaEl = qs('#plaka');
const dosyaNoEl = qs('#dosyaNo');
const policeNoEl = qs('#policeNo');
const musteriEl = qs('#musteri');
const tcEl = qs('#tcNo');
const telefonEl = qs('#telefon');
const carEl = qs('#car');
const sigortaEl = qs('#sigorta');
const authorEl = qs('#author');
const expertEl = qs('#expert');
const teslimEl = qs('#eta');
const fileInput = qs('#fileInput');
const photoGrid = qs('#photoGrid');
const notlarEl = qs('#notlar');
const saveBtn = qs('#saveBtn');
const editBtn = qs('#editBtn');
const deleteBtn = qs('#deleteBtn');
const backBtn = qs('#backBtn');
const exportBtn = qs('#exportBtn');
const importBtn = qs('#importBtn');
const importFile = qs('#importFile');

let items = [];
let selectedId = null;

async function loadAll(){
  items = await idbGetAll('items');
  items.sort((a,b)=> (b.updatedAt||b.createdAt) - (a.updatedAt||a.createdAt));
  renderList();
}

function renderList(filter=''){
  listEl.innerHTML='';
  const q = (filter||'').toLowerCase();
  items.forEach(it=>{
    if(q){
      const ok = (it.plaka||'').toLowerCase().includes(q) || (it.dosyaNo||'').toLowerCase().includes(q) || (it.musteri||'').toLowerCase().includes(q);
      if(!ok) return;
    }
    const d = document.createElement('div');
    d.className='item';
    d.dataset.id = it.id;
    d.innerHTML = `<div class="item-title">${it.plaka||'—'}</div><div class="muted small">${it.dosyaNo||''} • ${it.musteri||''}</div><div class="muted small">${it.durum||''}</div>`;
    d.addEventListener('click', ()=> openItem(it.id));
    listEl.appendChild(d);
  });
}

async function openItem(id){
  selectedId = id;
  const it = await idbGet('items', id);
  if(!it) return alert('Kayıt bulunamadı');
  placeholder.classList.add('hidden'); editor.classList.remove('hidden');
  plateTitle.textContent = it.plaka || 'PLAKA';
  metaInfo.textContent = `Dosya: ${it.dosyaNo||'-'} • ${it.musteri||'-'}`;
  statusSelect.value = it.durum || 'Parça Bekliyor';
  plakaEl.value = it.plaka||''; dosyaNoEl.value = it.dosyaNo||''; policeNoEl.value = it.policeNo||''; musteriEl.value = it.musteri||'';
  tcEl.value = it.tcNo||''; telefonEl.value = it.telefon||''; carEl.value = it.car||''; sigortaEl.value = it.sigorta||'';
  authorEl.value = it.author||''; expertEl.value = it.expert||''; teslimEl.value = it.eta||'';
  notlarEl.value = it.notlar||'';
  const allPhotos = await idbGetAll('photos');
  const photos = allPhotos.filter(p=> p.itemId === id);
  renderPhotos(photos);
}

function renderPhotos(photos){
  photoGrid.innerHTML='';
  photos.forEach(p=>{
    const img = document.createElement('img');
    const url = URL.createObjectURL(p.blob);
    img.src = url; img.title = p.name || '';
    img.addEventListener('click', ()=> {
      const w = window.open(''); w.document.write('<img src="'+url+'" style="max-width:100%;">');
    });
    img.addEventListener('contextmenu', async (e)=>{
      e.preventDefault();
      if(!confirm('Bu fotoğrafı silmek istiyor musunuz?')) return;
      try{ await idbDelete('photos', p.id); await loadAll(); await openItem(selectedId); }catch(err){ alert('Fotoğraf silinemedi: '+err.message) }
    });
    photoGrid.appendChild(img);
  });
}

async function createNew(){
  const id = uid(); const now = Date.now();
  const it = { id, plaka:'PLAKA', dosyaNo:'', policeNo:'', musteri:'', tcNo:'', telefon:'', car:'', sigorta:'', author:'', expert:'', eta:'', link:'', durum:'Parça Bekliyor', notlar:'', createdAt:now, updatedAt:now };
  await idbPut('items', it); await loadAll(); openItem(id);
}

async function saveCurrent(){
  if(!selectedId) return alert('Önce kayıt seçin.');
  try{
    const it = await idbGet('items', selectedId);
    it.plaka = plakaEl.value.trim(); it.dosyaNo = dosyaNoEl.value.trim(); it.policeNo = policeNoEl.value.trim();
    it.musteri = musteriEl.value.trim(); it.tcNo = tcEl.value.trim(); it.telefon = telefonEl.value.trim();
    it.car = carEl.value.trim(); it.sigorta = sigortaEl.value.trim(); it.author = authorEl.value.trim();
    it.expert = expertEl.value.trim(); it.eta = teslimEl.value || ''; it.durum = statusSelect.value || '';
    it.notlar = notlarEl.value || ''; it.updatedAt = Date.now();
    await idbPut('items', it);
    await loadAll();
    alert('Kayıt gerçekten kaydedildi.');
  }catch(err){ alert('Kaydedilemedi: '+err.message) }
}

async function deleteCurrent(){
  if(!selectedId) return alert('Önce kayıt seçin.');
  if(!confirm('Bu kaydı silmek istediğine emin misin?')) return;
  const allPhotos = await idbGetAll('photos'); const photos = allPhotos.filter(p=> p.itemId === selectedId);
  for(const p of photos) await idbDelete('photos', p.id);
  await idbDelete('items', selectedId);
  selectedId = null; editor.classList.add('hidden'); placeholder.classList.remove('hidden'); await loadAll();
}

fileInput.addEventListener('change', async (e)=>{
  if(!selectedId) return alert('Önce kayıt seçin.');
  const files = Array.from(e.target.files || []);
  for(const f of files){
    try{
      const blob = f.slice(0,f.size,f.type);
      const photo = { id: uid(), itemId: selectedId, name: f.name, size: f.size, type: f.type, blob };
      await idbPut('photos', photo);
    }catch(err){ console.error(err); alert('Fotoğraf eklenemedi: '+err.message) }
  }
  await loadAll(); await openItem(selectedId); fileInput.value='';
});

exportBtn.addEventListener('click', async ()=>{
  try{
    const allItems = await idbGetAll('items');
    const allPhotos = await idbGetAll('photos');
    const photosConverted = [];
    for(const p of allPhotos){
      const dataUrl = await blobToDataURL(p.blob);
      photosConverted.push({ id: p.id, itemId: p.itemId, name: p.name, type: p.type, data: dataUrl });
    }
    const out = { items: allItems, photos: photosConverted, exportedAt: Date.now() };
    const blob = new Blob([JSON.stringify(out)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'sigorta_backup_'+new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')+'.json'; a.click();
    URL.revokeObjectURL(url);
  }catch(err){ alert('Yedek alınamadı: '+err.message) }
});

importBtn.addEventListener('click', ()=> importFile.click());
importFile.addEventListener('change', async (e)=>{
  const f = e.target.files[0]; if(!f) return;
  try{
    const text = await f.text(); const parsed = JSON.parse(text); if(!parsed.items) return alert('Geçersiz yedek dosyası');
    for(const it of parsed.items) await idbPut('items', it);
    for(const p of (parsed.photos || [])){
      const blob = dataURLToBlob(p.data);
      await idbPut('photos', { id: p.id, itemId: p.itemId, name: p.name, type: p.type, blob });
    }
    await loadAll(); alert('Yedek yüklendi.');
  }catch(err){ alert('Yedek yüklenemedi: '+err.message) }
  importFile.value='';
});

function blobToDataURL(blob){ return new Promise((res, rej)=>{ const reader = new FileReader(); reader.onload = ()=> res(reader.result); reader.onerror = ()=> rej(reader.error); reader.readAsDataURL(blob); }); }
function dataURLToBlob(dataurl){ const arr = dataurl.split(','); const mime = arr[0].match(/:(.*?);/)[1]; const bstr = atob(arr[1]); let n = bstr.length; const u8 = new Uint8Array(n); while(n--) u8[n] = bstr.charCodeAt(n); return new Blob([u8], {type:mime}); }

newBtn.addEventListener('click', ()=> createNew());
saveBtn.addEventListener('click', ()=> saveCurrent());
editBtn.addEventListener('click', ()=> { alert('Alanları düzenleyip ardından Kaydet butonuna basın.'); });
deleteBtn.addEventListener('click', ()=> deleteCurrent());
backBtn.addEventListener('click', ()=> { editor.classList.add('hidden'); placeholder.classList.remove('hidden'); selectedId=null; });
searchInput.addEventListener('input', (e)=> renderList(e.target.value));

(async ()=>{ try{ await openDB(); await loadAll(); const all = await idbGetAll('items'); if(all.length===0){ const id=uid(), now=Date.now(); const it = { id, plaka:'34ABC123', dosyaNo:'S-2025-001', policeNo:'POL-998877', musteri:'Ahmet Yılmaz', tcNo:'', telefon:'05321234567', car:'Fiat Egea', sigorta:'X Sigorta', author:'Mehmet', expert:'Eksper A', eta:'2025-11-10', link:'', durum:'Parça Bekliyor', notlar:'Ön kaput - göçük - boyasız düzeltme önerildi.', createdAt:now, updatedAt:now }; await idbPut('items', it); await loadAll(); openItem(id); } }catch(err){ alert('IndexedDB açılamadı: '+err.message) } })();
