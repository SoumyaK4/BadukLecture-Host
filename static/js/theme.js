/**
 * Dark Mode Theme
 * Forces dark theme application
 */
document.addEventListener('DOMContentLoaded', function() {
    // Always use dark theme
    document.documentElement.setAttribute('data-theme', 'dark');

    // Remove any stored theme preference
    localStorage.removeItem('theme');

    console.log('Dark mode applied');
});