console.log("APP FINAL PRO ÇALIŞIYOR");

// --------------------------------------------------
// IMPORTLAR
// --------------------------------------------------
import {
  auth,
  provider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  db,
  storage,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  ref,
  uploadBytes,
  getDownloadURL
} from "./firebase.js";

// --------------------------------------------------
// GLOBAL STATE
// --------------------------------------------------
let photoURLs = [];
let editingID = null;

let allFiles = [];
let leftFiles = [];
let rightFiles = [];

// --------------------------------------------------
// AUTH
// --------------------------------------------------
const btnSignIn = document.getElementById("btnSignIn");
const btnSignOut = document.getElementById("btnSignOut");
const envPill = document.getElementById("envPill");

btnSignIn.addEventListener("click", () => signInWithPopup(auth, provider));
btnSignOut.addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, (user) => {
  if (user) {
    envPill.textContent = "Giriş: " + user.displayName;
    btnSignIn.style.display = "none";
    btnSignOut.style.display = "inline-block";
  } else {
    envPill.textContent = "Giriş yapılmadı";
    btnSignIn.style.display = "inline-block";
    btnSignOut.style.display = "none";
  }
});

// --------------------------------------------------
// FORM ALANLARI
// --------------------------------------------------
const fPlate     = document.getElementById("fPlate");
const fFileNo    = document.getElementById("fFileNo");
const fPolicy    = document.getElementById("fPolicy");
const fCustomer  = document.getElementById("fCustomer");
const fTC        = document.getElementById("fTC");
const fPhone     = document.getElementById("fPhone");
const fCarModel  = document.getElementById("fCarModel");
const fInsurance = document.getElementById("fInsurance");
const fBranch    = document.getElementById("fBranch");
const fExpert    = document.getElementById("fExpert");
const fWorker    = document.getElementById("fWorker");
const fDelivery  = document.getElementById("fDelivery");
const fStatus    = document.getElementById("fStatus");
const fNotes     = document.getElementById("fNotes");

const photoUpload = document.getElementById("photoUpload");
const photoGrid   = document.getElementById("photoGrid");
const sendWhatsappBtn = document.getElementById("sendWhatsappBtn");


