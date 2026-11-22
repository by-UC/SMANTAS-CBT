// ================= TOKEN ADMIN (TAMPILAN & AKSI) =================
function updateTampilanTokenAdmin() {
    const codeEl = document.getElementById("adminTokenAktifDisplay");
    const timerEl = document.getElementById("adminTokenCountdown");
    if (!codeEl || !timerEl) return;

    codeEl.innerText = tokenDriveState.token || "----";

    if (!tokenDriveState.expiresAt) {
        timerEl.innerText = "--:--";
        return;
    }

    const estServerNow = Date.now() + (tokenDriveState.serverOffsetMs || 0);
    const remainingMs = tokenDriveState.expiresAt - estServerNow;
    const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
    timerEl.innerText = formatDetikKeMmSs(remainingSec);

    if (remainingMs <= 0 && !isSyncingTokenFromDrive) {
        fetchTokenDariDrive(true);
    }
}

function mulaiTimerTokenAdmin() {
    if (tokenCountdownTimerId) clearInterval(tokenCountdownTimerId);
    updateTampilanTokenAdmin();
    tokenCountdownTimerId = setInterval(updateTampilanTokenAdmin, 1000);
}

function sinkronkanInputPengaturanToken() {
    const inpInterval = document.getElementById("settingTokenIntervalMenit");
    const selWajib = document.getElementById("settingWajibToken");
    if (inpInterval) inpInterval.value = tokenDriveState.intervalMenit || 5;
    if (selWajib) selWajib.value = tokenDriveState.wajibToken !== false ? "true" : "false";
    updateTampilanTokenAdmin();
}

async function simpanPengaturanToken() {
    const intervalVal = parseInt(document.getElementById("settingTokenIntervalMenit").value, 10);
    const wajibVal = document.getElementById("settingWajibToken").value === "true";

    if (isNaN(intervalVal) || intervalVal < 1) {
        alert("Interval ganti token minimal 1 menit!");
        return;
    }

    showLoading("Menyimpan pengaturan token...");
    try {
        const res = await postToGAS({
            action: "saveTokenConfig",
            intervalMenit: intervalVal,
            wajibToken: wajibVal,
            regenerate: false
        });
        if (res.data && res.data.status === "success" && res.data.data) {
            const d = res.data.data;
            const serverNow = Number(d.serverNow || Date.now());
            tokenDriveState = {
                token: String(d.token || "----"),
                intervalMenit: parseInt(d.intervalMenit, 10) || intervalVal,
                wajibToken: d.wajibToken !== false,
                expiresAt: Number(d.expiresAt || 0),
                serverOffsetMs: serverNow - Date.now()
            };
            sinkronkanInputPengaturanToken();
            sinkronkanTampilanInputTokenSiswa();
            hideLoading();
            alert(`Berhasil! Pengaturan token diperbarui (interval ${intervalVal} menit).`);
        } else {
            hideLoading();
            alert("Gagal menyimpan token: " + (res.data?.message || "Unknown error"));
        }
    } catch (e) {
        hideLoading();
        alert("Gagal terhubung ke GAS saat menyimpan token: " + e.message);
    }
}

async function acakUlangTokenDrive() {
    if (!confirm("Acak ulang token 4 digit sekarang?")) return;
    showLoading("Mengacak ulang token...");
    try {
        const res = await postToGAS({
            action: "saveTokenConfig",
            intervalMenit: tokenDriveState.intervalMenit || 5,
            wajibToken: tokenDriveState.wajibToken !== false,
            regenerate: true
        });
        if (res.data && res.data.status === "success" && res.data.data) {
            const d = res.data.data;
            const serverNow = Number(d.serverNow || Date.now());
            tokenDriveState = {
                token: String(d.token || "----"),
                intervalMenit: parseInt(d.intervalMenit, 10) || 5,
                wajibToken: d.wajibToken !== false,
                expiresAt: Number(d.expiresAt || 0),
                serverOffsetMs: serverNow - Date.now()
            };
            updateTampilanTokenAdmin();
        }
    } catch (e) {
        alert("Gagal mengacak token: " + e.message);
    }
    hideLoading();
}

async function salinTokenDrive() {
    const tokenVal = String(tokenDriveState.token || "").trim();
    if (!tokenVal || tokenVal === "----") {
        alert("Token belum tersedia untuk disalin.");
        return;
    }
    const teksSalin = `Token : ${tokenVal}`;
    const btn = document.getElementById("btnSalinTokenDrive");
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(teksSalin);
        } else {
            const ta = document.createElement("textarea");
            ta.value = teksSalin;
            ta.style.position = "fixed";
            ta.style.opacity = "0";
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            ta.remove();
        }
        if (btn) {
            const origText = btn.innerText;
            btn.innerText = "✔ Tersalin!";
            btn.style.background = "#28a745";
            setTimeout(() => {
                btn.innerText = origText;
                btn.style.background = "";
            }, 1600);
        }
    } catch (e) {
        alert("Gagal menyalin token: " + e.message);
    }
}

// ================= AUTH & NAVIGASI PANEL ADMIN =================
function toggleRoleLogin() {
    const btn = document.getElementById('btnRoleToggle');
    document.querySelectorAll('.section-view').forEach(sec => sec.classList.remove('active'));
    document.getElementById('errorAdmin').style.display = 'none';

    if (currentLoginRole === 'siswa') {
        currentLoginRole = 'admin';
        btn.innerText = "Login Admin";
        btn.classList.add('admin-mode');

        if (localStorage.getItem("isAdminLoggedIn") === "true") {
            setCompactMode(false);
            document.getElementById('viewPanelAdmin').classList.add('active');
            document.getElementById('tabMenu').style.display = 'none';
            sinkronkanHeaderAdmin();
            switchAdminTab('monitoring');
        } else {
            setCompactMode(true);
            document.getElementById('viewLoginAdmin').classList.add('active');
        }
    } else {
        currentLoginRole = 'siswa';
        btn.innerText = "Login Siswa";
        btn.classList.remove('admin-mode');
        setCompactMode(true);

        if (currentSiswaObj) {
            renderOpsiMapelUntukSiswa(currentSiswaObj);
            sinkronkanTampilanInputTokenSiswa();
            document.getElementById('viewPilihUjianSiswa').classList.add('active');
        } else {
            document.getElementById('viewLoginSiswa').classList.add('active');
        }
    }
    sinkronkanHeaderAdmin();
}

function getAdminPasswordPlain() {
    return localStorage.getItem("adminPasswordPlain") || pengaturanCbt.adminPasswordPlain || "admin123";
}

function getAdminPasswordHash() {
    return CryptoJS.SHA256(getAdminPasswordPlain()).toString();
}

function renderAdminPasswordDisplay() {
    const span = document.getElementById('currentAdminPassDisplay');
    const btn = document.getElementById('btnTogglePassAdmin');
    if (!span || !btn) return;
    const plain = getAdminPasswordPlain();
    if (isAdminPassVisible) {
        span.innerText = plain;
        btn.innerText = "Sembunyikan";
    } else {
        span.innerText = "•".repeat(plain.length);
        btn.innerText = "Lihat";
    }
}

function toggleLihatPasswordAdmin() {
    isAdminPassVisible = !isAdminPassVisible;
    renderAdminPasswordDisplay();
}

async function ubahPasswordAdmin() {
    const newPass = document.getElementById('newAdminPassword').value.trim();
    if (!newPass) { alert("Password baru kosong!"); return; }
    showLoading("Menyimpan password admin baru...");
    localStorage.setItem("adminPasswordPlain", newPass);
    localStorage.setItem("adminPasswordHash", CryptoJS.SHA256(newPass).toString());
    pengaturanCbt.adminPasswordPlain = newPass;
    await saveCbtDatabaseToGist();
    hideLoading();
    renderAdminPasswordDisplay();
    alert("Password admin berhasil diubah!");
    document.getElementById('newAdminPassword').value = "";
}

async function simpanPengaturanJp() {
    const val = parseInt(document.getElementById('settingMenitPerJp').value, 10);
    if (isNaN(val) || val < 1) {
        alert("Masukkan durasi menit per JP yang valid (minimal 1 menit)!");
        return;
    }
    showLoading("Menyimpan pengaturan JP ke Gist...");
    pengaturanCbt.menitPerJp = val;
    await saveCbtDatabaseToGist();
    updateLabelJp();
    hitungWaktuSelesaiOtomatis();
    hideLoading();
    alert(`Pengaturan berhasil disimpan! 1 JP = ${val} Menit.`);
}

function updateLabelJp() {
    const m = pengaturanCbt.menitPerJp || 40;
    const lbl = document.getElementById('labelJumlahJp');
    if (lbl) lbl.innerText = `JP (${m}m):`;
    const inp = document.getElementById('settingMenitPerJp');
    if (inp) inp.value = m;
}

function hitungWaktuSelesaiOtomatis() {
    const mulaiStr = document.getElementById('waktuMulai').value;
    const jp = parseInt(document.getElementById('jumlahJp').value, 10);
    const menitPerJp = parseInt(pengaturanCbt.menitPerJp, 10) || 40;

    if (!mulaiStr || isNaN(jp) || jp < 1) return;
    const startDate = new Date(mulaiStr);
    if (isNaN(startDate.getTime())) return;

    const totalMenit = jp * menitPerJp;
    const endDate = new Date(startDate.getTime() + totalMenit * 60000);
    const pad = (n) => String(n).padStart(2, '0');
    const formattedEnd = `${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())}T${pad(endDate.getHours())}:${pad(endDate.getMinutes())}`;
    document.getElementById('waktuSelesai').value = formattedEnd;
}

function switchAdminTab(tabName) {
    document.querySelectorAll('.admin-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.admin-view').forEach(view => view.classList.remove('active'));
    sinkronkanHeaderAdmin();

    if (tabName === 'monitoring') {
        document.querySelector('.admin-tab-btn:nth-child(1)').classList.add('active');
        document.getElementById('adminTabMonitoring').classList.add('active');
        fetchTokenDariDrive(true);
        mulaiTimerTokenAdmin();
        fetchSesiFromGAS(true);
        fetchLogLoginFromGAS();
    } else if (tabName === 'ujian') {
        document.querySelector('.admin-tab-btn:nth-child(2)').classList.add('active');
        document.getElementById('adminTabUjian').classList.add('active');
        updateLabelJp();
        renderTabelJadwal();
    } else if (tabName === 'master') {
        document.querySelector('.admin-tab-btn:nth-child(3)').classList.add('active');
        document.getElementById('adminTabMaster').classList.add('active');
        renderListMaster();
    } else if (tabName === 'siswa') {
        document.querySelector('.admin-tab-btn:nth-child(4)').classList.add('active');
        document.getElementById('adminTabSiswa').classList.add('active');
        initDropdowns();
        renderTabelDaftarSiswa();
    } else if (tabName === 'settings') {
        document.querySelector('.admin-tab-btn:nth-child(5)').classList.add('active');
        document.getElementById('adminTabSettings').classList.add('active');
        fetchTokenDariDrive(true);
        updateLabelJp();
        renderAdminPasswordDisplay();
        cekRateLimitGistApi(true);
    }
}

