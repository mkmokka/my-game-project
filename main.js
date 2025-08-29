// ===== Firebase Imports =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink, updatePassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getDatabase, ref, set, onValue, runTransaction } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// ===== Firebase Config =====
const firebaseConfig = {
  apiKey: "AIzaSyDyUA2w9LVnhJQHgDG4-R_y6mAG8UiJp-k",
  authDomain: "my-game-project-67148.firebaseapp.com",
  databaseURL: "https://my-game-project-67148-default-rtdb.firebaseio.com",
  projectId: "my-game-project-67148",
  appId: "1:792142496854:web:1794ad477cb19fc02ba7f7"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// ======= Registration (Send Email Link) =======
async function registerWithEmail() {
  const email = document.getElementById("regEmail").value;
  const actionCodeSettings = {
    url: window.location.origin + '/finish.html',
    handleCodeInApp: true
  };
  try {
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    window.localStorage.setItem('emailForSignIn', email);
    alert("Check your email to set your password!");
  } catch(err) { alert(err.message); }
}

// ======= Login with Email + Password =======
async function loginWithPassword() {
  const email = document.getElementById("logEmail").value;
  const password = document.getElementById("logPass").value;
  try {
    const userCred = await signInWithEmailAndPassword(auth,email,password);
    alert("Login successful! Redirecting to game...");
    window.location.href="game.html";
  } catch(err){ alert(err.message); }
}

// ======= Magic Link Handling =======
if(window.location.pathname.includes('finish.html')){
  window.onload = async () => {
    const url = window.location.href;
    if(isSignInWithEmailLink(auth,url)){
      let email = window.localStorage.getItem('emailForSignIn');
      if(!email) email = prompt("Enter your email to confirm");
      try {
        const result = await signInWithEmailLink(auth,email,url);
        window.localStorage.removeItem('emailForSignIn');

        // Replace prompt with password input in HTML
        const passwordInput = document.getElementById("passwordInput");
        const submitBtn = document.getElementById("setPasswordBtn");
        submitBtn.onclick = async () => {
          const password = passwordInput.value;
          if(password.length < 6){ alert("Password must be 6+ characters"); return; }
          await updatePassword(result.user,password);
          alert("Password set! You can login now.");
          window.location.href = "index.html";
        };
      } catch(err){ alert(err.message); }
    }
  };
}

// ======= 6-Player Multiplayer Join =======
async function joinRoom(roomId, avatarUrl){
  const user = auth.currentUser;
  if(!user){ alert("Login first"); return; }

  const roomMembersRef = ref(db,'rooms/'+roomId+'/members');
  await runTransaction(roomMembersRef, currentMembers => {
    currentMembers = currentMembers || {};
    const slots = ["1","2","3","4","5","6"];
    const mySlot = slots.find(s => !currentMembers[s]);

    if(!mySlot){
      alert("Room full!");
      return; // abort transaction
    }

    // Assign player data
    currentMembers[mySlot] = {
      uid: user.uid,
      email: user.email,
      avatar: avatarUrl,
      slot: mySlot,
      power: 10,
      alive: true,
      x: 100,
      y: 100
    };

    return currentMembers;
  });

  // Check if room is full to start game
  const statusRef = ref(db,'rooms/'+roomId+'/status');
  onValue(ref(db,'rooms/'+roomId+'/members'), snap => {
    const members = snap.val() || {};
    if(Object.keys(members).length === 6){
      set(statusRef,'started');
    }
  });
}

// ===== Export functions to window so HTML can call them =====
window.registerWithEmail = registerWithEmail;
window.loginWithPassword = loginWithPassword;
window.joinRoom = joinRoom;
