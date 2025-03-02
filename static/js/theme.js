
/**
 * Theme Toggle Functionality
 * Manages light/dark theme preferences and toggles
 */
document.addEventListener('DOMContentLoaded', function() {
    const html = document.documentElement;
    const themeToggle = document.getElementById('theme-toggle');
    
    // Check for saved preference or use system preference
    function getInitialTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            return savedTheme;
        }
        
        // Check system preference
        return window.matchMedia('(prefers-color-scheme: dark)').matches 
            ? 'dark' 
            : 'light';
    }
    
    // Apply theme to document
    function applyTheme(theme) {
        html.setAttribute('data-theme', theme);
        updateToggleButton(theme);
        localStorage.setItem('theme', theme);
        console.log(`Theme applied: ${theme}`);
    }
    
    // Update the toggle button icon based on current theme
    function updateToggleButton(theme) {
        if (!themeToggle) return;
        
        themeToggle.innerHTML = theme === 'dark' 
            ? '<i class="fas fa-sun"></i>' 
            : '<i class="fas fa-moon"></i>';
            
        themeToggle.setAttribute('aria-label', 
            theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    }
    
    // Toggle between themes
    function toggleTheme() {
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(newTheme);
    }
    
    // Set up event listener for theme toggle
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    // Initialize theme
    const initialTheme = getInitialTheme();
    applyTheme(initialTheme);
    
    // Listen for system preference changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (!localStorage.getItem('theme')) {
            // Only auto-switch if user hasn't manually set a preference
            applyTheme(e.matches ? 'dark' : 'light');
        }
    });
});