function prosesLoginAdmin() {
    let pass = document.getElementById('adminPassword').value;
    if (CryptoJS.SHA256(pass).toString() === getAdminPasswordHash()) {
        localStorage.setItem("isAdminLoggedIn", "true");
        setCompactMode(false);
        document.getElementById('tabMenu').style.display = 'none';
        document.getElementById('viewLoginAdmin').classList.remove('active');
        document.getElementById('viewPanelAdmin').classList.add('active');
        sinkronkanHeaderAdmin();
        switchAdminTab('monitoring');
    } else {
        document.getElementById('errorAdmin').style.display = 'block';
    }
}

function logoutAdmin() {
    localStorage.removeItem("isAdminLoggedIn");
    location.reload();
}

function refreshUISetelahDbMaster() {
    initDropdowns();
    renderTabelDaftarSiswa();
    renderTabelJadwal();
    renderTabelSesiAktif();
    updateLabelJp();
    renderAdminPasswordDisplay();
}

// ================= SIMPAN DATABASE KE GIST =================
async function saveCbtDatabaseToGist() {
    let payloadData = {
        db_kelas: daftarKelas,
        db_mapel: daftarMapel,
        db_siswa: databaseSiswa,
        db_jadwal: daftarJadwalUjian,
        db_pengaturan: pengaturanCbt
    };

    const githubHeaders = { headers: { "Authorization": `token ${GIST_TOKEN}` } };
    const serialized = JSON.stringify(payloadData);
    try {
        await axios.patch(`https://api.github.com/gists/${CBT_GIST_ID}`, {
            files: { "db_cbt.json": { content: serialized } }
        }, githubHeaders);
        simpanCacheCbtMaster(payloadData);
        isDataLoadedOnce = true;
    } catch (err) {
        try {
            let gistRes = await axios.get(`https://api.github.com/gists/${CBT_GIST_ID}?t=${Date.now()}`, githubHeaders);
            let filename = Object.keys(gistRes.data.files)[0];
            await axios.patch(`https://api.github.com/gists/${CBT_GIST_ID}`, {
                files: { [filename]: { content: serialized } }
            }, githubHeaders);
            simpanCacheCbtMaster(payloadData);
            isDataLoadedOnce = true;
        } catch (err2) {
            alert("Gagal menyimpan ke Gist: " + err2.message);
        }
    }
}

