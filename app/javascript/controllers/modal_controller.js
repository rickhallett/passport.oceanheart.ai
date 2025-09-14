import { Controller } from "@hotwired/stimulus"

// data-controller="modal"
// data-modal-target-id-value="modal-delete-123"
// action: "click->modal#open"
export default class extends Controller {
  static values = { targetId: String }

  open(event) {
    event.preventDefault()
    const el = document.getElementById(this.targetIdValue)
    if (el) el.classList.add("open")
  }

  close(event) {
    event?.preventDefault()
    const id = event?.params?.modalId || this.targetIdValue
    const el = document.getElementById(id)
    if (el) el.classList.remove("open")
  }

  backdrop(event) {
    // Close when clicking backdrop only
    if (event.target.classList.contains("terminal-modal-backdrop")) {
      this.close(event)
    }
  }
}

