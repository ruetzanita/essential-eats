export function normalize(data, type) {
    let list = Array.isArray(data) 
        ? data 
        : (data.items || data.recipes || data.data || data.grocery_list || data.meals || []);

    return list.map(obj => {
        const clean = {};
        const findValue = (targetObj, keys) => {
            if (!targetObj || typeof targetObj !== 'object') return null;
            for (let k of keys) {
                for (let actualKey in targetObj) {
                    if (actualKey.toLowerCase() === k.toLowerCase()) {
                        const val = targetObj[actualKey];
                        if (val !== undefined && val !== null) return val;
                    }
                }
            }
            for (let key in targetObj) {
                if (typeof targetObj[key] === 'object' && targetObj[key] !== null && !Array.isArray(targetObj[key])) {
                    const result = findValue(targetObj[key], keys);
                    if (result !== undefined && result !== null) return result;
                }
            }
            return null;
        };

        if (type === 'item') {
            clean.name = findValue(obj, ['name', 'item', 'product', 'description', 'title']) || "Unknown Item";
            clean.quantity = Number(findValue(obj, ['quantity', 'qty', 'count', 'amount'])) || 1;
            clean.category = findValue(obj, ['category', 'cat', 'group', 'department']) || "Pantry";
            clean.unit = findValue(obj, ['unit', 'uom', 'measurement']) || "count";
        } else {
            clean.title = findValue(obj, ['title', 'name', 'recipe', 'label']) || "Unnamed Recipe";
            clean.prepTime = findValue(obj, ['prepTime', 'prep_time', 'prep', 'prepDuration']) || "N/A";
            clean.cookTime = findValue(obj, ['cookTime', 'cook_time', 'cook', 'cookDuration']) || "N/A";
            clean.cookingTemp = findValue(obj, ['cookingTemp', 'cooking_temp', 'temp', 'temperature', 'heat']) || "N/A";
            clean.seasoningProfile = findValue(obj, ['seasoningProfile', 'seasoning_profile', 'seasoning', 'flavor', 'profile']) || "Standard Chef Seasoning";
            
            const rawIngredients = findValue(obj, ['ingredients', 'components', 'items', 'ingredientList']);
            clean.ingredients = Array.isArray(rawIngredients) ? rawIngredients : (typeof rawIngredients === 'string' ? [rawIngredients] : []);
            
            const rawInstructions = findValue(obj, ['instructions', 'steps', 'method', 'directions', 'execution']);
            clean.instructions = Array.isArray(rawInstructions) ? rawInstructions : (typeof rawInstructions === 'string' ? [rawInstructions] : []);
            
            clean.scalingNote = findValue(obj, ['scalingNote', 'scaling_note', 'note', 'servings', 'yield', 'tips']) || "Standard Prep";
            
            clean.chefTip = findValue(obj, ['chefTip', 'chef_tip', 'chef tip', 'chefsTip', 'nutritionalBoost', 'boost', 'proTip']) || "";
            clean.nutritionalBoost = clean.chefTip;
        }
        return clean;
    });
}