async function cekRateLimitGistApi(silent = false) {
    const remEl = document.getElementById('gistLimitRemaining');
    const usedEl = document.getElementById('gistLimitUsed');
    const resetEl = document.getElementById('gistLimitReset');
    const statusEl = document.getElementById('gistLimitStatus');

    if (!silent && remEl) remEl.innerText = "Memuat...";
    try {
        const res = await axios.get(`https://api.github.com/rate_limit?t=${Date.now()}`, {
            headers: { "Authorization": `token ${GIST_TOKEN}` }
        });
        const core = res.data?.resources?.core || res.data?.rate || {};
        const limit = Number(core.limit || 5000);
        const remaining = Number(core.remaining ?? 0);
        const used = Number(core.used ?? (limit - remaining));
        const resetEpoch = Number(core.reset || 0);

        let resetStr = "-";
        if (resetEpoch > 0) {
            const d = new Date(resetEpoch * 1000);
            const pad = (n) => String(n).padStart(2, '0');
            resetStr = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} WIB`;
        }

        if (remEl) {
            remEl.innerText = `${remaining} / ${limit}`;
            remEl.style.color = remaining > 500 ? "#28a745" : (remaining > 100 ? "#fd7e14" : "#dc3545");
        }
        if (usedEl) usedEl.innerText = `${used} req`;
        if (resetEl) resetEl.innerText = resetStr;
        if (statusEl) {
            statusEl.innerText = remaining > 500 ? "Aman (Raw-First Aktif)" : "Waspada Kuota Menipis";
            statusEl.style.color = remaining > 500 ? "#008080" : "#dc3545";
        }
    } catch (e) {
        if (remEl) {
            remEl.innerText = "Gagal cek";
            remEl.style.color = "#dc3545";
        }
        if (!silent) {
            alert("Gagal mengecek limit GitHub Gist API: " + (e.response?.data?.message || e.message));
        }
    }
}

// ================= MONITORING SESI & LOG SPREADSHEET =================
function renderStatusBadgesHtml(statusStr) {
    const raw = String(statusStr || "").trim();
    if (!raw || raw === "-") return `<span class="status-pill status-pill-login">-</span>`;

    const rawParts = raw.split(",").map(s => s.trim()).filter(Boolean);
    const parts = [];
    rawParts.forEach(part => {
        const mGabung = part.match(/^Selesai\s*\((Curang[\s\S]*)\)$/i);
        if (mGabung) {
            parts.push("Selesai");
            parts.push(mGabung[1].trim());
        } else {
            parts.push(part);
        }
    });

    const pills = parts.map(part => {
        const low = part.toLowerCase();
        let cls = "status-pill-login";
        if (low.startsWith("selesai")) cls = "status-pill-selesai";
        else if (low.includes("curang")) cls = "status-pill-curang";
        else if (low.includes("reset")) cls = "status-pill-reset";
        else if (low.includes("sedang")) cls = "status-pill-ujian";
        return `<span class="status-pill ${cls}">${part}</span>`;
    });

    return `<div class="status-pill-wrap">${pills.join("")}</div>`;
}

async function fetchLogLoginFromGAS() {
    try {
        let res = await postToGAS({ action: "getLogLogin", sheetName: "DB_Log_login_CBT" });
        if (res.data && res.data.status === "success") {
            logSiswaLogin = Array.isArray(res.data.data) ? res.data.data : [];
        }
    } catch (e) {
        console.error("Gagal mengambil log login dari GAS:", e);
    }
    renderTabelSiswaLogin();
    renderTabelSesiAktif();
}

async function hapusBarisLogSpreadsheet(index) {
    if (!Array.isArray(logSiswaLogin) || index < 0 || index >= logSiswaLogin.length) return;
    const row = logSiswaLogin[index];
    const infoLabel = `${row.nama || "-"} (${row.kelas || "-"} - ${row.mapel || "-"})`;
    if (!confirm(`Hapus baris log untuk ${infoLabel}?`)) return;

    showLoading("Menghapus baris log terpilih di Spreadsheet...");
    try {
        const res = await postToGAS({
            action: "deleteLogRow",
            sheetName: "DB_Log_login_CBT",
            index: index,
            nama: row.nama || "",
            kelas: row.kelas || "",
            mapel: row.mapel || "",
            status: row.status || ""
        });
        if (res.data && res.data.status === "success") {
            await fetchLogLoginFromGAS();
            hideLoading();
        } else {
            logSiswaLogin.splice(index, 1);
            renderTabelSiswaLogin();
            hideLoading();
            alert("Gagal menghapus baris log di Spreadsheet: " + (res.data?.message || "Unknown error"));
        }
    } catch (e) {
        logSiswaLogin.splice(index, 1);
        renderTabelSiswaLogin();
        hideLoading();
        alert("Gagal menghapus baris log: " + e.message);
    }
}

async function hapusSemuaLogSpreadsheet() {
    const jumlahLog = Array.isArray(logSiswaLogin) ? logSiswaLogin.length : 0;
    if (jumlahLog === 0) {
        alert("Tidak ada data log pengerjaan & nilai untuk dihapus.");
        return;
    }
    if (!confirm(`PERINGATAN! Yakin ingin menghapus SEMUA data Log Pengerjaan & Nilai Siswa (${jumlahLog} baris)?`)) return;
    if (!confirm("Konfirmasi terakhir: Seluruh log pengerjaan & nilai siswa akan dihapus permanen. Lanjutkan?")) return;

    showLoading("Menghapus seluruh log pengerjaan & nilai di Spreadsheet...");
    try {
        const res = await postToGAS({ action: "clearLogLogin", sheetName: "DB_Log_login_CBT" });
        logSiswaLogin = [];
        renderTabelSiswaLogin();
        hideLoading();
        if (res.data && res.data.status === "success") {
            alert("Seluruh log pengerjaan & nilai siswa berhasil dihapus!");
        }
    } catch (e) {
        hideLoading();
        alert("Gagal menghapus log di Spreadsheet: " + e.message);
    }
}

function resetCariNamaSesi() {
    const inp = document.getElementById('inputCariNamaSesi');
    if (inp) inp.value = "";
    renderTabelSesiAktif();
}

function isJadwalMapelSesuaiUntukKelas(mapelName, kelasName, options = {}) {
    const targetMapel = normStr(mapelName);
    const targetKelas = normStr(kelasName);
    if (!targetMapel || !targetKelas) return false;

    const requireActiveTime = options.requireActiveTime === true;
    const nowMs = Date.now();

    return (Array.isArray(daftarJadwalUjian) ? daftarJadwalUjian : []).some(j => {
        if (!j) return false;
        const mapelMatch = normStr(j.mapel) === targetMapel;
        const kelasMatch = normStr(j.kelas) === targetKelas;
        if (!mapelMatch || !kelasMatch) return false;

        if (!requireActiveTime) return true;

        const startMs = parseJadwalDateTimeMs(j.mulai);
        const endMs = parseJadwalDateTimeMs(j.selesai);
        if (isNaN(startMs) || isNaN(endMs)) return false;
        return nowMs >= startMs && nowMs <= endMs;
    });
}

// Hanya menampilkan mapel yang sesuai jadwal (dan rentang waktu aktif jadwal) untuk kelas siswa tersebut
function kumpulkanMapelAktifSiswa(username, sesiObj) {
    const mapelSet = new Map();
    const kelasNorm = normStr(sesiObj && sesiObj.kelas ? sesiObj.kelas : "");
    if (!kelasNorm) return [];

    const jadwalOptions = { requireActiveTime: true };

    const addMapelJikaSesuaiJadwal = (m) => {
        const clean = String(m || "").trim();
        if (!clean || clean === "-") return;
        if (!isJadwalMapelSesuaiUntukKelas(clean, kelasNorm, jadwalOptions)) return;
        const key = normStr(clean);
        if (!mapelSet.has(key)) mapelSet.set(key, clean);
    };

    if (sesiObj && sesiObj.mapel) addMapelJikaSesuaiJadwal(sesiObj.mapel);

    const lockedArr = bacaLockedMapelLokal(username);
    lockedArr.forEach(mNorm => {
        const matched = daftarMapel.find(dm => normStr(dm) === mNorm);
        addMapelJikaSesuaiJadwal(matched || mNorm);
    });

    const namaNorm = normStr(sesiObj && sesiObj.nama ? sesiObj.nama : "");
    if (Array.isArray(logSiswaLogin) && namaNorm) {
        logSiswaLogin.forEach(l => {
            const cocokNama = normStr(l.nama) === namaNorm;
            const cocokKelas = !l.kelas || normStr(l.kelas) === kelasNorm;
            if (cocokNama && cocokKelas && l.mapel) addMapelJikaSesuaiJadwal(l.mapel);
        });
    }

    if (mapelSet.size === 0) {
        daftarJadwalUjian.forEach(j => {
            if (normStr(j.kelas) === kelasNorm && j.mapel) {
                addMapelJikaSesuaiJadwal(j.mapel);
            }
        });
    }

    return Array.from(mapelSet.values());
}

function buatTombolResetAksiHtml(username, sesiObj) {
    const mapelAktifList = kumpulkanMapelAktifSiswa(username, sesiObj);
    const unameEnc = encodeURIComponent(username);
    const btns = [];

    mapelAktifList.forEach(mp => {
        const mpEnc = encodeURIComponent(mp);
        btns.push(`<button type="button" onclick="resetMapelSiswaAdmin('${unameEnc}', '${mpEnc}')" class="btn-reset-mapel">Reset-${mp}</button>`);
    });

    btns.push(`<button type="button" onclick="resetPerangkatSiswaAdmin('${unameEnc}')" class="btn-reset-perangkat">Reset-Perangkat</button>`);
    return `<div class="reset-aksi-group">${btns.join("")}</div>`;
}

function renderTabelSesiAktif() {
    const tbody = document.getElementById('tbodySesiAktif');
    if (!tbody) return;
    tbody.innerHTML = "";

    const keys = Object.keys(sesiLoginSiswa);
    if (keys.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Tidak ada siswa yang sedang terkunci sesi / login aktif di GAS.</td></tr>`;
        return;
    }

    const keyword = (document.getElementById('inputCariNamaSesi')?.value || "").trim().toLowerCase();
    let tampilCount = 0;

    keys.forEach(username => {
        const s = sesiLoginSiswa[username];
        if (!s) return;
        if (keyword && !String(s.nama || "").toLowerCase().includes(keyword)) return;
        tampilCount++;
        let statusBadge = renderStatusBadgesHtml(s.status || 'Login Aktif');
        const aksiHtml = buatTombolResetAksiHtml(username, s);

        tbody.innerHTML += `<tr>
            <td><b>${username}</b></td>
            <td>${s.nama || '-'}</td>
            <td>${s.kelas || '-'}</td>
            <td>${statusBadge}</td>
            <td style="font-family:monospace; font-size:10.5px;">${s.deviceId || '-'}</td>
            <td>${aksiHtml}</td>
        </tr>`;
    });

    if (tampilCount === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Siswa dengan nama "${keyword}" tidak ditemukan pada sesi aktif.</td></tr>`;
    }
}

async function resetMapelSiswaAdmin(usernameEnc, mapelEnc) {
    const username = decodeURIComponent(usernameEnc);
    const mapel = decodeURIComponent(mapelEnc);
    const sesiLama = sesiLoginSiswa[username] || {
        username: username, deviceId: "", status: "Login Aktif", nama: "", kelas: "", mapel: mapel
    };

    if (!isJadwalMapelSesuaiUntukKelas(mapel, sesiLama.kelas, { requireActiveTime: true })) {
        alert(`Mapel "${mapel}" berada di luar jadwal aktif kelas ${sesiLama.kelas || "-"} sehingga tidak bisa di-reset langsung. Silakan hapus log atau sesuaikan jadwal ujian.`);
        renderTabelSesiAktif();
        return;
    }

    if (!confirm(`Reset ujian mata pelajaran "${mapel}" untuk akun "${username}"?`)) return;

    showLoading(`Mereset mapel ${mapel} untuk ${username}...`);
    tandaiMapelDiresetLokal(username, mapel);

    try {
        await postToGAS({
            action: "resetMapelSiswa",
            sheetName: "DB_Log_login_CBT",
            username: username,
            nama: sesiLama.nama || "",
            kelas: sesiLama.kelas || "",
            mapel: mapel
        });
    } catch (e) {}

    await setSesiToGAS({
        username: username,
        deviceId: sesiLama.deviceId || "",
        status: `Reset-${mapel} (Direset)`,
        nama: sesiLama.nama || "",
        kelas: sesiLama.kelas || "",
        mapel: mapel,
        updatedAt: getLocalIsoNow()
    });

    await fetchSesiFromGAS(true);
    await fetchLogLoginFromGAS();
    hideLoading();
    alert(`Ujian mapel "${mapel}" untuk "${username}" berhasil di-reset!`);
}

async function resetPerangkatSiswaAdmin(usernameEnc) {
    const username = decodeURIComponent(usernameEnc);
    if (!confirm(`Reset kunci perangkat untuk akun "${username}"?`)) return;

    showLoading(`Mereset kunci perangkat untuk ${username}...`);
    await deleteSesiFromGAS(username);
    await fetchSesiFromGAS(true);
    hideLoading();
    alert(`Kunci perangkat untuk "${username}" berhasil di-reset!`);
}

async function refreshSemuaDataAdmin() {
    showLoading("Menghapus cache lokal & mengambil data terbaru...");
    bersihkanCacheLokalLama();
    isDataLoadedOnce = false;
    await fetchCbtDatabase(true, true);
    await fetchTokenDariDrive(true);
    await fetchSesiFromGAS(true);
    await fetchLogLoginFromGAS();
    hideLoading();
}

function renderTabelSiswaLogin() {
    let tbody = document.getElementById('tbodySiswaLogin');
    if (!tbody) return;
    tbody.innerHTML = "";

    const keyword = (document.getElementById('inputCariNamaLog')?.value || "").trim().toLowerCase();
    if (!Array.isArray(logSiswaLogin) || logSiswaLogin.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Belum ada siswa yang login/mengerjakan ujian.</td></tr>`;
        return;
    }

    let tampilCount = 0;
    logSiswaLogin.forEach((l, idx) => {
        if (!l) return;
        if (keyword && !String(l.nama || "").toLowerCase().includes(keyword)) return;
        tampilCount++;
        let badgeStatus = renderStatusBadgesHtml(l.status);
        tbody.innerHTML += `<tr>
            <td>${l.nama}</td>
            <td>${l.kelas}</td>
            <td>${l.mapel}</td>
            <td>${badgeStatus}</td>
            <td>${l.nilai !== null && l.nilai !== undefined ? l.nilai : "-"}</td>
            <td>
                <button type="button" onclick="hapusBarisLogSpreadsheet(${idx})" class="btn-sm btn-danger" style="margin:0;">Hapus Log</button>
            </td>
        </tr>`;
    });

    if (tampilCount === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Data log dengan nama "${keyword}" tidak ditemukan.</td></tr>`;
    }
}

// ================= BACKUP, RESTORE & RESET DB =================
function backupDatabaseJson() {
    const backupObj = {
        exportedAt: new Date().toISOString(),
        db_kelas: daftarKelas,
        db_mapel: daftarMapel,
        db_siswa: databaseSiswa,
        db_jadwal: daftarJadwalUjian,
        db_sesi_gas: sesiLoginSiswa,
        db_pengaturan: pengaturanCbt
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupObj, null, 2));
    const a = document.createElement('a');
    const tgl = new Date().toISOString().slice(0, 10);
    a.setAttribute("href", dataStr);
    a.setAttribute("download", `backup_smantas_cbt_${tgl}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
}

function restoreDatabaseJson(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!confirm("Apakah Anda yakin ingin me-restore database dari file ini?")) {
        event.target.value = "";
        return;
    }

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const parsed = JSON.parse(e.target.result);
            if (!parsed || typeof parsed !== 'object') throw new Error("Format JSON tidak valid.");
            showLoading("Merestore database ke GitHub Gist...");
            if (Array.isArray(parsed.db_kelas)) daftarKelas = parsed.db_kelas;
            if (Array.isArray(parsed.db_mapel)) daftarMapel = parsed.db_mapel;
            if (Array.isArray(parsed.db_siswa)) databaseSiswa = parsed.db_siswa;
            if (Array.isArray(parsed.db_jadwal)) daftarJadwalUjian = parsed.db_jadwal;
            if (parsed.db_pengaturan && typeof parsed.db_pengaturan === 'object') {
                pengaturanCbt = { ...pengaturanCbt, ...parsed.db_pengaturan };
                if (parsed.db_pengaturan.adminPasswordPlain) {
                    localStorage.setItem("adminPasswordPlain", parsed.db_pengaturan.adminPasswordPlain);
                }
            }
            await saveCbtDatabaseToGist();
            refreshUISetelahDbMaster();
            hideLoading();
            alert("Database berhasil direstore dan disinkronkan ke Gist!");
        } catch (err) {
            hideLoading();
            alert("Gagal restore database: " + err.message);
        }
        event.target.value = "";
    };
    reader.readAsText(file);
}

async function hapusDatabaseGist() {
    if (!confirm("PERINGATAN! Semua data Siswa, Jadwal Ujian di Gist, Sesi & Log di GAS, file Hasil Ujian, serta gambar soal di Drive akan dihapus permanen. Lanjutkan?")) return;
    if (!confirm("Konfirmasi terakhir: Yakin ingin mereset seluruh database?")) return;

    showLoading("Menghapus database Gist & membersihkan GAS/Drive...");
    databaseSiswa = [];
    daftarJadwalUjian = [];
    sesiLoginSiswa = {};
    logSiswaLogin = [];

    await saveCbtDatabaseToGist();
    try {
        await postToGAS({ action: "resetAllSesiAndLog", includeDriveAssets: true });
    } catch (e) {}

    renderTabelDaftarSiswa();
    renderTabelJadwal();
    renderTabelSesiAktif();
    renderTabelSiswaLogin();
    hideLoading();
    alert("Seluruh database berhasil dihapus/direset!");
}

// ================= MASTER KELAS & MAPEL =================
function initDropdowns() {
    let jdMp = document.getElementById('jadwalMapel');
    let checkboxContainer = document.getElementById('checkboxKelasContainer');
    let selKelasSatuan = document.getElementById('selectKelasSiswaSatuan');
    let selFilterKartu = document.getElementById('filterKelasKartu');

    if (jdMp) {
        jdMp.innerHTML = '<option value="">-- Pilih Mapel --</option>';
        daftarMapel.forEach(m => jdMp.innerHTML += `<option value="${m}">${m}</option>`);
    }

    if (selKelasSatuan) {
        const prevVal = selKelasSatuan.value;
        selKelasSatuan.innerHTML = '<option value="">-- Pilih Kelas --</option>';
        daftarKelas.forEach(k => selKelasSatuan.innerHTML += `<option value="${k}">${k}</option>`);
        if (prevVal) selKelasSatuan.value = prevVal;
    }

    if (selFilterKartu) {
        const prevFilter = selFilterKartu.value;
        selFilterKartu.innerHTML = '<option value="">Semua Kelas</option>';
        daftarKelas.forEach(k => selFilterKartu.innerHTML += `<option value="${k}">${k}</option>`);
        if (prevFilter) selFilterKartu.value = prevFilter;
    }

    if (checkboxContainer) renderCheckboxKelasPerBaris(checkboxContainer);
    renderListMaster();
}

