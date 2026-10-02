export const API = "https://essential-eats-api-demo.ruetzanita.workers.dev/api";

export const state = {
    suggestionsStore: [],
    stagingData: [],
    shoppingList: JSON.parse(localStorage.getItem('shopList')) || []
};

export function saveShoppingList() {
    localStorage.setItem('shopList', JSON.stringify(state.shoppingList));
}
