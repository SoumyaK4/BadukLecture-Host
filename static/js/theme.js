document.addEventListener('DOMContentLoaded', function() {
    const themeToggle = document.getElementById('theme-toggle');
    if (!themeToggle) return; // Safety check

    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

    // Check for saved theme preference or use system preference
    const savedTheme = localStorage.getItem('theme');
    const currentTheme = savedTheme || (prefersDarkScheme.matches ? 'dark' : 'light');

    // Set initial theme
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateToggleIcon(currentTheme);

    // Theme toggle click handler
    themeToggle.addEventListener('click', function() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateToggleIcon(newTheme);
    });

    // Update toggle icon based on theme
    function updateToggleIcon(theme) {
        themeToggle.innerHTML = theme === 'dark' 
            ? '<i class="fas fa-sun"></i>' 
            : '<i class="fas fa-moon"></i>';
    }

    // Apply theme to card and other elements
    applyThemeToElements(currentTheme);

    // Helper function to apply theme to specific elements
    function applyThemeToElements(theme) {
        // Add any additional element-specific theme adjustments here if needed
        console.log(`Theme applied: ${theme}`);
    }

    // Listen for system theme changes
    prefersDarkScheme.addEventListener('change', (e) => {
        // Only update if no manual preference has been set
        if (!localStorage.getItem('theme')) {
            const newTheme = e.matches ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
            updateToggleIcon(newTheme);
            applyThemeToElements(newTheme);
        }
    });
});