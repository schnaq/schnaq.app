// Access code form on the home page: shows the code as "1234 5678" like the
// app does on the projector, checks it against the API and forwards to the
// schnaq. ?code=12345678 (QR codes, old links) pre-fills it. The error texts
// come from the form's data attributes, so they are in the page's language.

const API = 'https://api.app.schnaq.com/schnaq/by-access-code'

const form = document.getElementById('join')
const input = form.elements['access-code']
const button = form.querySelector('button')
const message = document.getElementById('join-message')

const digits = () => input.value.replace(/\D/g, '')

function format() {
  const d = digits().slice(0, 8)
  input.value = d.length > 4 ? `${d.slice(0, 4)} ${d.slice(4)}` : d
  button.disabled = d.length === 0
}

function fail(text) {
  input.setAttribute('aria-invalid', 'true')
  message.textContent = text
  button.disabled = false
  input.focus()
}

input.addEventListener('input', () => {
  input.removeAttribute('aria-invalid')
  message.textContent = ''
  format()
})

form.addEventListener('submit', async (event) => {
  event.preventDefault()
  // Codes are numbers and the app's copy button drops leading zeros.
  const code = digits().padStart(8, '0')

  button.disabled = true
  try {
    const response = await fetch(`${API}?access-code=${code}`)
    if (response.status === 400 || response.status === 404) return fail(form.dataset.invalid)
    if (!response.ok) return fail(form.dataset.offline)
    const { location } = await response.json()
    window.location.href = location
  } catch {
    fail(form.dataset.offline)
  }
})

// Links to #join (header, footer, other pages) put the cursor into the field.
function focusOnJoinLink() {
  if (window.location.hash === '#join') input.focus()
}

const code = new URLSearchParams(window.location.search).get('code')
if (code) {
  input.value = code
  format()
}
// After load: the browser's own scroll to #join would otherwise reset the focus.
window.addEventListener('load', () => (code ? button.focus() : focusOnJoinLink()))
window.addEventListener('hashchange', focusOnJoinLink)
// Back from the schnaq: the page may come from the bfcache with a disabled button.
window.addEventListener('pageshow', format)
