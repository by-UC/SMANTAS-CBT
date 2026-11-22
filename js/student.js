// ================= SESI LOGIN SISWA LOKAL & KUNCI PER MAPEL =================
const SISWA_SESSION_STORAGE_KEY = "smantas_cbt_siswa_session_v1";
const EXAM_BACKUP_STORAGE_KEY = "smantas_cbt_exam_backup_v1";
const PENDING_SUBMIT_STORAGE_KEY = "smantas_cbt_pending_submit_v1";

function simpanSesiSiswaLokal(sessionObj) {
    try { localStorage.setItem(SISWA_SESSION_STORAGE_KEY, JSON.stringify(sessionObj)); } catch (e) {}
}

function bacaSesiSiswaLokal() {
    try {
        const raw = localStorage.getItem(SISWA_SESSION_STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
}

function hapusSesiSiswaLokal() {
    try { localStorage.removeItem(SISWA_SESSION_STORAGE_KEY); } catch (e) {}
}

function getLockedMapelStorageKey(username) {
    return `smantas_cbt_locked_mapel_${String(username || "").trim()}`;
}

function bacaLockedMapelLokal(username) {
    try {
        const raw = localStorage.getItem(getLockedMapelStorageKey(username));
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr.map(m => normStr(m)).filter(Boolean) : [];
    } catch (e) { return []; }
}

function simpanLockedMapelLokal(username, mapelArr) {
    try {
        const unique = [...new Set((mapelArr || []).map(m => normStr(m)).filter(Boolean))];
        localStorage.setItem(getLockedMapelStorageKey(username), JSON.stringify(unique));
    } catch (e) {}
}

function tandaiMapelTerkunciLokal(username, mapelName) {
    if (!username || !mapelName) return;
    const current = bacaLockedMapelLokal(username);
    const mNorm = normStr(mapelName);
    if (!current.includes(mNorm)) {
        current.push(mNorm);
        simpanLockedMapelLokal(username, current);
    }
}

function bukaKunciMapelLokal(username, mapelName = null) {
    if (!username) return;
    if (!mapelName) {
        try { localStorage.removeItem(getLockedMapelStorageKey(username)); } catch (e) {}
        return;
    }
    const target = normStr(mapelName);
    const sisa = bacaLockedMapelLokal(username).filter(m => m !== target);
    simpanLockedMapelLokal(username, sisa);
}

function getUnlockedMapelList(username) {
    try {
        const raw = localStorage.getItem(`smantas_cbt_unlocked_mapel_${String(username || "").trim()}`);
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
}

function tandaiMapelDiresetLokal(username, mapelName) {
    if (!username || !mapelName) return;
    bukaKunciMapelLokal(username, mapelName);
    const list = getUnlockedMapelList(username);
    const mNorm = normStr(mapelName);
    const filtered = list.filter(item => normStr(item.mapel) !== mNorm);
    filtered.push({ mapel: mapelName, unlockedAt: Date.now() });
    try {
        localStorage.setItem(`smantas_cbt_unlocked_mapel_${String(username || "").trim()}`, JSON.stringify(filtered));
    } catch (e) {}
}

function isMapelTerkunciUntukSiswa(username, namaSiswa, kelasSiswa, mapelName) {
    const targetMapel = normStr(mapelName);
    if (!targetMapel) return false;

    const logs = Array.isArray(logSiswaLogin) ? logSiswaLogin : [];
    const namaNorm = normStr(namaSiswa || "");
    const kelasNorm = normStr(kelasSiswa || "");

    const logMapelIni = logs.filter(l =>
        normStr(l.mapel) === targetMapel &&
        (!namaNorm || normStr(l.nama) === namaNorm) &&
        (!kelasNorm || normStr(l.kelas) === kelasNorm)
    );

    if (logMapelIni.length > 0) {
        const lastLog = logMapelIni[logMapelIni.length - 1];
        const st = String(lastLog.status || "").trim();
        if (st === "Direset" || st.toLowerCase().includes("reset")) {
            bukaKunciMapelLokal(username, mapelName);
            return false;
        }
        if (st.includes("Selesai") || st.toLowerCase().includes("curang")) {
            return true;
        }
    }

    const sess = sesiLoginSiswa[username];
    const sessStatus = sess ? String(sess.status || "").trim() : "";
    const sessMapelNorm = sess ? normStr(sess.mapel) : "";
    if (sess && sessMapelNorm === targetMapel) {
        if (sessStatus.endsWith("Direset") || sessStatus.toLowerCase().includes("reset")) {
            bukaKunciMapelLokal(username, mapelName);
            return false;
        }
        if (cekStatusTerkunci(sessStatus)) {
            return true;
        }
    }

    const unlockedList = getUnlockedMapelList(username);
    if (unlockedList.some(item => normStr(item.mapel) === targetMapel)) {
        return false;
    }

    return bacaLockedMapelLokal(username).includes(targetMapel);
}

function sinkronkanTampilanInputTokenSiswa() {
    const groupEl = document.getElementById("groupTokenUjianSiswa");
    const inpEl = document.getElementById("inputTokenSiswa");
    if (!groupEl) return;
    if (tokenDriveState.wajibToken !== false) {
        groupEl.style.display = "block";
    } else {
        groupEl.style.display = "none";
        if (inpEl) inpEl.value = "";
    }
}

function renderOpsiMapelUntukSiswa(siswa) {
    const selectMapel = document.getElementById('pilihMapelAktif');
    if (!selectMapel || !siswa) return;

    document.getElementById('salamSiswa').innerText = `Selamat Datang, ${siswa.nama}`;
    document.getElementById('infoKelasSiswa').innerText = `Kelas: ${siswa.kelas}`;

    selectMapel.innerHTML = '<option value="">-- Pilih Mata Pelajaran --</option>';

    const nowMs = Date.now();
    const kelasTrim = String(siswa.kelas || "").trim().toLowerCase();

    const jadwalAktifKelas = daftarJadwalUjian.filter(j => {
        const kelasMatch = String(j.kelas || "").trim().toLowerCase() === kelasTrim;
        if (!kelasMatch) return false;
        const startMs = parseJadwalDateTimeMs(j.mulai);
        const endMs = parseJadwalDateTimeMs(j.selesai);
        if (isNaN(startMs) || isNaN(endMs)) return false;
        return nowMs >= startMs && nowMs <= endMs;
    });

    if (jadwalAktifKelas.length === 0) {
        selectMapel.innerHTML = '<option value="">-- Tidak ada jadwal ujian aktif untuk kelas & waktu saat ini --</option>';
        return;
    }

    jadwalAktifKelas.forEach(j => {
        const terkunci = isMapelTerkunciUntukSiswa(siswa.username, siswa.nama, siswa.kelas, j.mapel);
        if (terkunci) {
            selectMapel.innerHTML += `<option value="${j.mapel}" disabled style="color:#999; background:#f1f1f1;">[TERKUNCI - Curang/Selesai] ${j.mapel}</option>`;
        } else {
            selectMapel.innerHTML += `<option value="${j.mapel}">${j.mapel} (${j.jp ? j.jp + ' JP • ' : ''}Selesai: ${j.selesai.replace('T', ' ')})</option>`;
        }
    });
}

// Mengambil log khusus milik siswa yang bersangkutan saja (hemat bandwidth & ringan di GAS)
async function fetchStudentLogFromGAS(nama, kelas) {
    try {
        const res = await postToGAS({
            action: "getStudentStatus",
            nama: nama,
            kelas: kelas
        });
        if (res.data && res.data.status === "success" && Array.isArray(res.data.data)) {
            logSiswaLogin = res.data.data;
        }
    } catch (e) {
        console.warn("Gagal mengambil status mapel siswa:", e);
    }
}

async function muatUlangDaftarMapelSiswa() {
    if (!currentSiswaObj) return;
    showLoading("Menghapus cache lokal & mengambil data terbaru...");
    bersihkanCacheLokalLama(currentSiswaObj.username);
    isDataLoadedOnce = false;
    await fetchCbtDatabase(true);
    await fetchSingleSesiFromGAS(currentSiswaObj.username, true);
    await fetchStudentLogFromGAS(currentSiswaObj.nama, currentSiswaObj.kelas);
    await fetchTokenDariDrive(true);
    renderOpsiMapelUntukSiswa(currentSiswaObj);
    sinkronkanTampilanInputTokenSiswa();
    hideLoading();
}

async function tampilkanHalamanPilihUjianSiswa(siswa) {
    currentSiswaObj = siswa;
    namaSiswaLogin = siswa.nama;
    kelasSiswaLogin = siswa.kelas;

    simpanSesiSiswaLokal({
        username: siswa.username,
        nama: siswa.nama,
        kelas: siswa.kelas,
        deviceId: getOrCreateDeviceId()
    });

    await fetchStudentLogFromGAS(siswa.nama, siswa.kelas);
    renderOpsiMapelUntukSiswa(siswa);
    sinkronkanTampilanInputTokenSiswa();

    const inpToken = document.getElementById('inputTokenSiswa');
    if (inpToken) inpToken.value = "";

    currentLoginRole = 'siswa';
    const btnToggle = document.getElementById('btnRoleToggle');
    if (btnToggle) {
        btnToggle.innerText = "Login Siswa";
        btnToggle.classList.remove('admin-mode');
    }

    setCompactMode(true);
    document.querySelectorAll('.section-view').forEach(sec => sec.classList.remove('active'));
    document.getElementById('tabMenu').style.display = 'none';
    document.getElementById('viewPilihUjianSiswa').classList.add('active');
    sinkronkanHeaderAdmin();
}

async function autentikasiSiswa() {
    let username = document.getElementById('nis').value.trim();
    let pass = document.getElementById('passSiswa').value.trim();

    if(!username || !pass) { alert("Username dan Password harus diisi!"); return; }

    showLoading("Memverifikasi akun & sesi perangkat...");
    await fetchCbtDatabase(false);

    let siswa = databaseSiswa.find(s => s.username === username);
    if(!siswa) { 
        hideLoading();
        alert("Username tidak ditemukan dalam database!"); 
        return; 
    }

    if(siswa.password !== pass) {
        hideLoading();
        alert("Password salah!");
        return;
    }

    // Ambil hanya sesi siswa ini + konfigurasi token (1 request ringan, bukan 1000+ record)
    const existingSession = await fetchSingleSesiFromGAS(username, true);
    await fetchTokenDariDrive(true);

    const myDeviceId = getOrCreateDeviceId();
    if(existingSession && existingSession.deviceId && existingSession.deviceId !== myDeviceId) {
        hideLoading();
        alert("AKSES DITOLAK!\nAkun Anda sedang aktif login di perangkat lain.\nUntuk pindah perangkat, silakan logout dari perangkat sebelumnya atau minta Admin melakukan Reset-Perangkat.");
        return;
    }

    const statusSetelahLogin = existingSession && existingSession.status
        ? existingSession.status
        : "Login Aktif";

    await setSesiToGAS({
        username: username,
        deviceId: myDeviceId,
        status: statusSetelahLogin,
        nama: siswa.nama,
        kelas: siswa.kelas,
        mapel: existingSession ? existingSession.mapel : "-",
        updatedAt: getLocalIsoNow()
    });
    hideLoading();

    await tampilkanHalamanPilihUjianSiswa(siswa);
}

async function logoutSiswa() {
    hentikanTimerUjian();
    bersihkanCacheSoal();
    hapusSesiSiswaLokal();
    if(currentSiswaObj) {
        showLoading("Melepaskan sesi perangkat...");
        const sess = await fetchSingleSesiFromGAS(currentSiswaObj.username, true);
        if(sess && sess.deviceId === getOrCreateDeviceId() && !cekStatusTerkunci(sess.status)) {
            if (sess.status && sess.status !== "Login Aktif") {
                await setSesiToGAS({
                    ...sess,
                    deviceId: "",
                    updatedAt: getLocalIsoNow()
                });
            } else {
                await deleteSesiFromGAS(currentSiswaObj.username);
            }
        }
        hideLoading();
    }
    currentSiswaObj = null;
    document.getElementById('nis').value = "";
    document.getElementById('passSiswa').value = "";
    document.getElementById('tabMenu').style.display = 'block';
    document.getElementById('viewPilihUjianSiswa').classList.remove('active');
    document.getElementById('viewLoginSiswa').classList.add('active');
    setCompactMode(true);
}

// ================= FULLSCREEN & ANTI-CURANG =================
async function masukFullscreenWajib() {
    const elem = document.documentElement;
    try {
        if (elem.requestFullscreen) {
            await elem.requestFullscreen({ navigationUI: "hide" }).catch(() => elem.requestFullscreen());
        } else if (elem.webkitRequestFullscreen) {
            await elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) {
            await elem.msRequestFullscreen();
        }
        const guard = document.getElementById('fullscreenGuardOverlay');
        if (guard && isCurrentlyFullscreen()) guard.style.display = 'none';
    } catch (e) {}
}

function aktifkanFullscreenDariOverlay() {
    masukFullscreenWajib();
}

function isCurrentlyFullscreen() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement);
}

function pasangPengawasAntiCurang() {
    document.addEventListener('fullscreenchange', handleFullscreenViolation);
    document.addEventListener('webkitfullscreenchange', handleFullscreenViolation);
    document.addEventListener('msfullscreenchange', handleFullscreenViolation);
    document.addEventListener('visibilitychange', handleVisibilityViolation);
    window.addEventListener('blur', handleWindowBlurViolation);
    document.addEventListener('contextmenu', preventCheatAction);
    document.addEventListener('keydown', preventCheatKeys);
}

function lepasPengawasAntiCurang() {
    document.removeEventListener('fullscreenchange', handleFullscreenViolation);
    document.removeEventListener('webkitfullscreenchange', handleFullscreenViolation);
    document.removeEventListener('msfullscreenchange', handleFullscreenViolation);
    document.removeEventListener('visibilitychange', handleVisibilityViolation);
    window.removeEventListener('blur', handleWindowBlurViolation);
    document.removeEventListener('contextmenu', preventCheatAction);
    document.removeEventListener('keydown', preventCheatKeys);
    const guard = document.getElementById('fullscreenGuardOverlay');
    if (guard) guard.style.display = 'none';
}

function preventCheatAction(e) {
    if (isExamInProgress) e.preventDefault();
}

function preventCheatKeys(e) {
    if (!isExamInProgress) return;
    if (e.key === "Escape" || e.key === "F11" || (e.ctrlKey && ['t', 'n', 'w', 'Tab'].includes(e.key))) {
        e.preventDefault();
    }
}

function handleFullscreenViolation() {
    if (!isExamInProgress || isSubmittingExam) return;
    if (!isCurrentlyFullscreen()) {
        picuPelanggaranUjian("Keluar dari mode Full Screen");
    }
}

function handleVisibilityViolation() {
    if (!isExamInProgress || isSubmittingExam) return;
    if (document.hidden) {
        picuPelanggaranUjian("Membuka tab lain / menyembunyikan layar ujian");
    }
}

function handleWindowBlurViolation() {
    if (!isExamInProgress || isSubmittingExam) return;
    picuPelanggaranUjian("Berpindah jendela / aplikasi lain");
}

function picuPelanggaranUjian(alasan) {
    if (!isExamInProgress || isSubmittingExam) return;
    isExamInProgress = false;
    hentikanTimerUjian();
    lepasPengawasAntiCurang();
    selesaiUjian(true, alasan, false);
}

// ================= TIMER HITUNG MUNDUR UJIAN =================
function formatDurasiDetikKeHhMmSs(totalSec) {
    const sec = Math.max(0, Math.floor(totalSec));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function hentikanTimerUjian() {
    if (examCountdownIntervalId) {
        clearInterval(examCountdownIntervalId);
        examCountdownIntervalId = null;
    }
    const timerEl = document.getElementById('examCountdownTimer');
    if (timerEl) {
        timerEl.classList.remove('timer-warning');
        timerEl.innerText = "⏱ --:--:--";
    }
}

function mulaiTimerUjian(jadwalMatch) {
    hentikanTimerUjian();
    const timerEl = document.getElementById('examCountdownTimer');

    let endMs = parseJadwalDateTimeMs(jadwalMatch?.selesai);
    if (isNaN(endMs)) {
        const jp = parseInt(jadwalMatch?.jp, 10) || 1;
        const menitPerJp = parseInt(pengaturanCbt.menitPerJp, 10) || 40;
        endMs = Date.now() + (jp * menitPerJp * 60 * 1000);
    }
    examEndTimestampMs = endMs;

    const tick = () => {
        const sisaMs = examEndTimestampMs - Date.now();
        const sisaSec = Math.max(0, Math.ceil(sisaMs / 1000));

        if (timerEl) {
            timerEl.innerText = `⏱ ${formatDurasiDetikKeHhMmSs(sisaSec)}`;
            if (sisaSec <= 300) {
                timerEl.classList.add('timer-warning');
            } else {
                timerEl.classList.remove('timer-warning');
            }
        }

        if (sisaMs <= 0) {
            hentikanTimerUjian();
            if (isExamInProgress && !isSubmittingExam) {
                isExamInProgress = false;
                lepasPengawasAntiCurang();
                selesaiUjian(false, "", true);
            }
        }
    };

    tick();
    examCountdownIntervalId = setInterval(tick, 1000);
}

// ================= MULAI UJIAN & LOAD SOAL =================
async function mulaiUjianPilihan() {
    let mapel = document.getElementById('pilihMapelAktif').value;
    if(!mapel) { alert("Pilih mata pelajaran ujian yang tersedia terlebih dahulu!"); return; }

    if(currentSiswaObj && isMapelTerkunciUntukSiswa(currentSiswaObj.username, namaSiswaLogin, kelasSiswaLogin, mapel)) {
        alert(`Mata pelajaran "${mapel}" sudah selesai / terkunci dan harus direset oleh Admin.\nSilakan pilih mata pelajaran lain yang tersedia.`);
        renderOpsiMapelUntukSiswa(currentSiswaObj);
        return;
    }

    const tokenInput = String(document.getElementById('inputTokenSiswa')?.value || "").trim();
    if (tokenDriveState.wajibToken !== false && !tokenInput) {
        alert("Masukkan 4 digit token ujian terlebih dahulu!");
        return;
    }

    await masukFullscreenWajib();

    showLoading("Memverifikasi token ujian...");
    try {
        const verRes = await postToGAS({
            action: "verifyToken",
            token: tokenInput
        });
        hideLoading();
        if (!verRes.data || verRes.data.status !== "success" || verRes.data.valid !== true) {
            alert("Token 4 digit salah atau sudah berganti! Minta token terbaru kepada pengawas.");
            return;
        }
    } catch (e) {
        hideLoading();
        alert("Gagal memverifikasi token ujian: " + e.message);
        return;
    }

    await masukFullscreenWajib();

    const nowMs = Date.now();
    const kelasTrim = kelasSiswaLogin.trim().toLowerCase();
    let jadwalMatch = daftarJadwalUjian.find(j => 
        j.mapel === mapel && String(j.kelas || "").trim().toLowerCase() === kelasTrim
    );

    if(!jadwalMatch) {
        alert("Jadwal ujian tidak ditemukan untuk kelas Anda!");
        return;
    }

    const startMs = parseJadwalDateTimeMs(jadwalMatch.mulai);
    const endMs = parseJadwalDateTimeMs(jadwalMatch.selesai);

    if(!isNaN(startMs) && nowMs < startMs) {
        alert(`Ujian belum dimulai!\nJadwal mulai: ${jadwalMatch.mulai.replace('T', ' ')}`);
        return;
    }

    if(!isNaN(endMs) && nowMs > endMs) {
        alert(`Ujian sudah berakhir!\nJadwal selesai: ${jadwalMatch.selesai.replace('T', ' ')}`);
        return;
    }

    mapelSiswaLogin = mapel;

    let riwayatStatusSaatIni = "Sedang Ujian";
    if(currentSiswaObj) {
        const prevSess = sesiLoginSiswa[currentSiswaObj.username];
        riwayatStatusSaatIni = gabungRiwayatStatus(prevSess ? prevSess.status : "", "Sedang Ujian");
        // Gabung update sesi + log mulai ujian dalam 1 panggilan (startExamSession) agar hemat kuota GAS 50%
        try {
            await postToGAS({
                action: "startExamSession",
                username: currentSiswaObj.username,
                deviceId: getOrCreateDeviceId(),
                nama: namaSiswaLogin,
                kelas: kelasSiswaLogin,
                mapel: mapel,
                status: riwayatStatusSaatIni,
                updatedAt: getLocalIsoNow()
            });
            sesiLoginSiswa[currentSiswaObj.username] = {
                username: currentSiswaObj.username,
                deviceId: getOrCreateDeviceId(),
                status: riwayatStatusSaatIni,
                nama: namaSiswaLogin,
                kelas: kelasSiswaLogin,
                mapel: mapel,
                updatedAt: getLocalIsoNow()
            };
        } catch (e) {
            console.warn("Gagal mencatat mulai ujian ke GAS:", e);
        }
    }

    namaUjianAktif = `${mapel.replace(/\s+/g, '_')}_${kelasSiswaLogin.replace(/\s+/g, '_')}`;
    await loadSoalUjian(jadwalMatch);
}

// ================= CADANGAN JAWABAN & SUBMIT DENGAN JITTER + RETRY =================
function simpanCadanganJawabanLokal() {
    try {
        if (!currentSiswaObj || !mapelSiswaLogin || !Array.isArray(listSoal) || listSoal.length === 0) return;
        const backupObj = {
            username: String(currentSiswaObj.username || ""),
            nama: namaSiswaLogin,
            kelas: kelasSiswaLogin,
            mapel: mapelSiswaLogin,
            namaUjian: namaUjianAktif,
            currentSoalIndex: currentSoalIndex,
            listSoal: listSoal,
            jawabanSiswa: jawabanSiswa,
            savedAt: Date.now()
        };
        localStorage.setItem(EXAM_BACKUP_STORAGE_KEY, JSON.stringify(backupObj));
    } catch (e) {}
}

function bacaCadanganJawabanLokal(username, mapel, kelas) {
    try {
        const raw = localStorage.getItem(EXAM_BACKUP_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || !Array.isArray(parsed.listSoal) || parsed.listSoal.length === 0) return null;
        if (String(parsed.username || "") !== String(username || "")) return null;
        if (normStr(parsed.mapel) !== normStr(mapel)) return null;
        if (normStr(parsed.kelas) !== normStr(kelas)) return null;
        if (parsed.savedAt && (Date.now() - parsed.savedAt > 12 * 60 * 60 * 1000)) {
            hapusCadanganJawabanLokal();
            return null;
        }
        return parsed;
    } catch (e) { return null; }
}

function hapusCadanganJawabanLokal() {
    try { localStorage.removeItem(EXAM_BACKUP_STORAGE_KEY); } catch (e) {}
}

function simpanAntreanSubmitLokal(itemObj) {
    try { localStorage.setItem(PENDING_SUBMIT_STORAGE_KEY, JSON.stringify(itemObj)); } catch (e) {}
}

function bacaAntreanSubmitLokal() {
    try {
        const raw = localStorage.getItem(PENDING_SUBMIT_STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
}

function hapusAntreanSubmitLokal() {
    try { localStorage.removeItem(PENDING_SUBMIT_STORAGE_KEY); } catch (e) {}
}

async function kirimDenganRetry(fnAsync, maxPercobaan = 4, delayAwalMs = 1500, labelStatus = "") {
    let lastErr = null;
    for (let attempt = 1; attempt <= maxPercobaan; attempt++) {
        try {
            if (labelStatus && attempt > 1) {
                showLoading(`${labelStatus} (Percobaan ${attempt}/${maxPercobaan})...`);
            }
            return await fnAsync();
        } catch (err) {
            lastErr = err;
            if (attempt < maxPercobaan) {
                const jeda = delayAwalMs * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 1200);
                await new Promise(resolve => setTimeout(resolve, jeda));
            }
        }
    }
    throw lastErr;
}

async function prosesAntreanSubmitTertunda(silent = false) {
    const pending = bacaAntreanSubmitLokal();
    if (!pending || !pending.payload) return false;

    try {
        if (!silent) {
            showLoading(`Mengirim ulang hasil ujian tertunda (${pending.payload.nama || pending.payload.nis})...`);
        }
        // Gunakan endpoint terpadu submitAllExamData agar hanya 1 HTTP request ke GAS
        await postToGAS({
            action: "submitAllExamData",
            sesiData: pending.sesiData || null,
            logData: pending.logData || null,
            resultData: pending.payload
        });
        if (pending.username && pending.mapel) {
            tandaiMapelTerkunciLokal(pending.username, pending.mapel);
        }
        hapusAntreanSubmitLokal();
        hapusCadanganJawabanLokal();
        if (!silent) {
            hideLoading();
            alert(`Hasil ujian yang sebelumnya tertunda untuk ${pending.payload.nama || pending.payload.nis} berhasil dikirim ke server!`);
        }
        return true;
    } catch (err) {
        if (!silent) hideLoading();
        console.warn("Pengiriman ulang antrean tertunda belum berhasil:", err);
        return false;
    }
}

async function loadSoalUjian(jadwalMatch = null) {
    showLoading("Memuat soal ujian...");
    try {
        const kelasTrim = kelasSiswaLogin.trim();
        const paketScope = `paket_${encodeURIComponent(mapelSiswaLogin)}_${encodeURIComponent(kelasTrim)}`;
        let soalTerfilter = bacaCacheSoal(paketScope);

        if (!soalTerfilter) {
            const allSoal = await fetchAllSoalFromGist({
                preferRaw: true,
                forceRefresh: false,
                cacheScope: "raw_exam"
            });
            soalTerfilter = allSoal.filter(s => cekSoalCocokKelas(s, mapelSiswaLogin, kelasTrim));
            simpanCacheSoal(paketScope, soalTerfilter);
        }
        listSoal = siapkanSoalDanOpsiAcak(soalTerfilter);

        hideLoading();
        if(!Array.isArray(listSoal) || listSoal.length === 0) { 
            alert("Belum ada soal yang tersedia untuk mata pelajaran dan kelas Anda."); 
            return; 
        }

        const cadanganLokal = currentSiswaObj
            ? bacaCadanganJawabanLokal(currentSiswaObj.username, mapelSiswaLogin, kelasTrim)
            : null;
        if (cadanganLokal && cadanganLokal.listSoal.length === listSoal.length) {
            listSoal = cadanganLokal.listSoal;
            jawabanSiswa = cadanganLokal.jawabanSiswa || {};
            currentSoalIndex = Math.min(
                Math.max(0, Number(cadanganLokal.currentSoalIndex || 0)),
                listSoal.length - 1
            );
        } else {
            currentSoalIndex = 0;
            jawabanSiswa = {};
            simpanCadanganJawabanLokal();
        }

        setCompactMode(false);
        const jpLabel = jadwalMatch && jadwalMatch.jp ? ` • ${jadwalMatch.jp} JP` : "";
        document.getElementById('infoUjianText').innerText = `Mapel: ${mapelSiswaLogin} (${kelasTrim}${jpLabel})`;
        document.getElementById('tabMenu').style.display = 'none';
        document.getElementById('viewPilihUjianSiswa').classList.remove('active');
        document.getElementById('viewUjianSiswa').classList.add('active');
        sinkronkanHeaderAdmin();
        renderSoalSiswa();

        isExamInProgress = true;
        isSubmittingExam = false;
        mulaiTimerUjian(jadwalMatch);
        pasangPengawasAntiCurang();

        if (!isCurrentlyFullscreen()) {
            await masukFullscreenWajib();
        }
    } catch(err) { 
        hideLoading();
        alert("Gagal memuat soal: " + err.message); 
    }
}

function acakArrayFisherYates(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

function siapkanSoalDanOpsiAcak(rawSoalList) {
    const soalTeracak = acakArrayFisherYates(rawSoalList);
    return soalTeracak.map(item => {
        const kunciHurufAsli = decodeKunciGist(item.kunci);
        const daftarHurufTersedia = ['A', 'B', 'C', 'D', 'E'].filter(
            opt => item.options && item.options[opt] !== undefined && String(item.options[opt]).trim() !== ""
        );
        const pasanganOpsi = daftarHurufTersedia.map(huruf => ({
            teks: item.options[huruf],
            isBenar: huruf === kunciHurufAsli
        }));
        const pasanganTeracak = acakArrayFisherYates(pasanganOpsi);
        const optionsBaru = {};
        let kunciHurufBaru = 'A';

        pasanganTeracak.forEach((p, idx) => {
            const labelBaru = daftarHurufTersedia[idx];
            optionsBaru[labelBaru] = p.teks;
            if (p.isBenar) kunciHurufBaru = labelBaru;
        });

        return { ...item, options: optionsBaru, kunci: encodeKunciGist(kunciHurufBaru) };
    });
}

function pilihJawabanSiswa(index, opt) {
    jawabanSiswa[index] = opt;
    simpanCadanganJawabanLokal();
    renderSoalSiswa();
    if (isExamInProgress && !isCurrentlyFullscreen()) {
        masukFullscreenWajib();
    }
}

function navigasiSoal(step) {
    const nextIdx = currentSoalIndex + step;
    if (nextIdx >= 0 && nextIdx < listSoal.length) {
        currentSoalIndex = nextIdx;
        simpanCadanganJawabanLokal();
        renderSoalSiswa();
        if (isExamInProgress && !isCurrentlyFullscreen()) {
            masukFullscreenWajib();
        }
    }
}

function renderSoalSiswa() {
    if (!Array.isArray(listSoal) || listSoal.length === 0) return;

    const totalSoal = listSoal.length;
    const item = listSoal[currentSoalIndex];
    const jawabanTersimpan = jawabanSiswa[currentSoalIndex] || null;
    const jumlahTerjawab = Object.keys(jawabanSiswa).length;

    document.getElementById('labelNomorSoal').innerText = `Soal ${currentSoalIndex + 1} dari ${totalSoal}`;
    document.getElementById('labelStatusTerjawab').innerText = `Terjawab: ${jumlahTerjawab} / ${totalSoal} soal`;
    document.getElementById('btnPrevSoal').disabled = (currentSoalIndex === 0);
    document.getElementById('btnNextSoal').disabled = (currentSoalIndex === totalSoal - 1);

    let html = `<div class="soal-box"><p>Soal ${currentSoalIndex + 1}. ${item.soal}</p>`;
    if (item.gambar) {
        html += `<img src="${item.gambar}" class="img-soal">`;
    }
    html += `<div style="margin-top: 10px;">`;
    ['A', 'B', 'C', 'D', 'E'].forEach(opt => {
        if (item.options && item.options[opt]) {
            const isChecked = (jawabanTersimpan === opt);
            html += `<label class="option-label ${isChecked ? 'selected-opt' : ''}">
                <input type="radio" name="soal_aktif" value="${opt}" ${isChecked ? 'checked' : ''} onclick="pilihJawabanSiswa(${currentSoalIndex}, '${opt}')"> 
                <b>${opt}.</b> ${item.options[opt]}
            </label>`;
        }
    });
    html += `</div></div>`;

    document.getElementById('soalContainer').innerHTML = html;
}

async function selesaiUjian(isCurang = false, alasanCurang = "", isTimeUp = false) {
    if (isSubmittingExam) return;

    if (!isCurang && !isTimeUp) {
        const belumDijawab = listSoal.length - Object.keys(jawabanSiswa).length;
        const pesanKonfirmasi = belumDijawab > 0 
            ? `Masih ada ${belumDijawab} soal yang belum dijawab.\nTetap kumpulkan jawaban sekarang?`
            : "Kumpulkan jawaban sekarang?";
        if(!confirm(pesanKonfirmasi)) return;
    }

    isSubmittingExam = true;
    isExamInProgress = false;
    hentikanTimerUjian();
    lepasPengawasAntiCurang();

    showLoading(
        isCurang
            ? `PELANGGARAN TERDETEKSI (${alasanCurang})! Mengunci mapel & mengirim jawaban...`
            : (isTimeUp
                ? "WAKTU UJIAN HABIS! Otomatis menyelesaikan & mengirim jawaban ke server..."
                : "Mengirim jawaban ke server... Jangan tutup halaman!")
    );

    // Jitter acak 0-3.5 detik saat waktu habis serentak agar 1000+ siswa tidak menabrak lock GAS bersamaan
    if (isTimeUp) {
        const jitterMs = Math.floor(Math.random() * 3500);
        await new Promise(resolve => setTimeout(resolve, jitterMs));
    }

    let benar = 0;
    listSoal.forEach((item, index) => {
        const kunciAsli = decodeKunciGist(item.kunci);
        if(jawabanSiswa[index] === kunciAsli) benar++;
    });
    let nilaiAkhir = listSoal.length > 0 ? Number(((benar / listSoal.length) * 100).toFixed(2)) : 0;
    const statusSebelum = currentSiswaObj && sesiLoginSiswa[currentSiswaObj.username]
        ? sesiLoginSiswa[currentSiswaObj.username].status
        : "";
    let statusFinal = "";
    if (isCurang) {
        const tokenCurang = formatPelanggaranRingkas(alasanCurang);
        const setelahCurang = gabungRiwayatStatus(statusSebelum, tokenCurang);
        statusFinal = gabungRiwayatStatus(setelahCurang, "Selesai");
    } else if (isTimeUp) {
        const setelahWaktuHabis = gabungRiwayatStatus(statusSebelum, "Waktu Habis");
        statusFinal = gabungRiwayatStatus(setelahWaktuHabis, "Selesai");
    } else {
        statusFinal = gabungRiwayatStatus(statusSebelum, "Selesai");
    }

    if (currentSiswaObj && mapelSiswaLogin) {
        tandaiMapelTerkunciLokal(currentSiswaObj.username, mapelSiswaLogin);
    }

    const sesiData = currentSiswaObj ? {
        username: currentSiswaObj.username,
        deviceId: getOrCreateDeviceId(),
        status: statusFinal,
        nama: namaSiswaLogin,
        kelas: kelasSiswaLogin,
        mapel: mapelSiswaLogin,
        updatedAt: getLocalIsoNow()
    } : null;

    const logData = {
        action: "logLogin",
        sheetName: "DB_Log_login_CBT",
        nama: namaSiswaLogin,
        kelas: kelasSiswaLogin,
        mapel: mapelSiswaLogin,
        status: statusFinal,
        nilai: nilaiAkhir
    };

    let payload = {
        action: "submitResult", namaUjian: namaUjianAktif,
        nis: currentSiswaObj ? currentSiswaObj.username : "Siswa", nama: namaSiswaLogin,
        nilai: nilaiAkhir, jawaban: jawabanSiswa, status: statusFinal
    };

    simpanCadanganJawabanLokal();
    simpanAntreanSubmitLokal({
        username: currentSiswaObj ? currentSiswaObj.username : "",
        mapel: mapelSiswaLogin,
        sesiData: sesiData,
        logData: logData,
        payload: payload,
        createdAt: Date.now()
    });

    if (sesiData) {
        sesiLoginSiswa[sesiData.username] = sesiData;
    }

    try {
        // 1 request tunggal menggantikan 3 request terpisah (setSesi + logLogin + submitResult)
        let res = await kirimDenganRetry(
            () => postToGAS({
                action: "submitAllExamData",
                sesiData: sesiData,
                logData: logData,
                resultData: payload
            }),
            4,
            1500,
            "Antrean server padat, mencoba mengirim ulang jawaban"
        );

        if (!res.data || res.data.status !== "success") {
            throw new Error(res.data?.message || "Respons server gagal");
        }

        hapusAntreanSubmitLokal();
        hapusCadanganJawabanLokal();
        hideLoading();
        bersihkanCacheSoal();
        if (isCurrentlyFullscreen() && document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
        }
        if (isCurang) {
            alert(`UJIAN DIHENTIKAN OTOMATIS!\nAlasan: ${alasanCurang}.\nStatus: Dianggap Curang / Selesai.\nNilai Anda: ${nilaiAkhir}\n\nMata pelajaran "${mapelSiswaLogin}" kini TERKUNCI dan harus direset Admin. Anda tetap bisa memilih mapel lain yang tersedia.`);
        } else if (isTimeUp) {
            alert(`WAKTU UJIAN TELAH HABIS!\nJawaban Anda otomatis dikumpulkan dan disimpan.\nNilai Akhir: ${nilaiAkhir}\n\nMata pelajaran "${mapelSiswaLogin}" telah ditandai Selesai/Terkunci.`);
        } else {
            alert(`Ujian Selesai!\nNilai Akhir: ${nilaiAkhir}\n\nMata pelajaran "${mapelSiswaLogin}" telah ditandai Selesai/Terkunci.`);
        }

        if (currentSiswaObj) {
            await tampilkanHalamanPilihUjianSiswa(currentSiswaObj);
        } else {
            location.reload();
        }
    } catch(err) {
        hideLoading();
        isSubmittingExam = false;
        if (isCurrentlyFullscreen() && document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
        }
        alert(isCurang
            ? `UJIAN DIHENTIKAN (${alasanCurang})! Nilai: ${nilaiAkhir}.\nServer sedang sibuk / koneksi terputus, tetapi jawaban Anda AMAN tersimpan di perangkat ini. Jangan hapus data browser, tunggu beberapa detik lalu klik "Selesaikan & Kirim Ujian" atau muat ulang halaman.`
            : `Server sedang sibuk / koneksi gagal setelah 4x percobaan!\nJangan khawatir, seluruh jawaban Anda (Nilai: ${nilaiAkhir}) AMAN tersimpan di perangkat ini.\n\nTunggu 5-10 detik lalu klik tombol "Selesaikan & Kirim Ujian" lagi (atau muat ulang halaman agar terkirim otomatis).`
        );
    }
}
