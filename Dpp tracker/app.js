import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, getDocs, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDhLfZ7vzJBaWqoEIzJ3M-dYrsA3Pc26YY",
  authDomain: "dpp-track-72653.firebaseapp.com",
  projectId: "dpp-track-72653",
  storageBucket: "dpp-track-72653.firebasestorage.app",
  messagingSenderId: "907995170773",
  appId: "1:907995170773:web:0434a35f0d65826fbe5f5c"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

let currentUser = null;
let currentView = "subjects"; 
let selectedSubject = "";
let selectedChapterId = "";
let selectedChapterName = "";
let selectedDppId = "";
let selectedDppName = "";

const authScreen = document.getElementById("auth-screen");
const appScreen = document.getElementById("app-screen");
const contentArea = document.getElementById("content-render-area");
const currentTitle = document.getElementById("current-title");
const btnBack = document.getElementById("btn-back");
const fabAdd = document.getElementById("fab-add");
const modalContainer = document.getElementById("modal-container");
const formModalCard = document.getElementById("form-modal-card");
const viewerModalCard = document.getElementById("viewer-modal-card");
const modalError = document.getElementById("modal-error-message");
const authError = document.getElementById("auth-error-message");

/* =========================================================================
   1. THEME SWAPPING ENGINE
   ========================================================================= */
const btnThemeToggle = document.getElementById("btn-theme-toggle");
const themeIcon = document.getElementById("theme-icon");

if (localStorage.getItem("theme") === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
    themeIcon.textContent = "light_mode";
} else {
    document.documentElement.setAttribute("data-theme", "light");
    themeIcon.textContent = "dark_mode";
}

btnThemeToggle.addEventListener("click", () => {
    const activeTheme = document.documentElement.getAttribute("data-theme");
    if (activeTheme === "dark") {
        document.documentElement.setAttribute("data-theme", "light");
        themeIcon.textContent = "dark_mode";
        localStorage.setItem("theme", "light");
    } else {
        document.documentElement.setAttribute("data-theme", "dark");
        themeIcon.textContent = "light_mode";
        localStorage.setItem("theme", "dark");
    }
});

/* =========================================================================
   2. AUTHENTICATION & NAVIGATION
   ========================================================================= */
document.getElementById("btn-login").addEventListener("click", () => {
    signInWithPopup(auth, provider).catch(err => authError.textContent = err.message);
});

document.getElementById("btn-logout").addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, user => {
    if (user) {
        currentUser = user;
        authScreen.classList.add("hidden");
        appScreen.classList.remove("hidden");
        navigateToSubjects();
    } else {
        appScreen.classList.add("hidden");
        authScreen.classList.remove("hidden");
    }
});

function navigateToSubjects() {
    currentView = "subjects";
    currentTitle.textContent = "Subjects";
    btnBack.classList.add("hidden");
    fabAdd.classList.add("hidden");
    contentArea.innerHTML = `
        <div class="tracker-card" onclick="selectSubject('Physics')"><span class="card-title">Physics</span></div>
        <div class="tracker-card" onclick="selectSubject('Chemistry')"><span class="card-title">Chemistry</span></div>
        <div class="tracker-card" onclick="selectSubject('Math')"><span class="card-title">Math</span></div>
    `;
}

window.selectSubject = (s) => { selectedSubject = s; navigateToChapters(); };

async function navigateToChapters() {
    currentView = "chapters";
    currentTitle.textContent = `${selectedSubject} - Chapters`;
    btnBack.classList.remove("hidden");
    fabAdd.classList.remove("hidden");
    contentArea.innerHTML = "Loading...";
    const q = query(collection(db, "chapters"), where("userId", "==", currentUser.uid), where("subject", "==", selectedSubject));
    const snapshot = await getDocs(q);
    contentArea.innerHTML = "";
    snapshot.forEach(doc => {
        contentArea.innerHTML += `<div class="tracker-card" onclick="selectChapter('${doc.id}', '${doc.data().name}')"><span class="card-title">${doc.data().name}</span></div>`;
    });
}

window.selectChapter = (id, name) => { selectedChapterId = id; selectedChapterName = name; navigateToDpps(); };

async function navigateToDpps() {
    currentView = "dpps";
    currentTitle.textContent = `${selectedChapterName} - DPPs`;
    contentArea.innerHTML = "Loading...";
    const q = query(collection(db, "dpps"), where("chapterId", "==", selectedChapterId));
    const snapshot = await getDocs(q);
    contentArea.innerHTML = "";
    snapshot.forEach(doc => {
        contentArea.innerHTML += `<div class="tracker-card" onclick="selectDpp('${doc.id}', '${doc.data().name}')"><span class="card-title">${doc.data().name}</span></div>`;
    });
}

window.selectDpp = (id, name) => { selectedDppId = id; selectedDppName = name; navigateToQuestions(); };

async function navigateToQuestions() {
    currentView = "questions";
    currentTitle.textContent = `${selectedDppName} - Solutions`;
    contentArea.innerHTML = "Loading...";
    const q = query(collection(db, "questions"), where("dppId", "==", selectedDppId));
    const snapshot = await getDocs(q);
    contentArea.innerHTML = "";
    snapshot.forEach(doc => {
        contentArea.innerHTML += `<div class="tracker-card" onclick="openInlineFile('${doc.id}', 'Question ${doc.data().number}')"><span class="card-title">Question ${doc.data().number}</span></div>`;
    });
}

btnBack.addEventListener("click", () => {
    if (currentView === "chapters") navigateToSubjects();
    else if (currentView === "dpps") navigateToChapters();
    else if (currentView === "questions") navigateToDpps();
});

/* =========================================================================
   3. MODAL LOGIC
   ========================================================================= */
fabAdd.addEventListener("click", () => {
    modalContainer.classList.remove("hidden");
    formModalCard.classList.remove("hidden");
    const now = new Date();
    document.getElementById("record-date").value = now.toISOString().split('T')[0];
    document.getElementById("record-time").value = now.toTimeString().slice(0,5);
});

document.getElementById("btn-modal-cancel").addEventListener("click", () => {
    modalContainer.classList.add("hidden");
    formModalCard.classList.add("hidden");
});

document.getElementById("btn-modal-submit").addEventListener("click", async () => {
    const name = document.getElementById("primary-input").value;
    if (currentView === "chapters") {
        await addDoc(collection(db, "chapters"), { name, subject: selectedSubject, userId: currentUser.uid });
        navigateToChapters();
    } else if (currentView === "dpps") {
        await addDoc(collection(db, "dpps"), { name, chapterId: selectedChapterId });
        navigateToDpps();
    }
    modalContainer.classList.add("hidden");
    formModalCard.classList.add("hidden");
});

window.openInlineFile = async (docId, title) => {
    modalContainer.classList.remove("hidden");
    viewerModalCard.classList.remove("hidden");
    document.getElementById("pdf-file-name").textContent = title;
};

document.getElementById("btn-close-viewer").addEventListener("click", () => {
    modalContainer.classList.add("hidden");
    viewerModalCard.classList.add("hidden");
});