// Spring Passport JavaScript
// CSRF Token handling for AJAX requests

document.addEventListener('DOMContentLoaded', function() {
    // Get CSRF token from meta tag
    const csrfToken = document.querySelector('meta[name="_csrf"]')?.getAttribute('content');
    const csrfHeader = document.querySelector('meta[name="_csrf_header"]')?.getAttribute('content');
    
    // Set CSRF token for all AJAX requests
    if (csrfToken && csrfHeader) {
        // For fetch API
        const originalFetch = window.fetch;
        window.fetch = function(url, options = {}) {
            if (!options.headers) {
                options.headers = {};
            }
            if (typeof options.headers.set === 'function') {
                options.headers.set(csrfHeader, csrfToken);
            } else {
                options.headers[csrfHeader] = csrfToken;
            }
            return originalFetch(url, options);
        };
        
        // For XMLHttpRequest
        const originalOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
            this.addEventListener('readystatechange', function() {
                if (this.readyState === XMLHttpRequest.OPENED) {
                    this.setRequestHeader(csrfHeader, csrfToken);
                }
            });
            return originalOpen.apply(this, arguments);
        };
    }
    
    // Form enhancement
    enhanceForms();
    
    // Flash message auto-hide
    hideFlashMessages();
});

function enhanceForms() {
    const forms = document.querySelectorAll('.terminal-form');
    
    forms.forEach(form => {
        const submitButton = form.querySelector('.terminal-button');
        const inputs = form.querySelectorAll('.terminal-input');
        
        // Add loading state on form submission
        form.addEventListener('submit', function(e) {
            if (submitButton) {
                submitButton.classList.add('loading');
                submitButton.disabled = true;
            }
        });
        
        // Input validation styling
        inputs.forEach(input => {
            input.addEventListener('blur', function() {
                validateInput(this);
            });
            
            input.addEventListener('input', function() {
                clearValidationState(this);
            });
        });
    });
}

function validateInput(input) {
    const value = input.value.trim();
    
    // Email validation
    if (input.type === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (value && !emailRegex.test(value)) {
            setInputState(input, 'error');
            return false;
        }
    }
    
    // Required field validation
    if (input.required && !value) {
        setInputState(input, 'error');
        return false;
    }
    
    // Password length validation
    if (input.type === 'password' && value && value.length < 8) {
        setInputState(input, 'error');
        return false;
    }
    
    if (value) {
        setInputState(input, 'success');
    }
    
    return true;
}

function setInputState(input, state) {
    input.classList.remove('error', 'success');
    if (state) {
        input.classList.add(state);
    }
}

function clearValidationState(input) {
    input.classList.remove('error', 'success');
}

function hideFlashMessages() {
    const flashMessages = document.querySelectorAll('#flash-messages > div');
    
    flashMessages.forEach(message => {
        setTimeout(() => {
            message.style.opacity = '0';
            message.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                message.remove();
            }, 300);
        }, 5000);
    });
}

// Auth utility functions
window.PassportAuth = {
    // Sign out function
    signOut: function() {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = '/sign-out';
        
        // Add CSRF token
        const csrfToken = document.querySelector('meta[name="_csrf"]')?.getAttribute('content');
        if (csrfToken) {
            const csrfInput = document.createElement('input');
            csrfInput.type = 'hidden';
            csrfInput.name = '_csrf';
            csrfInput.value = csrfToken;
            form.appendChild(csrfInput);
        }
        
        document.body.appendChild(form);
        form.submit();
    },
    
    // Show loading state
    showLoading: function(element) {
        if (element) {
            element.classList.add('loading');
            element.disabled = true;
        }
    },
    
    // Hide loading state
    hideLoading: function(element) {
        if (element) {
            element.classList.remove('loading');
            element.disabled = false;
        }
    }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.PassportAuth;
}