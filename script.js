// =========================================================
// SMANTAS CBT - UNIFIED ENGINE (GITHUB PAGES READY, 1000+ USERS)
// =========================================================

function uiLoading(show, text = "Memproses...") {
  let elText = document.getElementById('loading-text');
  let elOverlay = document.getElementById('loading-overlay');
  if (elText) elText.innerText = text;
  if (elOverlay) elOverlay.classList.toggle('hidden', !show);
}

const DB = {
  get(key, defaultVal = []) {
    let d = localStorage.getItem('cbt_' + key);
    return d ? JSON.parse(d) : defaultVal;
  },
  set(key, val) { 
    localStorage.setItem('cbt_' + key, JSON.stringify(val)); 
  },
  initLocal() {
    if (!localStorage.getItem('cbt_adminPass')) localStorage.setItem('cbt_adminPass', 'admin37');
    if (!localStorage.getItem('cbt_adminUser')) localStorage.setItem('cbt_adminUser', 'admin');
    if (!localStorage.getItem('cbt_mapel')) this.set('mapel', ['Biologi', 'Matematika', 'Fisika', 'Kimia']);
    if (!localStorage.getItem('cbt_kelas')) this.set('kelas', ['X IPA 1', 'X IPA 2', 'XI IPA 1']);
    if (!localStorage.getItem('cbt_siswa')) this.set('siswa', [
      { nama: 'Siswa Contoh 1', kelas: 'X IPA 1', user: 'siswa1', pass: '123456' },
      { nama: 'Siswa Contoh 2', kelas: 'X IPA 1', user: 'siswa2', pass: '123456' }
    ]);
    if (!localStorage.getItem('cbt_ujian')) this.set('ujian', []);
    if (!localStorage.getItem('cbt_soal')) this.set('soal', []);
    if (!localStorage.getItem('cbt_sesi')) this.set('sesi', []);
  }
};
DB.initLocal();

// FORMAT GAMBAR & TAG HTML DALAM TEKS SOAL/JAWABAN (Regex diperbaiki)
function formatTextWithImages(str) {
  if (!str) return '';
  let text = String(str);
  text = text.replace(/\[(img\vert{}gambar)\](.*?)\[\/\1\]/gi, (match, tag, url) => {
    return `<img src="${url.trim()}" class="max-w-full h-auto rounded-lg my-2 border shadow-sm block max-h-80 object-contain mx-auto" alt="Gambar Soal">`;
  });
  text = text.replace(/<v:imagedata[^>]*src=["']([^"']+)["'][^>]*>/gi, (match, src) => {
    return `<img src="${src.trim()}" class="max-w-full h-auto rounded-lg my-2 border shadow-sm block max-h-80 object-contain mx-auto" alt="Gambar Word">`;
  });
  let trimmed = text.trim();
  if (!trimmed.startsWith('<img') && !trimmed.includes('[img]') && !trimmed.includes('[gambar]')) {
    if (/^data:image\/[a-zA-Z]+;base64,/i.test(trimmed) || /^https?:\/\/\S+\.(png|jpg|jpeg|gif|webp|svg)(\?\S*)?$/i.test(trimmed)) {
      text = `<img src="${trimmed}" class="max-w-full h-auto rounded-lg my-2 border shadow-sm block max-h-80 object-contain mx-auto" alt="Gambar">`;
    }
  }
  return text;
}

// DOWNLOAD TEMPLATE EXCEL SISWA
function downloadTemplateSiswa() {
  let data = [
    ["Nama Lengkap", "Kelas", "Username", "Password"],
    ["Ahmad Fauzi", "X IPA 1", "ahmad", "123456"],
    ["Siti Rahma", "X IPA 1", "siti", "123456"]
  ];
  let ws = XLSX.utils.aoa_to_sheet(data);
  let wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Format Siswa");
  XLSX.writeFile(wb, "Template_Form_Siswa.xlsx");
}

