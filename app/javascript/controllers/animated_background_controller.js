import { Controller } from "@hotwired/stimulus"

// Animated background effects and particles
export default class extends Controller {
  static values = { 
    particles: { type: Number, default: 50 },
    speed: { type: Number, default: 1 },
    color: { type: String, default: "rgba(59, 130, 246, 0.1)" }
  }

  connect() {
    this.createCanvas()
    this.initParticles()
    this.animate()
    
    // Handle window resize
    window.addEventListener("resize", this.handleResize.bind(this))
  }

  disconnect() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame)
    }
    window.removeEventListener("resize", this.handleResize.bind(this))
    
    if (this.canvas) {
      this.canvas.remove()
    }
  }

  createCanvas() {
    this.canvas = document.createElement("canvas")
    this.canvas.style.position = "absolute"
    this.canvas.style.top = "0"
    this.canvas.style.left = "0"
    this.canvas.style.width = "100%"
    this.canvas.style.height = "100%"
    this.canvas.style.pointerEvents = "none"
    this.canvas.style.zIndex = "1"
    
    this.element.style.position = "relative"
    this.element.appendChild(this.canvas)
    
    this.ctx = this.canvas.getContext("2d")
    this.resizeCanvas()
  }

  resizeCanvas() {
    const rect = this.element.getBoundingClientRect()
    this.canvas.width = rect.width
    this.canvas.height = rect.height
  }

  handleResize() {
    this.resizeCanvas()
  }

  initParticles() {
    this.particles = []
    
    for (let i = 0; i < this.particlesValue; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * this.speedValue,
        vy: (Math.random() - 0.5) * this.speedValue,
        size: Math.random() * 2 + 1,
        opacity: Math.random() * 0.5 + 0.1
      })
    }
  }

  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    
    // Update and draw particles
    this.particles.forEach(particle => {
      // Update position
      particle.x += particle.vx
      particle.y += particle.vy
      
      // Wrap around edges
      if (particle.x < 0) particle.x = this.canvas.width
      if (particle.x > this.canvas.width) particle.x = 0
      if (particle.y < 0) particle.y = this.canvas.height
      if (particle.y > this.canvas.height) particle.y = 0
      
      // Draw particle
      this.ctx.beginPath()
      this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
      this.ctx.fillStyle = this.colorValue.replace(/[\\d\\.]+\\)$/, `${particle.opacity})`)
      this.ctx.fill()
    })
    
    // Draw connections between nearby particles
    this.drawConnections()
    
    this.animationFrame = requestAnimationFrame(() => this.animate())
  }

  drawConnections() {
    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const p1 = this.particles[i]
        const p2 = this.particles[j]
        
        const dx = p1.x - p2.x
        const dy = p1.y - p2.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        if (distance < 100) {
          const opacity = (1 - distance / 100) * 0.2
          
          this.ctx.beginPath()
          this.ctx.moveTo(p1.x, p1.y)
          this.ctx.lineTo(p2.x, p2.y)
          this.ctx.strokeStyle = this.colorValue.replace(/[\\d\\.]+\\)$/, `${opacity})`)
          this.ctx.lineWidth = 1
          this.ctx.stroke()
        }
      }
    }
  }
}