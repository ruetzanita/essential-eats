import './style.css';
import { 
    fetchInv, updateQty, deleteItem, parseGrocery, handleReceiptImageUpload, commitGrocery, 
    getSuggestions, fetchLibrary, saveRecipe, deleteRecipe, importRecipes, importRecipeFromUrl, saveClippedRecipe
} from './api.js';
import { 
    switchView, toggleGrocery, addShopItem, removeShopItem, exportShoppingList,
    updateStagingData, removeFromStaging, scrollToOutOfStock, scrollToTop, renderShop, showToast,
    openSplashIntro, dismissSplashIntro, dismissSplashIntroAndSupper, handleSplashBackdropClick,
    initTheme, setTheme, toggleThemePicker, closeThemePicker
} from './ui.js';

// Initialize sensory theme immediately to prevent any flash of unstyled theme
initTheme();

// Attach UI functions to window for HTML event handlers
window.switchView = switchView;
window.toggleGrocery = toggleGrocery;
window.addShopItem = addShopItem;
window.removeShopItem = removeShopItem;
window.exportShoppingList = exportShoppingList;
window.updateStagingData = updateStagingData;
window.removeFromStaging = removeFromStaging;
window.scrollToOutOfStock = scrollToOutOfStock;
window.scrollToTop = scrollToTop;
window.showToast = showToast;
window.openSplashIntro = openSplashIntro;
window.dismissSplashIntro = dismissSplashIntro;
window.dismissSplashIntroAndSupper = dismissSplashIntroAndSupper;
window.handleSplashBackdropClick = handleSplashBackdropClick;
window.setTheme = setTheme;
window.toggleThemePicker = toggleThemePicker;
window.closeThemePicker = closeThemePicker;

// Attach API functions to window
window.updateQty = updateQty;
window.deleteItem = deleteItem;
window.parseGrocery = parseGrocery;
window.handleReceiptImageUpload = handleReceiptImageUpload;
window.commitGrocery = commitGrocery;
window.getSuggestions = getSuggestions;
window.fetchLibrary = fetchLibrary;
window.saveRecipe = saveRecipe;
window.deleteRecipe = deleteRecipe;
window.importRecipes = importRecipes;
window.importRecipeFromUrl = importRecipeFromUrl;
window.saveClippedRecipe = saveClippedRecipe;

// Scroll event for Back-to-Top button
window.addEventListener('scroll', () => {
    const btn = document.getElementById('back-to-top');
    if (!btn) return;
    if (window.scrollY > 200) {
        btn.classList.add('visible');
    } else {
        btn.classList.remove('visible');
    }
});

// Escape key listener for splash overlay and theme picker
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const overlay = document.getElementById('splash-intro-overlay');
        if (overlay && overlay.classList.contains('splash-active')) {
            dismissSplashIntro();
        }
        closeThemePicker();
    }
});

// Click outside listener for theme picker dropdown
window.addEventListener('click', (e) => {
    const container = document.querySelector('.theme-picker-container');
    if (container && !container.contains(e.target)) {
        closeThemePicker();
    }
});

// Message listener for Browser Extension & Bookmarklet integration
window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'ESSENTIAL_EATS_SAVE_RECIPE') {
        saveClippedRecipe(event.data.recipe);
    } else if (event.data && event.data.type === 'ESSENTIAL_EATS_CLIP_URL') {
        importRecipeFromUrl(event.data.url);
    }
});

// Initial boot
document.addEventListener('DOMContentLoaded', () => {
    fetchInv();
    renderShop();
    
    // Check for Mobile Bookmarklet / Extension query parameter (?clip=URL)
    const urlParams = new URLSearchParams(window.location.search);
    const clipUrl = urlParams.get('clip');
    if (clipUrl) {
        sessionStorage.setItem('ee_splash_dismissed', 'true');
        switchView('view-lib');
        const portal = document.getElementById('url-import-portal');
        if (portal) portal.style.display = 'block';
        const input = document.getElementById('recipe-url-input');
        if (input) input.value = clipUrl;
        
        // Clean URL query parameter without page reload
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Auto-trigger extraction
        setTimeout(() => {
            importRecipeFromUrl(clipUrl);
        }, 300);
        return;
    }

    // Automatically display the splash intro on fresh visits
    if (!sessionStorage.getItem('ee_splash_dismissed')) {
        openSplashIntro();
    }
});