// --------------------------------------------------
// FOTOĞRAF YÜKLEME
// --------------------------------------------------
photoUpload.addEventListener("change", async (e) => {
  const files = e.target.files;

  for (let file of files) {
    const storageRef = ref(storage, `photos/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);

    photoURLs.push(url);
    addPhoto(url);
  }
});

// --------------------------------------------------
// FOTOĞRAF KARTI OLUŞTURMA
// --------------------------------------------------
function addPhoto(url) {
  const index = photoURLs.length - 1;

  const div = document.createElement("div");
  div.classList.add("photo-card");
  div.draggable = true;

  div.innerHTML = `
    <img src="${url}" class="thumb">
    <button class="delete-photo">×</button>
  `;

  // Thumbnail → Lightbox Aç
  div.querySelector("img").addEventListener("click", () => openGallery(index));

  // Fotoğraf Silme
  div.querySelector(".delete-photo").addEventListener("click", (e) => {
    e.stopPropagation();

    photoURLs.splice(index, 1);
    div.remove();
    refreshDragIndexes();
  });

  // Drag start
  div.addEventListener("dragstart", () => {
    div.classList.add("dragging");
  });

  // Drag end (sıralama kaydet)
  div.addEventListener("dragend", () => {
    div.classList.remove("dragging");

    const newOrder = [];
    document.querySelectorAll(".photo-card img").forEach((img) => {
      newOrder.push(img.src);
    });

    photoURLs = newOrder;
  });

  photoGrid.appendChild(div);
}

function refreshDragIndexes() {
  photoGrid.innerHTML = "";
  photoURLs.forEach((url) => addPhoto(url));
}

// --------------------------------------------------
// LIGHTBOX
// --------------------------------------------------
const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightboxImg");
const lightboxPrev = document.getElementById("lightboxPrev");
const lightboxNext = document.getElementById("lightboxNext");
const lightboxClose = document.getElementById("lightboxClose");

let galleryIndex = 0;
let zoomLevel = 1;

function openGallery(i) {
  galleryIndex = i;
  zoomLevel = 1;

  lightboxImg.src = photoURLs[i];
  lightboxImg.style.transform = "scale(1)";
  lightbox.classList.add("show");
}

lightboxClose.addEventListener("click", () => lightbox.classList.remove("show"));

lightboxPrev.addEventListener("click", () => {
  galleryIndex = (galleryIndex - 1 + photoURLs.length) % photoURLs.length;
  lightboxImg.src = photoURLs[galleryIndex];
});

lightboxNext.addEventListener("click", () => {
  galleryIndex = (galleryIndex + 1) % photoURLs.length;
  lightboxImg.src = photoURLs[galleryIndex];
});

lightboxImg.addEventListener("wheel", (e) => {
  e.preventDefault();

  zoomLevel += e.deltaY * -0.002;
  zoomLevel = Math.min(Math.max(zoomLevel, 1), 3);

  lightboxImg.style.transform = `scale(${zoomLevel})`;
});

// --------------------------------------------------
// WHATSAPP TOPLU FOTO GÖNDERME
// --------------------------------------------------
sendWhatsappBtn.addEventListener("click", () => {
  if (photoURLs.length === 0) {
    return alert("Gönderilecek fotoğraf yok!");
  }

  const message =
    "Sigorta Dosya Fotoğrafları:\n\n" + photoURLs.join("\n");

  const url = "https://wa.me/?text=" + encodeURIComponent(message);

  window.open(url, "_blank");
});


// --------------------------------------------------
// KAYDET
// --------------------------------------------------
document.getElementById("saveBtn").addEventListener("click", async () => {
  const data = {
    plaka: fPlate.value,
    dosyaNo: fFileNo.value,
    police: fPolicy.value,
    musteri: fCustomer.value,
    tc: fTC.value,
    telefon: fPhone.value,
    arac: fCarModel.value,
    sigorta: fInsurance.value,
    sube: fBranch.value,
    eksper: fExpert.value,
    yapan: fWorker.value,
    teslim: fDelivery.value,
    durum: fStatus.value,
    notlar: fNotes.value,
    fotolar: photoURLs,
    tarih: new Date().toLocaleString("tr-TR")
  };

  if (editingID) {
    await updateDoc(doc(db, "dosyalar", editingID), data);
    alert("Kayıt güncellendi!");
  } else {
    await addDoc(collection(db, "dosyalar"), data);
    alert("Kayıt eklendi!");
  }

  clearForm();
  loadFiles();
});

// --------------------------------------------------
// FORM TEMİZLE
// --------------------------------------------------
function clearForm() {
  editingID = null;

  fPlate.value = "";
  fFileNo.value = "";
  fPolicy.value = "";
  fCustomer.value = "";
  fTC.value = "";
  fPhone.value = "";
  fCarModel.value = "";
  fInsurance.value = "";
  fBranch.value = "Aykut Polat Özel Servis";
  fExpert.value = "";
  fWorker.value = "";
  fDelivery.value = "";
  fStatus.value = "Parça Bekliyor";
  fNotes.value = "";

  photoGrid.innerHTML = "";
  photoUpload.value = "";
  photoURLs = [];
}

document.getElementById("newBtn").addEventListener("click", clearForm);

// --------------------------------------------------
// SİLME
// --------------------------------------------------
document.getElementById("deleteBtn").addEventListener("click", async () => {
  if (!editingID) return alert("Silmek için önce bir dosya seç!");

  if (!confirm("Bu dosya silinsin mi?")) return;

  await deleteDoc(doc(db, "dosyalar", editingID));

  alert("Dosya silindi!");

  clearForm();
  loadFiles();
});

// --------------------------------------------------
// LİSTELEME
// --------------------------------------------------
async function loadFiles() {
  const snap = await getDocs(collection(db, "dosyalar"));

  allFiles = [];
  leftFiles = [];
  rightFiles = [];

  snap.forEach((docSnap) => {
    let d = docSnap.data();
    let id = docSnap.id;

    let full = { id, ...d };

    allFiles.push(full);

    if (d.sube === "Aykut Polat Özel Servis") leftFiles.push(full);
    else rightFiles.push(full);
  });

  renderLeftList(leftFiles);
  renderRightList(rightFiles);
}

// --------------------------------------------------
// LİSTE OLUŞTURMA
// --------------------------------------------------
function renderLeftList(list) {
  const div = document.getElementById("leftList");
  div.innerHTML = "";

  list.forEach((file) => {
    div.appendChild(createListItem(file));
  });
}

function renderRightList(list) {
  const div = document.getElementById("rightList");
  div.innerHTML = "";

  list.forEach((file) => {
    div.appendChild(createListItem(file));
  });
}

function createListItem(file) {
  const item = document.createElement("div");
  item.className = "plate-item";

  item.innerHTML = `
    <strong>${file.plaka}</strong>
    <small>${file.musteri}</small>
    <span>${file.durum}</span>
  `;

  item.addEventListener("click", () => fillForm(file));

  return item;
}

// --------------------------------------------------
// FORM DOLDURMA
// --------------------------------------------------
function fillForm(file) {
  editingID = file.id;

  fPlate.value = file.plaka;
  fFileNo.value = file.dosyaNo;
  fPolicy.value = file.police;
  fCustomer.value = file.musteri;
  fTC.value = file.tc;
  fPhone.value = file.telefon;
  fCarModel.value = file.arac;
  fInsurance.value = file.sigorta;
  fBranch.value = file.sube;
  fExpert.value = file.eksper ?? "";
  fWorker.value = file.yapan;
  fDelivery.value = file.teslim;
  fStatus.value = file.durum;
  fNotes.value = file.notlar;

  photoGrid.innerHTML = "";
  photoURLs = file.fotolar || [];
  photoURLs.forEach(addPhoto);
}

// --------------------------------------------------
// ARAMA SİSTEMİ
// --------------------------------------------------
const searchInput = document.getElementById("searchInput");
const rightSearch = document.getElementById("rightSearch");

// SOL ARAMA
searchInput.addEventListener("input", () => {
  const q = searchInput.value.toLowerCase();

  const filtered = leftFiles.filter(f =>
    f.plaka.toLowerCase().includes(q) ||
    (f.musteri ?? "").toLowerCase().includes(q) ||
    (f.dosyaNo ?? "").toLowerCase().includes(q)
  );

  renderLeftList(filtered);
});

// SAĞ ARAMA
rightSearch.addEventListener("input", () => {
  const q = rightSearch.value.toLowerCase();

  const filtered = rightFiles.filter(f =>
    f.plaka.toLowerCase().includes(q) ||
    (f.musteri ?? "").toLowerCase().includes(q) ||
    (f.dosyaNo ?? "").toLowerCase().includes(q)
  );

  renderRightList(filtered);
});

// --------------------------------------------------
// EXCEL EXPORT
// --------------------------------------------------
document.getElementById("exportBtn").addEventListener("click", async () => {
  const snap = await getDocs(collection(db, "dosyalar"));

  const rows = [];

  snap.forEach((docSnap) => {
    const d = docSnap.data();

    rows.push({
      Plaka: d.plaka,
      DosyaNo: d.dosyaNo,
      Poliçe: d.police,
      Müşteri: d.musteri,
      TC: d.tc,
      Telefon: d.telefon,
      Araç: d.arac,
      Sigorta: d.sigorta,
      Şube: d.sube,
      Eksper: d.eksper ?? "",
      Yapan: d.yapan,
      Teslim: d.teslim,
      Durum: d.durum,
      Notlar: d.notlar,
      Fotoğraf: d.fotolar?.length || 0,
      Tarih: d.tarih
    });
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Dosyalar");
  XLSX.writeFile(wb, "sigorta_dosyalar.xlsx");

  alert("Excel başarıyla indirildi!");
});

// --------------------------------------------------
// BAŞLAT
// --------------------------------------------------
loadFiles();
