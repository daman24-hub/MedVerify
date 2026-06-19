const TOAST_ROOT_ID = 'dawacheck-toast-root'

const ensureToastRoot = () => {
  let root = document.getElementById(TOAST_ROOT_ID)
  if (!root) {
    root = document.createElement('div')
    root.id = TOAST_ROOT_ID
    document.body.appendChild(root)
  }
  return root
}

export const showToast = (message, variant = 'info') => {
  const root = ensureToastRoot()
  const toast = document.createElement('div')
  toast.className = `toast toast-${variant}`
  toast.textContent = message
  root.appendChild(toast)

  requestAnimationFrame(() => {
    toast.classList.add('toast-visible')
  })

  setTimeout(() => {
    toast.classList.remove('toast-visible')
    toast.addEventListener(
      'transitionend',
      () => {
        toast.remove()
      },
      { once: true },
    )
  }, 4200)
}
