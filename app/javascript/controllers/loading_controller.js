import { Controller } from "@hotwired/stimulus"

// Loading animations and page transitions
export default class extends Controller {
  static targets = ["indicator", "content"]

  connect() {
    // Listen for turbo navigation events
    document.addEventListener("turbo:click", this.showLoading.bind(this))
    document.addEventListener("turbo:before-visit", this.showLoading.bind(this))
    document.addEventListener("turbo:visit", this.showLoading.bind(this))
    document.addEventListener("turbo:load", this.hideLoading.bind(this))
    document.addEventListener("turbo:frame-load", this.hideLoading.bind(this))
  }

  disconnect() {
    document.removeEventListener("turbo:click", this.showLoading.bind(this))
    document.removeEventListener("turbo:before-visit", this.showLoading.bind(this))
    document.removeEventListener("turbo:visit", this.showLoading.bind(this))
    document.removeEventListener("turbo:load", this.hideLoading.bind(this))
    document.removeEventListener("turbo:frame-load", this.hideLoading.bind(this))
  }

  showLoading() {
    const indicator = document.getElementById("loading-indicator")
    if (indicator) {
      indicator.style.transform = "translateX(0)"
      indicator.style.transition = "transform 0.3s ease-out"
    }

    // Add loading state to body
    document.body.classList.add("loading")
  }

  hideLoading() {
    const indicator = document.getElementById("loading-indicator")
    if (indicator) {
      // Complete the progress bar
      indicator.style.transform = "translateX(0)"
      
      // Hide it after a short delay
      setTimeout(() => {
        indicator.style.transform = "translateX(100%)"
        indicator.style.transition = "transform 0.2s ease-in"
      }, 200)
      
      // Reset for next navigation
      setTimeout(() => {
        indicator.style.transform = "translateX(-100%)"
        indicator.style.transition = ""
      }, 500)
    }

    // Remove loading state from body
    document.body.classList.remove("loading")

    // Trigger stagger animations for new content
    this.triggerStaggerAnimations()
  }

  triggerStaggerAnimations() {
    const staggerElements = document.querySelectorAll(".stagger-children > *")
    staggerElements.forEach((el, index) => {
      el.style.opacity = "0"
      el.style.transform = "translateY(20px)"
      
      setTimeout(() => {
        el.style.transition = "opacity 0.6s ease-out, transform 0.6s ease-out"
        el.style.opacity = "1"
        el.style.transform = "translateY(0)"
      }, index * 100)
    })
  }

  // Method to show a custom loading spinner
  showSpinner(target = document.body) {
    const spinner = document.createElement("div")
    spinner.className = "fixed inset-0 flex items-center justify-center z-50 glass backdrop-blur-sm"
    spinner.innerHTML = `
      <div class="flex items-center space-x-4 glass p-6 rounded-xl">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
        <span class="text-white font-medium">Loading...</span>
      </div>
    `
    spinner.id = "custom-spinner"
    target.appendChild(spinner)
    
    // Animate in
    requestAnimationFrame(() => {
      spinner.style.opacity = "0"
      spinner.style.transition = "opacity 0.3s ease-out"
      requestAnimationFrame(() => {
        spinner.style.opacity = "1"
      })
    })
  }

  // Method to hide custom loading spinner
  hideSpinner() {
    const spinner = document.getElementById("custom-spinner")
    if (spinner) {
      spinner.style.opacity = "0"
      setTimeout(() => {
        spinner.remove()
      }, 300)
    }
  }
}