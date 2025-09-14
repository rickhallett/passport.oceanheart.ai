import { Controller } from "@hotwired/stimulus"

// data-controller="collapsible"
// data-collapsible-collapsed-value="true"
export default class extends Controller {
  static targets = ["content", "icon"]
  static values = { collapsed: Boolean }

  connect() {
    this.updateVisibility()
  }

  toggle() {
    this.collapsedValue = !this.collapsedValue
    this.updateVisibility()
  }

  expand() {
    this.collapsedValue = false
    this.updateVisibility()
  }

  collapse() {
    this.collapsedValue = true
    this.updateVisibility()
  }

  updateVisibility() {
    if (this.hasContentTarget) {
      if (this.collapsedValue) {
        this.contentTarget.style.display = 'none'
        this.contentTarget.setAttribute('aria-hidden', 'true')
      } else {
        this.contentTarget.style.display = 'block'
        this.contentTarget.setAttribute('aria-hidden', 'false')
      }
    }

    if (this.hasIconTarget) {
      this.iconTarget.textContent = this.collapsedValue ? '▶' : '▼'
      this.iconTarget.style.transform = this.collapsedValue ? 'rotate(0deg)' : 'rotate(90deg)'
    }

    // Update ARIA attributes for accessibility
    const header = this.element.querySelector('.collapsible-header')
    if (header) {
      header.setAttribute('aria-expanded', !this.collapsedValue)
    }
  }

  // Keyboard support
  keydown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      this.toggle()
    }
  }
}