// DOWNLOAD TEMPLATE SOAL (WORD / HTML)
function downloadTemplateSoal() {
  let header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Template Soal CBT</title></head><body>";
  let footer = "</body></html>";
  let tableRows = "";
  
  for (let i = 1; i <= 5; i++) {
    let isEx = (i === 1);
    tableRows += `
      <tr style="background-color: #f2f4f8; font-weight: bold;">
        <td style="padding: 8px; border: 1px solid #ccc; text-align: center; width: 10%;">${i}</td>
        <td style="padding: 8px; border: 1px solid #ccc; width: 75%;">${isEx ? "Contoh Pertanyaan: Berapakah hasil dari 2 + 2? [img]https://via.placeholder.com/150[/img]" : ""}</td>
        <td style="padding: 8px; border: 1px solid #ccc; text-align: center; width: 15%; color: #2563eb;">${isEx ? "C" : ""}</td>
      </tr>
      <tr><td style="padding: 6px; border: 1px solid #ccc; text-align: center; font-weight: bold; background: #fafafa;">A</td><td colspan="2" style="padding: 6px 8px; border: 1px solid #ccc;">${isEx ? "2" : ""}</td></tr>
      <tr><td style="padding: 6px; border: 1px solid #ccc; text-align: center; font-weight: bold; background: #fafafa;">B</td><td colspan="2" style="padding: 6px 8px; border: 1px solid #ccc;">${isEx ? "3" : ""}</td></tr>
      <tr><td style="padding: 6px; border: 1px solid #ccc; text-align: center; font-weight: bold; background: #fafafa;">C</td><td colspan="2" style="padding: 6px 8px; border: 1px solid #ccc;">${isEx ? "4" : ""}</td></tr>
      <tr><td style="padding: 6px; border: 1px solid #ccc; text-align: center; font-weight: bold; background: #fafafa;">D</td><td colspan="2" style="padding: 6px 8px; border: 1px solid #ccc;">${isEx ? "5" : ""}</td></tr>
      <tr><td style="padding: 6px; border: 1px solid #ccc; text-align: center; font-weight: bold; background: #fafafa;">E</td><td colspan="2" style="padding: 6px 8px; border: 1px solid #ccc;">${isEx ? "6" : ""}</td></tr>
    `;
  }

  let sourceHTML = header + "<h2 style='color:#1e3a8a;'>Template Form Soal CBT</h2><table border='1' style='border-collapse: collapse; width:100%; font-family:Arial; font-size:13px;'><thead style='background:#2563eb; color:#fff;'><tr><th>No / Opsi</th><th>Pertanyaan / Pilihan Jawaban</th><th>Kunci</th></tr></thead><tbody>" + tableRows + "</tbody></table>" + footer;
  let blob = new Blob(['\ufeff', sourceHTML], { type: 'application/msword' });
  let url = URL.createObjectURL(blob);
  let downloadLink = document.createElement("a");
  downloadLink.href = url;
  downloadLink.download = 'Template_Soal_CBT.doc';
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}

// STATE VARIABELS
let currentUser = {}; 
let currentTest = {}; 
let soalData = [];
let currentIndex = 0; 
let jawabanSiswa = {}; 
let timerInterval;
let currentEndTime = null; 
let cheatDetectionActive = false; 
let isUjianSelesai = false;

