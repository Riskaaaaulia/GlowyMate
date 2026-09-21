
// ==========================================================================
// CONFIGURATION & GLOBAL VARIABLES
// ==========================================================================
// Tempelkan URL Google Apps Script Web App kamu di bawah ini
const GOOGLE_SHEET_API_URL = "https://script.google.com/a/macros/smk.belajar.id/s/AKfycbyJjjyU0XKTvp1do9AA2vnro8tUMaxsIG89ZXY9md099T03qxFWy4UHfdHlUpZjnkiSTA/exec";

let currentUser = {
  name: "",
  age: null,
  skinType: ""
};

let currentQuestionIndex = 0;
let quizScores = { Berminyak: 0, Kering: 0, Sensitive: 0, Kombinasi: 0 };

const quizQuestions = [
  {
    question: "Bagaimana kondisi wajahmu setelah 1 jam dicuci tanpa memakai produk apa pun?",
    options: [
      { text: "Tampak berkilau dan terasa berminyak di seluruh wajah", type: "Berminyak" },
      { text: "Terasa tertarik, kaku, atau bersisik", type: "Kering" },
      { text: "Terasa perih, kemerahan, atau gatal", type: "Sensitive" },
      { text: "Berminyak di dahi/hidung (T-Zone), tapi pipi kering/normal", type: "Kombinasi" }
    ]
  },
  {
    question: "Seberapa sering jerawat atau komedo muncul di wajahmu?",
    options: [
      { text: "Sangat sering, terutama di daerah yang berminyak", type: "Berminyak" },
      { text: "Jarang sekali, kulit cenderung kusam atau bersisik", type: "Kering" },
      { text: "Sering kemerahan / bentol kecil saat coba produk baru", type: "Sensitive" },
      { text: "Hanya muncul di dahi, hidung, atau dagu", type: "Kombinasi" }
    ]
  },
  {
    question: "Bagaimana tampilan pori-pori di wajahmu?",
    options: [
      { text: "Terlihat besar dan jelas di seluruh wajah", type: "Berminyak" },
      { text: "Sangat kecil dan hampir tidak terlihat", type: "Kering" },
      { text: "Tampak normal tapi mudah memerah", type: "Sensitive" },
      { text: "Terlihat jelas hanya di area hidung dan dahi", type: "Kombinasi" }
    ]
  }
];

const ingredientRecommendations = {
  Berminyak: ["Salicylic Acid (BHA)", "Tea Tree", "Niacinamide", "Centella Asiatica"],
  Kering: ["Hyaluronic Acid", "Ceramide", "Glycerin", "Aloe Vera"],
  Sensitive: ["Centella Asiatica", "Chamomile", "Allantoin", "Ceramide"],
  Kombinasi: ["Niacinamide", "Hyaluronic Acid", "Green Tea", "Centella Asiatica"]
};

// Data Cadangan (Fallback Data) jika Google Sheet belum terhubung
const fallbackProducts = [
  {
    id: "P01",
    name: "Ms. Pimple Acne Solution Face Wash",
    brand: "Emina",
    category: "Cleanser",
    skin_type: "Berminyak",
    min_age: 12,
    max_age: 19,
    key_ingredients: "Salicylic Acid, Rosebay Willowherb",
    price_range: "20rb - 30rb",
    image_url: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=300",
    product_url: "#"
  },
  {
    id: "P02",
    name: "7X Ceramide Barrier Moisture Gel",
    brand: "The Originote",
    category: "Moisturizer",
    skin_type: "Berminyak",
    min_age: 12,
    max_age: 20,
    key_ingredients: "Ceramide, Hyaluronic Acid, Centella",
    price_range: "35rb - 45rb",
    image_url: "https://images.unsplash.com/photo-1608248597266-c89133a8a3a0?w=300",
    product_url: "#"
  }
];

// ==========================================================================
// INITIALIZATION
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
  loadUserData();
  renderQuizQuestion();
});

// ==========================================================================
// USER AUTHENTICATION & LOCALSTORAGE
// ==========================================================================
function loadUserData() {
  const savedUser = localStorage.getItem("glowymate_user");
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    updateUserUI();
  }
}

function handleLogin() {
  const nameInput = document.getElementById("inputUsername").value.trim();
  const ageInput = parseInt(document.getElementById("inputUserAge").value);

  if (!nameInput || isNaN(ageInput) || ageInput < 10 || ageInput > 25) {
    alert("Mohon masukkan nama dan usia remaja yang valid (10-25 tahun).");
    return;
  }

  currentUser.name = nameInput;
  currentUser.age = ageInput;

  localStorage.setItem("glowymate_user", JSON.stringify(currentUser));
  updateUserUI();
}