function renderCheckboxKelasPerBaris(container) {
    container.innerHTML = "";
    const colsPerRow = 7;

    for (let i = 0; i < daftarKelas.length; i += colsPerRow) {
        const rowChunk = daftarKelas.slice(i, i + colsPerRow);
        const rowIndex = Math.floor(i / colsPerRow);
        const rowDiv = document.createElement("div");
        rowDiv.className = "kelas-row-line";
        rowDiv.setAttribute("data-row-idx", rowIndex);

        rowChunk.forEach(k => {
            const lbl = document.createElement("label");
            lbl.title = k;
            const cb = document.createElement("input");
            cb.type = "checkbox";
            cb.name = "kelasCheck";
            cb.value = k;
            cb.setAttribute("data-row-idx", rowIndex);
            cb.onchange = () => sinkronkanTombolPilihBaris(rowIndex);
            lbl.appendChild(cb);
            lbl.appendChild(document.createTextNode(" " + k));
            rowDiv.appendChild(lbl);
        });

        const btnAll = document.createElement("button");
        btnAll.type = "button";
        btnAll.className = "btn-pilih-baris";
        btnAll.id = `btnPilihBaris_${rowIndex}`;
        btnAll.title = "Pilih / Batal pilih semua kelas pada baris ini";
        btnAll.innerText = "All";
        btnAll.onclick = () => togglePilihBarisKelas(rowIndex);
        rowDiv.appendChild(btnAll);

        container.appendChild(rowDiv);
    }
}

function togglePilihBarisKelas(rowIndex) {
    const checkboxes = Array.from(document.querySelectorAll(`input[name="kelasCheck"][data-row-idx="${rowIndex}"]`));
    if (checkboxes.length === 0) return;
    const semuaSudahTercentang = checkboxes.every(cb => cb.checked);
    checkboxes.forEach(cb => { cb.checked = !semuaSudahTercentang; });
    sinkronkanTombolPilihBaris(rowIndex);
}

function sinkronkanTombolPilihBaris(rowIndex) {
    const checkboxes = Array.from(document.querySelectorAll(`input[name="kelasCheck"][data-row-idx="${rowIndex}"]`));
    const btn = document.getElementById(`btnPilihBaris_${rowIndex}`);
    if (!btn || checkboxes.length === 0) return;
    if (checkboxes.every(cb => cb.checked)) btn.classList.add("active-all");
    else btn.classList.remove("active-all");
}

function renderMatrixCategoryGrid(containerEl, items, maxRowsPerCol, onDeleteFnName) {
    if (!containerEl) return;
    containerEl.innerHTML = "";
    const total = items.length;
    if (total === 0) {
        containerEl.style.gridTemplateColumns = "1fr";
        containerEl.style.gridAutoFlow = "row";
        containerEl.innerHTML = `<div style="color:#777; font-size:12px; padding:4px 0;">Belum ada data.</div>`;
        return;
    }

    const maxCols = 3;
    const maxCap3Cols = maxRowsPerCol * maxCols;
    let numCols, numRows;

    if (total <= maxCap3Cols) {
        numCols = Math.min(maxCols, Math.ceil(total / maxRowsPerCol));
        numRows = Math.min(maxRowsPerCol, total);
    } else {
        numCols = maxCols;
        const extraItems = total - maxCap3Cols;
        numRows = maxRowsPerCol + Math.ceil(extraItems / maxCols);
    }

    containerEl.style.gridTemplateColumns = `repeat(${numCols}, minmax(130px, 1fr))`;
    containerEl.style.gridTemplateRows = `repeat(${numRows}, auto)`;
    containerEl.style.gridAutoFlow = "column";

    items.forEach((labelText, idx) => {
        const div = document.createElement("div");
        div.className = "master-matrix-item";
        div.innerHTML = `
            <span class="item-label" title="${labelText}">${labelText}</span>
            <button type="button" onclick="${onDeleteFnName}(${idx})" style="padding:1.5px 5px; font-size:10px; background:#dc3545; color:white; width:auto; border:none; border-radius:3px; cursor:pointer; flex-shrink:0;">Hapus</button>
        `;
        containerEl.appendChild(div);
    });
}

function renderListMaster() {
    renderMatrixCategoryGrid(document.getElementById('listKelas'), daftarKelas, 7, "hapusKelas");
    renderMatrixCategoryGrid(document.getElementById('listMapel'), daftarMapel, 10, "hapusMapel");
}

async function tambahKelas() {
    let k = document.getElementById('inputKelasBaru').value.trim();
    if (!k) return;
    if (daftarKelas.includes(k)) { alert("Kelas sudah ada!"); return; }
    showLoading("Menyimpan kelas...");
    daftarKelas.push(k);
    document.getElementById('inputKelasBaru').value = "";
    await saveCbtDatabaseToGist();
    initDropdowns();
    hideLoading();
}

async function hapusKelas(index) {
    if (!confirm("Yakin ingin menghapus kelas ini?")) return;
    showLoading("Menghapus kelas...");
    daftarKelas.splice(index, 1);
    await saveCbtDatabaseToGist();
    initDropdowns();
    hideLoading();
}

async function tambahMapel() {
    let m = document.getElementById('inputMapelBaru').value.trim();
    if (!m) return;
    if (daftarMapel.includes(m)) { alert("Mapel sudah ada!"); return; }
    showLoading("Menyimpan mata pelajaran...");
    daftarMapel.push(m);
    document.getElementById('inputMapelBaru').value = "";
    await saveCbtDatabaseToGist();
    initDropdowns();
    hideLoading();
}

async function hapusMapel(index) {
    if (!confirm("Yakin ingin menghapus mata pelajaran ini?")) return;
    showLoading("Menghapus mata pelajaran...");
    daftarMapel.splice(index, 1);
    await saveCbtDatabaseToGist();
    initDropdowns();
    hideLoading();
}

// ================= DATA SISWA & CETAK KARTU 3 CM =================
function buatHtmlKartuSiswa(daftar) {
    return daftar.map(s => `
        <div class="kartu-siswa-3cm">
            <div class="kartu-3cm-top">
                <span>KARTU CBT</span>
                <span>${s.kelas || '-'}</span>
            </div>
            <div class="kartu-3cm-nama" title="${s.nama || '-'}">${s.nama || '-'}</div>
            <div class="kartu-3cm-cred">
                <div class="kartu-3cm-cred-row">
                    <span class="kartu-3cm-cred-label">User:</span>
                    <span class="kartu-3cm-cred-val">${s.username || '-'}</span>
                </div>
                <div class="kartu-3cm-cred-row">
                    <span class="kartu-3cm-cred-label">Pass:</span>
                    <span class="kartu-3cm-cred-val">${s.password || '-'}</span>
                </div>
            </div>
        </div>
    `).join("");
}

function getSiswaTersaringSaatIni() {
    const keyword = (document.getElementById('inputCariNamaSiswa')?.value || "").trim().toLowerCase();
    const kelasFilter = (document.getElementById('filterKelasKartu')?.value || "").trim().toLowerCase();
    return databaseSiswa.filter(s => {
        const cocokNama = !keyword || String(s.nama || "").toLowerCase().includes(keyword);
        const cocokKelas = !kelasFilter || String(s.kelas || "").trim().toLowerCase() === kelasFilter;
        return cocokNama && cocokKelas;
    });
}

function bukaModalCetakKartu(singleIdx = null) {
    let targetList = [];
    let judul = "Kartu Login Siswa (Tinggi 3 cm)";
    if (typeof singleIdx === "number" && databaseSiswa[singleIdx]) {
        targetList = [databaseSiswa[singleIdx]];
        judul = `Kartu Siswa: ${databaseSiswa[singleIdx].nama} (Tinggi 3 cm)`;
    } else {
        targetList = getSiswaTersaringSaatIni();
        const kelasFilter = document.getElementById('filterKelasKartu')?.value;
        judul = `Kartu Siswa ${kelasFilter ? "Kelas " + kelasFilter : "Semua"} (${targetList.length} Kartu • Tinggi 3 cm)`;
    }
    if (targetList.length === 0) {
        alert("Tidak ada data siswa yang cocok untuk dicetak.");
        return;
    }
    const gridHtml = `<div class="kartu-siswa-grid">${buatHtmlKartuSiswa(targetList)}</div>`;
    document.getElementById('modalKartuTitle').innerText = judul;
    document.getElementById('modalKartuBody').innerHTML = gridHtml;
    document.getElementById('printKartuArea').innerHTML = gridHtml;
    document.getElementById('modalCetakKartu').style.display = 'flex';
}

function tutupModalKartu() {
    document.getElementById('modalCetakKartu').style.display = 'none';
}

function eksekusiCetakKartu() {
    window.print();
}

async function simpanSiswaSatuan() {
    const nama = document.getElementById('inputNamaSiswa').value.trim();
    const kelas = document.getElementById('selectKelasSiswaSatuan').value.trim();
    const username = document.getElementById('inputUsernameSiswa').value.trim();
    const password = document.getElementById('inputPasswordSiswa').value.trim();
    const editIdx = parseInt(document.getElementById('editSiswaIndex').value, 10);

    if (!nama || !kelas || !username || !password) {
        alert("Semua kolom (Nama, Kelas, Username, Password) wajib diisi!");
        return;
    }

    const duplikatIdx = databaseSiswa.findIndex((s, i) => s.username === username && i !== editIdx);
    if (duplikatIdx !== -1) {
        alert(`Username "${username}" sudah digunakan oleh ${databaseSiswa[duplikatIdx].nama}!`);
        return;
    }

    showLoading(editIdx >= 0 ? "Memperbarui data siswa..." : "Menambahkan siswa ke Gist...");
    if (editIdx >= 0 && editIdx < databaseSiswa.length) {
        databaseSiswa[editIdx] = { nama, kelas, username, password };
    } else {
        databaseSiswa.push({ nama, kelas, username, password });
    }

    await saveCbtDatabaseToGist();
    renderTabelDaftarSiswa();
    batalEditSiswa();
    hideLoading();
}

