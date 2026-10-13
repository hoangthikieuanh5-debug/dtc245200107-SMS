// app.js - Client-side scripts
document.addEventListener('DOMContentLoaded', () => {

  // ---- Delete confirmation ----
  document.querySelectorAll('.btn-delete-confirm').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      const name = this.dataset.name || 'mục này';
      if (confirm(`⚠️ Bạn có chắc muốn xóa "${name}"?\nHành động này không thể hoàn tác.`)) {
        this.closest('form').submit();
      }
    });
  });

  // ---- Grade badge colorizer ----
  document.querySelectorAll('.grade-value').forEach(el => {
    const val = parseFloat(el.textContent);
    let cls = 'badge-d';
    if (val >= 8.5)      cls = 'badge-a';
    else if (val >= 7.0) cls = 'badge-b';
    else if (val >= 5.0) cls = 'badge-c';
    el.classList.add('badge-grade', cls);
  });

  // ---- Animate rows ----
  document.querySelectorAll('tbody tr').forEach((tr, i) => {
    tr.style.opacity = '0';
    tr.style.transform = 'translateY(10px)';
    setTimeout(() => {
      tr.style.transition = 'all 0.3s ease';
      tr.style.opacity = '1';
      tr.style.transform = 'translateY(0)';
    }, i * 40);
  });

  // ---- Active nav highlight ----
  const path = window.location.pathname;
  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.getAttribute('href') !== '/' && path.startsWith(link.getAttribute('href'))) {
      link.classList.add('active');
    }
  });

  // ---- Toast notifications ----
  const toasts = document.querySelectorAll('.auto-toast');
  toasts.forEach(t => {
    setTimeout(() => t.classList.add('fade-out'), 4000);
  });
});