function handleLogout() {
  localStorage.removeItem("glowymate_user");
  currentUser = { name: "", age: null, skinType: "" };
  
  document.getElementById("inputUsername").value = "";
  document.getElementById("inputUserAge").value = "";
  
  document.getElementById("authFormView").classList.remove("hidden");
  document.getElementById("userProfileView").classList.add("hidden");
  resetQuiz();
}

function updateUserUI() {
  if (currentUser.name) {
    document.getElementById("authFormView").classList.add("hidden");
    document.getElementById("userProfileView").classList.remove("hidden");
    
    document.getElementById("profileName").innerText = currentUser.name;
    document.getElementById("profileAge").innerText = currentUser.age || "-";
    document.getElementById("profileSkinType").innerText = currentUser.skinType || "Belum Kuis";
    document.getElementById("profileAvatar").innerText = currentUser.name.charAt(0).toUpperCase();
  }
}

// ==========================================================================
// QUIZ ENGINE
// ==========================================================================
function renderQuizQuestion() {
  const quizContainer = document.getElementById("quizContent");
  const q = quizQuestions[currentQuestionIndex];

  let html = `
    <div class="flex justify-between items-center mb-3">
      <span class="text-[10px] bg-pink-100 text-pink-600 font-bold px-2 py-0.5 rounded-full">Pertanyaan ${currentQuestionIndex + 1} dari ${quizQuestions.length}</span>
      <span class="text-[10px] text-slate-400 font-semibold">${Math.round(((currentQuestionIndex + 1) / quizQuestions.length) * 100)}%</span>
    </div>
    <h3 class="font-bold text-xs text-slate-800 mb-3">${q.question}</h3>
    <div class="space-y-2">
  `;

  q.options.forEach((opt, index) => {
    html += `
      <button onclick="handleAnswer('${opt.type}')" class="w-full text-left p-3 text-xs border border-pink-100 rounded-xl hover:bg-pink-50 hover:border-pink-300 transition-all active:scale-[0.99] flex items-center gap-2">
        <span class="w-5 h-5 bg-pink-100 text-pink-600 rounded-full flex items-center justify-center font-bold text-[10px]">${index + 1}</span>
        <span class="text-slate-700">${opt.text}</span>
      </button>
    `;
  });

  html += `</div>`;
  quizContainer.innerHTML = html;
}

function handleAnswer(type) {
  quizScores[type]++;
  currentQuestionIndex++;

  if (currentQuestionIndex < quizQuestions.length) {
    renderQuizQuestion();
  } else {
    calculateQuizResult();
  }
}

function calculateQuizResult() {
  let winningType = "Berminyak";
  let maxScore = -1;

  for (const type in quizScores) {
    if (quizScores[type] > maxScore) {
      maxScore = quizScores[type];
      winningType = type;
    }
  }

  currentUser.skinType = winningType;
  localStorage.setItem("glowymate_user", JSON.stringify(currentUser));
  updateUserUI();

  displayResults(winningType);
}

function displayResults(skinType) {
  document.getElementById("quizSection").classList.add("hidden");
  document.getElementById("resultSection").classList.remove("hidden");

  document.getElementById("skinResultTitle").innerText = `Tipe Kulitmu: ${skinType}`;
  document.getElementById("userAgeDisplay").innerText = currentUser.age || "Remaja";

  // Render Badges Kandungan
  const badgesContainer = document.getElementById("ingredientBadges");
  const ingredients = ingredientRecommendations[skinType] || ingredientRecommendations["Berminyak"];
  badgesContainer.innerHTML = ingredients
    .map(ing => `<span class="bg-pink-50 text-pink-600 border border-pink-200 text-[10px] font-bold px-2.5 py-1 rounded-lg">✨ ${ing}</span>`)
    .join("");

  fetchProducts(skinType);
}

function resetQuiz() {
  currentQuestionIndex = 0;
  quizScores = { Berminyak: 0, Kering: 0, Sensitive: 0, Kombinasi: 0 };
  
  document.getElementById("quizSection").classList.remove("hidden");
  document.getElementById("resultSection").classList.add("hidden");
  renderQuizQuestion();
}