function editSiswa(idx) {
    const s = databaseSiswa[idx];
    if (!s) return;
    document.getElementById('editSiswaIndex').value = idx;
    document.getElementById('inputNamaSiswa').value = s.nama;
    const selKelas = document.getElementById('selectKelasSiswaSatuan');
    if (!Array.from(selKelas.options).some(opt => opt.value === s.kelas)) {
        selKelas.innerHTML += `<option value="${s.kelas}">${s.kelas}</option>`;
    }
    selKelas.value = s.kelas;
    document.getElementById('inputUsernameSiswa').value = s.username;
    document.getElementById('inputPasswordSiswa').value = s.password;
    document.getElementById('judulFormSiswaSatuan').innerText = `Edit Data Siswa: ${s.nama}`;
    document.getElementById('btnSimpanSiswaSatuan').innerText = "Update Data Siswa";
    document.getElementById('btnSimpanSiswaSatuan').style.background = "#28a745";
    document.getElementById('btnBatalEditSiswa').style.display = "block";
    document.getElementById('adminTabSiswa').scrollIntoView({ behavior: 'smooth' });
}

function batalEditSiswa() {
    document.getElementById('editSiswaIndex').value = "-1";
    document.getElementById('inputNamaSiswa').value = "";
    document.getElementById('selectKelasSiswaSatuan').value = "";
    document.getElementById('inputUsernameSiswa').value = "";
    document.getElementById('inputPasswordSiswa').value = "";
    document.getElementById('judulFormSiswaSatuan').innerText = "Tambah Siswa";
    document.getElementById('btnSimpanSiswaSatuan').innerText = "Simpan Siswa";
    document.getElementById('btnSimpanSiswaSatuan').style.background = "#008080";
    document.getElementById('btnBatalEditSiswa').style.display = "none";
}

async function hapusSemuaSiswa() {
    if (!Array.isArray(databaseSiswa) || databaseSiswa.length === 0) return;
    const kelasFilter = (document.getElementById('filterKelasKartu')?.value || "").trim();
    const keyword = (document.getElementById('inputCariNamaSiswa')?.value || "").trim();

    let targetSiswa = databaseSiswa;
    let labelScope = `SELURUH data siswa (${databaseSiswa.length} siswa)`;

    if (kelasFilter || keyword) {
        const filtered = getSiswaTersaringSaatIni();
        if (filtered.length === 0) return;
        const descFilter = [kelasFilter ? `Kelas ${kelasFilter}` : "", keyword ? `Nama "${keyword}"` : ""].filter(Boolean).join(" & ");
        if (!confirm(`Hapus HANYA siswa yang tampil sesuai filter: ${descFilter} (${filtered.length} siswa)?`)) return;
        targetSiswa = filtered;
        labelScope = `${filtered.length} siswa (${descFilter})`;
    } else {
        if (!confirm(`PERINGATAN! Yakin ingin menghapus ${labelScope}?`)) return;
    }

    showLoading(`Menghapus ${targetSiswa.length} data siswa...`);
    const targetSet = new Set(targetSiswa);
    targetSiswa.forEach(s => { if (s.username) delete sesiLoginSiswa[String(s.username).trim()]; });
    databaseSiswa = databaseSiswa.filter(s => !targetSet.has(s));

    await saveCbtDatabaseToGist();
    renderTabelDaftarSiswa();
    renderTabelSesiAktif();
    batalEditSiswa();
    hideLoading();
}

async function hapusSiswa(idx) {
    const s = databaseSiswa[idx];
    if (!s || !confirm(`Yakin ingin menghapus siswa "${s.nama}" (${s.username})?`)) return;
    showLoading("Menghapus data siswa...");
    await deleteSesiFromGAS(s.username);
    databaseSiswa.splice(idx, 1);
    await saveCbtDatabaseToGist();
    renderTabelDaftarSiswa();
    renderTabelSesiAktif();
    if (parseInt(document.getElementById('editSiswaIndex').value, 10) === idx) batalEditSiswa();
    hideLoading();
}

async function importDataSiswaToGist(event) {
    const file = event.target.files[0];
    if (!file) return;
    showLoading("Membaca Excel & mengunggah data siswa...");
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(worksheet);
            databaseSiswa = json.map(row => ({
                nama: row.Nama || row.nama || "",
                kelas: row.Kelas || row.kelas || "",
                username: String(row.Username || row.username || ""),
                password: String(row.Password || row.password || "")
            }));
            await saveCbtDatabaseToGist();
            renderTabelDaftarSiswa();
            hideLoading();
            alert(`Berhasil mengunggah ${databaseSiswa.length} data siswa!`);
        } catch (err) {
            hideLoading();
            alert("Gagal membaca file Excel: " + err.message);
        }
        event.target.value = "";
    };
    reader.readAsArrayBuffer(file);
}

function resetCariNamaSiswa() {
    const inp = document.getElementById('inputCariNamaSiswa');
    if (inp) inp.value = "";
    const sel = document.getElementById('filterKelasKartu');
    if (sel) sel.value = "";
    renderTabelDaftarSiswa();
}

function renderTabelDaftarSiswa() {
    let tbody = document.getElementById('tbodyDaftarSiswa');
    if (!tbody) return;
    tbody.innerHTML = "";
    if (databaseSiswa.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Belum ada data siswa.</td></tr>`;
        return;
    }

    const keyword = (document.getElementById('inputCariNamaSiswa')?.value || "").trim().toLowerCase();
    const kelasFilter = (document.getElementById('filterKelasKartu')?.value || "").trim().toLowerCase();
    let tampilCount = 0;

    databaseSiswa.forEach((s, idx) => {
        const cocokNama = !keyword || String(s.nama || "").toLowerCase().includes(keyword);
        const cocokKelas = !kelasFilter || String(s.kelas || "").trim().toLowerCase() === kelasFilter;
        if (!cocokNama || !cocokKelas) return;
        tampilCount++;
        tbody.innerHTML += `<tr>
            <td>${s.nama}</td>
            <td>${s.kelas}</td>
            <td>${s.username}</td>
            <td>${s.password}</td>
            <td>
                <button onclick="bukaModalCetakKartu(${idx})" class="btn-sm btn-info" title="Cetak Kartu 3 cm">Kartu</button>
                <button onclick="editSiswa(${idx})" class="btn-sm btn-warning">Edit</button>
                <button onclick="hapusSiswa(${idx})" class="btn-sm btn-danger">Hapus</button>
            </td>
        </tr>`;
    });

    if (tampilCount === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Data siswa tidak ditemukan untuk filter saat ini.</td></tr>`;
    }
}

// ================= KOMPRESI GAMBAR SOAL (< 50 KB) & UPLOAD WORD =================
const MAX_GAMBAR_SOAL_BYTES = 50 * 1024;
const MAX_GAMBAR_SOAL_DIM = 1280;

function estimasiUkuranBase64Bytes(dataUrl) {
    if (!dataUrl || typeof dataUrl !== "string") return 0;
    const parts = dataUrl.split(",");
    const base64Part = parts.length > 1 ? parts[1] : parts[0];
    const clean = base64Part.replace(/\s+/g, "");
    const padding = (clean.match(/=+$/) || [""])[0].length;
    return Math.max(0, Math.floor((clean.length * 3) / 4) - padding);
}

function loadImageFromDataUrl(dataUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(err);
        img.src = dataUrl;
    });
}

function renderCanvasToDataUrl(img, width, height, mimeType, quality, fillWhiteBg = false) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));
    const ctx = canvas.getContext("2d", { alpha: !fillWhiteBg });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    if (fillWhiteBg) {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL(mimeType, quality);
}

async function kompresGambarSoalKeBawah50KB(base64DataUrl, maxBytes = MAX_GAMBAR_SOAL_BYTES) {
    try {
        const ukuranAwal = estimasiUkuranBase64Bytes(base64DataUrl);
        if (ukuranAwal > 0 && ukuranAwal <= maxBytes) {
            return { dataUrl: base64DataUrl, sizeBytes: ukuranAwal, compressed: false };
        }
        const img = await loadImageFromDataUrl(base64DataUrl);
        let width = img.naturalWidth || img.width || 800;
        let height = img.naturalHeight || img.height || 600;
        const maxDimAwal = Math.max(width, height);
        if (maxDimAwal > MAX_GAMBAR_SOAL_DIM) {
            const scale = MAX_GAMBAR_SOAL_DIM / maxDimAwal;
            width = Math.round(width * scale);
            height = Math.round(height * scale);
        }
        let bestDataUrl = null;
        let bestSize = Infinity;
        const qualities = [0.85, 0.78, 0.72, 0.65, 0.58, 0.50];
        for (let step = 0; step < 5; step++) {
            for (const q of qualities) {
                const candidateWebp = renderCanvasToDataUrl(img, width, height, "image/webp", q, true);
                const sizeWebp = estimasiUkuranBase64Bytes(candidateWebp);
                if (sizeWebp < bestSize) { bestSize = sizeWebp; bestDataUrl = candidateWebp; }
                if (sizeWebp <= maxBytes) return { dataUrl: candidateWebp, sizeBytes: sizeWebp, compressed: true };
            }
            for (const q of [0.82, 0.74, 0.66, 0.58, 0.50]) {
                const candidateJpeg = renderCanvasToDataUrl(img, width, height, "image/jpeg", q, true);
                const sizeJpeg = estimasiUkuranBase64Bytes(candidateJpeg);
                if (sizeJpeg < bestSize) { bestSize = sizeJpeg; bestDataUrl = candidateJpeg; }
                if (sizeJpeg <= maxBytes) return { dataUrl: candidateJpeg, sizeBytes: sizeJpeg, compressed: true };
            }
            width = Math.max(320, Math.round(width * 0.82));
            height = Math.max(240, Math.round(height * 0.82));
        }
        return { dataUrl: bestDataUrl || base64DataUrl, sizeBytes: bestSize < Infinity ? bestSize : ukuranAwal, compressed: true };
    } catch (err) {
        return { dataUrl: base64DataUrl, sizeBytes: estimasiUkuranBase64Bytes(base64DataUrl), compressed: false };
    }
}

