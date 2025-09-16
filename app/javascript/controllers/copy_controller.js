import { Controller } from "@hotwired/stimulus"

// data-controller="copy"
export default class extends Controller {
  
  copyPath(event) {
    const path = event.currentTarget.dataset.path
    if (path) {
      this.copyToClipboard(path)
      this.showFeedback(event.currentTarget, 'Path copied!')
    }
  }

  copyCurl(event) {
    const method = event.currentTarget.dataset.method || 'get'
    const path = event.currentTarget.dataset.path
    
    if (path) {
      // Generate a basic curl command
      const baseUrl = window.location.origin
      const curl = `curl -X ${method.toUpperCase()} "${baseUrl}${path}"`
      
      this.copyToClipboard(curl)
      this.showFeedback(event.currentTarget, 'cURL copied!')
    }
  }

  async copyToClipboard(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
      } else {
        // Fallback for older browsers or non-HTTPS
        this.fallbackCopyToClipboard(text)
      }
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
      this.fallbackCopyToClipboard(text)
    }
  }

  fallbackCopyToClipboard(text) {
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    
    try {
      document.execCommand('copy')
    } catch (err) {
      console.error('Fallback copy failed:', err)
    }
    
    document.body.removeChild(textArea)
  }

  showFeedback(button, message) {
    const originalText = button.textContent
    button.textContent = message
    button.classList.add('copied')
    
    setTimeout(() => {
      button.textContent = originalText
      button.classList.remove('copied')
    }, 1500)
  }
}


