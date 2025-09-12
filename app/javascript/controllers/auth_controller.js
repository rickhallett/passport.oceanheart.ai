import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["email", "password", "submit", "status"]
  
  connect() {
    console.log("Auth controller connected")
    this.updateStatus("Ready")
  }
  
  handleResponse(event) {
    if (event.detail.success) {
      this.updateStatus("Authentication successful")
      this.clearForm()
    } else {
      this.updateStatus("Authentication failed", "error")
      this.shakeForm()
    }
  }
  
  updateStatus(message, type = "info") {
    if (this.hasStatusTarget) {
      this.statusTarget.textContent = message
      this.statusTarget.className = `terminal-text status-${type}`
    }
  }
  
  clearForm() {
    if (this.hasEmailTarget) this.emailTarget.value = ""
    if (this.hasPasswordTarget) this.passwordTarget.value = ""
  }
  
  shakeForm() {
    this.element.classList.add("shake")
    setTimeout(() => this.element.classList.remove("shake"), 500)
  }
}