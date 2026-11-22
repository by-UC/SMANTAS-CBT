// ================= KONFIGURASI SISTEM =================
const GIST_RAW_URL = "https://gist.githubusercontent.com/by-UC/4b29a383e8a164f932396735ab60621b/raw/soal.json"; 
const CBT_GIST_RAW_URL = "https://gist.githubusercontent.com/by-UC/50cfbd273416be193afd98b4af08fb58/raw/db_cbt.json";
const CBT_GIST_ID = "50cfbd273416be193afd98b4af08fb58";
const GAS_URL = "https://script.google.com/macros/s/AKfycbwfRx34EfghBoAufQQuqhHUIrcZdFa_yjQL2Q8UrMfhq5quf9bgBnZDX5Mgli4rFDf7/exec";

const GIST_ID = "4b29a383e8a164f932396735ab60621b";
const t1 = "ghp_5Ofh9x64itKcWGL1PDIk0";
const t2 = "V2eEWYvRV0AFFLJ";
const GIST_TOKEN = t1 + t2;

// ================= HELPER POST GAS ANTI-CORS PREFLIGHT (TEXT/PLAIN) =================
// Mengirim sebagai text/plain menghindari OPTIONS preflight pada Google Apps Script Web App
// sehingga latency turun drastis dan lebih tahan beban 1000+ user konkuren.
async function postToGAS(payloadObj, timeoutMs = 25000) {
    return axios.post(GAS_URL, JSON.stringify(payloadObj), {
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        timeout: timeoutMs
    });
}

// ================= STATE GLOBAL =================
let currentLoginRole = 'siswa';

let daftarKelas = ["X-1", "X-2", "XI-IPA-1", "XII-IPA-1"];
let daftarMapel = ["Bahasa Sunda", "Matematika", "Biologi"];
let databaseSiswa = [];
let daftarJadwalUjian = []; 
let sesiLoginSiswa = {};
let pengaturanCbt = {
    menitPerJp: 40,
    adminPasswordPlain: "admin123"
};
let logSiswaLogin = []; 
let isAdminPassVisible = false;
let isDataLoadedOnce = false;

let listSoal = [];
let currentSoalIndex = 0;
let jawabanSiswa = {};
let namaUjianAktif = "Ujian_CBT_Umum";
let kelasSiswaLogin = "";
let mapelSiswaLogin = "";
let namaSiswaLogin = "";
let currentSiswaObj = null;

let isExamInProgress = false;
let isSubmittingExam = false;
let examCountdownIntervalId = null;
let examEndTimestampMs = 0;

// ================= TOKEN 4 DIGIT DI GOOGLE DRIVE =================
let tokenDriveState = {
    token: "----",
    intervalMenit: 5,
    wajibToken: true,
    expiresAt: 0,
    serverOffsetMs: 0
};
let tokenCountdownTimerId = null;
let isSyncingTokenFromDrive = false;

function formatDetikKeMmSs(totalSec) {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

async function fetchTokenDariDrive(silent = true) {
    if (isSyncingTokenFromDrive) return tokenDriveState;
    isSyncingTokenFromDrive = true;
    try {
        const res = await postToGAS({ action: "getTokenConfig" });
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
            if (typeof sinkronkanInputPengaturanToken === "function") sinkronkanInputPengaturanToken();
            if (typeof sinkronkanTampilanInputTokenSiswa === "function") sinkronkanTampilanInputTokenSiswa();
        }
    } catch (e) {
        if (!silent) console.error("Gagal mengambil token dari GAS:", e);
    } finally {
        isSyncingTokenFromDrive = false;
    }
    return tokenDriveState;
}

// ================= HEADER & UI UMUM =================
function sinkronkanHeaderAdmin() {
    const headerBox = document.getElementById('mainHeaderBox');
    const adminInline = document.getElementById('headerAdminInline');
    const isAdminActive = document.getElementById('viewPanelAdmin')?.classList.contains('active');

    if (isAdminActive) {
        headerBox?.classList.remove('centered-header');
        adminInline?.classList.add('active');
    } else {
        headerBox?.classList.add('centered-header');
        adminInline?.classList.remove('active');
    }
}

