import { Controller } from "@hotwired/stimulus"

// data-controller="dropdown"
// data-action="click->dropdown#toggle keydown->dropdown#keydown"
export default class extends Controller {
  static targets = ["menu"]

  connect() {
    this.outsideClickListener = this.closeOnOutsideClick.bind(this)
  }

  disconnect() {
    document.removeEventListener('click', this.outsideClickListener)
  }

  toggle(event) {
    event.preventDefault()
    event.stopPropagation()
    
    if (this.element.classList.contains('open')) {
      this.close()
    } else {
      this.open()
    }
  }

  keydown(event) {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault()
        this.toggle(event)
        break
      case 'Escape':
        event.preventDefault()
        this.close()
        break
      case 'ArrowDown':
        if (this.element.classList.contains('open')) {
          event.preventDefault()
          this.focusNextItem()
        }
        break
      case 'ArrowUp':
        if (this.element.classList.contains('open')) {
          event.preventDefault()
          this.focusPreviousItem()
        }
        break
    }
  }

  open() {
    this.element.classList.add('open')
    document.addEventListener('click', this.outsideClickListener)
    
    // Focus first focusable item
    const firstItem = this.element.querySelector('.dropdown-item:not(.disabled)')
    if (firstItem) {
      firstItem.focus()
    }
  }

  close() {
    this.element.classList.remove('open')
    document.removeEventListener('click', this.outsideClickListener)
  }

  closeOnOutsideClick(event) {
    if (!this.element.contains(event.target)) {
      this.close()
    }
  }

  focusNextItem() {
    const items = Array.from(this.element.querySelectorAll('.dropdown-item:not(.disabled)'))
    const currentIndex = items.indexOf(document.activeElement)
    const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0
    items[nextIndex]?.focus()
  }

  focusPreviousItem() {
    const items = Array.from(this.element.querySelectorAll('.dropdown-item:not(.disabled)'))
    const currentIndex = items.indexOf(document.activeElement)
    const previousIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1
    items[previousIndex]?.focus()
  }
}