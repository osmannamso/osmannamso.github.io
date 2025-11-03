// app.js
document.addEventListener('DOMContentLoaded', () => {
    // --- PWA Service Worker Registration ---
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('Service Worker registered successfully', reg))
            .catch(err => console.error('Service Worker registration failed', err));
    }

    // --- State Management ---
    let currentCategoryId = null;
    let mediaRecorder;
    let audioChunks = [];
    let recordedAudioBlob = null;
    let mediaStream = null; // To hold the microphone stream

    // --- DOM Element References ---
    const categoryScreen = document.getElementById('category-screen');
    const itemScreen = document.getElementById('item-screen');
    const categoryGrid = document.getElementById('category-grid');
    const itemGrid = document.getElementById('item-grid');
    const backButton = document.getElementById('backButton');
    const itemScreenTitle = document.getElementById('item-screen-title');

    // Modals
    const addCategoryModal = document.getElementById('add-category-modal');
    const addItemModal = document.getElementById('add-item-modal');

    // Buttons
    const addCategoryBtn = document.getElementById('add-category-btn');
    const addItemBtn = document.getElementById('add-item-btn');
    const saveCategoryBtn = document.getElementById('save-category-btn');
    const saveItemBtn = document.getElementById('save-item-btn');
    const recordBtn = document.getElementById('record-btn');
    const stopRecordBtn = document.getElementById('stop-record-btn');
    const cancelButtons = document.querySelectorAll('.cancel-btn');

    // Inputs
    const categoryNameInput = document.getElementById('category-name-input');
    const categoryImageInput = document.getElementById('category-image-input');
    const itemNameInput = document.getElementById('item-name-input');
    const itemImageInput = document.getElementById('item-image-input');
    const audioPlayback = document.getElementById('audio-playback');

    // --- UI Navigation ---
    function showCategoryScreen() {
        categoryScreen.classList.remove('hidden');
        itemScreen.classList.add('hidden');
        backButton.classList.add('hidden');
        currentCategoryId = null;
        loadCategories();
    }

    function showItemScreen(categoryId, categoryName) {
        categoryScreen.classList.add('hidden');
        itemScreen.classList.remove('hidden');
        backButton.classList.remove('hidden');
        itemScreenTitle.textContent = categoryName;
        currentCategoryId = categoryId;
        loadItems(categoryId);
    }

    // --- Data Loading and Rendering ---
    async function loadCategories() {
        const categories = await window.db.getCategories();
        categoryGrid.innerHTML = ''; // Clear existing
        categories.forEach(category => {
            const card = createCard(category, 'category', () => showItemScreen(category.id, category.name));
            categoryGrid.appendChild(card);
        });
    }

    async function loadItems(categoryId) {
        const items = await window.db.getItemsByCategoryId(categoryId);
        itemGrid.innerHTML = ''; // Clear existing
        items.forEach(item => {
            const card = createCard(item, 'item', () => playSound(item.sound));
            itemGrid.appendChild(card);
        });
    }

    function createCard(data, type, onCardClick) {
        const card = document.createElement('div');
        card.className = 'card';
        
        const img = document.createElement('img');
        // Blobs need to be converted to an Object URL to be used in an <img> tag
        img.src = URL.createObjectURL(data.picture);
        img.alt = data.name;
        
        const p = document.createElement('p');
        p.textContent = data.name;

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '&times;'; // 'x' symbol
        deleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation(); // Prevent the card's main click event

            const confirmationText = `Are you sure you want to delete the ${type} "${data.name}"?`;
            if (confirm(confirmationText)) {
                try {
                    if (type === 'category') {
                        await window.db.deleteCategory(data.id);
                        loadCategories(); // Refresh the category list
                    } else if (type === 'item') {
                        await window.db.deleteItem(data.id);
                        loadItems(currentCategoryId); // Refresh the item list
                    }
                } catch (error) {
                    console.error(`Failed to delete ${type}:`, error);
                    alert(`Could not delete the ${type}. Please try again.`);
                }
            }
        });
        
        card.appendChild(img);
        card.appendChild(p);
        card.appendChild(deleteBtn);

        // The main click action (navigate or play sound)
        card.addEventListener('click', onCardClick);
        return card;
    }

    function playSound(soundBlob) {
        if (soundBlob) {
            const soundUrl = URL.createObjectURL(soundBlob);
            const audio = new Audio(soundUrl);
            audio.play();
        }
    }

    // --- Modal Handling ---
    function openModal(modal) {
        modal.classList.remove('hidden');
    }

    function closeModal(modal) {
        modal.classList.add('hidden');
        // Reset forms inside the modal
        modal.querySelectorAll('input').forEach(input => input.value = '');
        recordedAudioBlob = null;
        audioPlayback.removeAttribute('src');

        // Stop microphone stream if it's active
        stopMicrophone();
    }

    // --- Event Listeners ---
    backButton.addEventListener('click', showCategoryScreen);
    addCategoryBtn.addEventListener('click', () => openModal(addCategoryModal)); 
    addItemBtn.addEventListener('click', () => openModal(addItemModal));
    cancelButtons.forEach(btn => btn.addEventListener('click', () => {
        closeModal(addCategoryModal);
        closeModal(addItemModal);
    }));

    saveCategoryBtn.addEventListener('click', async () => {
        const name = categoryNameInput.value.trim();
        const imageFile = categoryImageInput.files[0];
        if (name && imageFile) {
            await window.db.addCategory({ name: name, picture: imageFile });
            closeModal(addCategoryModal);
            loadCategories();
        } else {
            alert('Please provide a name and an image for the category.');
        }
    });

    saveItemBtn.addEventListener('click', async () => {
        const name = itemNameInput.value.trim();
        const imageFile = itemImageInput.files[0];
        if (name && imageFile && recordedAudioBlob && currentCategoryId) {
            await window.db.addItem({
                name: name,
                picture: imageFile,
                sound: recordedAudioBlob,
                categoryId: currentCategoryId
            });
            closeModal(addItemModal);
            loadItems(currentCategoryId);
        } else {
            alert('Please provide a name, an image, and a recorded sound for the item.');
        }
    });

    // --- Audio Recording Logic ---
    async function startMicrophoneAndSetupRecorder() {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                // Find a supported MIME type
                const mimeTypes = ['audio/mp4', 'audio/webm', 'audio/ogg', 'audio/wav'];
                let supportedMimeType = '';
                for (const type of mimeTypes) {
                    if (MediaRecorder.isTypeSupported(type)) {
                        supportedMimeType = type;
                        break;
                    }
                }

                if (!supportedMimeType) {
                    alert('Audio recording is not supported on your browser.');
                    return;
                }

                mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(mediaStream, { mimeType: supportedMimeType });

                mediaRecorder.ondataavailable = (event) => {
                    audioChunks.push(event.data);
                };

                mediaRecorder.onstop = () => {
                    recordedAudioBlob = new Blob(audioChunks, { type: supportedMimeType });
                    const audioUrl = URL.createObjectURL(recordedAudioBlob);
                    audioPlayback.src = audioUrl;
                    audioChunks = []; // Reset for next recording

                    // We can stop the mic right after recording is done
                    // or wait until the modal closes. Let's wait.
                    // stopMicrophone(); 
                };
            } catch (err) {
                console.error('Error accessing microphone:', err);
                alert('Could not access the microphone. Please allow microphone access in your browser settings.');
                document.getElementById('recorder-ui').classList.add('hidden');
            }
        } else {
            console.error('getUserMedia not supported on your browser!');
            document.getElementById('recorder-ui').classList.add('hidden');
        }
    }

    function stopMicrophone() {
        if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
            mediaStream = null;
            mediaRecorder = null;
            recordBtn.disabled = false;
            stopRecordBtn.disabled = true;
        }
    }

    recordBtn.addEventListener('click', async () => {
        await startMicrophoneAndSetupRecorder();
        mediaRecorder.start();
        recordBtn.disabled = true;
        stopRecordBtn.disabled = false;
    });

    stopRecordBtn.addEventListener('click', () => {
        mediaRecorder.stop();
        recordBtn.disabled = false;
        stopRecordBtn.disabled = true;
    });

    // --- App Initialization ---
    async function main() {
        await window.db.initDB();
        showCategoryScreen();
    }

    main();
});