function setCompactMode(isCompact) {
    const container = document.getElementById('mainContainer');
    if (isCompact) {
        container.classList.add('login-compact');
    } else {
        container.classList.remove('login-compact');
    }
    sinkronkanHeaderAdmin();
}

function showLoading(text) {
    document.getElementById('loadingText').innerText = text;
    document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

function getOrCreateDeviceId() {
    let devId = localStorage.getItem("smantas_cbt_device_id");
    if (!devId) {
        devId = "DEV-" + Math.random().toString(36).substring(2, 8).toUpperCase() + "-" + Date.now().toString(36).toUpperCase();
        localStorage.setItem("smantas_cbt_device_id", devId);
    }
    return devId;
}

function getLocalIsoNow() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function normStr(val) {
    return String(val || "").trim().toLowerCase();
}

function parseJadwalDateTimeMs(isoLocalStr) {
    if (!isoLocalStr) return NaN;
    return new Date(isoLocalStr).getTime();
}

// ================= FORMAT SOAL.JSON & SANDI KUNCI =================
const MAP_OPT_TO_CIPHER = { 'A': 'K', 'B': 'L', 'C': 'M', 'D': 'N', 'E': 'O' };
const MAP_CIPHER_TO_OPT = { 'K': 'A', 'L': 'B', 'M': 'C', 'N': 'D', 'O': 'E', 'A': 'A', 'B': 'B', 'C': 'C', 'D': 'D', 'E': 'E' };

function encodeKunciGist(opt) {
    const up = String(opt || 'A').trim().toUpperCase();
    return MAP_OPT_TO_CIPHER[up] || 'K';
}

function decodeKunciGist(cipher) {
    const up = String(cipher || 'K').trim().toUpperCase();
    return MAP_CIPHER_TO_OPT[up] || 'A';
}

function normalisasiKeBarisPerMapel(rawItems) {
    const arr = Array.isArray(rawItems) ? rawItems : [];
    const mapelMap = new Map();

    const getOrCreateGroup = (mapelName) => {
        const key = String(mapelName || "Umum").trim() || "Umum";
        if (!mapelMap.has(key)) {
            mapelMap.set(key, { mapel: key, kelas: [], soal: [] });
        }
        return mapelMap.get(key);
    };

    arr.forEach(entry => {
        if (!entry || typeof entry !== "object") return;
        if (Array.isArray(entry.soal)) {
            const grp = getOrCreateGroup(entry.mapel);
            if (Array.isArray(entry.kelas)) {
                entry.kelas.forEach(k => { if (k && !grp.kelas.includes(k)) grp.kelas.push(k); });
            }
            entry.soal.forEach(s => {
                if (!s || typeof s !== "object") return;
                const soalObj = {
                    ...s,
                    mapel: s.mapel || grp.mapel,
                    kelas: Array.isArray(s.kelas) && s.kelas.length > 0 ? s.kelas : [...grp.kelas]
                };
                if (!grp.soal.some(existing => existing.id && soalObj.id && existing.id === soalObj.id)) {
                    grp.soal.push(soalObj);
                }
            });
            return;
        }

        const grp = getOrCreateGroup(entry.mapel);
        if (Array.isArray(entry.kelas)) {
            entry.kelas.forEach(k => { if (k && !grp.kelas.includes(k)) grp.kelas.push(k); });
        }
        if (entry.soal !== undefined) {
            if (!grp.soal.some(existing => existing.id && entry.id && existing.id === entry.id)) {
                grp.soal.push({
                    ...entry,
                    mapel: grp.mapel,
                    kelas: Array.isArray(entry.kelas) ? [...entry.kelas] : [...grp.kelas]
                });
            }
        }
    });

    return Array.from(mapelMap.values());
}

function serializeSoalJsonOneMapelPerLine(soalArrayOrMapelRows) {
    const mapelRows = normalisasiKeBarisPerMapel(soalArrayOrMapelRows);
    if (mapelRows.length === 0) return "[]";
    const lines = mapelRows.map(row => `  ${JSON.stringify(row)}`);
    return `[\n${lines.join(",\n")}\n]`;
}

function parseSoalJsonFlexible(rawContent) {
    if (!rawContent) return [];
    let rawItems = [];
    if (Array.isArray(rawContent)) {
        rawItems = rawContent;
    } else {
        const text = String(rawContent).trim();
        if (!text) return [];
        try {
            const parsed = JSON.parse(text);
            rawItems = Array.isArray(parsed) ? parsed : (parsed && typeof parsed === "object" ? [parsed] : []);
        } catch (_) {
            const lines = text
                .split(/\r?\n/)
                .map(l => l.trim())
                .filter(l => l && l !== "[" && l !== "]")
                .map(l => l.endsWith(",") ? l.slice(0, -1).trim() : l);

            for (const line of lines) {
                try {
                    const obj = JSON.parse(line);
                    if (obj && typeof obj === "object") rawItems.push(obj);
                } catch (lineErr) {}
            }
        }
    }

    const mapelRows = normalisasiKeBarisPerMapel(rawItems);
    const flatSoal = [];
    mapelRows.forEach(row => {
        row.soal.forEach(item => {
            flatSoal.push({
                ...item,
                mapel: item.mapel || row.mapel,
                kelas: Array.isArray(item.kelas) && item.kelas.length > 0 ? item.kelas : [...row.kelas]
            });
        });
    });
    return flatSoal;
}

function getItemMapelNorm(item) {
    if (!item || typeof item !== "object") return "";
    if (item.mapel) return normStr(item.mapel);
    if (item.namaUjian) {
        const parts = String(item.namaUjian).split("_");
        if (parts.length > 1) return normStr(parts.slice(0, -1).join(" "));
    }
    return "";
}

function itemCocokMapel(item, mapelTarget) {
    const targetNorm = normStr(mapelTarget);
    if (!targetNorm) return false;
    const itemMapel = getItemMapelNorm(item);
    if (itemMapel === targetNorm) return true;
    const slugTarget = targetNorm.replace(/\s+/g, "_");
    const slugItem = itemMapel.replace(/\s+/g, "_");
    if (slugItem === slugTarget) return true;
    if (item.namaUjian && normStr(item.namaUjian).startsWith(slugTarget + "_")) return true;
    return false;
}

function cekSoalCocokKelas(item, mapel, kelasTarget) {
    if (!itemCocokMapel(item, mapel)) return false;
    const targetNorm = normStr(kelasTarget);
    if (Array.isArray(item.kelas) && item.kelas.length > 0) {
        return item.kelas.some(k => normStr(k) === targetNorm);
    }
    const legacyName = normStr(`${String(mapel || "").replace(/\s+/g, '_')}_${String(kelasTarget || "").replace(/\s+/g, '_')}`);
    return normStr(item.namaUjian) === legacyName;
}

// ================= CACHE SOAL & DATABASE MASTER GIST =================
const SOAL_CACHE_TTL_MS = 15 * 60 * 1000;
const CBT_DB_CACHE_KEY = `smantas_cbt_master_cache_${CBT_GIST_ID}`;
const CBT_DB_CACHE_TTL_MS = 2 * 60 * 1000;

function getSoalCacheKey(scope = "all") {
    return `smantas_cbt_soal_cache_${GIST_ID}_${scope}`;
}

function bacaCacheSoal(scope = "all") {
    try {
        const raw = sessionStorage.getItem(getSoalCacheKey(scope));
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || !Array.isArray(parsed.data) || !parsed.savedAt) return null;
        if (Date.now() - parsed.savedAt > SOAL_CACHE_TTL_MS) {
            sessionStorage.removeItem(getSoalCacheKey(scope));
            return null;
        }
        return parsed.data;
    } catch (e) {
        return null;
    }
}

