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

// STATE VARIABLES
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

    let activeExam = sessionStorage.getItem('cbt_activeExam');
    if (activeExam && document.getElementById('engine-ujian')) {
        let examData = JSON.parse(activeExam);
        currentTest = examData.currentTest;
        soalData = examData.soalData;
        jawabanSiswa = examData.jawabanSiswa || {};
        currentIndex = examData.currentIndex || 0;
        currentEndTime = examData.endTime;
        
        let elMapel = document.getElementById('uji-mapel');
        if(elMapel) elMapel.innerText = currentTest.mapel + " - " + currentTest.judul;
        
        renderTampilanSoalSingle();
        lanjutkanTimer(currentEndTime);
        setTimeout(() => { cheatDetectionActive = true; }, 3000);
    }

    let lastResult = sessionStorage.getItem('cbt_lastResult');
    if (lastResult && document.getElementById('hasil-status')) {
        let res = JSON.parse(lastResult);
        document.getElementById('hasil-status').innerText = res.status || 'UJIAN SELESAI';
        document.getElementById('hasil-msg').innerText = "Nilai akhir Anda berhasil direkam.";
        document.getElementById('hasil-nilai').innerText = res.nilai ?? '0';
    }
});

function setRole(role) {
  let roleInput = document.getElementById('login-role');
  let btnSiswa = document.getElementById('btn-Siswa');
  let btnAdmin = document.getElementById('btn-Admin');
  if(roleInput) roleInput.value = role;
  if(btnSiswa) {
    btnSiswa.className = role === 'SISWA' ? 
      'w-1/2 py-2.5 bg-blue-600 text-white rounded-lg font-bold text-xs sm:text-sm shadow-sm transition cursor-pointer' : 
      'w-1/2 py-2.5 text-gray-600 rounded-lg font-bold text-xs sm:text-sm transition cursor-pointer';
  }
  if(btnAdmin) {
    btnAdmin.className = role === 'ADMIN' ? 
      'w-1/2 py-2.5 bg-blue-600 text-white rounded-lg font-bold text-xs sm:text-sm shadow-sm transition cursor-pointer' : 
      'w-1/2 py-2.5 text-gray-600 rounded-lg font-bold text-xs sm:text-sm transition cursor-pointer';
  }
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
    let adminU = localStorage.getItem('cbt_adminUser') || 'admin'; 
    let adminP = localStorage.getItem('cbt_adminPass') || 'admin37';
    if (u === adminU && p === adminP) {
      currentUser = { nama: 'Administrator', role: 'ADMIN' };
      sessionStorage.setItem('cbt_loggedUser', JSON.stringify(currentUser));
      showView('view-admin'); 
      muatPengaturan(); 
      loadTabelSiswa(); 
      loadLiveMonitor(); 
      loadSelectUjianAdminSoal();
    } else { 
      alert("Username atau Password Admin salah!"); 
    }
  } else {
    let daftarSiswa = DB.get('siswa');
    let s = daftarSiswa.find(x => x.user === u && x.pass === p);
    if (s) {
      currentUser = { nama: s.nama, kelas: s.kelas, username: s.user };
      sessionStorage.setItem('cbt_loggedUser', JSON.stringify(currentUser));
      showView('view-siswa'); 
      loadDaftarTesSiswa();
    } else { 
      alert("Username atau Password Siswa salah!"); 
    }
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
  if (confirm(`Apakah Anda yakin ingin menghapus ${tipe} "${val}"?`)) {
    let data = DB.get(tipe).filter(x => x !== val);
    DB.set(tipe, data); 
    muatPengaturan();
  }
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

// PERINGATAN KONFIRMASI PENGHAPUSAN SISWA
function hapusSiswa(idx) {
  let siswa = DB.get('siswa');
  let targetSiswa = siswa[idx];
  let namaSiswa = targetSiswa ? targetSiswa.nama : "ini";

  if (confirm(`PERINGATAN: Apakah Anda yakin ingin menghapus data siswa "${namaSiswa}"? Tindakan ini tidak dapat dibatalkan.`)) {
    siswa.splice(idx, 1);
    DB.set('siswa', siswa);
    loadTabelSiswa();
    alert("Data siswa berhasil dihapus.");
  }
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
  if(pBaru && pBaru.trim() !== "") {
    localStorage.setItem('cbt_adminPass', pBaru.trim());
    alert("Password admin berhasil diubah!");
  }
}

function resetAllDatabase() {
  if(confirm("PERINGATAN KERAS: Seluruh data ujian, soal, siswa, dan nilai akan dihapus permanen dan dikembalikan ke setelan awal! Lanjutkan?")) {
    localStorage.clear();
    DB.initLocal();
    alert("Database berhasil direset penuh.");
    location.reload();
  }
}

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

  uiLoading(true, "Memproses Dokumen...");
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
      try {
        let workbook = XLSX.read(new Uint8Array(arrayBuffer), {type: 'array'});
        let firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        let rows = XLSX.utils.sheet_to_json(firstSheet, {header: 1, raw: false});
        prosesSimpanSoalKeDB(formUjian, rows);
      } catch (err) {
        alert("Gagal memproses dokumen: " + err.message);
      }
    }
  };
  reader.readAsArrayBuffer(file);
}