async function bacaFileSoalOtomatis(event) {
    const file = event.target.files[0];
    if (!file) return;
    let ekstensi = file.name.split('.').pop().toLowerCase();

    if (ekstensi === 'txt') {
        const reader = new FileReader();
        reader.onload = function(e) { document.getElementById('soalBatchText').value = e.target.result; };
        reader.readAsText(file);
    } else if (ekstensi === 'docx') {
        showLoading("Membaca file Word & mengunggah gambar ke Google Drive...");
        let imagesList = [];
        let imageCounter = 0;
        try {
            let result = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() }, {
                convertImage: mammoth.images.imgElement(function(image) {
                    return image.read("base64").then(function(imageBuffer) {
                        let base64Str = "data:" + image.contentType + ";base64," + imageBuffer;
                        imageCounter++;
                        let placeholderId = `IMG_DRIVE_${Date.now()}_${imageCounter}`;
                        imagesList.push({ id: placeholderId, data: base64Str });
                        return { src: placeholderId };
                    });
                })
            });

            let tempDiv = document.createElement("div");
            tempDiv.innerHTML = result.value;
            let totalImg = imagesList.length;
            let ringkasanKompresi = [];

            for (let i = 0; i < totalImg; i++) {
                let imgData = imagesList[i];
                showLoading(`Mengompres & mengunggah gambar ${i + 1} dari ${totalImg} (< 50 KB)...`);
                const hasilKompres = await kompresGambarSoalKeBawah50KB(imgData.data, MAX_GAMBAR_SOAL_BYTES);
                const finalBase64 = hasilKompres.dataUrl;
                const kbAkhir = (hasilKompres.sizeBytes / 1024).toFixed(1);
                const extFile = finalBase64.startsWith("data:image/webp") ? "webp" : "jpg";
                ringkasanKompresi.push(`Img ${i + 1}: ${kbAkhir} KB`);

                try {
                    let uploadRes = await postToGAS({
                        action: "uploadImage",
                        folderName: "Soal_CBT_Drive",
                        fileData: finalBase64,
                        fileName: `soal_img_${Date.now()}_${i + 1}.${extFile}`
                    });
                    if (uploadRes.data && uploadRes.data.status === "success") {
                        let targetImg = tempDiv.querySelector(`[src="${imgData.id}"]`);
                        if (targetImg) targetImg.setAttribute("src", uploadRes.data.fileUrl);
                    }
                } catch (err) {}
            }

            document.getElementById('soalBatchText').value = konversiHtmlKeFormatCbtDenganLink(tempDiv);
            hideLoading();
            const infoUkuran = ringkasanKompresi.length > 0 ? `\nUkuran gambar: ${ringkasanKompresi.join(", ")}` : "";
            alert(`File Word berhasil diproses!${infoUkuran}`);
        } catch (err) {
            hideLoading();
            alert("Gagal memproses file Word: " + err.message);
            document.getElementById('soalBatchText').value = "";
        }
    }
}

function konversiHtmlKeFormatCbtDenganLink(element) {
    let textOut = "";
    let nodes = element.querySelectorAll('p, li, h1, h2, h3, h4');
    nodes.forEach(node => {
        let text = node.innerText.trim();
        let imgEl = node.querySelector('img');
        if (imgEl && imgEl.getAttribute('src')) {
            text += `<br><img src="${imgEl.getAttribute('src')}" class="img-soal">`;
        }
        if (text.toLowerCase().startsWith("soal") || node.innerHTML.includes("SOAL")) {
            textOut += "\nSOAL\n" + text.replace(/SOAL[:\.]?/i, "").trim() + "\n";
        } else if (text.toLowerCase().startsWith("jawaban") || text === "0" || text === "1") {
            textOut += text + "\n";
        } else if (text.length > 0) {
            textOut += text + "\n";
        }
    });
    return textOut;
}

// ================= JADWAL UJIAN, SOAL GIST & EXPORT EXCEL =================
function hapusKelasDariSoalList(contentSoal, mapel, kelasList) {
    const targetKelasSet = new Set((kelasList || []).map(k => normStr(k)).filter(Boolean));
    const oldFolderNames = new Set(
        (kelasList || []).map(k => normStr(`${String(mapel || "").replace(/\s+/g, "_")}_${String(k || "").replace(/\s+/g, "_")}`))
    );
    const updated = [];
    let dihapusCount = 0;

    contentSoal.forEach(item => {
        if (!item || typeof item !== "object") return;
        if (itemCocokMapel(item, mapel)) {
            if (Array.isArray(item.kelas) && item.kelas.length > 0) {
                const sebelumLen = item.kelas.length;
                const sisaKelas = item.kelas.filter(k => !targetKelasSet.has(normStr(k)));
                if (sisaKelas.length < sebelumLen) dihapusCount += (sebelumLen - sisaKelas.length);
                if (sisaKelas.length > 0) updated.push({ ...item, kelas: sisaKelas });
                return;
            }
            if (item.namaUjian && oldFolderNames.has(normStr(item.namaUjian))) { dihapusCount++; return; }
            if (!Array.isArray(item.kelas) || item.kelas.length === 0) { dihapusCount++; return; }
        }
        updated.push(item);
    });
    return { updated, dihapusCount };
}

async function eksekusiHapusSoalDiGist(mapel, kelasList) {
    const githubHeaders = { headers: { "Authorization": `token ${GIST_TOKEN}` } };
    const gistRes = await axios.get(`https://api.github.com/gists/${GIST_ID}?t=${Date.now()}`, githubHeaders);
    const files = gistRes.data.files || {};
    const filename = files["soal.json"] ? "soal.json" : Object.keys(files)[0];
    const contentSoal = parseSoalJsonFlexible(files[filename]?.content || "[]");

    const resultHapus = hapusKelasDariSoalList(contentSoal, mapel, kelasList);
    const serialized = serializeSoalJsonOneMapelPerLine(resultHapus.updated);

    await axios.patch(`https://api.github.com/gists/${GIST_ID}`, {
        files: { [filename]: { content: serialized } }
    }, githubHeaders);

    bersihkanCacheSoal();
    const parsedFresh = parseSoalJsonFlexible(serialized);
    simpanCacheSoal("admin_api", parsedFresh);
    simpanCacheSoal("raw_exam", parsedFresh);
    return resultHapus.dihapusCount;
}

async function sinkronkanKelasSoalSaatEditJadwal(oldMapel, oldKelasList, newMapel, newKelasList) {
    const githubHeaders = { headers: { "Authorization": `token ${GIST_TOKEN}` } };
    const gistRes = await axios.get(`https://api.github.com/gists/${GIST_ID}?t=${Date.now()}`, githubHeaders);
    const files = gistRes.data.files || {};
    const filename = files["soal.json"] ? "soal.json" : Object.keys(files)[0];
    let contentSoal = parseSoalJsonFlexible(files[filename]?.content || "[]");

    const oldKelasSet = new Set((oldKelasList || []).map(k => normStr(k)).filter(Boolean));
    let berubah = false;

    contentSoal = contentSoal.map(item => {
        if (!itemCocokMapel(item, oldMapel)) return item;
        const itemKelasArr = Array.isArray(item.kelas) ? item.kelas : [];
        const adaKelasLama = itemKelasArr.some(k => oldKelasSet.has(normStr(k)));
        if (!adaKelasLama && itemKelasArr.length > 0) return item;

        const sisaKelas = itemKelasArr.filter(k => !oldKelasSet.has(normStr(k)));
        newKelasList.forEach(nk => {
            if (!sisaKelas.some(sk => normStr(sk) === normStr(nk))) sisaKelas.push(nk);
        });
        berubah = true;
        return { ...item, mapel: newMapel, kelas: sisaKelas };
    });

    if (berubah) {
        await axios.patch(`https://api.github.com/gists/${GIST_ID}`, {
            files: { [filename]: { content: serializeSoalJsonOneMapelPerLine(contentSoal) } }
        }, githubHeaders);
        bersihkanCacheSoal();
    }
}

async function simpanJadwalDanSoal() {
    let mapel = document.getElementById('jadwalMapel').value;
    let checkedKelas = Array.from(document.querySelectorAll('input[name="kelasCheck"]:checked')).map(el => el.value);
    let mulai = document.getElementById('waktuMulai').value;
    let jp = parseInt(document.getElementById('jumlahJp').value, 10) || 1;
    let selesai = document.getElementById('waktuSelesai').value;
    let rawText = document.getElementById('soalBatchText').value.trim();

    const origIndicesStr = document.getElementById('editJadwalOrigIndices')?.value || "";
    const origMapel = document.getElementById('editJadwalOrigMapel')?.value || "";
    const origKelasStr = document.getElementById('editJadwalOrigKelas')?.value || "";
    const isEditMode = origIndicesStr !== "";

    if (!mapel) { alert("Pilih Mata Pelajaran!"); return; }
    if (checkedKelas.length === 0) { alert("Pilih minimal 1 kelas!"); return; }
    if (!mulai || !selesai) { alert("Tentukan waktu mulai dan jumlah JP!"); return; }
    if (mulai >= selesai) { alert("Waktu selesai harus lebih besar dari mulai!"); return; }

    showLoading(isEditMode ? "Memperbarui jadwal ujian..." : "Menyiapkan jadwal & menyimpan soal...");

    if (isEditMode) {
        try {
            const origIndices = JSON.parse(origIndicesStr);
            origIndices.sort((a, b) => b - a).forEach(idx => {
                if (idx >= 0 && idx < daftarJadwalUjian.length) daftarJadwalUjian.splice(idx, 1);
            });
        } catch (e) {}
    }

    checkedKelas.forEach(kelas => {
        daftarJadwalUjian = daftarJadwalUjian.filter(j => !(j.mapel === mapel && j.kelas === kelas));
        daftarJadwalUjian.push({ mapel, kelas, jp, mulai, selesai });
    });

    await saveCbtDatabaseToGist();

    if (rawText) {
        showLoading("Menyimpan soal ke Gist...");
        let parsedSoal = parseSoalDariTeks(rawText, mapel, checkedKelas);
        if (parsedSoal.length === 0) {
            hideLoading();
            alert("Format soal tidak terbaca! Pastikan format sesuai (SOAL ... JAWABAN ... 0/1).");
            return;
        }

        const githubHeaders = { headers: { "Authorization": `token ${GIST_TOKEN}` } };
        try {
            let gistRes = await axios.get(`https://api.github.com/gists/${GIST_ID}?t=${Date.now()}`, githubHeaders);
            const files = gistRes.data.files || {};
            const filename = files["soal.json"] ? "soal.json" : Object.keys(files)[0];
            let contentSoal = parseSoalJsonFlexible(files[filename].content);

            if (isEditMode && origMapel && origKelasStr) {
                try {
                    const origKelasList = JSON.parse(origKelasStr);
                    contentSoal = hapusKelasDariSoalList(contentSoal, origMapel, origKelasList).updated;
                } catch (e) {}
            }
            contentSoal = hapusKelasDariSoalList(contentSoal, mapel, checkedKelas).updated;

            parsedSoal.forEach(newItem => {
                const existingIdentical = contentSoal.find(oldItem =>
                    itemCocokMapel(oldItem, newItem.mapel) &&
                    oldItem.soal === newItem.soal &&
                    oldItem.kunci === newItem.kunci &&
                    JSON.stringify(oldItem.options) === JSON.stringify(newItem.options)
                );

                if (existingIdentical && Array.isArray(existingIdentical.kelas)) {
                    newItem.kelas.forEach(k => {
                        if (!existingIdentical.kelas.some(ek => normStr(ek) === normStr(k))) existingIdentical.kelas.push(k);
                    });
                } else {
                    contentSoal.push(newItem);
                }
            });

            await axios.patch(`https://api.github.com/gists/${GIST_ID}`, {
                files: { [filename]: { content: serializeSoalJsonOneMapelPerLine(contentSoal) } }
            }, githubHeaders);
            bersihkanCacheSoal();
        } catch (e) {
            hideLoading();
            alert("Gagal upload soal ke Gist: " + e.message);
            return;
        }
    } else if (isEditMode && origMapel && origKelasStr) {
        try {
            const origKelasList = JSON.parse(origKelasStr);
            if (normStr(origMapel) !== normStr(mapel) || JSON.stringify([...origKelasList].sort()) !== JSON.stringify([...checkedKelas].sort())) {
                await sinkronkanKelasSoalSaatEditJadwal(origMapel, origKelasList, mapel, checkedKelas);
            }
        } catch (e) {}
    }

    hideLoading();
    batalEditJadwal();
    renderTabelJadwal();
    renderTabelSesiAktif();
    alert(isEditMode ? "Jadwal ujian berhasil diperbarui!" : "Jadwal ujian dan soal berhasil disimpan!");
}