function simpanCacheSoal(scope = "all", data = []) {
    try {
        sessionStorage.setItem(getSoalCacheKey(scope), JSON.stringify({
            savedAt: Date.now(),
            data: Array.isArray(data) ? data : []
        }));
    } catch (e) {}
}

function bersihkanCacheSoal() {
    try {
        Object.keys(sessionStorage).forEach(k => {
            if (k.startsWith(`smantas_cbt_soal_cache_${GIST_ID}_`)) {
                sessionStorage.removeItem(k);
            }
        });
    } catch (e) {}
}

function bersihkanCacheLokalLama(usernameOpsional = null) {
    try {
        localStorage.removeItem(CBT_DB_CACHE_KEY);
        if (usernameOpsional) {
            localStorage.removeItem(getLockedMapelStorageKey(usernameOpsional));
            localStorage.removeItem(`smantas_cbt_unlocked_mapel_${String(usernameOpsional).trim()}`);
        } else {
            Object.keys(localStorage).forEach(k => {
                if (
                    k.startsWith("smantas_cbt_master_cache_") ||
                    k.startsWith("smantas_cbt_locked_mapel_") ||
                    k.startsWith("smantas_cbt_unlocked_mapel_")
                ) {
                    localStorage.removeItem(k);
                }
            });
        }
        bersihkanCacheSoal();
    } catch (e) {}
}

