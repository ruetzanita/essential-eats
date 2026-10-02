import { state, saveShoppingList } from './state.js';

// --- Non-Blocking Glassmorphic Toast Notifications ---
export function showToast(message, type = 'info', duration = 3500) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'ph-info';
    if (type === 'success') icon = 'ph-check-circle';
    if (type === 'warning') icon = 'ph-warning';
    if (type === 'danger' || type === 'error') icon = 'ph-warning-octagon';
    
    toast.innerHTML = `<i class="ph ${icon}" style="font-size: 1.25rem; flex-shrink: 0;"></i> <span>${message}</span>`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('toast-fadeout');
        setTimeout(() => toast.remove(), 350);
    }, duration);
}

export function switchView(view) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active-view'));
    document.querySelectorAll('nav button').forEach(b => b.classList.remove('active-tab'));
    
    const targetView = document.getElementById(`view-${view}`);
    const targetTab = document.getElementById(`tab-${view}`);
    if (targetView) targetView.classList.add('active-view');
    if (targetTab) targetTab.classList.add('active-tab');
    
    if (view === 'lib' && window.fetchLibrary) window.fetchLibrary();
    if (view === 'shop') renderShop();
    
    const qNav = document.getElementById('quick-nav');
    if (qNav) {
        qNav.style.display = (view === 'inv') ? 'flex' : 'none';
    }
    
    const dockBadge = document.getElementById('dock-out-badge');
    if (dockBadge) {
        dockBadge.style.display = (view === 'inv' && dockBadge.dataset.count > 0) ? 'flex' : 'none';
    }
}

export function toggleGrocery() {
    const el = document.getElementById('grocery-portal');
    if (!el) return;
    el.style.display = el.style.display === 'block' ? 'none' : 'block';
}

export function getCategoryData(cat) {
    const map = {
        'Fresh': { color: '#22C55E', icon: 'ph-leaf' },
        'Produce': { color: '#22C55E', icon: 'ph-leaf' },
        'Fruits & Vegetables': { color: '#22C55E', icon: 'ph-leaf' },
        'Meat': { color: '#F43F5E', icon: 'ph-bone' },
        'Beverages': { color: '#0A84FF', icon: 'ph-coffee' },
        'Pantry': { color: '#F97316', icon: 'ph-cube' },
        'Canned': { color: '#EAB308', icon: 'ph-pepper' },
        'Condiments': { color: '#EAB308', icon: 'ph-drop' },
        'Oils & Vinegars': { color: '#FACC15', icon: 'ph-drop' },
        'Oils/Vinegars': { color: '#FACC15', icon: 'ph-drop' },
        'Spices': { color: '#F59E0B', icon: 'ph-flask' },
        'Spices & Seasoning': { color: '#F59E0B', icon: 'ph-flask' },
        'Frozen Foods': { color: '#06B6D4', icon: 'ph-snowflake' },
        'Snacks': { color: '#8B5CF6', icon: 'ph-cake' },
        'Pets': { color: '#E056FD', icon: 'ph-paw-print' },
        'Household': { color: '#14B8A6', icon: 'ph-broom' }
    };
    return map[cat] || { color: '#94A3B8', icon: 'ph-tag' };
}

