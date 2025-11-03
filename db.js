// db.js

const DB_NAME = 'KidsLearningAppDB';
const DB_VERSION = 1;
const CATEGORIES_STORE = 'categories';
const ITEMS_STORE = 'items';

let db;

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error('Database error:', event.target.error);
            reject('Database error');
        };

        request.onupgradeneeded = (event) => {
            db = event.target.result;
            // Create Categories object store
            if (!db.objectStoreNames.contains(CATEGORIES_STORE)) {
                const categoryStore = db.createObjectStore(CATEGORIES_STORE, { keyPath: 'id', autoIncrement: true });
                categoryStore.createIndex('name', 'name', { unique: true });
            }
            // Create Items object store
            if (!db.objectStoreNames.contains(ITEMS_STORE)) {
                const itemStore = db.createObjectStore(ITEMS_STORE, { keyPath: 'id', autoIncrement: true });
                itemStore.createIndex('categoryId', 'categoryId', { unique: false });
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log('Database opened successfully.');
            resolve(db);
        };
    });
}

function addCategory(category) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([CATEGORIES_STORE], 'readwrite');
        const store = transaction.objectStore(CATEGORIES_STORE);
        const request = store.add(category);

        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject('Error adding category: ' + event.target.error);
    });
}

function addItem(item) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([ITEMS_STORE], 'readwrite');
        const store = transaction.objectStore(ITEMS_STORE);
        const request = store.add(item);

        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject('Error adding item: ' + event.target.error);
    });
}

function getCategories() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([CATEGORIES_STORE], 'readonly');
        const store = transaction.objectStore(CATEGORIES_STORE);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject('Error fetching categories: ' + event.target.error);
    });
}

function getItemsByCategoryId(categoryId) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([ITEMS_STORE], 'readonly');
        const store = transaction.objectStore(ITEMS_STORE);
        const index = store.index('categoryId');
        const request = index.getAll(categoryId);

        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject('Error fetching items: ' + event.target.error);
    });
}

// Export the functions to be used in app.js
window.db = {
    initDB,
    addCategory,
    addItem,
    getCategories,
    getItemsByCategoryId
};