async function fetchAllSoalFromGist(options = {}) {
    const preferRaw = options.preferRaw !== false;
    const forceRefresh = options.forceRefresh === true;
    const cacheScope = options.cacheScope || (preferRaw ? "raw_exam" : "admin_api");

    if (!forceRefresh) {
        const cached = bacaCacheSoal(cacheScope);
        if (cached) return cached;
    }

    if (preferRaw) {
        try {
            // Bucket 60 detik agar CDN GitHub Raw mengembalikan cache bersama untuk 1000+ siswa
            const res = await axios.get(`${GIST_RAW_URL}?t=${Math.floor(Date.now() / 60000)}`);
            const list = parseSoalJsonFlexible(res.data);
            simpanCacheSoal(cacheScope, list);
            return list;
        } catch (rawErr) {
            console.warn("Gagal baca GIST_RAW_URL, fallback ke Gist API:", rawErr);
        }
    }

    try {
        const gistRes = await axios.get(`https://api.github.com/gists/${GIST_ID}?t=${Date.now()}`, {
            headers: { "Authorization": `token ${GIST_TOKEN}` }
        });
        const filename = Object.keys(gistRes.data.files)[0];
        const rawContent = gistRes.data.files[filename].content;
        const list = parseSoalJsonFlexible(rawContent);
        simpanCacheSoal(cacheScope, list);
        return list;
    } catch (apiErr) {
        if (!preferRaw) {
            try {
                const res = await axios.get(`${GIST_RAW_URL}?t=${Date.now()}`);
                const list = parseSoalJsonFlexible(res.data);
                simpanCacheSoal(cacheScope, list);
                return list;
            } catch (e2) {}
        }
        return [];
    }
}

function terapkanDataCbtMaster(data) {
    if (!data || typeof data !== 'object') return;
    if (Array.isArray(data.db_kelas)) daftarKelas = data.db_kelas;
    if (Array.isArray(data.db_mapel)) daftarMapel = data.db_mapel;
    if (Array.isArray(data.db_siswa)) databaseSiswa = data.db_siswa;
    if (Array.isArray(data.db_jadwal)) daftarJadwalUjian = data.db_jadwal;
    if (data.db_pengaturan && typeof data.db_pengaturan === 'object') {
        pengaturanCbt = { ...pengaturanCbt, ...data.db_pengaturan };
        if (data.db_pengaturan.adminPasswordPlain) {
            localStorage.setItem("adminPasswordPlain", data.db_pengaturan.adminPasswordPlain);
        }
    }
}

function simpanCacheCbtMaster(data) {
    try {
        localStorage.setItem(CBT_DB_CACHE_KEY, JSON.stringify({
            savedAt: Date.now(),
            data: data
        }));
    } catch (e) {}
}

function bacaCacheCbtMaster() {
    try {
        const raw = localStorage.getItem(CBT_DB_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || !parsed.data || !parsed.savedAt) return null;
        if (Date.now() - parsed.savedAt > CBT_DB_CACHE_TTL_MS) return null;
        return parsed.data;
    } catch (e) {
        return null;
    }
}

