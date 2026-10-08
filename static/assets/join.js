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

input.addEventListener('input', (event) => {
  input.removeAttribute('aria-invalid')
  message.textContent = ''
  if (event.isComposing) return
  // Keep the caret behind the same digit when the space is added or removed.
  const digitsBeforeCaret = input.value.slice(0, input.selectionStart).replace(/\D/g, '').length
  format()
  const caret = digitsBeforeCaret > 4 ? digitsBeforeCaret + 1 : digitsBeforeCaret
  input.setSelectionRange(caret, caret)
})

form.addEventListener('submit', async (event) => {
  event.preventDefault()
  // Codes are numbers and the app's copy button drops leading zeros.
  const accessCode = digits().padStart(8, '0')

  button.disabled = true
  try {
    const response = await fetch(`${API}?access-code=${accessCode}`)
    if (response.status === 400 || response.status === 404) return fail(form.dataset.invalid)
    if (!response.ok) return fail(form.dataset.offline)
    const { location } = await response.json()
    window.location.href = location
  } catch {
    fail(form.dataset.offline)
  }
})

// Links to #code (header, footer, other pages) put the cursor into the field.
// Chromium does that on its own; this covers browsers that only scroll. After
// load and after the click, so the browser's own anchor handling comes first.
const focusField = () => setTimeout(() => input.focus())
document.addEventListener('click', (event) => {
  if (event.target.closest('a[href$="#code"]')) focusField()
})

const code = new URLSearchParams(window.location.search).get('code')
if (code) {
  input.value = code
  format()
}
window.addEventListener('load', () => {
  if (code) button.focus()
  else if (window.location.hash === '#code') focusField()
})
// Back from the schnaq: the page may come from the bfcache with a disabled button.
window.addEventListener('pageshow', format)
