// Deteksi siswa keluar tab / pindah aplikasi
document.addEventListener("visibilitychange", () => {
  if (document.hidden && cheatDetectionActive) {
    alert("Peringatan! Anda terdeteksi meninggalkan halaman ujian.");
    // Anda bisa mencatat pelanggaran ini ke database
  }
});

// Deteksi keluar dari Fullscreen
document.addEventListener("fullscreenchange", () => {
  if (!document.fullscreenElement && cheatDetectionActive) {
    alert("Anda harus tetap berada dalam mode layar penuh (fullscreen) selama ujian!");
  }
});