async function fetchCbtDatabase(forceRefresh = false, preferApi = false) {
    if (isDataLoadedOnce && !forceRefresh) return;

    if (!forceRefresh && !preferApi) {
        const cached = bacaCacheCbtMaster();
        if (cached) {
            terapkanDataCbtMaster(cached);
            isDataLoadedOnce = true;
            if (typeof refreshUISetelahDbMaster === "function") refreshUISetelahDbMaster();
            return;
        }
    }

    try {
        let data = null;
        if (preferApi) {
            try {
                let apiRes = await axios.get(`https://api.github.com/gists/${CBT_GIST_ID}?t=${Date.now()}`, {
                    headers: { "Authorization": `token ${GIST_TOKEN}` }
                });
                const files = apiRes.data.files || {};
                const fname = files["db_cbt.json"] ? "db_cbt.json" : Object.keys(files)[0];
                data = JSON.parse(files[fname].content);
            } catch (apiErr) {
                const bucket = Math.floor(Date.now() / 60000);
                let res = await axios.get(`${CBT_GIST_RAW_URL}?t=${bucket}`);
                data = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
            }
        } else {
            try {
                const bucket = forceRefresh ? Date.now() : Math.floor(Date.now() / 60000);
                let res = await axios.get(`${CBT_GIST_RAW_URL}?t=${bucket}`);
                data = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
            } catch (rawErr) {
                let apiRes = await axios.get(`https://api.github.com/gists/${CBT_GIST_ID}?t=${Date.now()}`, {
                    headers: { "Authorization": `token ${GIST_TOKEN}` }
                });
                const files = apiRes.data.files || {};
                const fname = files["db_cbt.json"] ? "db_cbt.json" : Object.keys(files)[0];
                data = JSON.parse(files[fname].content);
            }
        }

        if (data && typeof data === 'object') {
            terapkanDataCbtMaster(data);
            simpanCacheCbtMaster(data);
        }
        isDataLoadedOnce = true;
    } catch (e) {
        console.error("Gagal mengambil db_cbt.json dari Gist:", e);
    }
    if (typeof refreshUISetelahDbMaster === "function") refreshUISetelahDbMaster();
}

// ================= STATUS & RIWAYAT SESI (GAS) =================
function parseTokenCount(token) {
    const m = String(token || "").trim().match(/^(.*?)(?:\s*\((\d+)x\))?$/i);
    if (!m) return { base: String(token || "").trim(), count: 1 };
    return {
        base: m[1].trim(),
        count: m[2] ? parseInt(m[2], 10) : 1
    };
}

function formatTokenCount(base, count) {
    return count > 1 ? `${base} (${count}x)` : base;
}

function gabungRiwayatStatus(statusLama, statusBaru) {
    const baru = String(statusBaru || "").trim();
    const lamaRaw = String(statusLama || "").trim();
    if (!lamaRaw || lamaRaw === "-" || lamaRaw === "Login Aktif") {
        return baru;
    }

    const daftarLama = lamaRaw.split(",").map(s => s.trim()).filter(Boolean);
    if (!baru) return daftarLama.join(", ");

    if (daftarLama[daftarLama.length - 1] === "Sedang Ujian" && baru !== "Sedang Ujian") {
        daftarLama.pop();
    }

    if (daftarLama.length === 0) return baru;

    if (baru.toLowerCase().startsWith("curang")) {
        const parsedBaru = parseTokenCount(baru);
        const existingIdx = daftarLama.findIndex(tok =>
            parseTokenCount(tok).base.toLowerCase() === parsedBaru.base.toLowerCase()
        );
        if (existingIdx !== -1) {
            const parsedLama = parseTokenCount(daftarLama[existingIdx]);
            const totalCount = parsedLama.count + parsedBaru.count;
            daftarLama[existingIdx] = formatTokenCount(parsedLama.base, totalCount);
            return daftarLama.join(", ");
        }
    }

    if (daftarLama[daftarLama.length - 1].toLowerCase() === baru.toLowerCase()) {
        return daftarLama.join(", ");
    }

    daftarLama.push(baru);
    return daftarLama.join(", ");
}

function cekStatusTerkunci(statusStr) {
    const tokens = String(statusStr || "").split(",").map(s => s.trim()).filter(Boolean);
    if (tokens.length === 0) return false;
    const terakhir = tokens[tokens.length - 1];
    if (terakhir === "Direset" || terakhir.endsWith("Direset") || terakhir.toLowerCase().includes("reset") || terakhir === "Sedang Ujian" || terakhir === "Login Aktif") {
        return false;
    }
    return terakhir === "Selesai" || terakhir.toLowerCase().startsWith("curang");
}

