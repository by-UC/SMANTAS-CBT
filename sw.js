// Pemantau Pindah Tab & Layar Penuh (Dijalankan sewaktu ujian berlangsung)
document.addEventListener("visibilitychange", () => {
  if (document.hidden && typeof cheatDetectionActive !== 'undefined' && cheatDetectionActive) {
    alert("PERINGATAN: Anda terdeteksi meninggalkan halaman ujian!");
  }
});

document.addEventListener("fullscreenchange", () => {
  if (!document.fullscreenElement && typeof cheatDetectionActive !== 'undefined' && cheatDetectionActive) {
    alert("PERINGATAN: Anda wajib berada dalam mode skrin penuh (fullscreen) semasa ujian!");
  }
});