document.addEventListener("DOMContentLoaded", () => {
    let logged = sessionStorage.getItem('cbt_loggedUser');
    if (logged) {
        currentUser = JSON.parse(logged);
        if (currentUser.role === 'ADMIN') {
            if(document.getElementById('view-admin')) {
                showView('view-admin');
                muatPengaturan();
                loadTabelSiswa();
                loadLiveMonitor();
                loadSelectUjianAdminSoal();
            }
        } else {
            if(document.getElementById('profil-nama')) {
                document.getElementById('profil-nama').innerText = currentUser.nama;
                document.getElementById('profil-kelas').innerText = currentUser.kelas;
            }
            if(document.getElementById('view-siswa')) {
                showView('view-siswa');
                loadDaftarTesSiswa();
            }
        }
    }

    // Inisialisasi Halaman Ujian
    let activeExam = sessionStorage.getItem('cbt_activeExam');
    if (activeExam && document.getElementById('engine-ujian')) {
        let examData = JSON.parse(activeExam);
        currentTest = examData.currentTest;
        soalData = examData.soalData;
        jawabanSiswa = examData.jawabanSiswa;
        currentIndex = examData.currentIndex || 0;
        currentEndTime = examData.endTime;
        
        let elMapel = document.getElementById('uji-mapel');
        if(elMapel) elMapel.innerText = currentTest.mapel + " - " + currentTest.judul;
        
        renderTampilanSoalSingle();
        lanjutkanTimer(currentEndTime);
        setTimeout(() => { cheatDetectionActive = true; }, 3000);
    }

    // Inisialisasi Halaman Selesai
    let lastResult = sessionStorage.getItem('cbt_lastResult');
    if (lastResult && document.getElementById('hasil-status')) {
        let res = JSON.parse(lastResult);
        document.getElementById('hasil-status').innerText = res.status || 'UJIAN SELESAI';
        document.getElementById('hasil-msg').innerText = "Nilai akhir Anda berhasil direkam.";
        document.getElementById('hasil-nilai').innerText = res.nilai ?? '0';
    }
});

// LOGIN & NAVIGASI VIEW
function setRole(role) {
  let roleInput = document.getElementById('login-role');
  let btnSiswa = document.getElementById('btn-Siswa');
  let btnAdmin = document.getElementById('btn-Admin');
  if(roleInput) roleInput.value = role;
  if(btnSiswa) btnSiswa.className = role === 'SISWA' ? 'w-1/2 py-2.5 bg-blue-600 text-white rounded-lg font-bold text-xs sm:text-sm shadow-sm transition' : 'w-1/2 py-2.5 text-gray-600 rounded-lg font-bold text-xs sm:text-sm transition';
  if(btnAdmin) btnAdmin.className = role === 'ADMIN' ? 'w-1/2 py-2.5 bg-blue-600 text-white rounded-lg font-bold text-xs sm:text-sm shadow-sm transition' : 'w-1/2 py-2.5 text-gray-600 rounded-lg font-bold text-xs sm:text-sm transition';
}

function showView(id) {
  ['view-login', 'view-admin', 'view-siswa', 'engine-ujian', 'view-hasil'].forEach(el => {
    let node = document.getElementById(el);
    if(node) node.classList.add('hidden');
  });
  let target = document.getElementById(id);
  if(target) {
    target.classList.remove('hidden');
    if (id === 'view-siswa') {
      target.style.display = 'flex';
      let dash = document.getElementById('siswa-dashboard');
      if (dash) dash.classList.remove('hidden');
    }
  }
}

function prosesLogin() {
  let u = document.getElementById('username').value.trim();
  let p = document.getElementById('password').value.trim();
  let r = document.getElementById('login-role').value;
  if(!u || !p) return alert("Harap isi username dan password.");

  if (r === 'ADMIN') {
    let adminU = localStorage.getItem('cbt_adminUser'); 
    let adminP = localStorage.getItem('cbt_adminPass');
    if (u === adminU && p === adminP) {
      currentUser = { nama: 'Administrator', role: 'ADMIN' };
      sessionStorage.setItem('cbt_loggedUser', JSON.stringify(currentUser));
      showView('view-admin'); muatPengaturan(); loadTabelSiswa(); loadLiveMonitor(); loadSelectUjianAdminSoal();
    } else { alert("Username atau Password Admin salah!"); }
  } else {
    let daftarSiswa = DB.get('siswa');
    let s = daftarSiswa.find(x => x.user === u && x.pass === p);
    if (s) {
      currentUser = { nama: s.nama, kelas: s.kelas, username: s.user };
      sessionStorage.setItem('cbt_loggedUser', JSON.stringify(currentUser));
      showView('view-siswa'); loadDaftarTesSiswa();
    } else { alert("Username atau Password Siswa salah!"); }
  }
}

function logout() {
  sessionStorage.clear();
  currentUser = {}; currentTest = {}; jawabanSiswa = {};
  currentIndex = 0; isUjianSelesai = false; cheatDetectionActive = false;
  window.location.href = 'index.html';
}