function prosesSimpanSoalKeDB(formUjian, rows) {
  let listSoal = [];
  let currentSoal = null;

  rows.forEach(r => {
    let col0 = String(r[0] || '').trim();
    let col1 = String(r[1] || '').trim();
    let col2 = String(r[2] || '').trim();

    if (!isNaN(col0) && col0 !== '') {
      if (currentSoal) listSoal.push(currentSoal);
      currentSoal = {
        idTes: formUjian.idTes,
        no: parseInt(col0),
        teks: col1,
        a: '', b: '', c: '', d: '', e: '',
        kunci: col2 ? col2.toUpperCase() : 'A'
      };
    } else if (currentSoal) {
      let optKey = col0.toUpperCase();
      if (['A', 'B', 'C', 'D', 'E'].includes(optKey)) {
        currentSoal[optKey.toLowerCase()] = col1;
      }
    }
  });
  if (currentSoal) listSoal.push(currentSoal);

  if (listSoal.length === 0) {
    uiLoading(false);
    return alert("Soal tidak terdeteksi! Pastikan format file sesuai template.");
  }

  let ujianDB = DB.get('ujian');
  formUjian.jumlahSoal = listSoal.length;
  ujianDB.push(formUjian);
  DB.set('ujian', ujianDB);

  let soalDB = DB.get('soal');
  soalDB = soalDB.concat(listSoal);
  DB.set('soal', soalDB);

  uiLoading(false);
  alert("Ujian & Soal berhasil disimpan!");
  document.getElementById('tes-judul').value = '';
  document.getElementById('fileExcelSoal').value = '';
  loadDaftarUjianAdmin();
}

function loadDaftarUjianAdmin() {
  let ujian = DB.get('ujian');
  let tbody = document.querySelector('#tabel-daftar-ujian tbody');
  if (!tbody) return;
  tbody.innerHTML = ujian.length === 0 ? '<tr><td colspan="7" class="p-3 text-center text-gray-500">Belum ada ujian.</td></tr>' :
    ujian.map(u => `<tr>
      <td class="p-2 border font-mono text-xs">${u.idTes}</td>
      <td class="p-2 border"><b>${u.judul}</b><br><span class="text-xs text-gray-500">${u.mapel}</span></td>
      <td class="p-2 border">${u.kelas.join(', ')}</td>
      <td class="p-2 border text-center">${u.durasi} Min</td>
      <td class="p-2 border text-center">${u.acak}</td>
      <td class="p-2 border text-center font-bold">${u.jumlahSoal || 0}</td>
      <td class="p-2 border text-center">
        <button onclick="hapusUjian('${u.idTes}')" class="bg-rose-600 text-white px-2 py-1 rounded text-xs">Hapus</button>
      </td>
    </tr>`).join('');
}

