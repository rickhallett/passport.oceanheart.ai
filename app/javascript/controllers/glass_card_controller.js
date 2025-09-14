import { Controller } from "@hotwired/stimulus"

// Glass card hover effects and interactions
export default class extends Controller {
  static targets = ["card"]
  static values = { 
    intensity: { type: Number, default: 1 },
    glow: { type: String, default: "blue" }
  }

  connect() {
    this.element.addEventListener("mouseenter", this.handleMouseEnter.bind(this))
    this.element.addEventListener("mouseleave", this.handleMouseLeave.bind(this))
    this.element.addEventListener("mousemove", this.handleMouseMove.bind(this))
  }

  disconnect() {
    this.element.removeEventListener("mouseenter", this.handleMouseEnter.bind(this))
    this.element.removeEventListener("mouseleave", this.handleMouseLeave.bind(this))
    this.element.removeEventListener("mousemove", this.handleMouseMove.bind(this))
  }

  handleMouseEnter(event) {
    this.element.style.transition = "transform 0.3s ease-out, box-shadow 0.3s ease-out"
    this.element.style.transform = `scale(${1 + (0.02 * this.intensityValue)})`
    
    // Add glow effect based on color
    const glowColors = {
      blue: "0 0 30px rgba(59, 130, 246, 0.4)",
      purple: "0 0 30px rgba(147, 51, 234, 0.4)",
      emerald: "0 0 30px rgba(16, 185, 129, 0.4)",
      pink: "0 0 30px rgba(236, 72, 153, 0.4)"
    }
    
    const currentShadow = this.element.style.boxShadow || ""
    const glowShadow = glowColors[this.glowValue] || glowColors.blue
    this.element.style.boxShadow = `${currentShadow}, ${glowShadow}`
  }

  handleMouseLeave(event) {
    this.element.style.transform = "scale(1)"
    this.element.style.boxShadow = ""
  }

  handleMouseMove(event) {
    if (!this.element.matches(":hover")) return

    const rect = this.element.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    
    const rotateX = (y - centerY) / centerY * 5 * this.intensityValue
    const rotateY = (centerX - x) / centerX * 5 * this.intensityValue
    
    this.element.style.transform = `
      scale(${1 + (0.02 * this.intensityValue)}) 
      rotateX(${rotateX}deg) 
      rotateY(${rotateY}deg)
    `
  }
}