function parseSoalDariTeks(text, mapelName, kelasArray) {
    let lines = text.split('\n');
    let soalList = [];
    let currentSoal = null;
    let optionsMap = {};
    let optionKeys = ['A', 'B', 'C', 'D', 'E'];
    let optIdx = 0;

    lines.forEach(line => {
        let l = line.trim();
        if (l.startsWith("SOAL")) {
            if (currentSoal) { currentSoal.options = optionsMap; soalList.push(currentSoal); }
            currentSoal = {
                id: Math.floor(Date.now() + Math.random() * 100000),
                mapel: mapelName,
                kelas: [...new Set(kelasArray)],
                soal: "",
                options: {},
                kunci: "K"
            };
            optionsMap = {};
            optIdx = 0;
        } else if (l.startsWith("JAWABAN")) {
        } else if (currentSoal && !currentSoal.soal) {
            currentSoal.soal = l;
        } else if (currentSoal) {
            if (l === "0" || l === "1") {
                if (l === "1" && optionKeys[optIdx - 1]) currentSoal.kunci = encodeKunciGist(optionKeys[optIdx - 1]);
            } else if (l.length > 0 && optIdx < 5) {
                optionsMap[optionKeys[optIdx]] = l;
                optIdx++;
            }
        }
    });
    if (currentSoal) { currentSoal.options = optionsMap; soalList.push(currentSoal); }
    return soalList;
}

function getGroupedJadwalList() {
    const groups = [];
    daftarJadwalUjian.forEach((j, originalIdx) => {
        const key = `${j.mapel}||${j.jp}||${j.mulai}||${j.selesai}`;
        let existing = groups.find(g => g.key === key);
        if (existing) {
            if (!existing.kelasList.includes(j.kelas)) existing.kelasList.push(j.kelas);
            existing.indices.push(originalIdx);
        } else {
            groups.push({ key: key, mapel: j.mapel, jp: j.jp, mulai: j.mulai, selesai: j.selesai, kelasList: [j.kelas], indices: [originalIdx] });
        }
    });
    groups.sort((a, b) => (new Date(b.mulai || 0).getTime() || 0) - (new Date(a.mulai || 0).getTime() || 0));
    return groups;
}

function formatWaktuRingkasTabel(isoStr) {
    if (!isoStr) return "-";
    const parts = String(isoStr).replace("T", " ").split(" ");
    return parts.length < 2 ? isoStr : `${parts[0]}<br>${parts[1]}`;
}

