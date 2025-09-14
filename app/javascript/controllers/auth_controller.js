import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["email", "password", "submit", "status"]
  
  connect() {
    console.log("Auth controller connected")
    this.updateStatus("System Ready", "success")
    this.addInputAnimations()
  }
  
  handleResponse(event) {
    const submitButton = this.hasSubmitTarget ? this.submitTarget : null
    
    if (event.detail.success) {
      this.updateStatus("Authentication successful", "success")
      this.showSuccessAnimation()
      this.clearForm()
    } else {
      this.updateStatus("Authentication failed", "error")
      this.showErrorAnimation()
      this.shakeForm()
    }
    
    // Reset submit button state
    if (submitButton) {
      submitButton.disabled = false
      submitButton.textContent = submitButton.dataset.originalText || "Sign In"
    }
  }
  
  updateStatus(message, type = "info") {
    if (this.hasStatusTarget) {
      const statusDot = this.statusTarget.querySelector(".status-online, .status-offline")
      const statusText = this.statusTarget.querySelector("span")
      
      if (statusDot && statusText) {
        statusText.textContent = message
        
        // Update status indicator
        statusDot.className = `status-indicator ${
          type === "success" ? "status-online" : 
          type === "error" ? "status-offline" : "status-online"
        }`
        
        // Add animation
        statusText.style.transform = "translateY(-10px)"
        statusText.style.opacity = "0"
        
        requestAnimationFrame(() => {
          statusText.style.transition = "all 0.3s ease-out"
          statusText.style.transform = "translateY(0)"
          statusText.style.opacity = "1"
        })
      }
    }
  }
  
  addInputAnimations() {
    // Add focus animations to inputs
    const inputs = this.element.querySelectorAll(".input-glass")
    inputs.forEach(input => {
      input.addEventListener("focus", () => {
        input.style.transform = "scale(1.02)"
        input.style.boxShadow = "0 0 20px rgba(59, 130, 246, 0.3)"
      })
      
      input.addEventListener("blur", () => {
        input.style.transform = "scale(1)"
        input.style.boxShadow = ""
      })
    })
  }
  
  showSuccessAnimation() {
    // Create success checkmark animation
    const successIcon = document.createElement("div")
    successIcon.className = "fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50"
    successIcon.innerHTML = `
      <div class="glass rounded-full p-4 animate-scale-in glow-emerald">
        <svg class="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
      </div>
    `
    
    document.body.appendChild(successIcon)
    
    setTimeout(() => {
      successIcon.style.opacity = "0"
      successIcon.style.transition = "opacity 0.3s ease-out"
      setTimeout(() => successIcon.remove(), 300)
    }, 1500)
  }
  
  showErrorAnimation() {
    // Create error animation
    const errorIcon = document.createElement("div")
    errorIcon.className = "fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50"
    errorIcon.innerHTML = `
      <div class="glass rounded-full p-4 animate-scale-in" style="box-shadow: 0 0 20px rgba(248, 113, 113, 0.3);">
        <svg class="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </div>
    `
    
    document.body.appendChild(errorIcon)
    
    setTimeout(() => {
      errorIcon.style.opacity = "0"
      errorIcon.style.transition = "opacity 0.3s ease-out"
      setTimeout(() => errorIcon.remove(), 300)
    }, 1500)
  }
  
  clearForm() {
    if (this.hasEmailTarget) {
      this.emailTarget.value = ""
      this.animateInput(this.emailTarget)
    }
    if (this.hasPasswordTarget) {
      this.passwordTarget.value = ""
      this.animateInput(this.passwordTarget)
    }
  }
  
  animateInput(input) {
    input.style.transform = "scale(0.98)"
    setTimeout(() => {
      input.style.transform = "scale(1)"
    }, 100)
  }
  
  shakeForm() {
    this.element.style.animation = "shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97)"
    setTimeout(() => {
      this.element.style.animation = ""
    }, 500)
  }
  
  // Handle form submission with loading state
  handleSubmit(event) {
    const submitButton = this.hasSubmitTarget ? this.submitTarget : null
    
    if (submitButton) {
      submitButton.dataset.originalText = submitButton.textContent
      submitButton.disabled = true
      submitButton.innerHTML = `
        <div class="flex items-center justify-center space-x-2">
          <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          <span>Signing in...</span>
        </div>
      `
    }
    
    this.updateStatus("Authenticating...", "info")
  }
}