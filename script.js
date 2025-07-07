const MAX_TRIES = 7;
let cards = [];
let packData = [];
let answer = null;
let tries = 0;
let showInitialHint = false;
let showWordCountHint = false;
let showAppearanceHint = false;
let selectedCardsMode = true; // If true, only select answers from selected cards
let selectedCardNames = []; // Array to hold selected card names

const FIELD_NAMES = [
  "CardName", "id", "CardType", "Attribute", "Property", "Types",
  "Level", "ATK", "DEF", "Link", "PendulumScale", "Description"
];

// DISPLAY_FIELDS: visible fields in table (excluding "id" and "Description")
const DISPLAY_FIELDS = [
  "CardName", "CardType", "Attribute", "Property", "Types",
  "Level", "ATK", "DEF", "Link", "PendulumScale"
];

const FIELDS_TO_CHECK = [
  "CardType", "Attribute", "Property", "Types",
  "Level", "ATK", "DEF", "Link", "PendulumScale"
];

// Load and parse CSV
async function loadCards() {
  const res = await fetch('data/cards.csv');
  const csvText = await res.text();
  await loadSelectedCardNames();
  await loadPackData();

  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  cards = parsed.data.map(card => {
    const cleanedCard = {};
    for (let key in card) {
      // Replace HTML-escaped apostrophes
      if (typeof card[key] === 'string') {
        cleanedCard[key] = card[key].replace(/&#039;/g, "'").trim();
        // Replace HTML-escaped quotes
        cleanedCard[key] = cleanedCard[key].replace(/&quot;/g, '"');
        // Replace HTML-escaped ampersands
        cleanedCard[key] = cleanedCard[key].replace(/&amp;/g, '&');
      } else {
        cleanedCard[key] = card[key];
      }
    }
    return cleanedCard;
  });

  if (selectedCardsMode && selectedCardNames.length > 0) {
    const filteredCards = cards.filter(card => selectedCardNames.includes(card.CardName));
    answer = filteredCards[Math.floor(Math.random() * filteredCards.length)];
  } else {
    answer = cards[Math.floor(Math.random() * cards.length)];
  }
  populateDatalist(cards);
  createTableHeader();
  document.getElementById("guessInput").addEventListener("input", function (e) {
    const val = e.target.value.trim();
    const input = e.target;
    
    if (val.length === 0) {
      input.removeAttribute("list");  // disables suggestions
    } else {
      input.setAttribute("list", "cardList");  // re-enable
    }
  });

  document.getElementById("guessInput").addEventListener("change", function (e) {
    e.target.removeAttribute("list");
  });

  document.getElementById("guessInput").addEventListener("mousedown", function (e) {
    e.target.removeAttribute("list");
  });

  // Prevent showing list on focus (click)
  document.getElementById("guessInput").addEventListener("focus", function (e) {
    e.target.removeAttribute("list");
  });

  let zoomLevel = 1;
  document.getElementById("zoomedImage").addEventListener("wheel", function (e) {
    e.preventDefault();
    zoomLevel += e.deltaY > 0 ? -0.1 : 0.1;
    zoomLevel = Math.max(0.5, Math.min(3, zoomLevel));
    this.style.transform = `scale(${zoomLevel})`;
  });
  document.getElementById("zoomModal").addEventListener("click", function (e) {
    // Only close if user clicked outside the image
    if (!e.target.closest(".zoom-wrapper")) {
      this.classList.add("hidden");
    }
  });

  document.getElementById("initialHintBtn").addEventListener("click", () => {
    showInitialHint = !showInitialHint;
    document.getElementById("initialHintBtn").classList.toggle("active", showInitialHint);
    updateHintDisplay();
  });

  document.getElementById("wordHintBtn").addEventListener("click", () => {
    showWordCountHint = !showWordCountHint;
    document.getElementById("wordHintBtn").classList.toggle("active", showWordCountHint);
    updateHintDisplay();
  });

  document.getElementById("appearanceHintBtn").addEventListener("click", () => {
    showAppearanceHint = !showAppearanceHint;
    document.getElementById("appearanceHintBtn").classList.toggle("active", showAppearanceHint);
    // Update the appearance hint display
    updateAppearanceHint();
    updateHintDisplay();
  });

  console.log("Answer Card:", answer);
}

async function loadSelectedCardNames() {
  const res = await fetch('data/25ser.csv');
  const csvText = await res.text();
  const lines = csvText.trim().split("\n");
  selectedCardNames = lines.map(line => line.trim()).filter(Boolean);
}

async function loadPackData() {
  const res = await fetch('data/pack.csv');
  const csvText = await res.text();

  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true
  });

  packData = parsed.data;
}

function populateDatalist(data) {
  const list = document.getElementById('cardList');
  data.forEach(card => {
    const option = document.createElement('option');
    option.value = card.CardName;
    list.appendChild(option);
  });

  updateTriesLeft();
}