// PERINGATAN KONFIRMASI HAPUS UJIAN
function hapusUjian(idTes) {
  if (confirm(`PERINGATAN: Apakah Anda yakin ingin menghapus ujian "${idTes}" beserta seluruh bank soal dan sesi terkait?`)) {
    DB.set('ujian', DB.get('ujian').filter(x => x.idTes !== idTes));
    DB.set('soal', DB.get('soal').filter(x => x.idTes !== idTes));
    DB.set('sesi', DB.get('sesi').filter(x => x.idTes !== idTes));
    loadDaftarUjianAdmin();
    alert("Ujian berhasil dihapus.");
  }
}

function loadSelectUjianAdminSoal() {
  let ujian = DB.get('ujian');
  let sel = document.getElementById('select-soal-idtes');
  if (sel) {
    sel.innerHTML = '<option value="">- Pilih ID Ujian -</option>' + ujian.map(u => `<option value="${u.idTes}">${u.judul} (${u.mapel})</option>`).join('');
  }
}

function loadDaftarSoalAdmin() {
  let idTes = document.getElementById('select-soal-idtes').value;
  let cont = document.getElementById('container-daftar-soal-admin');
  if (!idTes || !cont) return;
  
  let soalList = DB.get('soal').filter(s => s.idTes === idTes);
  if (soalList.length === 0) {
    cont.innerHTML = '<p class="text-xs text-gray-500">Tidak ada soal ditemukan.</p>';
    return;
  }

  cont.innerHTML = soalList.map(s => `
    <div class="p-3 border rounded-lg bg-gray-50 space-y-1 text-xs sm:text-sm">
      <div class="font-bold text-blue-700">Soal No. ${s.no} (Kunci: ${s.kunci})</div>
      <div>${formatTextWithImages(s.teks)}</div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-gray-600 pt-1">
        <div><b>A.</b> ${formatTextWithImages(s.a)}</div>
        <div><b>B.</b> ${formatTextWithImages(s.b)}</div>
        <div><b>C.</b> ${formatTextWithImages(s.c)}</div>
        <div><b>D.</b> ${formatTextWithImages(s.d)}</div>
        <div><b>E.</b> ${formatTextWithImages(s.e)}</div>
      </div>
    </div>
  `).join('');
}

function loadDaftarTesSiswa() {
  let container = document.getElementById('daftar-tes-container');
  if (!container) return;
  
  let ujianList = DB.get('ujian').filter(u => u.kelas.includes(currentUser.kelas));
  let sesiList = DB.get('sesi');

  if (ujianList.length === 0) {
    container.innerHTML = '<p class="text-xs text-gray-500 col-span-2">Belum ada ujian tersedia untuk kelas Anda.</p>';
    return;
  }

  container.innerHTML = ujianList.map(u => {
    let sesi = sesiList.find(s => s.idTes === u.idTes && s.username === currentUser.username);
    let sudahSelesai = sesi && sesi.status === 'SELESAI';
    
    return `
      <div class="bg-white p-4 rounded-xl shadow border border-gray-100 flex flex-col justify-between">
        <div>
          <span class="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded">${u.mapel}</span>
          <h4 class="font-bold text-sm sm:text-base text-gray-800 mt-1">${u.judul}</h4>
          <p class="text-xs text-gray-500 mt-1">Durasi: ${u.durasi} Menit | Soal: ${u.jumlahSoal || 0}</p>
        </div>
        <div class="mt-4">
          ${sudahSelesai ? 
            `<button disabled class="w-full bg-gray-300 text-gray-600 py-2.5 rounded-lg font-bold text-xs">Ujian Selesai (Nilai: ${sesi.nilai})</button>` :
            `<button onclick="mulaikanUjian('${u.idTes}')" class="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-bold text-xs shadow transition">MULAILAH UJIAN</button>`
          }
        </div>
      </div>
    `;
  }).join('');
}