function switchAdminTab(tabId, btn) {
  document.querySelectorAll('.admin-tab-content').forEach(el => el.classList.add('hidden'));
  let targetTab = document.getElementById(tabId);
  if(targetTab) targetTab.classList.remove('hidden');
  document.querySelectorAll('.tab-btn').forEach(el => { el.classList.remove('text-blue-600', 'border-blue-600'); el.classList.add('border-transparent', 'text-gray-500'); });
  if(btn) btn.classList.add('text-blue-600', 'border-blue-600');
  if(tabId === 'tab-pengaturan') loadTabelSiswa();
  if(tabId === 'tab-ujian') loadDaftarUjianAdmin();
  if(tabId === 'tab-soal') loadSelectUjianAdminSoal();
  if(tabId === 'tab-monitor') loadLiveMonitor(); 
}

// ADMIN SETTINGS & SISWA MANAGEMENT
function muatPengaturan() {
  let mapel = DB.get('mapel'); let kelas = DB.get('kelas');
  let listM = document.getElementById('list-mapel-ui'); let listK = document.getElementById('list-kelas-ui');
  let selMapel = document.getElementById('tes-mapel'); let contKelas = document.getElementById('tes-kelas-container');
  let selManualKelas = document.getElementById('manual-kelas');
  
  if(listM) listM.innerHTML = mapel.map(m => `<li class="p-2 flex justify-between items-center"><span>${m}</span><button onclick="hapusItem('mapel','${m}')" class="text-rose-600 text-xs font-bold">Hapus</button></li>`).join('');
  if(listK) listK.innerHTML = kelas.map(k => `<li class="p-2 flex justify-between items-center"><span>${k}</span><button onclick="hapusItem('kelas','${k}')" class="text-rose-600 text-xs font-bold">Hapus</button></li>`).join('');
  
  if(selMapel) selMapel.innerHTML = '<option value="">- Mata Pelajaran -</option>' + mapel.map(m => `<option value="${m}">${m}</option>`).join('');
  if(selManualKelas) selManualKelas.innerHTML = '<option value="">- Pilih Kelas -</option>' + kelas.map(k => `<option value="${k}">${k}</option>`).join('');
  if(contKelas) contKelas.innerHTML = kelas.map(k => `<label class="flex space-x-1.5 items-center"><input type="checkbox" class="cb-kelas rounded text-blue-600" value="${k}"> <span>${k}</span></label>`).join('');
}

function tambahItem(tipe) {
  let input = document.getElementById(tipe === 'mapel' ? 'input-mapel' : 'input-kelas');
  let val = input.value.trim();
  if(!val) return;
  let data = DB.get(tipe);
  if(!data.includes(val)) { data.push(val); DB.set(tipe, data); input.value = ''; muatPengaturan(); }
}

function hapusItem(tipe, val) {
  let data = DB.get(tipe).filter(x => x !== val);
  DB.set(tipe, data); muatPengaturan();
}

function tambahSiswaSatu() {
  let nama = document.getElementById('manual-nama').value.trim();
  let kelas = document.getElementById('manual-kelas').value;
  let user = document.getElementById('manual-user').value.trim();
  let pass = document.getElementById('manual-pass').value.trim();
  if(!nama || !kelas || !user || !pass) return alert("Lengkapi data siswa!");
  let siswa = DB.get('siswa');
  siswa.push({ nama, kelas, user, pass });
  DB.set('siswa', siswa);
  alert("Siswa berhasil ditambahkan!");
  document.getElementById('manual-nama').value = '';
  document.getElementById('manual-user').value = '';
  document.getElementById('manual-pass').value = '';
  loadTabelSiswa();
}