function renderTabelJadwal() {
    let tbody = document.getElementById('tbodyJadwal');
    if (!tbody) return;
    tbody.innerHTML = "";
    const groupedList = getGroupedJadwalList();
    if (groupedList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Belum ada jadwal ujian.</td></tr>`;
        return;
    }

    groupedList.forEach((g) => {
        const kelasStr = g.kelasList.join(', ');
        const kelasJson = encodeURIComponent(JSON.stringify(g.kelasList));
        const indicesJson = encodeURIComponent(JSON.stringify(g.indices));
        const mapelEnc = encodeURIComponent(g.mapel);
        const groupPayloadEnc = encodeURIComponent(JSON.stringify({
            mapel: g.mapel, kelasList: g.kelasList, jp: g.jp || 1, mulai: g.mulai || "", selesai: g.selesai || "", indices: g.indices
        }));

        tbody.innerHTML += `<tr>
            <td class="col-mapel"><b>${g.mapel}</b></td>
            <td class="col-kelas">${kelasStr}</td>
            <td class="col-jp">${g.jp ? g.jp + ' JP' : '-'}</td>
            <td class="col-waktu">${formatWaktuRingkasTabel(g.mulai)}</td>
            <td class="col-waktu">${formatWaktuRingkasTabel(g.selesai)}</td>
            <td class="col-aksi">
                <div class="jadwal-aksi-stack">
                    <div class="jadwal-aksi-top-row">
                        <button type="button" onclick="editJadwalGroup('${groupPayloadEnc}')" class="btn-warning btn-jadwal-act">Edit</button>
                        <button type="button" onclick="lihatSoalJadwal('${mapelEnc}', '${kelasJson}')" class="btn-info btn-jadwal-act">Soal</button>
                    </div>
                    <div class="jadwal-aksi-top-row">
                        <button type="button" onclick="bukaModalExportHasil('${mapelEnc}', '${kelasJson}')" class="btn-success btn-jadwal-act">Hasil</button>
                        <button type="button" onclick="hapusJadwalGroup('${indicesJson}', '${mapelEnc}', '${kelasJson}')" class="btn-danger btn-jadwal-act">Hapus</button>
                    </div>
                </div>
            </td>
        </tr>`;
    });
}

function editJadwalGroup(groupPayloadEnc) {
    const g = JSON.parse(decodeURIComponent(groupPayloadEnc));
    if (!g) return;
    document.getElementById('editJadwalOrigIndices').value = JSON.stringify(g.indices || []);
    document.getElementById('editJadwalOrigMapel').value = g.mapel || "";
    document.getElementById('editJadwalOrigKelas').value = JSON.stringify(g.kelasList || []);

    const selMapel = document.getElementById('jadwalMapel');
    if (selMapel) {
        if (!Array.from(selMapel.options).some(opt => opt.value === g.mapel)) {
            selMapel.innerHTML += `<option value="${g.mapel}">${g.mapel}</option>`;
        }
        selMapel.value = g.mapel;
    }

    const kelasSet = new Set((g.kelasList || []).map(k => normStr(k)));
    const rowSet = new Set();
    document.querySelectorAll('input[name="kelasCheck"]').forEach(cb => {
        cb.checked = kelasSet.has(normStr(cb.value));
        const rIdx = cb.getAttribute('data-row-idx');
        if (rIdx !== null) rowSet.add(Number(rIdx));
    });
    rowSet.forEach(rIdx => sinkronkanTombolPilihBaris(rIdx));

    document.getElementById('waktuMulai').value = g.mulai || "";
    document.getElementById('jumlahJp').value = g.jp || 1;
    if (g.selesai) document.getElementById('waktuSelesai').value = g.selesai;
    else hitungWaktuSelesaiOtomatis();

    document.getElementById('soalBatchText').value = "";
    document.getElementById('fileSoalAny').value = "";
    document.getElementById('judulFormJadwal').innerText = `Edit Jadwal: ${g.mapel}`;
    document.getElementById('labelSoalUploadJadwal').innerText = "Ganti/Upload Soal Baru (Opsional — kosongkan jika soal tetap):";
    document.getElementById('btnSimpanJadwal').innerText = "Update Jadwal";
    document.getElementById('btnSimpanJadwal').style.background = "#008080";
    document.getElementById('btnBatalEditJadwal').style.display = "block";
    document.getElementById('cardFormJadwal')?.scrollIntoView({ behavior: 'smooth' });
}

function batalEditJadwal() {
    document.getElementById('editJadwalOrigIndices').value = "";
    document.getElementById('editJadwalOrigMapel').value = "";
    document.getElementById('editJadwalOrigKelas').value = "";
    document.getElementById('jadwalMapel').value = "";
    const rowSet = new Set();
    document.querySelectorAll('input[name="kelasCheck"]').forEach(cb => {
        cb.checked = false;
        const rIdx = cb.getAttribute('data-row-idx');
        if (rIdx !== null) rowSet.add(Number(rIdx));
    });
    rowSet.forEach(rIdx => sinkronkanTombolPilihBaris(rIdx));

    document.getElementById('waktuMulai').value = "";
    document.getElementById('jumlahJp').value = "1";
    document.getElementById('waktuSelesai').value = "";
    document.getElementById('soalBatchText').value = "";
    document.getElementById('fileSoalAny').value = "";
    document.getElementById('judulFormJadwal').innerText = "Buat Jadwal";
    document.getElementById('labelSoalUploadJadwal').innerText = "Upload File Word (.docx) / Text (.txt) atau Paste Format Soal:";
    document.getElementById('btnSimpanJadwal').innerText = "Simpan Jadwal & Upload Soal";
    document.getElementById('btnSimpanJadwal').style.background = "#28a745";
    document.getElementById('btnBatalEditJadwal').style.display = "none";
}

async function bukaModalExportHasil(mapelEnc, kelasJson) {
    const mapel = decodeURIComponent(mapelEnc);
    const kelasList = JSON.parse(decodeURIComponent(kelasJson));
    if (!Array.isArray(logSiswaLogin) || logSiswaLogin.length === 0) {
        showLoading("Mengambil data nilai dari Spreadsheet...");
        await fetchLogLoginFromGAS();
        hideLoading();
    }

    document.getElementById('modalExportTitle').innerText = `Export Hasil: ${mapel}`;
    const body = document.getElementById('modalExportBody');
    let html = `<p style="font-size:12.5px; margin-top:0; color:#444;">Pilih kelas yang ingin diunduh file rekap nilainya (<b>.xlsx</b>):</p><div class="export-kelas-btn-list">`;
    kelasList.forEach(kls => {
        const klsEnc = encodeURIComponent(kls);
        html += `<button type="button" onclick="prosesExportHasilXlsx('${mapelEnc}', '${klsEnc}')" style="background:#28a745; text-align:left; padding:8px 12px;">📥 Download Hasil Kelas <b>${kls}</b> (.xlsx)</button>`;
    });
    if (kelasList.length > 1) {
        html += `<hr style="width:100%; border:0; border-top:1px dashed #ccc; margin:4px 0;">`;
        html += `<button type="button" onclick="prosesExportHasilMultiKelasXlsx('${mapelEnc}', '${kelasJson}')" style="background:#008080; text-align:left; padding:8px 12px;">📊 Download Gabungan Semua Kelas (${kelasList.join(', ')}) (.xlsx)</button>`;
    }
    html += `</div>`;
    body.innerHTML = html;
    document.getElementById('modalExportHasil').style.display = 'flex';
}

function tutupModalExport() {
    document.getElementById('modalExportHasil').style.display = 'none';
}

function susunBarisRekapKelas(mapel, kelasTarget) {
    const klsNorm = String(kelasTarget || "").trim().toLowerCase();
    const mapelNorm = String(mapel || "").trim().toLowerCase();
    const siswaDiKelas = databaseSiswa.filter(s => String(s.kelas || "").trim().toLowerCase() === klsNorm);
    const logMatch = (Array.isArray(logSiswaLogin) ? logSiswaLogin : []).filter(l =>
        String(l.kelas || "").trim().toLowerCase() === klsNorm &&
        String(l.mapel || "").trim().toLowerCase() === mapelNorm
    );

    const rows = [];
    const namaSudahMasuk = new Set();

    siswaDiKelas.forEach((s, idx) => {
        const namaNorm = String(s.nama || "").trim().toLowerCase();
        namaSudahMasuk.add(namaNorm);
        const entries = logMatch.filter(l => String(l.nama || "").trim().toLowerCase() === namaNorm);
        const latest = entries.length > 0 ? entries[entries.length - 1] : null;
        rows.push({
            "No": idx + 1, "NIS / Username": s.username || "-", "Nama Siswa": s.nama || "-", "Kelas": s.kelas || kelasTarget,
            "Mata Pelajaran": mapel, "Status": latest ? (latest.status || "-") : "Belum Mengerjakan",
            "Nilai": (latest && latest.nilai !== null && latest.nilai !== undefined && latest.nilai !== "") ? Number(latest.nilai) : "-"
        });
    });

    logMatch.forEach(l => {
        const namaNorm = String(l.nama || "").trim().toLowerCase();
        if (!namaSudahMasuk.has(namaNorm)) {
            namaSudahMasuk.add(namaNorm);
            rows.push({
                "No": rows.length + 1, "NIS / Username": "-", "Nama Siswa": l.nama || "-", "Kelas": l.kelas || kelasTarget,
                "Mata Pelajaran": mapel, "Status": l.status || "-",
                "Nilai": (l.nilai !== null && l.nilai !== undefined && l.nilai !== "") ? Number(l.nilai) : "-"
            });
        }
    });
    return rows;
}

function prosesExportHasilXlsx(mapelEnc, kelasEnc) {
    const mapel = decodeURIComponent(mapelEnc);
    const kelasTarget = decodeURIComponent(kelasEnc);
    const rows = susunBarisRekapKelas(mapel, kelasTarget);
    if (rows.length === 0) { alert(`Belum ada data siswa untuk kelas ${kelasTarget}.`); return; }

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [{ wch: 5 }, { wch: 16 }, { wch: 28 }, { wch: 12 }, { wch: 20 }, { wch: 30 }, { wch: 10 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, kelasTarget.replace(/[\\/?*[\]:]/g, "_").slice(0, 31) || "Hasil");
    XLSX.writeFile(workbook, `Hasil_${mapel.replace(/\s+/g, '_')}_${kelasTarget.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    tutupModalExport();
}

function prosesExportHasilMultiKelasXlsx(mapelEnc, kelasJson) {
    const mapel = decodeURIComponent(mapelEnc);
    const kelasList = JSON.parse(decodeURIComponent(kelasJson));
    const workbook = XLSX.utils.book_new();
    let totalAdaData = 0;

    kelasList.forEach(kls => {
        const rows = susunBarisRekapKelas(mapel, kls);
        if (rows.length > 0) {
            totalAdaData += rows.length;
            const ws = XLSX.utils.json_to_sheet(rows);
            ws['!cols'] = [{ wch: 5 }, { wch: 16 }, { wch: 28 }, { wch: 12 }, { wch: 20 }, { wch: 30 }, { wch: 10 }];
            XLSX.utils.book_append_sheet(workbook, ws, kls.replace(/[\\/?*[\]:]/g, "_").slice(0, 31));
        }
    });

    if (totalAdaData === 0) { alert("Belum ada data siswa pada kelas-kelas yang dipilih."); return; }
    XLSX.writeFile(workbook, `Hasil_${mapel.replace(/\s+/g, '_')}_Gabungan_${new Date().toISOString().slice(0, 10)}.xlsx`);
    tutupModalExport();
}

async function lihatSoalJadwal(mapelEnc, kelasJson) {
    const mapel = decodeURIComponent(mapelEnc);
    const kelasList = JSON.parse(decodeURIComponent(kelasJson));
    showLoading("Mengambil daftar soal dari Gist...");
    const allSoal = await fetchAllSoalFromGist({ preferRaw: false, forceRefresh: true, cacheScope: 'admin_api' });
    hideLoading();

    const seenIds = new Set();
    const matchedSoal = [];
    allSoal.forEach((item, idx) => {
        const cocok = kelasList.some(k => cekSoalCocokKelas(item, mapel, k));
        const keyId = item.id !== undefined && item.id !== null ? String(item.id) : `idx_${idx}`;
        if (cocok && !seenIds.has(keyId)) { seenIds.add(keyId); matchedSoal.push(item); }
    });
    tampilkanModalPreviewSoal(`Soal: ${mapel} (${kelasList.join(', ')})`, matchedSoal, mapel, kelasList);
}

async function lihatSemuaSoalGist() {
    showLoading("Mengambil seluruh bank soal dari Gist...");
    const allSoal = await fetchAllSoalFromGist({ preferRaw: false, forceRefresh: true, cacheScope: 'admin_api' });
    hideLoading();
    tampilkanModalPreviewSoal(`Seluruh Bank Soal di Gist (${allSoal.length} Butir)`, allSoal, null, null);
}

function tampilkanModalPreviewSoal(judul, soalArray, mapelTarget, kelasListTarget) {
    document.getElementById('modalSoalTitle').innerText = `${judul} — Total: ${soalArray.length} Soal`;
    const body = document.getElementById('modalSoalBody');
    const btnHapus = document.getElementById('btnHapusSoalPaket');

    if (mapelTarget && kelasListTarget && soalArray.length > 0) {
        btnHapus.style.display = "inline-block";
        btnHapus.onclick = () => hapusSoalUntukKelas(mapelTarget, kelasListTarget);
    } else {
        btnHapus.style.display = "none";
    }

    if (soalArray.length === 0) {
        body.innerHTML = `<div style="text-align:center; padding:30px; color:#666;">Belum ada soal yang tersimpan di Gist untuk ujian/kelas ini.</div>`;
    } else {
        let html = "";
        soalArray.forEach((item, idx) => {
            const kunciPlain = decodeKunciGist(item.kunci);
            const kunciCipher = encodeKunciGist(kunciPlain);
            const infoKelas = Array.isArray(item.kelas) ? item.kelas.join(', ') : (item.namaUjian || '-');
            html += `<div class="preview-item">
                <div style="display:flex; justify-content:space-between; font-size:11.5px; color:#666; margin-bottom:5px; border-bottom:1px dashed #ddd; padding-bottom:4px;">
                    <span><b>No. ${idx + 1}</b> | Mapel: <b>${item.mapel || '-'}</b> | Kelas: <b>${infoKelas}</b></span>
                    <span style="background:#008080; color:#fff; padding:2px 6px; border-radius:3px;">Kunci Gist: <b>${kunciCipher}</b> (${kunciPlain})</span>
                </div>
                <div style="font-size:13.5px; font-weight:bold; margin-bottom:6px;">${item.soal}</div>`;
            if (item.gambar) html += `<img src="${item.gambar}" class="img-soal">`;
            ['A', 'B', 'C', 'D', 'E'].forEach(opt => {
                if (item.options && item.options[opt]) {
                    const isBenar = (opt === kunciPlain);
                    html += `<div class="preview-opt ${isBenar ? 'is-kunci' : ''}"><b>${opt}.</b> ${item.options[opt]} ${isBenar ? ' ✔' : ''}</div>`;
                }
            });
            html += `</div>`;
        });
        body.innerHTML = html;
    }
    document.getElementById('modalLihatSoal').style.display = 'flex';
}

function tutupModalSoal() {
    document.getElementById('modalLihatSoal').style.display = 'none';
}

async function hapusSoalUntukKelas(mapel, kelasList) {
    if (!confirm(`Hapus soal "${mapel}" untuk kelas ${kelasList.join(', ')} dari soal.json di Gist?`)) return;
    showLoading("Menghapus soal dari soal.json di Gist...");
    try {
        await eksekusiHapusSoalDiGist(mapel, kelasList);
        hideLoading();
        tutupModalSoal();
        alert(`Soal untuk ${mapel} (${kelasList.join(', ')}) berhasil dihapus!`);
    } catch (err) {
        hideLoading();
        alert("Gagal menghapus soal: " + err.message);
    }
}

async function hapusJadwalGroup(indicesJson, mapelEnc, kelasJson) {
    const indices = JSON.parse(decodeURIComponent(indicesJson));
    const mapel = decodeURIComponent(mapelEnc);
    const kelasList = JSON.parse(decodeURIComponent(kelasJson));
    if (!confirm(`Hapus jadwal ujian "${mapel}" untuk kelas ${kelasList.join(', ')} sekaligus soalnya?`)) return;

    showLoading("Menghapus jadwal & membersihkan soal...");
    indices.sort((a, b) => b - a).forEach(idx => daftarJadwalUjian.splice(idx, 1));
    await saveCbtDatabaseToGist();
    try { await eksekusiHapusSoalDiGist(mapel, kelasList); } catch (err) {}
    renderTabelJadwal();
    renderTabelSesiAktif();
    hideLoading();
}

// ================= INISIALISASI APLIKASI =================
window.addEventListener("online", () => {
    prosesAntreanSubmitTertunda(false);
});

window.onload = async function() {
    showLoading("Memuat data sistem...");
    await prosesAntreanSubmitTertunda(false);
    await fetchCbtDatabase(false);

    if (localStorage.getItem("isAdminLoggedIn") === "true") {
        await fetchSesiFromGAS(true);
        await fetchTokenDariDrive(true);
        hideLoading();
        setCompactMode(false);
        document.getElementById('tabMenu').style.display = 'none';
        document.getElementById('viewLoginSiswa').classList.remove('active');
        document.getElementById('viewLoginAdmin').classList.remove('active');
        document.getElementById('viewPanelAdmin').classList.add('active');
        sinkronkanHeaderAdmin();
        switchAdminTab('monitoring');
        return;
    }

    const savedSiswaSess = bacaSesiSiswaLokal();
    if (savedSiswaSess && savedSiswaSess.username) {
        const siswaCocok = databaseSiswa.find(s => String(s.username) === String(savedSiswaSess.username));
        const sesiServer = await fetchSingleSesiFromGAS(savedSiswaSess.username, true);
        await fetchTokenDariDrive(true);
        const perangkatSama = !sesiServer || !sesiServer.deviceId || sesiServer.deviceId === getOrCreateDeviceId();

        hideLoading();
        if (siswaCocok && perangkatSama) {
            await tampilkanHalamanPilihUjianSiswa(siswaCocok);
            return;
        } else {
            hapusSesiSiswaLokal();
        }
    } else {
        hideLoading();
    }

    setCompactMode(true);
    sinkronkanHeaderAdmin();
};
