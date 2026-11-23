// Data awal (jika localStorage masih kosong)
const soalDefault = [
  {
    id: 1,
    pertanyaan: "Apa kepanjangan dari HTML?",
    opsi: {
      A: "Hyper Text Markup Language",
      B: "High Tech Modern Language",
      C: "Hyperlink and Text Markup Language",
      D: "Home Tool Markup Language"
    },
    jawaban: "A"
  }
];

// Ambil data dari localStorage atau gunakan data default
let daftarSoal = JSON.parse(localStorage.getItem("bankSoal")) || soalDefault;

const formSoal = document.getElementById("form-soal");
const wadahDaftarSoal = document.getElementById("daftar-soal");
const jumlahSoalEl = document.getElementById("jumlah-soal");

// Fungsi menyimpan ke localStorage dan memperbarui tampilan
function simpanDanRender() {
  localStorage.setItem("bankSoal", JSON.stringify(daftarSoal));
  renderSoal();
}

// Fungsi menampilkan soal ke halaman HTML
function renderSoal() {
  wadahDaftarSoal.innerHTML = "";
  jumlahSoalEl.textContent = daftarSoal.length;

  if (daftarSoal.length === 0) {
    wadahDaftarSoal.innerHTML = "<p>Belum ada soal tersimpan.</p>";
    return;
  }

  daftarSoal.forEach((item, index) => {
    const div = document.createElement("div");
    div.className = "item-soal";
    div.innerHTML = `
      <strong>${index + 1}. ${item.pertanyaan}</strong>
      <ul>
        <li>A. ${item.opsi.A}</li>
        <li>B. ${item.opsi.B}</li>
        <li>C. ${item.opsi.C}</li>
        <li>D. ${item.opsi.D}</li>
      </ul>
      <div><strong>Kunci Jawaban:</strong> ${item.jawaban}</div>
      <button class="btn-hapus" onclick="hapusSoal(${item.id})">Hapus</button>
    `;
    wadahDaftarSoal.appendChild(div);
  });
}

// Event saat form disubmit
formSoal.addEventListener("submit", function (e) {
  e.preventDefault();

  const soalBaru = {
    id: Date.now(),
    pertanyaan: document.getElementById("pertanyaan").value,
    opsi: {
      A: document.getElementById("opsi-a").value,
      B: document.getElementById("opsi-b").value,
      C: document.getElementById("opsi-c").value,
      D: document.getElementById("opsi-d").value
    },
    jawaban: document.getElementById("jawaban").value
  };

  daftarSoal.push(soalBaru);
  simpanDanRender();
  formSoal.reset();
});

// Fungsi menghapus soal
function hapusSoal(id) {
  if (confirm("Yakin ingin menghapus soal ini?")) {
    daftarSoal = daftarSoal.filter(item => item.id !== id);
    simpanDanRender();
  }
}

// Jalankan pertama kali saat halaman dimuat
renderSoal();