function createTableHeader() {
  const header = document.createElement('div');
  header.className = 'result-row';

  DISPLAY_FIELDS.forEach(field => {
    const span = document.createElement('span');
    span.className = 'field';
    span.style.fontWeight = 'bold';
    span.textContent = field === "PendulumScale" ? "Pendulum" : field;
    header.appendChild(span);
  });

  document.getElementById('results').appendChild(header);
}

function submitGuess() {
  if (tries >= MAX_TRIES) return;

  const input = document.getElementById('guessInput');
  const guessName = input.value.trim();
  const guessedCard = cards.find(c => c.CardName.toLowerCase() === guessName.toLowerCase());

  // If guessName is empty, do nothing
  if (guessName.length === 0) {
    return;
  }
  if (!guessedCard) {
    alert("Card not found!");
    return;
  }

  displayResult(guessedCard);
  tries++;
  updateTriesLeft();
  if (tries >= MAX_TRIES || isCorrect(guessedCard)) {
    alert(isCorrect(guessedCard) ? "🎉 Correct!" : "❌ Out of guesses! The answer was: " + answer.CardName);
    // If incorrect, display the answer
    if (!isCorrect(guessedCard)) {
      displayResult(answer);
    } else {
      // If correct, disable further guesses
      tries = MAX_TRIES;  // Set tries to max to prevent further guesses
    }
  }

  input.value = "";
}

function isCorrect(card) {
  return Object.keys(answer).every(key => card[key] === answer[key]);
}

function displayResult(guess) {
  const row = document.createElement('div');
  row.className = 'result-row';

  if (isCorrect(guess)) {
    row.classList.add("correct-row");
  }

  DISPLAY_FIELDS.forEach(field => {
    const span = document.createElement('span');
    span.className = 'field';

    let isCorrect = true;
    let displayValue = guess[field];

    if (field === "CardName") {
      const wrapper = document.createElement("div");
      wrapper.style.display = "flex";
      wrapper.style.alignItems = "center";
      wrapper.style.gap = "8px";

      const image = document.createElement("img");
      const id = guess.id?.toString().replace(/^0+/, '');
      image.src = `card-images/${id}.png`;
      image.onerror = () => {
        image.src = 'card-images/Back-EN.png';
      };
      image.className = "card-thumbnail";
      image.alt = guess[field];
      image.dataset.full = image.src;

      image.addEventListener("click", () => toggleZoom(image));

      const nameSpan = document.createElement("span");
      nameSpan.textContent = displayValue ?? "-";

      wrapper.appendChild(image);
      wrapper.appendChild(nameSpan);
      span.appendChild(wrapper);
    } else {
      // Preprocess display value
      if (["Attribute", "Property", "Types"].includes(field) && displayValue === "NULL") {
        displayValue = "-";
      }
      if (["Level", "ATK", "DEF", "Link", "PendulumScale"].includes(field)
          && (displayValue === "-1" || displayValue === -1)) {
        displayValue = "-";
      }

      // Create icon + text container
      const fieldContent = document.createElement('span');
      fieldContent.style.display = 'flex';
      fieldContent.style.alignItems = 'center';
      fieldContent.style.gap = '4px';

      // Add icon for Attribute
      if (field === "Attribute" && displayValue !== "-") {
        const attrIcon = document.createElement('img');
        attrIcon.src = `icons/attribute/attribute_icon_${displayValue.toLowerCase()}.png`;
        attrIcon.alt = displayValue;
        attrIcon.style.width = '16px';
        attrIcon.style.height = '16px';
        fieldContent.appendChild(attrIcon);
      }

      // Add icon for Property (if not Normal or NULL)
      if (field === "Property" && displayValue !== "-" && displayValue.toLowerCase() !== "normal") {
        const propIcon = document.createElement('img');
        propIcon.src = `icons/effect/effect_icon_${displayValue.toLowerCase().replace(/-/g, "")}.png`;  // also remove "-"
        propIcon.alt = displayValue;
        propIcon.style.width = '16px';
        propIcon.style.height = '16px';
        fieldContent.appendChild(propIcon);
      }

      if (field === "Types") {

        if (!displayValue || displayValue === "-" || displayValue.trim() === "") {
          // Show a plain "-" if NULL or empty
          const textNode = document.createTextNode("-");
          fieldContent.appendChild(textNode);
          span.appendChild(fieldContent);
        } else {
          const guessTypes = (guess[field] || "").split("/").map(s => s.trim());
          const answerTypes = (answer[field] || "").split("/").map(s => s.trim());

          guessTypes.forEach((type, idx) => {
            if (idx > 0) fieldContent.appendChild(document.createTextNode("/"));

            const typeSpan = document.createElement("span");
            typeSpan.textContent = type;

            if (answerTypes.includes(type)) {
              typeSpan.style.color = "#28a745"; // green
              // typeSpan.style.fontWeight = "bold";
            }

            fieldContent.appendChild(typeSpan);
            span.appendChild(fieldContent);
          });
        }
      } else {
        const textNode = document.createTextNode(displayValue ?? "-");
      
        fieldContent.appendChild(textNode);
        span.appendChild(fieldContent);
      }

      // Field-level correctness coloring
      if (FIELDS_TO_CHECK.includes(field)) {
        const isCorrect = guess[field] === answer[field];
        span.classList.add(isCorrect ? 'correct' : 'incorrect');
      }

      row.appendChild(span);
    }

    // Check correctness
    if (FIELDS_TO_CHECK.includes(field)) {
      const isMonster = guess.CardType === "Monster" && answer.CardType === "Monster";
      const isNumeric = ["Level", "ATK", "DEF", "Link", "PendulumScale"].includes(field);

      const val1 = parseInt(guess[field]);
      const val2 = parseInt(answer[field]);

      const isEqual = guess[field] === answer[field];
      isCorrect = isEqual;

      if (isEqual) {
        span.classList.add("correct");
      } else {
        span.classList.add("incorrect");

        // Add arrow hint if both are Monster and field is numeric
        if (isMonster && isNumeric && !isNaN(val1) && !isNaN(val2)) {
          const arrow = document.createElement("span");
          arrow.style.marginLeft = "4px";
          arrow.style.fontWeight = "bold";
          arrow.style.color = "#721c24";
          arrow.textContent = val1 < val2 ? "↑" : "↓";
          span.appendChild(arrow);
        }
      }
    }

    row.appendChild(span);
  });

  document.getElementById('results').appendChild(row);
}

