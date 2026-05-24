import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Your verified Firebase configuration details
const firebaseConfig = {
  apiKey: "AIzaSyDhLfZ7vzJBaWqoEIzJ3M-dYrsA3Pc26YY",
  authDomain: "dpp-track-72653.firebaseapp.com",
  projectId: "dpp-track-72653",
  storageBucket: "dpp-track-72653.firebasestorage.app",
  messagingSenderId: "907995170773",
  appId: "1:907995170773:web:0434a35f0d65826fbe5f5c"
};

// Initialize app modules
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// App Navigation Pointer State
let currentUser = null;
let currentView = "subjects"; // values: subjects -> chapters -> dpps -> questions
let selectedSubject = "";
let selectedChapterId = "";
let selectedChapterName = "";
let selectedDppId = "";
let selectedDppName = "";

// DOM Bindings
const authScreen = document.getElementById("auth-screen");
const appScreen = document.getElementById("app-screen");
const contentArea = document.getElementById("content-render-area");
const currentTitle = document.getElementById("current-title");
const btnBack = document.getElementById("btn-back");
const fabAdd = document.getElementById("fab-add");
const modalContainer = document.getElementById("modal-container");
const formModalCard = document.getElementById("form-modal-card");
const viewerModalCard = document.getElementById("viewer-modal-card");

/* =========================================================================
   1. AUTHENTICATION PIPELINE
   ========================================================================= */
document.getElementById("btn-login").addEventListener("click", () => {
    signInWithPopup(auth, provider).catch(err => alert("Auth Failed: " + err.message));
});

document.getElementById("btn-logout").addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, user => {
    if (user) {
        currentUser = user;
        authScreen.classList.add("hidden");
        appScreen.classList.remove("hidden");
        navigateToSubjects();
    } else {
        currentUser = null;
        appScreen.classList.add("hidden");
        authScreen.classList.remove("hidden");
    }
});

/* =========================================================================
   2. RENDER ENGINE & NAVIGATION LOOPS
   ========================================================================= */
function navigateToSubjects() {
    currentView = "subjects";
    currentTitle.textContent = "Subjects";
    btnBack.classList.add("hidden");
    fabAdd.classList.add("hidden");
    
    contentArea.innerHTML = `
        <div class="tracker-card" onclick="selectSubject('Physics')"><span class="card-title">📚 Physics</span><span class="material-icons">chevron_right</span></div>
        <div class="tracker-card" onclick="selectSubject('Chemistry')"><span class="card-title">🧪 Chemistry</span><span class="material-icons">chevron_right</span></div>
        <div class="tracker-card" onclick="selectSubject('Math')"><span class="card-title">📐 Math</span><span class="material-icons">chevron_right</span></div>
    `;
}
window.selectSubject = (subject) => {
    selectedSubject = subject;
    navigateToChapters();
};

async function navigateToChapters() {
    currentView = "chapters";
    currentTitle.textContent = `${selectedSubject} - Chapters`;
    btnBack.classList.remove("hidden");
    fabAdd.classList.remove("hidden");
    contentArea.innerHTML = "Loading Chapters...";

    const q = query(collection(db, "chapters"), where("userId", "==", currentUser.uid), where("subject", "==", selectedSubject), orderBy("name"));
    const snapshot = await getDocs(q);
    
    contentArea.innerHTML = "";
    snapshot.forEach(doc => {
        const data = doc.data();
        contentArea.innerHTML += `
            <div class="tracker-card" onclick="selectChapter('${doc.id}', '${data.name}')">
                <span class="card-title">📁 ${data.name}</span>
                <span class="material-icons">chevron_right</span>
            </div>
        `;
    });
}
window.selectChapter = (id, name) => {
    selectedChapterId = id;
    selectedChapterName = name;
    navigateToDpps();
};

async function navigateToDpps() {
    currentView = "dpps";
    currentTitle.textContent = `${selectedChapterName} - DPPs`;
    contentArea.innerHTML = "Loading DPP Records...";

    const q = query(collection(db, "dpps"), where("chapterId", "==", selectedChapterId), orderBy("name"));
    const snapshot = await getDocs(q);
    
    contentArea.innerHTML = "";
    snapshot.forEach(doc => {
        const data = doc.data();
        contentArea.innerHTML += `
            <div class="tracker-card" onclick="selectDpp('${doc.id}', '${data.name}')">
                <span class="card-title">📄 ${data.name}</span>
                <span class="material-icons">chevron_right</span>
            </div>
        `;
    });
}
window.selectDpp = (id, name) => {
    selectedDppId = id;
    selectedDppName = name;
    navigateToQuestions();
};

async function navigateToQuestions() {
    currentView = "questions";
    currentTitle.textContent = `${selectedDppName} - Solutions`;
    contentArea.innerHTML = "Loading Questions...";

    const q = query(collection(db, "questions"), where("dppId", "==", selectedDppId), orderBy("number"));
    const snapshot = await getDocs(q);
    
    contentArea.innerHTML = "";
    snapshot.forEach(doc => {
        const data = doc.data();
        contentArea.innerHTML += `
            <div class="tracker-card" onclick="openInlineFile('${doc.id}', 'Question ${data.number}')">
                <div>
                    <div class="card-title" style="color: var(--primary-purple)">Question ${data.number}</div>
                    <p style="font-size:13px; margin-top:4px; color:#555;">${data.notes || 'No added formula text notes.'}</p>
                </div>
                <span class="material-icons" style="color: var(--primary-purple)">visibility</span>
            </div>
        `;
    });
}