function loadTabelSiswa() {
  let siswa = DB.get('siswa');
  let tbody = document.querySelector('#tabel-kelola-siswa tbody');
  if(!tbody) return;
  tbody.innerHTML = siswa.length === 0 ? '<tr><td colspan="5" class="p-3 text-center text-gray-500">Belum ada data siswa.</td></tr>' :
    siswa.map((s, idx) => `<tr>
      <td class="p-2.5 border">${s.nama}</td>
      <td class="p-2.5 border">${s.kelas}</td>
      <td class="p-2.5 border font-mono">${s.user}</td>
      <td class="p-2.5 border font-mono">${s.pass}</td>
      <td class="p-2.5 border text-center"><button onclick="hapusSiswa(${idx})" class="bg-rose-600 text-white px-2 py-1 rounded text-xs">Hapus</button></td>
    </tr>`).join('');
}

function hapusSiswa(idx) {
  let siswa = DB.get('siswa');
  siswa.splice(idx, 1);
  DB.set('siswa', siswa);
  loadTabelSiswa();
}

function prosesUploadSiswa() {
  let fileEl = document.getElementById('fileExcelSiswa');
  if(fileEl.files.length === 0) return alert("Pilih file excel siswa terlebih dahulu!");
  let reader = new FileReader();
  reader.onload = function(e) {
    let workbook = XLSX.read(new Uint8Array(e.target.result), {type: 'array'});
    let sheet = workbook.Sheets[workbook.SheetNames[0]];
    let rows = XLSX.utils.sheet_to_json(sheet, {header: 1});
    if(rows.length > 0) rows.shift();
    let siswa = DB.get('siswa');
    rows.forEach(r => {
      if(r[0] && r[1] && r[2] && r[3]) {
        siswa.push({ nama: String(r[0]), kelas: String(r[1]), user: String(r[2]), pass: String(r[3]) });
      }
    });
    DB.set('siswa', siswa);
    alert("Data siswa massal berhasil diunggah!");
    fileEl.value = '';
    loadTabelSiswa();
  };
  reader.readAsArrayBuffer(fileEl.files[0]);
}

function gantiPassword() {
  let pBaru = prompt("Masukkan Password Admin Baru:");
  if(pBaru) {
    localStorage.setItem('cbt_adminPass', pBaru);
    alert("Password admin berhasil diubah!");
  }
}

function resetAllDatabase() {
  if(confirm("PERINGATAN: Seluruh data ujian, soal, siswa, dan nilai akan dihapus permanen! Lanjutkan?")) {
    localStorage.clear();
    DB.initLocal();
    alert("Database berhasil direset.");
    location.reload();
  }
}

// MANAJEMEN UJIAN & WEB WORKER PARSER
function buatUjianTerpadu() {
  let judulEl = document.getElementById('tes-judul');
  let mapelEl = document.getElementById('tes-mapel');
  let durasiEl = document.getElementById('tes-durasi');
  let fileEl = document.getElementById('fileExcelSoal');
  let acakEl = document.getElementById('tes-acak');

  if(!judulEl || !mapelEl || !fileEl) return;

  let formUjian = {
    idTes: "TEST-" + new Date().getTime(),
    judul: judulEl.value.trim(),
    mapel: mapelEl.value,
    kelas: Array.from(document.querySelectorAll('.cb-kelas:checked')).map(cb => cb.value),
    durasi: durasiEl ? (durasiEl.value || 60) : 60,
    acak: acakEl && acakEl.checked ? 'YA' : 'TIDAK'
  };

  if(!formUjian.judul || !formUjian.mapel || formUjian.kelas.length === 0) return alert("Lengkapi Form dan pilih minimal satu kelas!");
  if(fileEl.files.length === 0) return alert("Pilih file Soal!");

  uiLoading(true, "Memproses Dokumen dengan Web Worker...");
  let file = fileEl.files[0];
  let reader = new FileReader();

  reader.onload = function(e) {
    let arrayBuffer = e.target.result;
    if (window.Worker) {
      let worker = new Worker('parser.worker.js');
      worker.postMessage({ arrayBuffer: arrayBuffer, fileName: file.name });
      worker.onmessage = function(event) {
        worker.terminate();
        if (!event.data.success) {
          uiLoading(false);
          return alert("Gagal memproses dokumen: " + event.data.error);
        }
        prosesSimpanSoalKeDB(formUjian, event.data.rows);
      };
    } else {
      uiLoading(false);
      alert