function toggleZoom(imgElement) {
  const modal = document.getElementById("zoomModal");
  const zoomedImage = document.getElementById("zoomedImage");

  if (modal.classList.contains("hidden")) {
    zoomedImage.src = imgElement.dataset.full;
    modal.classList.remove("hidden");
    zoomLevel = 1;
    zoomedImage.style.transform = "scale(1)";
  } else {
    modal.classList.add("hidden");
  }
}

function updateTriesLeft() {
  const left = MAX_TRIES - tries;
  document.getElementById("triesLeft").textContent = `Enter the card name (you have ${left} ${left < 2 ? 'try):' : 'tries):'}`;
}

function confirmNewGame() {
  // Don't confirm for now, just start a new game
  // Uncomment the next line to enable confirmation dialog
  // if (confirm("Are you sure you want to start a new game?")) {
    startNewGame();
  // }
}

function startNewGame() {
  tries = 0;
  if (selectedCardsMode && selectedCardNames.length > 0) {
    const filteredCards = cards.filter(card => selectedCardNames.includes(card.CardName));
    answer = filteredCards[Math.floor(Math.random() * filteredCards.length)];
  } else {
    answer = cards[Math.floor(Math.random() * cards.length)];
  }

  // Clear results
  const results = document.getElementById('results');
  results.innerHTML = '';  // Remove all previous guess rows

  createTableHeader();     // Add back header row
  updateTriesLeft();       // Reset tries counter
  document.getElementById("guessInput").value = "";  // Clear input
  updateHintDisplay();  // Reset hint contents
  updateAppearanceHint();  // Reset appearance hint

  console.log("New Answer:", answer);  // Debug log
}

function updateHintDisplay() {
  const initialHintSpan = document.getElementById("initialHintDisplay");
  const wordHintSpan = document.getElementById("wordHintDisplay");

  if (!answer) {
    initialHintSpan.textContent = "";
    wordHintSpan.textContent = "";
    return;
  }

  initialHintSpan.innerHTML = showInitialHint
    ? `<strong>${answer.CardName.charAt(0)}</strong>`
    : "";

  wordHintSpan.innerHTML = showWordCountHint
    ? `<strong>${answer.CardName.trim().split(/\s+/).length}</strong>`
    : "";
}

function getFirstAppearanceDate(cardId) {
  const match = packData.find(p => p.id === cardId);
  // const pack_id 
  // return match ? match.date : "Unknown";
  if (match) {
    const date = match.date;
    const pack = match.pack_id.split("-");
    return date + (pack.length > 1 ? ` [${pack[0]}]` : "");
  }
  return "Unknown";
}

function updateAppearanceHint() {
  const hintSpan = document.getElementById("appearanceHintDisplay");
  if (showAppearanceHint && answer) {
    const date = getFirstAppearanceDate(answer.id);
    hintSpan.innerHTML = date !== "Unknown" ? `<strong>${date}</strong>` : "<strong>Unknown</strong>";
  } else {
    hintSpan.textContent = "";
  }
}

loadCards();