// Global back button engine routing
btnBack.addEventListener("click", () => {
    if (currentView === "chapters") navigateToSubjects();
    else if (currentView === "dpps") navigateToChapters();
    else if (currentView === "questions") navigateToDpps();
});

/* =========================================================================
   3. MODAL POPUP SUBMISSIONS (Base64 Database Ingestion Engine)
   ========================================================================= */
fabAdd.addEventListener("click", () => {
    modalContainer.classList.remove("hidden");
    formModalCard.classList.remove("hidden");
    document.getElementById("primary-input").value = "";
    document.getElementById("question-notes").value = "";
    document.getElementById("solution-file-picker").value = "";
    document.getElementById("selected-file-indicator").textContent = "No file selected (Max 15MB)";

    if (currentView === "chapters") {
        document.getElementById("form-modal-title").textContent = "Add New Chapter";
        document.getElementById("input-label-text").textContent = "Chapter Name";
        document.getElementById("question-file-fields").classList.add("hidden");
    } else if (currentView === "dpps") {
        document.getElementById("form-modal-title").textContent = "Add New DPP Sheet";
        document.getElementById("input-label-text").textContent = "DPP Designation/No.";
        document.getElementById("question-file-fields").classList.add("hidden");
    } else if (currentView === "questions") {
        document.getElementById("form-modal-title").textContent = "Insert Question Entry";
        document.getElementById("input-label-text").textContent = "Question Number (Numeric)";
        document.getElementById("question-file-fields").classList.remove("hidden");
    }
});

document.getElementById("solution-file-picker").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if(file) document.getElementById("selected-file-indicator").textContent = `${file.name} (${(file.size/(1024*1024)).toFixed(2)} MB)`;
});

document.getElementById("btn-modal-cancel").addEventListener("click", closeModal);
function closeModal() {
    modalContainer.classList.add("hidden");
    formModalCard.classList.add("hidden");
    viewerModalCard.classList.add("hidden");
}

document.getElementById("btn-modal-submit").addEventListener("click", async () => {
    const primaryInput = document.getElementById("primary-input").value.trim();
    if (!primaryInput) return alert("Field value is empty!");

    if (currentView === "chapters") {
        await addDoc(collection(db, "chapters"), { name: primaryInput, subject: selectedSubject, userId: currentUser.uid });
        closeModal(); navigateToChapters();
    } else if (currentView === "dpps") {
        await addDoc(collection(db, "dpps"), { name: primaryInput, chapterId: selectedChapterId });
        closeModal(); navigateToDpps();
    } else if (currentView === "questions") {
        const filePicker = document.getElementById("solution-file-picker");
        const rawFile = filePicker.files[0];
        const notesText = document.getElementById("question-notes").value.trim();
        
        if (!rawFile) return alert("You must choose a solution image or PDF file!");
        
        document.getElementById("selected-file-indicator").textContent = "Processing and converting file...";

        // Convert the selected file to a string data stream to save directly in the free database tier
        const encodedDataString = await readAsBase64(rawFile);

        await addDoc(collection(db, "questions"), {
            dppId: selectedDppId,
            number: parseInt(primaryInput, 10),
            notes: notesText,
            fileDataStream: encodedDataString,
            mimeType: rawFile.type
        });
        
        closeModal();
        navigateToQuestions();
    }
});

function readAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.readerResult || reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/* =========================================================================
   4. FULL IMMERSIVE VIEWPORT RENDERING ENGINE (NATIVE BASE64 STREAM)
   ========================================================================= */
window.openInlineFile = async (docId, title) => {
    modalContainer.classList.remove("hidden");
    viewerModalCard.classList.remove("hidden");
    document.getElementById("pdf-file-name").textContent = title;
    
    const viewport = document.querySelector(".pdf-render-viewport");
    viewport.innerHTML = "<div style='color:white; padding:20px;'>Decoding document stream...</div>";

    // Fetch the data block cleanly from Firestore
    const { doc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
    const docRef = window.window; // Helper anchor fallback 
    
    const targetQuery = query(collection(db, "questions"));
    const snapshot = await getDocs(targetQuery);
    
    let base64Source = "";
    let fileMime = "image/jpeg";
    
    snapshot.forEach(item => {
        if(item.id === docId) {
            base64Source = item.data().fileDataStream;
            fileMime = item.data().mimeType || "image/jpeg";
        }
    });

    if (fileMime === "application/pdf") {
        // Embed PDF stream directly into a clean system iframe view
        viewport.innerHTML = `<iframe src="${base64Source}" width="100%" height="100%" style="border: none; background: white; border-radius:8px;"></iframe>`;
    } else {
        // Render high contrast notebook photograph assets beautifully
        viewport.innerHTML = `
            <div style="width:100%; height:100%; overflow:auto; display:flex; justify-content:center; align-items:center; background:#1e1e1e; border-radius:8px;">
                <img src="${base64Source}" style="max-width:100%; max-height:100%; object-fit:contain;" />
            </div>`;
    }
};

document.getElementById("btn-close-viewer").addEventListener("click", closeModal);