function mulaikanUjian(idTes) {
  let ujian = DB.get('ujian').find(u => u.idTes === idTes);
  let daftarSoal = DB.get('soal').filter(s => s.idTes === idTes);
  if (!ujian || daftarSoal.length === 0) return alert("Data soal tidak ditemukan!");

  if (ujian.acak === 'YA') {
    daftarSoal.sort(() => Math.random() - 0.5);
  }

  currentTest = ujian;
  soalData = daftarSoal;
  currentIndex = 0;
  jawabanSiswa = {};
  currentEndTime = new Date().getTime() + (parseInt(ujian.durasi) * 60 * 1000);

  let examData = {
    currentTest,
    soalData,
    jawabanSiswa,
    currentIndex,
    endTime: currentEndTime
  };
  sessionStorage.setItem('cbt_activeExam', JSON.stringify(examData));

  if (document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen().catch(()=>{});
  }

  window.location.href = 'ujian.html';
}

function renderTampilanSoalSingle() {
  let area = document.getElementById('area-soal');
  let labelPos = document.getElementById('label-nomor-posisi');
  if (!area || soalData.length === 0) return;

  let s = soalData[currentIndex];
  if(labelPos) labelPos.innerText = `${currentIndex + 1} / ${soalData.length}`;

  let opsiHTML = ['a', 'b', 'c', 'd', 'e'].map(o => {
    let checked = jawabanSiswa[s.no] === o.toUpperCase() ? 'checked' : '';
    let textOpsi = s[o];
    if (!textOpsi) return '';
    return `
      <label class="flex items-start space-x-3 p-3 border rounded-xl bg-white hover:bg-blue-50/50 cursor-pointer transition">
        <input type="radio" name="jawaban" value="${o.toUpperCase()}" onchange="pilihJawaban('${s.no}', '${o.toUpperCase()}')" ${checked} class="mt-1 w-4 h-4 text-blue-600">
        <div class="text-xs sm:text-sm text-gray-800"><b class="uppercase">${o}.</b> ${formatTextWithImages(textOpsi)}</div>
      </label>
    `;
  }).join('');

  area.innerHTML = `
    <div class="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4 max-w-3xl mx-auto">
      <div class="font-bold text-xs text-blue-600">SOAL NO. ${currentIndex + 1}</div>
      <div class="text-sm sm:text-base text-gray-800 leading-relaxed">${formatTextWithImages(s.teks)}</div>
      <div class="space-y-2 pt-2">${opsiHTML}</div>
    </div>
  `;

  let btnPrev = document.getElementById('btn-prev');
  let btnNext = document.getElementById('btn-next');
  let btnFinish = document.getElementById('btn-finish');

  if(btnPrev) btnPrev.classList.toggle('hidden', currentIndex === 0);
  if(btnNext) btnNext.classList.toggle('hidden', currentIndex === soalData.length - 1);
  if(btnFinish) btnFinish.classList.toggle('hidden', currentIndex !== soalData.length - 1);
}

function pilihJawaban(noSoal, val) {
  jawabanSiswa[noSoal] = val;
  let activeExam = JSON.parse(sessionStorage.getItem('cbt_activeExam') || '{}');
  activeExam.jawabanSiswa = jawabanSiswa;
  sessionStorage.setItem('cbt_activeExam', JSON.stringify(activeExam));
}

function soalSebelumnya() {
  if (currentIndex > 0) { currentIndex--; renderTampilanSoalSingle(); }
}

function soalBerikutnya() {
  if (currentIndex < soalData.length - 1) { currentIndex++; renderTampilanSoalSingle(); }
}

function toggleModalDaftarSoal() {
  let m = document.getElementById('modal-daftar-soal');
  if(!m) return;
  m.classList.toggle('hidden');
  if (!m.classList.contains('hidden')) {
    let grid = document.getElementById('grid-no-soal');
    grid.innerHTML = soalData.map((s, idx) => {
      let diisi = jawabanSiswa[s.no] ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700';
      return `<button onclick="lompatKeSoal(${idx})" class="p-2.5 font-bold rounded-lg text-xs ${diisi}">${idx + 1}</button>`;
    }).join('');
  }
}

function lompatKeSoal(idx) {
  currentIndex = idx;
  toggleModalDaftarSoal();
  renderTampilanSoalSingle();
}

