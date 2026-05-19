document.addEventListener('DOMContentLoaded', function () {
  var header = document.getElementById('kc-header')
  if (!header) return
  header.style.cursor = 'pointer'
  header.addEventListener('click', function () {
    window.location.href = 'http://localhost:5173'
  })
})