// --- Dedicated OUT OF STOCK Auto-Sorting & Inventory Rendering ---
export function renderInv(data) {
    const list = document.getElementById('inventory-list');
    list.innerHTML = '';
    if (!data || !Array.isArray(data) || data.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:30px;">Pantry is empty. Click "+ GROCERY" to add items.</p>';
        return;
    }

    const inStock = data.filter(i => (i.quantity || 0) > 0);
    const outOfStock = data.filter(i => (i.quantity || 0) <= 0);

    // Update bottom dock warning pill badge
    const dockBadge = document.getElementById('dock-out-badge');
    const dockNum = document.getElementById('out-count-num');
    if (dockBadge && dockNum) {
        dockBadge.dataset.count = outOfStock.length;
        dockNum.textContent = outOfStock.length;
        dockBadge.style.display = outOfStock.length > 0 ? 'flex' : 'none';
    }

    const quickNav = document.getElementById('quick-nav');
    if (quickNav) quickNav.innerHTML = '';

    // Render in-stock items grouped by category
    const cats = [...new Set(inStock.map(i => i.category || 'Pantry'))].sort();
    cats.forEach(cat => {
        const catData = getCategoryData(cat);
        const safeId = cat.replace(/[^a-zA-Z]/g, '');
        
        if (quickNav) {
            quickNav.innerHTML += `<div class="quick-nav-item" style="color: ${catData.color}; border-color: ${catData.color};" onclick="window.flyToCategory('${safeId}')" title="${cat}"><i class="ph ${catData.icon}"></i></div>`;
        }

        list.innerHTML += `<div id="cat-header-${safeId}" class="category-header" style="border-left: 4px solid ${catData.color};"><i class="ph ${catData.icon}" style="margin-right: 8px; font-size: 1.1rem; vertical-align: middle;"></i> ${cat}</div>`;
        
        inStock.filter(i => i.category === cat).forEach(item => {
            list.innerHTML += `
                <div class="card" style="border-left: 4px solid ${catData.color};">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                        <span style="font-weight:600; font-size:1.05rem;">${item.name || 'Unknown'}</span>
                        <span style="color:#D4AF37; font-weight:600;">Qty: ${item.quantity || 0} ${item.unit && item.unit !== 'count' ? `<small style="color:var(--text-muted);">${item.unit}</small>` : ''}</span>
                    </div>
                    <div class="controls">
                        <button class="btn-icon" style="color:var(--accent); margin-right: 12px;" onclick="window.addShopItem('${(item.name || "").replace(/'/g, "\\'")}')" title="Add to Shopping List"><i class="ph ph-shopping-cart-simple" style="font-size: 1.2rem;"></i></button>
                        <button class="btn btn-qty" onclick="window.updateQty(${item.id}, -1, ${item.quantity})"><i class="ph ph-minus"></i></button>
                        <button class="btn btn-qty" onclick="window.updateQty(${item.id}, 1, ${item.quantity})"><i class="ph ph-plus"></i></button>
                        <button class="btn-icon danger" style="margin-left:auto;" onclick="window.deleteItem(${item.id}, '${(item.name || "").replace(/'/g, "\\'")}')" title="Delete"><i class="ph ph-trash" style="font-size: 1.2rem;"></i></button>
                    </div>
                </div>`;
        });
    });

    // Render OUT OF STOCK section at bottom if any items have quantity <= 0
    if (outOfStock.length > 0) {
        list.innerHTML += `
            <div id="cat-header-outofstock" class="category-header out-of-stock-header">
                <i class="ph ph-warning-circle" style="margin-right: 8px; font-size: 1.15rem; vertical-align: middle;"></i> OUT OF STOCK (${outOfStock.length})
            </div>`;

        outOfStock.forEach(item => {
            const catData = getCategoryData(item.category || 'Pantry');
            list.innerHTML += `
                <div class="card card-out-of-stock" style="border-left: 4px solid var(--danger);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span style="font-weight:600; font-size:1.05rem; opacity:0.85;">${item.name || 'Unknown'}</span>
                            <span class="badge" style="background:${catData.color}22; color:${catData.color}; border: 1px solid ${catData.color}44;">
                                <i class="ph ${catData.icon}"></i> ${item.category || 'Pantry'}
                            </span>
                        </div>
                        <span style="color:var(--danger); font-weight:700; font-size:0.85rem; letter-spacing:0.5px;">OUT</span>
                    </div>
                    <div class="controls">
                        <button class="btn-icon" style="color:var(--accent); margin-right: 12px;" onclick="window.addShopItem('${(item.name || "").replace(/'/g, "\\'")}')" title="Add to Shopping List"><i class="ph ph-shopping-cart-simple" style="font-size: 1.2rem;"></i></button>
                        <button class="btn btn-qty" disabled style="opacity:0.25; cursor:not-allowed;"><i class="ph ph-minus"></i></button>
                        <button class="btn btn-qty" style="color:var(--success); border-color:var(--success);" onclick="window.updateQty(${item.id}, 1, 0)" title="Restock +1"><i class="ph ph-plus"></i></button>
                        <button class="btn-icon danger" style="margin-left:auto;" onclick="window.deleteItem(${item.id}, '${(item.name || "").replace(/'/g, "\\'")}')" title="Delete"><i class="ph ph-trash" style="font-size: 1.2rem;"></i></button>
                    </div>
                </div>`;
        });
    }
}

