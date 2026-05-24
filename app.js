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

document.getElementById("btn-login").addEventListener("click", () => {
    signInWithPopup(auth, provider).catch(err => console.error("Auth Failed: ", err));
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
window.selectSubject = (subject) => { selectedSubject = subject; navigateToChapters(); };

async function navigateToChapters() {
    currentView = "chapters";
    currentTitle.textContent = `${selectedSubject} - Chapters`;
    btnBack.classList.remove("hidden");
    fabAdd.classList.remove("hidden");
    contentArea.innerHTML = "Loading...";

    try {
        const q = query(collection(db, "chapters"), where("userId", "==", currentUser.uid), where("subject", "==", selectedSubject));
        const snapshot = await getDocs(q);
        let list = [];
        snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
        list.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
        
        contentArea.innerHTML = list.length === 0 ? "<p style='padding:20px; color:#636e72;'>No chapters yet.</p>" : "";
        list.forEach(item => {
            const timeTag = item.time ? ` ${item.time}` : "";
            contentArea.innerHTML += `
                <div class="tracker-card">
                    <div class="card-main-clickable" onclick="selectChapter('${item.id}', '${item.name}')">
                        <div><span class="card-title">📁 ${item.name}</span><span style="font-size:12px; color:var(--text-muted); display:block;">📅 ${item.date}${timeTag}</span></div>
                        <span class="material-icons">chevron_right</span>
                    </div>
                    <span class="material-icons delete-btn" onclick="event.stopPropagation(); deleteRecord('chapters', '${item.id}')">delete</span>
                </div>
            `;
        });
    } catch (err) { contentArea.innerHTML = "Error: " + err.message; }
}
window.selectChapter = (id, name) => { selectedChapterId = id; selectedChapterName = name; navigateToDpps(); };

async function navigateToDpps() {
    currentView = "dpps";
    currentTitle.textContent = `${selectedChapterName} - DPPs`;
    contentArea.innerHTML = "Loading...";
    try {
        const q = query(collection(db, "dpps"), where("chapterId", "==", selectedChapterId));
        const snapshot = await getDocs(q);
        let list = [];
        snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
        
        contentArea.innerHTML = list.length === 0 ? "<p style='padding:20px; color:#636e72;'>No DPPs found.</p>" : "";
        list.forEach(item => {
            const timeTag = item.time ? ` ${item.time}` : "";
            contentArea.innerHTML += `
                <div class="tracker-card">
                    <div class="card-main-clickable" onclick="selectDpp('${item.id}', '${item.name}')">
                        <div><span class="card-title">📄 ${item.name}</span><span style="font-size:12px; color:var(--text-muted); display:block;">📅 ${item.date}${timeTag}</span></div>
                        <span class="material-icons">chevron_right</span>
                    </div>
                    <span class="material-icons delete-btn" onclick="event.stopPropagation(); deleteRecord('dpps', '${item.id}')">delete</span>
                </div>
            `;
        });
    } catch (err) { contentArea.innerHTML = "Error: " + err.message; }
}
window.selectDpp = (id, name) => { selectedDppId = id; selectedDppName = name; navigateToQuestions(); };

async function navigateToQuestions() {
    currentView = "questions";
    currentTitle.textContent = `${selectedDppName} - Solutions`;
    contentArea.innerHTML = "Loading...";
    try {
        const q = query(collection(db, "questions"), where("dppId", "==", selectedDppId));
        const snapshot = await getDocs(q);
        let list = [];
        snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
        list.sort((a, b) => (a.number || 0) - (b.number || 0));
        
        contentArea.innerHTML = list.length === 0 ? "<p style='padding:20px; color:#636e72;'>No entries.</p>" : "";
        list.forEach(item => {
            const hasFile = !!item.fileDataStream;
            const timeTag = item.time ? ` ${item.time}` : "";
            contentArea.innerHTML += `
                <div class="tracker-card">
                    <div class="card-main-clickable" onclick="handleQuestionClick('${item.id}', 'Question ${item.number}', ${hasFile})">
                        <div>
                            <div class="card-title" style="color: ${hasFile ? 'var(--primary-purple)' : '#475569'}">Question ${item.number}</div>
                            <span style="font-size:11px; font-weight:bold; color: #94a3b8;">📅 ${item.date}${timeTag}</span>
                            <p style="font-size:13px; color:#555;">${item.notes || 'No notes.'}</p>
                        </div>
                        <span class="material-icons">${hasFile ? 'visibility' : 'notes'}</span>
                    </div>
                    <span class="material-icons delete-btn" onclick="event.stopPropagation(); deleteRecord('questions', '${item.id}')">delete</span>
                </div>
            `;
        });
    } catch (err) { contentArea.innerHTML = "Error: " + err.message; }
}

window.handleQuestionClick = (docId, title, hasFile) => { if (hasFile) openInlineFile(docId, title); };

btnBack.addEventListener("click", () => {
    if (currentView === "chapters") navigateToSubjects();
    else if (currentView === "dpps") navigateToChapters();
    else if (currentView === "questions") navigateToDpps();
});

window.deleteRecord = async (col, id) => {
    if (confirm("Delete this entry?")) {
        await deleteDoc(doc(db, col, id));
        if (currentView === "chapters") navigateToChapters();
        else if (currentView === "dpps") navigateToDpps();
        else if (currentView === "questions") navigateToQuestions();
    }
};

fabAdd.addEventListener("click", () => {
    modalContainer.classList.remove("hidden");
    formModalCard.classList.remove("hidden");
    
    // Auto-fill Date and Time
    const now = new Date();
    document.getElementById("record-date").value = now.toISOString().split('T')[0];
    document.getElementById("record-time").value = now.toTimeString().slice(0,5);

    document.getElementById("question-file-fields").classList.toggle("hidden", currentView !== "questions");
});

document.getElementById("btn-modal-submit").addEventListener("click", async () => {
    const primaryInput = document.getElementById("primary-input").value.trim();
    const chosenDate = document.getElementById("record-date").value;
    const chosenTime = document.getElementById("record-time").value; // Capture time

    if (!primaryInput) return;

    try {
        if (currentView === "chapters") {
            await addDoc(collection(db, "chapters"), { name: primaryInput, date: chosenDate, time: chosenTime, subject: selectedSubject, userId: currentUser.uid });
            closeModal(); navigateToChapters();
        } else if (currentView === "dpps") {
            await addDoc(collection(db, "dpps"), { name: primaryInput, date: chosenDate, time: chosenTime, chapterId: selectedChapterId });
            closeModal(); navigateToDpps();
        } else if (currentView === "questions") {
            const rawFile = document.getElementById("solution-file-picker").files[0];
            let encodedData = rawFile ? await readAsBase64(rawFile) : "";
            
            await addDoc(collection(db, "questions"), {
                dppId: selectedDppId, number: parseInt(primaryInput), date: chosenDate, time: chosenTime, notes: document.getElementById("question-notes").value, fileDataStream: encodedData, mimeType: rawFile?.type || ""
            });
            closeModal(); navigateToQuestions();
        }
    } catch (err) { modalError.textContent = "Error: " + err.message; }
});

function closeModal() {
    modalContainer.classList.add("hidden");
    formModalCard.classList.add("hidden");
    viewerModalCard.classList.add("hidden");
}

async function readAsBase64(file) { return new Promise(resolve => { const r = new FileReader(); r.onload = () => resolve(r.result); r.readAsDataURL(file); }); }
document.getElementById("btn-close-viewer").addEventListener("click", closeModal);
document.getElementById("btn-modal-cancel").addEventListener("click", closeModal);
