document.addEventListener('DOMContentLoaded', function () {
  const header = document.getElementById('kc-header')
  if (!header) return
  header.style.cursor = 'pointer'
  header.addEventListener('click', function () {
    globalThis.location.href = 'http://localhost:5173'
  })
})