function formatPelanggaranRingkas(alasan) {
    const low = String(alasan || "").toLowerCase();
    if (low.includes("full screen") || low.includes("fullscreen")) {
        return "Curang: Keluar dari mode Full Screen";
    }
    if (low.includes("tab") || low.includes("jendela") || low.includes("aplikasi") || low.includes("menyembunyikan")) {
        return "Curang: Pindah Tab / Aplikasi";
    }
    if (low.includes("waktu")) {
        return "Waktu Habis";
    }
    return alasan ? `Curang: ${alasan}` : "Curang";
}

function normalisasiSesiDariGAS(rawData) {
    const map = {};
    if (!rawData) return map;

    if (Array.isArray(rawData)) {
        rawData.forEach(item => {
            if (!item) return;
            const uname = String(item.username || item.nis || "").trim();
            if (uname) {
                map[uname] = {
                    username: uname,
                    deviceId: item.deviceId || item.perangkat || "",
                    status: item.status || "Login Aktif",
                    nama: item.nama || "",
                    kelas: item.kelas || "",
                    mapel: item.mapel || "-",
                    updatedAt: item.updatedAt || ""
                };
            }
        });
    } else if (typeof rawData === 'object') {
        Object.keys(rawData).forEach(key => {
            const item = rawData[key];
            if (item && typeof item === 'object') {
                const uname = String(item.username || key || "").trim();
                if (uname) {
                    map[uname] = {
                        username: uname,
                        deviceId: item.deviceId || item.perangkat || "",
                        status: item.status || "Login Aktif",
                        nama: item.nama || "",
                        kelas: item.kelas || "",
                        mapel: item.mapel || "-",
                        updatedAt: item.updatedAt || ""
                    };
                }
            }
        });
    }
    return map;
}

// Ambil sesi 1 user saja (jauh lebih ringan untuk siswa daripada mengunduh 1000+ sesi)
async function fetchSingleSesiFromGAS(username, silent = true) {
    const uname = String(username || "").trim();
    if (!uname) return null;
    try {
        const res = await postToGAS({ action: "getSesi", username: uname });
        if (res.data && res.data.status === "success") {
            const d = res.data.data;
            if (d && (d.username || d.deviceId || d.status)) {
                sesiLoginSiswa[uname] = {
                    username: uname,
                    deviceId: d.deviceId || "",
                    status: d.status || "Login Aktif",
                    nama: d.nama || "",
                    kelas: d.kelas || "",
                    mapel: d.mapel || "-",
                    updatedAt: d.updatedAt || ""
                };
                return sesiLoginSiswa[uname];
            } else {
                delete sesiLoginSiswa[uname];
                return null;
            }
        }
    } catch (e) {
        if (!silent) console.error("Gagal mengambil sesi siswa dari GAS:", e);
    }
    return sesiLoginSiswa[uname] || null;
}

async function fetchSesiFromGAS(silent = false) {
    try {
        const res = await postToGAS({ action: "getSesi" });
        if (res.data && res.data.status === "success") {
            sesiLoginSiswa = normalisasiSesiDariGAS(res.data.data);
        }
    } catch (e) {
        if (!silent) console.error("Gagal mengambil data sesi dari GAS:", e);
    }
    if (typeof renderTabelSesiAktif === "function") renderTabelSesiAktif();
    return sesiLoginSiswa;
}

async function setSesiToGAS(sesiObj) {
    const uname = String(sesiObj.username || "").trim();
    if (!uname) return null;

    sesiLoginSiswa[uname] = {
        username: uname,
        deviceId: sesiObj.deviceId || "",
        status: sesiObj.status || "Login Aktif",
        nama: sesiObj.nama || "",
        kelas: sesiObj.kelas || "",
        mapel: sesiObj.mapel || "-",
        updatedAt: sesiObj.updatedAt || getLocalIsoNow()
    };

    try {
        const res = await postToGAS({
            action: "setSesi",
            username: uname,
            sesi: sesiLoginSiswa[uname]
        });
        return res.data;
    } catch (e) {
        console.error("Gagal menyimpan sesi ke GAS:", e);
        return null;
    }
}

async function deleteSesiFromGAS(username) {
    const uname = String(username || "").trim();
    if (!uname) return null;
    delete sesiLoginSiswa[uname];
    try {
        const res = await postToGAS({ action: "resetSesi", username: uname });
        return res.data;
    } catch (e) {
        console.error("Gagal mereset sesi di GAS:", e);
        return null;
    }
}
