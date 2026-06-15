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

// --- Auth ---
document.getElementById("btn-login").addEventListener("click", () => signInWithPopup(auth, provider));
document.getElementById("btn-logout").addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, user => {
  if (user) { currentUser = user; authScreen.classList.add("hidden"); appScreen.classList.remove("hidden"); navigateToSubjects(); }
  else { currentUser = null; appScreen.classList.add("hidden"); authScreen.classList.remove("hidden"); }
});

// --- Navigation ---
function navigateToSubjects() {
  currentView = "subjects";
  currentTitle.textContent = "Subjects";
  btnBack.classList.add("hidden");
  fabAdd.classList.add("hidden");
  contentArea.innerHTML = "";
  ["Physics", "Chemistry", "Math"].forEach(subj => {
    const div = document.createElement("div");
    div.className = "tracker-card";
    div.innerHTML = `<span class="card-title">${subj}</span>`;
    div.addEventListener("click", () => { selectedSubject = subj; navigateToChapters(); });
    contentArea.appendChild(div);
  });
}

async function navigateToChapters() {
  currentView = "chapters";
  currentTitle.textContent = `${selectedSubject} - Chapters`;
  btnBack.classList.remove("hidden");
  fabAdd.classList.remove("hidden");
  contentArea.innerHTML = "Loading...";
  try {
    const q = query(collection(db, "chapters"), where("userId", "==", currentUser.uid), where("subject", "==", selectedSubject));
    const snapshot = await getDocs(q);
    contentArea.innerHTML = "";
    snapshot.forEach(docSnap => {
      const item = { id: docSnap.id, ...docSnap.data() };
      const div = document.createElement("div");
      div.className = "tracker-card";
      div.innerHTML = `<div>${item.name}</div><span class="material-icons delete-btn">delete</span>`;
      div.querySelector("div").addEventListener("click", () => { selectedChapterId = item.id; selectedChapterName = item.name; navigateToDpps(); });
      div.querySelector(".delete-btn").addEventListener("click", (e) => { e.stopPropagation(); deleteRecord('chapters', item.id); });
      contentArea.appendChild(div);
    });
  } catch (err) { contentArea.innerHTML = "Error: " + err.message; }
}

async function navigateToDpps() {
  currentView = "dpps";
  currentTitle.textContent = `${selectedChapterName} - DPPs`;
  contentArea.innerHTML = "Loading...";
  try {
    const q = query(collection(db, "dpps"), where("chapterId", "==", selectedChapterId));
    const snapshot = await getDocs(q);
    contentArea.innerHTML = "";
    snapshot.forEach(docSnap => {
      const item = { id: docSnap.id, ...docSnap.data() };
      const div = document.createElement("div");
      div.className = "tracker-card";
      div.innerHTML = `<div>${item.name}</div><span class="material-icons delete-btn">delete</span>`;
      div.querySelector("div").addEventListener("click", () => { selectedDppId = item.id; selectedDppName = item.name; navigateToQuestions(); });
      div.querySelector(".delete-btn").addEventListener("click", (e) => { e.stopPropagation(); deleteRecord('dpps', item.id); });
      contentArea.appendChild(div);
    });
  } catch (err) { contentArea.innerHTML = "Error: " + err.message; }
}

async function navigateToQuestions() {
  currentView = "questions";
  currentTitle.textContent = `${selectedDppName} - Solutions`;
  contentArea.innerHTML = "Loading...";
  try {
    const q = query(collection(db, "questions"), where("dppId", "==", selectedDppId));
    const snapshot = await getDocs(q);
    contentArea.innerHTML = "";
    const questions = [];
    snapshot.forEach(d => questions.push({ id: d.id, ...d.data() }));
    questions.sort((a, b) => (a.number || 0) - (b.number || 0));
    questions.forEach(item => {
      const hasFile = !!item.fileDataStream;
      const div = document.createElement("div");
      div.className = "tracker-card";
      div.innerHTML = `<div>Question ${item.number}</div><span class="material-icons delete-btn">delete</span>`;
      div.querySelector("div").addEventListener("click", () => { if(hasFile) openInlineFile(item.id, `Question ${item.number}`); });
      div.querySelector(".delete-btn").addEventListener("click", (e) => { e.stopPropagation(); deleteRecord('questions', item.id); });
      contentArea.appendChild(div);
    });
  } catch (err) { contentArea.innerHTML = "Error: " + err.message; }
}

// --- Helpers & Logic ---
window.deleteRecord = async (col, id) => {
  if (confirm("Delete this?")) {
    await deleteDoc(doc(db, col, id));
    if (currentView === "chapters") navigateToChapters();
    else if (currentView === "dpps") navigateToDpps();
    else navigateToQuestions();
  }
};

btnBack.addEventListener("click", () => {
  if (currentView === "chapters") navigateToSubjects();
  else if (currentView === "dpps") navigateToChapters();
  else navigateToQuestions();
});

function closeModal() { modalContainer.classList.add("hidden"); formModalCard.classList.add("hidden"); viewerModalCard.classList.add("hidden"); }
document.getElementById("btn-modal-cancel").addEventListener("click", closeModal);
document.getElementById("btn-close-viewer").addEventListener("click", closeModal);

async function openInlineFile(docId, title) {
    modalContainer.classList.remove("hidden");
    viewerModalCard.classList.remove("hidden");
    document.getElementById("pdf-file-name").textContent = title;
    const viewport = document.querySelector(".pdf-render-viewport");
    viewport.innerHTML = "Loading...";
    const snapshot = await getDocs(collection(db, "questions"));
    const docData = snapshot.docs.find(d => d.id === docId);
    if(docData) {
        const data = docData.data();
        viewport.innerHTML = data.mimeType === "application/pdf" ? `<iframe src="${data.fileDataStream}" width="100%" height="100%"></iframe>` : `<img src="${data.fileDataStream}" style="max-width:100%"/>`;
    }
}