function lanjutkanTimer(endTime) {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    let now = new Date().getTime();
    let distance = endTime - now;

    if (distance <= 0) {
      clearInterval(timerInterval);
      alert("Waktu ujian telah habis!");
      submitUjian('SELESAI');
      return;
    }

    let h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    let m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    let s = Math.floor((distance % (1000 * 60)) / 1000);

    let display = document.getElementById('timer-display');
    if(display) {
      display.innerText = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
  }, 1000);
}

function submitUjian(status = 'SELESAI') {
  if (isUjianSelesai) return;
  isUjianSelesai = true;
  clearInterval(timerInterval);

  let benar = 0;
  soalData.forEach(s => {
    if (jawabanSiswa[s.no] && jawabanSiswa[s.no] === s.kunci) {
      benar++;
    }
  });

  let nilaiAkhir = Math.round((benar / soalData.length) * 100);

  let sesiList = DB.get('sesi');
  let idx = sesiList.findIndex(s => s.idTes === currentTest.idTes && s.username === currentUser.username);
  
  let dataSesi = {
    idTes: currentTest.idTes,
    username: currentUser.username,
    nama: currentUser.nama,
    kelas: currentUser.kelas,
    status: status,
    nilai: nilaiAkhir,
    jawaban: jawabanSISHEDAT = jawabanSiswa
  };

  if (idx >= 0) sesiList[idx] = dataSesi;
  else sesiList.push(dataSesi);
  
  DB.set('sesi', sesiList);

  sessionStorage.removeItem('cbt_activeExam');
  sessionStorage.setItem('cbt_lastResult', JSON.stringify({ status, nilai: nilaiAkhir }));

  window.location.href = 'selesai.html';
}

function loadLiveMonitor() {
  let sesi = DB.get('sesi');
  let tbody = document.querySelector('#tabel-monitor tbody');
  if(!tbody) return;
  tbody.innerHTML = sesi.length === 0 ? '<tr><td colspan="7" class="p-3 text-center text-gray-500">Belum ada aktivitas ujian.</td></tr>' :
    sesi.map(s => `<tr>
      <td class="p-2 border font-mono text-xs">${s.username}</td>
      <td class="p-2 border">${s.nama}</td>
      <td class="p-2 border">${s.kelas}</td>
      <td class="p-2 border font-mono text-xs">${s.idTes}</td>
      <td class="p-2 border"><span class="px-2 py-0.5 rounded text-[10px] font-bold ${s.status === 'SELESAI' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}">${s.status}</span></td>
      <td class="p-2 border font-bold">${s.nilai}</td>
      <td class="p-2 border text-center"><button onclick="resetSesiSiswa('${s.idTes}', '${s.username}')" class="bg-rose-600 text-white px-2 py-1 rounded text-xs">Reset</button></td>
    </tr>`).join('');
}

// PERINGATAN KONFIRMASI RESET SESI SISWA
function resetSesiSiswa(idTes, user) {
  if(confirm(`PERINGATAN: Apakah Anda yakin ingin mereset sesi ujian untuk siswa dengan username "${user}" pada ujian "${idTes}"? Siswa akan dapat mengerjakan ulang.`)) {
    let sesi = DB.get('sesi').filter(s => !(s.idTes === idTes && s.username === user));
    DB.set('sesi', sesi);
    loadLiveMonitor();
    alert("Sesi siswa berhasil direset.");
  }
}

function eksporHasil() {
  let sesi = DB.get('sesi');
  if(sesi.length === 0) return alert("Belum ada data nilai untuk dieksport!");
  
  let filename = document.getElementById('ekspor-filename').value.trim() || 'Hasil_Ujian_CBT';
  let ws = XLSX.utils.json_to_sheet(sesi.map(s => ({
    Username: s.username,
    Nama: s.nama,
    Kelas: s.kelas,
    ID_Tes: s.idTes,
    Status: s.status,
    Nilai: s.nilai
  })));
  
  let wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Hasil Ujian");
  XLSX.writeFile(wb, filename + ".xlsx");
}
