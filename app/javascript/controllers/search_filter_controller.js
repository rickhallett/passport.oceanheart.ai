import { Controller } from "@hotwired/stimulus"

// data-controller="search-filter"
export default class extends Controller {
  static targets = ["input"]

  connect() {
    this.activeMethod = 'all'
    this.searchTerm = ''
    this.debounceTimer = null
  }

  search() {
    // Debounce search to avoid excessive filtering
    clearTimeout(this.debounceTimer)
    this.debounceTimer = setTimeout(() => {
      this.searchTerm = this.inputTarget.value.toLowerCase()
      this.filterRoutes()
    }, 200)
  }

  filterByMethod(event) {
    const method = event.currentTarget.dataset.method
    
    // Update active filter chip
    this.element.querySelectorAll('.filter-chip').forEach(chip => {
      chip.classList.remove('active')
    })
    event.currentTarget.classList.add('active')
    
    this.activeMethod = method
    this.filterRoutes()
  }

  filterRoutes() {
    const container = document.querySelector('.api-routes-container')
    if (!container) return

    const searchTerm = this.searchTerm
    const activeMethod = this.activeMethod

    // Find all endpoint rows and sections
    const rows = container.querySelectorAll('[data-searchable]')
    const sections = container.querySelectorAll('.collapsible-section')

    // Filter rows based on search term and method
    rows.forEach(row => {
      const searchableText = row.dataset.searchable || ''
      const rowMethod = row.dataset.method || ''
      
      const matchesSearch = !searchTerm || searchableText.includes(searchTerm)
      const matchesMethod = activeMethod === 'all' || rowMethod === activeMethod
      
      const shouldShow = matchesSearch && matchesMethod
      row.style.display = shouldShow ? 'block' : 'none'
      
      if (shouldShow) {
        this.highlightSearchTerms(row, searchTerm)
      }
    })

    // Show/hide sections based on whether they contain visible rows
    sections.forEach(section => {
      const visibleRows = section.querySelectorAll('[data-searchable][style="display: block"], [data-searchable]:not([style*="display: none"])')
      const hasVisibleContent = visibleRows.length > 0

      if (hasVisibleContent) {
        section.style.display = 'block'
        // Auto-expand sections with matches
        const collapsibleController = this.application.getControllerForElementAndIdentifier(section, 'collapsible')
        if (collapsibleController && (searchTerm || activeMethod !== 'all')) {
          collapsibleController.expand()
        }
      } else {
        section.style.display = 'none'
      }
    })
  }

  highlightSearchTerms(element, term) {
    if (!term) return

    const textNodes = this.getTextNodes(element)
    textNodes.forEach(node => {
      const text = node.textContent
      if (text.toLowerCase().includes(term)) {
        const highlightedText = text.replace(
          new RegExp(`(${this.escapeRegExp(term)})`, 'gi'),
          '<mark class="search-highlight">$1</mark>'
        )
        const wrapper = document.createElement('span')
        wrapper.innerHTML = highlightedText
        node.parentNode.replaceChild(wrapper, node)
      }
    })
  }

  getTextNodes(element) {
    const textNodes = []
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null,
      false
    )
    
    let node
    while (node = walker.nextNode()) {
      if (node.textContent.trim()) {
        textNodes.push(node)
      }
    }
    
    return textNodes
  }

  escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  clearSearch() {
    this.inputTarget.value = ''
    this.searchTerm = ''
    this.filterRoutes()
  }
}