export function scrollToOutOfStock() {
    if (!document.getElementById('view-inv').classList.contains('active-view')) {
        switchView('inv');
    }
    setTimeout(() => {
        const target = document.getElementById('cat-header-outofstock');
        if (target) {
            const offset = window.innerWidth <= 640 ? 86 : 112;
            const y = target.getBoundingClientRect().top + window.scrollY - offset;
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
    }, 60);
}

export function renderStaging() {
    const area = document.getElementById('staging-area');
    area.innerHTML = "<h4 style='margin:15px 0 10px 0; color:var(--text-accent);'><i class='ph ph-truck'></i> Loading Dock (Review AI Parse)</h4>";

    state.stagingData.forEach((item, index) => {
        const name = item.name || "";
        const qty = item.quantity || 1;
        const cat = item.category || "Pantry";
        const unit = item.unit || "count";

        area.innerHTML += `
            <div class="card" style="margin:10px 0; border: 1px solid var(--border);">
                <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:10px;">
                    <input type="text" value="${name}" onchange="window.updateStagingData(${index}, 'name', this.value)" placeholder="Item name">
                    <div style="display:grid; grid-template-columns: 80px 1fr; gap:10px; width: 100%;">
                        <input type="number" value="${qty}" min="1" onchange="window.updateStagingData(${index}, 'quantity', Number(this.value))">
                        <select onchange="window.updateStagingData(${index}, 'category', this.value)">
                            <option value="${cat}">${cat}</option>
                            <option value="Fresh">Fresh / Produce</option>
                            <option value="Meat">Meat</option>
                            <option value="Beverages">Beverages</option>
                            <option value="Pantry">Pantry</option>
                            <option value="Canned">Canned / Condiments</option>
                            <option value="Oils/Vinegars">Oils & Vinegars</option>
                            <option value="Spices">Spices & Seasoning</option>
                            <option value="Frozen Foods">Frozen Foods</option>
                            <option value="Snacks">Snacks</option>
                            <option value="Pets">Pets</option>
                            <option value="Household">Household</option>
                        </select>
                    </div>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <small style="color:var(--text-muted);"><i class="ph ph-tag"></i> Staged item</small>
                    <button class="btn-icon danger" onclick="window.removeFromStaging(${index})"><i class="ph ph-trash" style="font-size: 1.2rem;"></i></button>
                </div>
            </div>`;
    });
    
    const commitBtn = document.getElementById('commit-btn');
    if (commitBtn) {
        commitBtn.style.display = state.stagingData.length > 0 ? 'block' : 'none';
    }
}

export function updateStagingData(index, key, value) {
    if (state.stagingData[index]) {
        state.stagingData[index][key] = value;
    }
}

export function removeFromStaging(index) {
    state.stagingData.splice(index, 1);
    renderStaging();
}

export function renderSuggestions() {
    const div = document.getElementById('suggestions');
    div.innerHTML = '<div class="category-header" style="border-left:4px solid #8E44AD;"><i class="ph ph-heart"></i> Nourishing Suppers</div>';

    document.getElementById('suggestions').scrollIntoView({ behavior: 'smooth', block: 'start' });

    state.suggestionsStore.forEach((s, i) => {
        const id = `sug-recipe-${i}`;
        const title = s.title || "Unnamed Recipe";
        const note = s.scalingNote || "Standard Prep";
        const prep = s.prepTime || "N/A";
        const cook = s.cookTime || "N/A";
        const temp = s.cookingTemp || "N/A";
        const seasoning = s.seasoningProfile || "Standard";
        const chefTip = s.chefTip || s.nutritionalBoost;
        const ings = Array.isArray(s.ingredients) ? s.ingredients : [];
        const inst = Array.isArray(s.instructions) ? s.instructions : [];

        const tipHtml = chefTip ? `
            <div class="chefs-tip">
                <i class="ph ph-heart" style="margin-right:6px; font-size:1.1rem; vertical-align:middle; color:var(--text-accent);"></i> 
                <b>Nourish Note:</b> ${chefTip}
            </div>` : '';

        const metaHtml = `
            <div class="recipe-meta">
                <span><i class="ph ph-knife"></i> Prep: ${prep}</span>
                <span><i class="ph ph-fire"></i> Cook: ${cook}</span>
                <span><i class="ph ph-thermometer"></i> Temp: ${temp}</span>
            </div>
            <p class="seasoning-profile"><i class="ph ph-drop"></i> <b>Seasoning Profile:</b> ${seasoning}</p>
        `;

        div.innerHTML += `
            <div class="card">
                <div onclick="document.getElementById('${id}').classList.toggle('active')" style="cursor:pointer;">
                    <b style="color:var(--text-accent); font-size:1.15rem;">${title}</b><br>
                    <small style="color:var(--text-muted);">${note}</small>
                </div>
                <div id="${id}" class="recipe-content">
                    ${metaHtml}
                    ${tipHtml}
                    <p style="margin-top:15px; font-weight:600;"><i class="ph ph-list-bullets"></i> Ingredients:</p>
                    <ul>${ings.map(ing => `<li>${ing || ''}</li>`).join('')}</ul>
                    <p style="margin-top:15px; font-weight:600;"><i class="ph ph-cooking-pot"></i> Chef Instructions:</p>
                    <ol>${inst.map(step => `<li style="margin-bottom:8px;">${step || ''}</li>`).join('')}</ol>
                    <button class="btn" style="background:var(--success); color:#FFFFFF; font-weight:700; width:100%; margin-top:15px;" onclick="window.saveRecipe(${i})"><i class="ph ph-heart"></i> SAVE TO FAVORITES</button>
                </div>
            </div>`;
    });
}

export function renderLibrary(data) {
    const div = document.getElementById('recipe-library');
    div.innerHTML = '';
    if (!Array.isArray(data) || data.length === 0) {
        div.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:30px;">No saved recipes yet. Explore suggestions and click "Save to Favorites"!</p>';
        return;
    }
    
    data.forEach((r, i) => {
        if (!r) return;
        const id = `lib-recipe-${i}`;
        const ings = Array.isArray(r.ingredients) ? r.ingredients : [];
        const inst = Array.isArray(r.instructions) ? r.instructions : [];
        const tip = r.chefTip || r.nutritionalBoost;
        let sourceDomain = '';
        if (r.sourceUrl) {
            try { sourceDomain = new URL(r.sourceUrl).hostname.replace('www.', ''); } catch(e) {}
        }
        
        div.innerHTML += `
            <div class="card" onclick="document.getElementById('${id}').classList.toggle('active')" style="cursor:pointer; overflow:hidden;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px;">
                    ${r.imageUrl ? `<img src="${r.imageUrl}" alt="${r.title}" style="width:52px; height:52px; border-radius:10px; object-fit:cover; border:1px solid var(--border); flex-shrink:0;">` : ''}
                    <div style="flex:1;">
                        <b style="color:var(--text-accent); font-size:1.1rem; line-height:1.3;">${r.title || 'Unnamed'}</b><br>
                        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-top:4px;">
                            <small style="color:var(--text-muted);">${r.scalingNote || 'Favorites'}</small>
                            ${(r.prepTime || r.cookTime) ? `<span style="font-size:0.75rem; color:var(--text-muted); background:var(--btn-qty-bg); padding:2px 6px; border-radius:6px;"><i class="ph ph-clock"></i> ${[r.prepTime, r.cookTime].filter(Boolean).join(' + ')}</span>` : ''}
                            ${sourceDomain ? `<a href="${r.sourceUrl}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" style="font-size:0.75rem; color:#60a5fa; text-decoration:none; display:inline-flex; align-items:center; gap:3px;"><i class="ph ph-arrow-square-out"></i> ${sourceDomain}</a>` : ''}
                        </div>
                    </div>
                    <button class="btn-icon danger" onclick="window.deleteRecipe(event, ${r.id})" title="Delete Recipe"><i class="ph ph-trash" style="font-size: 1.2rem;"></i></button>
                </div>
                <div id="${id}" class="recipe-content">
                    ${tip ? `<div class="chefs-tip"><i class="ph ph-heart" style="margin-right:6px; font-size:1.1rem; vertical-align:middle; color:var(--text-accent);"></i> <b>Nourish Note:</b> ${tip}</div>` : ''}
                    <p style="margin-top:12px; font-weight:600;">Ingredients:</p>
                    <ul>${ings.map(ing => `<li>${ing}</li>`).join('')}</ul>
                    <p style="margin-top:12px; font-weight:600;">Instructions:</p>
                    <ol>${inst.map(step => `<li>${step}</li>`).join('')}</ol>
                </div>
            </div>`;
    });
}

// --- Aisle-Categorized Shopping List & Export ---
export function renderShop() {
    const list = document.getElementById('shopping-list');
    list.innerHTML = '';
    
    if (!state.shoppingList || state.shoppingList.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding: 30px;">Your shopping list is empty.</p>';
        return;
    }

    state.shoppingList.forEach((item, index) => {
        list.innerHTML += `
            <div class="card" style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <span style="font-weight:600; font-size:1.05rem;">${item}</span>
                </div>
                <button class="btn-icon danger" onclick="window.removeShopItem(${index})" title="Remove"><i class="ph ph-trash" style="font-size: 1.2rem;"></i></button>
            </div>`;
    });
}

export async function exportShoppingList() {
    if (!state.shoppingList || state.shoppingList.length === 0) {
        showToast("Shopping list is empty!", "info");
        return;
    }

    const inv = JSON.parse(localStorage.getItem('kh_sandbox_inventory') || '[]');
    
    const aisleMap = {
        'Produce': { emoji: '🥬', title: 'PRODUCE', items: [] },
        'Meat': { emoji: '🥩', title: 'MEAT & SEAFOOD', items: [] },
        'Beverages': { emoji: '🥛', title: 'BEVERAGES', items: [] },
        'Pantry': { emoji: '🥫', title: 'PANTRY & CANNED', items: [] },
        'Oils & Vinegars': { emoji: '🫒', title: 'OILS & CONDIMENTS', items: [] },
        'Spices & Seasoning': { emoji: '🧂', title: 'SPICES & SEASONING', items: [] },
        'Frozen Foods': { emoji: '❄️', title: 'FROZEN FOODS', items: [] },
        'Snacks': { emoji: '🥨', title: 'SNACKS', items: [] },
        'Pets': { emoji: '🐾', title: 'PETS', items: [] },
        'Household': { emoji: '🧹', title: 'HOUSEHOLD', items: [] },
        'Other': { emoji: '📦', title: 'OTHER ITEMS', items: [] }
    };
    
    state.shoppingList.forEach(item => {
        const itemLower = item.toLowerCase();
        const match = inv.find(i => (i.name || '').toLowerCase() === itemLower || itemLower.includes((i.name || '').toLowerCase()));
        let category = match ? match.category : null;
        
        if (!category) {
            if (/apple|banana|berry|lemon|onion|garlic|lettuce|herb|spinach|tomato|potato|vegetable|fruit/i.test(itemLower)) category = 'Produce';
            else if (/chicken|beef|steak|pork|bacon|fish|salmon|shrimp|turkey|meat/i.test(itemLower)) category = 'Meat';
            else if (/water|coffee|tea|juice|soda|milk|beverage/i.test(itemLower)) category = 'Beverages';
            else if (/oil|vinegar|sauce|dressing|mayo|mustard|ketchup/i.test(itemLower)) category = 'Oils & Vinegars';
            else if (/salt|pepper|paprika|spice|seasoning|curry|cumin|oregano/i.test(itemLower)) category = 'Spices & Seasoning';
            else if (/frozen|ice cream|pizza/i.test(itemLower)) category = 'Frozen Foods';
            else if (/chip|cracker|pretzel|cookie|candy|snack|popcorn/i.test(itemLower)) category = 'Snacks';
            else if (/cat|dog|pet|litter|kibble/i.test(itemLower)) category = 'Pets';
            else if (/paper|towel|soap|detergent|cleaner|trash/i.test(itemLower)) category = 'Household';
            else if (/rice|pasta|flour|sugar|canned|bean|soup|bread/i.test(itemLower)) category = 'Pantry';
            else category = 'Other';
        }
        
        if (category === 'Fresh') category = 'Produce';
        if (category === 'Condiments' || category === 'Canned') category = 'Pantry';
        if (category === 'Oils/Vinegars') category = 'Oils & Vinegars';
        if (category === 'Spices') category = 'Spices & Seasoning';
        
        if (aisleMap[category]) {
            aisleMap[category].items.push(item);
        } else {
            aisleMap['Other'].items.push(item);
        }
    });

    const today = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    let text = `🛒 Essential Eats Shopping Checklist (${today})\n\n`;

    Object.values(aisleMap).forEach(aisle => {
        if (aisle.items.length > 0) {
            text += `${aisle.emoji} ${aisle.title}\n`;
            aisle.items.forEach(it => {
                text += `[ ] ${it}\n`;
            });
            text += `\n`;
        }
    });

    text = text.trim();

    if (navigator.share) {
        try {
            await navigator.share({
                title: `Essential Eats Shopping List (${today})`,
                text: text
            });
            showToast("Shopping checklist shared!", "success");
            return;
        } catch (e) {
            if (e.name === 'AbortError') return;
        }
    }

    try {
        await navigator.clipboard.writeText(text);
        showToast("Checklist copied to clipboard! (Ready for Notes / Keep)", "success");
    } catch (e) {
        showToast("Could not copy checklist to clipboard.", "warning");
    }
}

export function addShopItem(name = null) {
    const val = name || document.getElementById('shop-input').value.trim();
    if (!val) return;
    state.shoppingList.push(val);
    saveShoppingList();
    if (!name) document.getElementById('shop-input').value = '';
    renderShop();
    showToast(`Added "${val}" to Shopping List`, "success");
}

export function removeShopItem(index) {
    const item = state.shoppingList[index];
    state.shoppingList.splice(index, 1);
    saveShoppingList();
    renderShop();
    showToast(`Removed "${item}" from list`, "info");
}

export function openSplashIntro() {
    const overlay = document.getElementById('splash-intro-overlay');
    if (!overlay) return;
    overlay.classList.remove('splash-closing');
    overlay.classList.add('splash-active');
    document.body.style.overflow = 'hidden';
}

export function dismissSplashIntro() {
    const overlay = document.getElementById('splash-intro-overlay');
    if (!overlay) return;
    overlay.classList.add('splash-closing');
    try {
        sessionStorage.setItem('ee_splash_dismissed', 'true');
    } catch (e) {}
    setTimeout(() => {
        overlay.classList.remove('splash-active');
        overlay.classList.remove('splash-closing');
        document.body.style.overflow = '';
    }, 320);
}

export function dismissSplashIntroAndSupper() {
    dismissSplashIntro();
    setTimeout(() => {
        if (window.getSuggestions) {
            window.getSuggestions();
        }
    }, 380);
}

export function handleSplashBackdropClick(event) {
    if (event.target && event.target.id === 'splash-intro-overlay') {
        dismissSplashIntro();
    }
}

export function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.flyToCategory = function(safeId) {
    if (!document.getElementById('view-inv').classList.contains('active-view')) {
        switchView('inv');
    }
    setTimeout(() => {
        const target = document.getElementById(`cat-header-${safeId}`);
        if (target) {
            const offset = window.innerWidth <= 640 ? 86 : 112;
            const y = target.getBoundingClientRect().top + window.scrollY - offset;
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
    }, 50);
};

// --- Sensory Theme Engine (5 Color Schemes) ---
export function initTheme() {
    const savedTheme = localStorage.getItem('ee_theme') || 'midnight';
    applyTheme(savedTheme, false);
}

export function setTheme(themeName) {
    applyTheme(themeName, true);
    closeThemePicker();
}

function applyTheme(themeName, notify = true) {
    const validThemes = ['midnight', 'sage', 'dusk', 'linen', 'oat'];
    const normalizedTheme = themeName === 'amber' ? 'linen' : themeName;
    const activeTheme = validThemes.includes(normalizedTheme) ? normalizedTheme : 'midnight';
    
    document.documentElement.setAttribute('data-theme', activeTheme);
    localStorage.setItem('ee_theme', activeTheme);
    
    // Update theme picker active states
    document.querySelectorAll('.theme-option-btn').forEach(btn => {
        if (btn.dataset.themeId === activeTheme) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    const themeNames = {
        'midnight': 'Midnight Neon',
        'sage': 'Warm Earth & Sage',
        'dusk': 'Lavender Dusk',
        'linen': 'Linen & Matcha',
        'oat': 'Paper & Oat'
    };
    
    if (notify) {
        showToast(`Theme changed to ${themeNames[activeTheme]}`, 'info', 2500);
    }
}

export function toggleThemePicker(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    const dropdown = document.getElementById('theme-picker-dropdown');
    if (!dropdown) return;
    const isShown = dropdown.style.display !== 'none';
    dropdown.style.display = isShown ? 'none' : 'flex';
}

export function closeThemePicker() {
    const dropdown = document.getElementById('theme-picker-dropdown');
    if (dropdown) dropdown.style.display = 'none';
}