// ==========================================================================
// GOOGLE SHEETS FETCH & RENDER (DENGAN KISARAN HARGA)
// ==========================================================================
async function fetchProducts(skinType) {
  const productListContainer = document.getElementById("productList");
  productListContainer.innerHTML = `<p class="text-xs text-slate-400 text-center py-4">🔍 Mencari produk aman untukmu...</p>`;

  try {
    const response = await fetch(GOOGLE_SHEET_API_URL);
    const data = await response.json();
    
    if (data && data.length > 0) {
      renderProducts(data, skinType);
    } else {
      renderProducts(fallbackProducts, skinType);
    }
  } catch (error) {
    console.warn("Gagal mengambil data dari Google Sheet API, menggunakan data cadangan.", error);
    renderProducts(fallbackProducts, skinType);
  }
}

function renderProducts(products, skinType) {
  const productListContainer = document.getElementById("productList");
  const userAge = currentUser.age || 15;

  const filtered = products.filter(p => {
    const matchSkin = p.skin_type.toLowerCase() === skinType.toLowerCase() || p.skin_type.toLowerCase() === "semua tipe";
    const matchAge = userAge >= p.min_age && userAge <= p.max_age;
    return matchSkin && matchAge;
  });

  if (filtered.length === 0) {
    productListContainer.innerHTML = `<p class="text-xs text-slate-500 text-center py-4">Belum ada produk yang cocok untuk kriteria ini.</p>`;
    return;
  }

  // MEMANGGIL price_range SEBAGAI BADGE KISARAN HARGA
  productListContainer.innerHTML = filtered.map(p => `
    <div class="bg-white p-3 rounded-2xl border border-pink-100 flex gap-3 items-center card-hover shadow-sm">
      <img src="${p.image_url}" alt="${p.name}" class="w-16 h-16 object-cover rounded-xl border border-pink-50" onerror="this.src='https://via.placeholder.com/100?text=GlowyMate'">
      <div class="flex-grow">
        <div class="flex justify-between items-center">
          <span class="text-[9px] bg-pink-100 text-pink-600 font-bold px-2 py-0.5 rounded-full">${p.category}</span>
          <span class="text-[9px] bg-emerald-50 text-emerald-600 border border-emerald-200 font-bold px-2 py-0.5 rounded-full">🏷️ ${p.price_range || 'Terjangkau'}</span>
        </div>
        <h4 class="font-bold text-xs text-slate-800 mt-1">${p.name}</h4>
        <p class="text-[10px] text-slate-400">${p.brand}</p>
        <p class="text-[9px] text-pink-500 mt-1">🧪 Key: <span class="font-medium text-slate-600">${p.key_ingredients}</span></p>
      </div>
    </div>
  `).join("");
}

// ==========================================================================
// GLOWYBOT AI WIDGET
// ==========================================================================
function toggleChat() {
  const chatBox = document.getElementById("chatBox");
  chatBox.classList.toggle("hidden");
}

function sendChatMessage() {
  const input = document.getElementById("chatInput");
  const message = input.value.trim();
  if (!message) return;

  const chatMessages = document.getElementById("chatMessages");

  // Pesan Pengguna
  chatMessages.innerHTML += `
    <div class="bg-slate-100 text-slate-700 p-2.5 rounded-xl rounded-tr-none max-w-[85%] ml-auto text-right">
      ${message}
    </div>
  `;

  input.value = "";
  chatMessages.scrollTop = chatMessages.scrollHeight;

  // Respon Otomatis Bot
  setTimeout(() => {
    let reply = "Untuk hasil perawatan maksimal, pastikan kamu selalu mencuci muka 2x sehari dan memakai sunscreen ya! 🌸";
    
    if (message.toLowerCase().includes("jerawat")) {
      reply = "Untuk jerawat remaja, cari kandungan Salicylic Acid atau Tea Tree, dan hindari memencet jerawat ya!";
    } else if (message.toLowerCase().includes("kering")) {
      reply = "Kulit kering butuh pelembab dengan kandungan Hyaluronic Acid atau Ceramide!";
    }

    chatMessages.innerHTML += `
      <div class="bg-pink-100 text-slate-700 p-2.5 rounded-xl rounded-tl-none max-w-[85%]">
        ${reply}
      </div>
    `;
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }, 600);
}

// ==========================================================================
// MODAL ABOUT
// ==========================================================================
function openAboutModal() {
  document.getElementById("aboutModal").classList.remove("hidden");
}

function closeAboutModal() {
  document.getElementById("aboutModal").classList.add("hidden");
}
