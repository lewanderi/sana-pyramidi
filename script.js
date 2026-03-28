// database connection
const supabaseUrl = "https://golunduallnunwyvnpyb.supabase.co"; 
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvbHVuZHVhbGxudW53eXZucHliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMDA1MzYsImV4cCI6MjA4OTg3NjUzNn0.AFiEhAmiflXXb1AFLjcXAMMzRu8wgtCvZMcpdgbfgl4"; 
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// puzzle
const puzzle = {
    categories: [
        {label: "Kahveja☕️", words: [ "Americano", "Espresso", "Latte", "Suodatin", "Capuccino"], color: "#2a9d8f" },
        {label: "Teetä🍵", words: ["Vihreä",  "valkoinen", "musta", "rooibos"], color: "#f4a261" },
        {label: "Negroni🥃", words: ["campari",  "gin", "vermouth"], color: "#e63946" },
        {label: "Rommikola🍹", words: ["rommi",  "coca-cola"], color: "#457b9d" },
    ],
    lone_word: "vodka",
    lone_word_color: "#a8dadc"
}
const defaultPuzzle = JSON.parse(JSON.stringify(puzzle));

// global variables
let shuffledWords = [];
const COLS = 60;
let wrongGuesses = 0;
const MAX_GUESSES = 4;
let nextHintSize = 5;
let previousGuesses = [];

// check if custom URL
async function loadFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("puzzle");
    console.log("code:", code);
    if (!code) return false;

        // check if it's an old base64 URL or a new share code
    if (code.includes("-")) {
        // new format — load from database

        // loading state
        document.getElementById("choice-screen").style.display = "none";
        document.getElementById("loading").style.display = "flex";
        startLoadingMessages();

        const [{ data, error }] = await Promise.all([
            supabaseClient.from("puzzles").select("*").eq("share_code", code).single(),
            new Promise(resolve => setTimeout(resolve, 1000))
        ]);

        document.getElementById("loading").style.display = "none";
        stopLoadingMessages();

        if (error || !data) {
            console.log("puzzle not found:", error);
            return false;
        }

        const colors = ["#2a9d8f", "#f4a261", "#e63946", "#457b9d"];
        puzzle.categories = data.categories.map((c, i) => ({
            ...c,
            color: colors[i]
        }));
        puzzle.lone_word = data.lone_word;
        puzzle.lone_word_color = "#a8dadc";
        return true;

    } else {
        try {
            const puzzleData = JSON.parse(atob(encoded));
            console.log("puzzleData:", puzzleData);
            puzzle.categories = puzzleData.categories;
            puzzle.lone_word = puzzleData.lone_word;
            puzzle.lone_word_color = puzzleData.lone_word_color;
            return true;
    } catch (e) {
        console.log("error:", e);
        return false;  // invalid or corrupted URL
    }
    }
}


document.addEventListener("DOMContentLoaded", async () => {
    hideBack();

    window.addEventListener("pageshow", () => {
        hideBack();
    });

    const loadedFromUrl = await loadFromUrl();
    console.log("loadedFromUrl:", loadedFromUrl); 
    if (loadedFromUrl) {
        // reconstruct share URL from current URL
        const code = new URLSearchParams(window.location.search).get("puzzle");
        window.generatedShareUrl = `${window.location.origin}${window.location.pathname}?puzzle=${code}`;        
        document.getElementById("choice-screen").style.display = "none";
        document.getElementById("game").style.display = "block";
        document.getElementById("share-section").style.display = "flex";
        renderPyramid();

        showBack(() => {
            document.getElementById("game").style.display = "none";
            document.getElementById("choice-screen").style.display = "flex";
            resetGame();
            hideBack();
        });
    }

    // from library
    const fromLibrary = new URLSearchParams(window.location.search).get("from") === "library";
    
    showBack(() => {
        if (fromLibrary) {
            window.location.href = "library.html";
        } else {
            document.getElementById("game").style.display = "none";
            document.getElementById("choice-screen").style.display = "flex";
            resetGame();
            hideBack();
        }
    });


// event listeners
    document.getElementById("overlay-btn").addEventListener("click", () => {
        location.reload();
    });

    document.getElementById("overlay-home-btn").addEventListener("click", () => {
        document.getElementById("overlay").style.display = "none";
        document.getElementById("game").style.display = "none";
        document.getElementById("choice-screen").style.display = "flex";
        resetGame();
        hideBack();
    });

    document.getElementById("overlay-create-btn").addEventListener("click", () => {
        document.getElementById("overlay").style.display = "none";
        document.getElementById("game").style.display = "none";
        document.getElementById("setup-screen").style.display = "block";
        resetGame();
        showBack(() => {
            document.getElementById("setup-screen").style.display = "none";
            document.getElementById("choice-screen").style.display = "flex";
            hideBack();
        });
});

document.getElementById("clear-btn").addEventListener("click", () => {
    document.querySelectorAll(".tile.selected").forEach(tile => {
        tile.classList.remove("selected");
        [1,2,3,4,5].forEach(n => tile.classList.remove(`selected-${n}`));
    });
});

// hint logic
document.getElementById("hint-btn").addEventListener("click", () => {
    while (nextHintSize >= 3) {
    const category = puzzle.categories.find(c => c.words.length === nextHintSize);
    const freeTiles = [...document.querySelectorAll(".tile:not(.locked):not(.hinted)")]
        .filter(tile => category.words.includes(tile.textContent));
    if (freeTiles.length > 0) break;
    nextHintSize--;
    }

    if (nextHintSize < 3) {
        document.getElementById("hint-btn").disabled = true;
        document.getElementById("hint-btn").style.opacity = "0.4";
        return;
    }

    // find the category and pick a random tile from it
    const category = puzzle.categories.find(c => c.words.length === nextHintSize);
    const freeTiles = [...document.querySelectorAll(".tile:not(.locked):not(.hinted)")]
        .filter(tile => category.words.includes(tile.textContent));
    const hintTile = freeTiles[Math.floor(Math.random() * freeTiles.length)];

    // calculate where slot 1 of this row is
    const tileSpan = 12;
    const rowWidth = category.words.length * tileSpan;
    const rowStart = (COLS - rowWidth) / 2;
    const slot1Column = `${rowStart + 1} / ${rowStart + 1 + tileSpan}`;
    const slot1Row = String(category.words.length);

    // find whatever tile is currently sitting in slot 1
    const allTiles = [...document.querySelectorAll(".tile:not(.locked):not(.hinted)")];
    const tileInSlot1 = allTiles.find(t => 
        t.style.gridColumn === slot1Column && 
        t.style.gridRow === slot1Row
    );

    // save the hint tile's current position before moving it
    const hintTileOldColumn = hintTile.style.gridColumn;
    const hintTileOldRow = hintTile.style.gridRow;

    // move hint tile to slot 1
    hintTile.classList.add("hinted");
    hintTile.style.gridColumn = slot1Column;
    hintTile.style.gridRow = slot1Row;
    hintTile.dataset.hintColor = category.color;
    hintTile.style.background = category.color; 
        

    // move the displaced tile into the hint tile's old position
    if (tileInSlot1 && tileInSlot1 !== hintTile) {
        tileInSlot1.style.gridColumn = hintTileOldColumn;
        tileInSlot1.style.gridRow = hintTileOldRow;
    }

    nextHintSize--;
    if (nextHintSize < 3) {
        document.getElementById("hint-btn").disabled = true;
        document.getElementById("hint-btn").style.opacity = "0.4";
    }
});

// start choice DAILY PÄIVÄN VUORI
document.getElementById("example-btn").addEventListener("click", async () => {
    // get daily also from home screen
    const today = new Date().toISOString().slice(0, 10);

    const { data: daily } = await supabaseClient
        .from("puzzles")
        .select("*")
        .eq("is_daily", true)
        .lte("daily_date", today)
        .order("daily_date", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (daily) {
        const colors = ["#2a9d8f", "#f4a261", "#e63946", "#457b9d"];
        puzzle.categories = daily.categories.map((c, i) => ({ ...c, color: colors[i] }));
        puzzle.lone_word = daily.lone_word;
        puzzle.lone_word_color = "#a8dadc";

        window.generatedShareUrl = `${window.location.origin}/index.html?puzzle=${daily.share_code}`;
        document.getElementById("share-section").style.display = "flex";
    }

    document.getElementById("choice-screen").style.display = "none";
    document.getElementById("game").style.display = "block";
    
    showBack(() => {  
        document.getElementById("game").style.display = "none";
        document.getElementById("choice-screen").style.display = "flex";
        resetGame();
        hideBack();
    });
    renderPyramid();
});

document.getElementById("custom-btn").addEventListener("click", () => {
    document.getElementById("choice-screen").style.display = "none";
    document.getElementById("setup-screen").style.display = "block";
    showBack(() => {
        document.getElementById("setup-screen").style.display = "none";
        document.getElementById("choice-screen").style.display = "flex";
        hideBack();
    });
});

// submit logic
const submitBtn = document.getElementById("check-btn");
submitBtn.addEventListener("click", () => {

    if (wrongGuesses >= MAX_GUESSES) return;

    const selected = [...document.querySelectorAll(".tile.selected")];
    const selectedWords = selected.map(t => t.textContent);

    console.log("selected:", selected.map(t => ({
    word: t.textContent,
    hinted: t.classList.contains("hinted"),
    locked: t.classList.contains("locked")
    })));

    if (selected.length === 0) {
        submitBtn.classList.add("shake");
        submitBtn.addEventListener("animationend", () => {
        submitBtn.classList.remove("shake");
        }, { once: true });

        setInstruction("Valitse vähintään yksi sana");

        return;
    } 

    const guessKey = [...selectedWords].sort().join(",");

    if (previousGuesses.includes(guessKey)) {
        setInstruction("Kokeilit tätä jo! 🤔");
        selected.forEach(tile => {
                tile.classList.add("shake");
                tile.addEventListener("animationend", () => {
                    tile.classList.remove("shake");
                }, { once: true });
            });
        return;
    }

    previousGuesses.push(guessKey);

    const match = puzzle.categories.find(category => 
        category.words.every(word => selectedWords.includes(word)) &&
        selectedWords.every(word => category.words.includes(word))
    );

    if (match) {
        setInstruction(`Hyvä!👍🏻`, 2000);

        selected.forEach(tile => {
            tile.remove();
        });
        
        createMergedBlock(match.label, match.words, match.color, match.words.length);

        setTimeout(() => {
            repositionRemaining();
            checkWin();
        }, 50);
    }
    if (!match) {
        const isLoneWord = selectedWords.length === 1 && selectedWords[0] === puzzle.lone_word;

        if (isLoneWord) {
            setInstruction(`Hyvä!👍🏻`, 2000);
            const tile = selected[0];
            tile.remove();

            createMergedBlock(puzzle.lone_word, [puzzle.lone_word], puzzle.lone_word_color, 1);

            repositionRemaining();
            checkWin();
        } else {
            // check if one away from any category
            const oneAway = puzzle.categories.find(category => {
                const matches = selectedWords.filter(w => category.words.includes(w)).length;
                const extras = selectedWords.filter(w => !category.words.includes(w)).length;
                console.log(category.label, "matches:", matches, "extras:", extras, "needed:", category.words.length - 1);
                return matches === category.words.length - 1 && extras === 1 && selectedWords.length === category.words.length;
            });
            console.log("oneAway:", oneAway);

            // check if all selected words belong to the same category but not enough
            // might be too easy, only add 1 more?
            const onTrack = puzzle.categories.find(category => {
                const matches = selectedWords.filter(w => category.words.includes(w)).length;
                const extras = selectedWords.filter(w => !category.words.includes(w)).length;
                return matches === selectedWords.length && extras === 0 && matches < category.words.length;
            });

            if (onTrack) {
                setInstruction(`Tarvitset ${onTrack.words.length - selectedWords.length} lisää!`);
            } else if (oneAway) {
                setInstruction("Yhden päässä...");
            } else {
                setInstruction("Ei🙁");
            }

            selected.forEach(tile => {
                tile.classList.add("shake");
                tile.addEventListener("animationend", () => {
                tile.classList.remove("shake");
                }, {once: true});
            });

            wrongGuesses++;
            document.getElementById(`dot${wrongGuesses}`).textContent = "";

            if (wrongGuesses >= MAX_GUESSES) {
                console.log("game over triggered");
                setTimeout(() => revealAndGameOver(), 400);
            }
        };
    }
})

// custom words validation
// STEP 1 — validate and generate link
document.getElementById("generate-btn").addEventListener("click", async () => {
    const requiredSizes = [5, 4, 3, 2];
    const labelInputs = [...document.querySelectorAll(".category-label")];
    const loneWord = document.getElementById("lone-word-input").value.trim();

    const chipRows = [...document.querySelectorAll(".chip-row")];
    const categories = labelInputs.map((labelInput, i) => {
        const label = labelInput.value.trim();
        const words = [...chipRows[i].querySelectorAll(".chip-input")]
            .map(input => input.value.trim())
            .filter(w => w.length > 0);
        return { label, words, size: requiredSizes[i] };
    });

    const validationMsg = document.getElementById("validation-msg");
    validationMsg.style.display = "none";

    const emptyLabel = categories.find(c => c.label === "");
    if (emptyLabel) {
        validationMsg.textContent = "Täytä kaikki kategoriat";
        validationMsg.style.display = "block";
        return;
    }
    const wrongCount = categories.find(c => c.words.length !== c.size);
    if (wrongCount) {
        validationMsg.textContent = `"${wrongCount.label}" tarvitsee tasan ${wrongCount.size} sanaa`;
        validationMsg.style.display = "block";
        return;
    }
    if (!loneWord) {
        validationMsg.textContent = "Lisää yksittäinen sana";
        validationMsg.style.display = "block";
        return;
    }
    const allWords = [...categories.flatMap(c => c.words), loneWord];
    if (new Set(allWords).size !== allWords.length) {
        validationMsg.textContent = "Kaikkien sanojen täytyy olla eri";
        validationMsg.style.display = "block";
        return;
    }

    // build puzzle object
    const colors = ["#2a9d8f", "#f4a261", "#e63946", "#457b9d"];
    puzzle.categories = categories.map((c, i) => ({
        label: c.label,
        words: c.words,
        color: colors[i]
    }));
    puzzle.lone_word = loneWord;
    puzzle.lone_word_color = "#a8dadc";

    // share code
    const shareCode = await savePuzzle();
    console.log("shareCode:", shareCode);
    if (shareCode) {
        console.log("inside shareCode block");
        const shareUrl = `${window.location.origin}${window.location.pathname}?puzzle=${shareCode}`;
        window.generatedShareUrl = shareUrl;
        console.log("generatedShareUrl:", window.generatedShareUrl);
        console.log("set to:", window.generatedShareUrl);
    }

    document.getElementById("share-section").style.display = "flex";

    document.getElementById("setup-screen").style.display = "none";
    document.getElementById("game").style.display = "block";

    showBack(() => {                                          // ADDED
        document.getElementById("game").style.display = "none";
        document.getElementById("choice-screen").style.display = "flex";
        resetGame();
        hideBack();
    });

    renderPyramid();
});
    // copy button
    document.getElementById("copy-btn").addEventListener("click", () => {
        console.log("generatedShareUrl:", window.generatedShareUrl);
        navigator.clipboard.writeText(window.generatedShareUrl).then(() => {
            document.getElementById("copy-btn").textContent = "Kopioitu!✅";
            setTimeout(() => {
                document.getElementById("copy-btn").textContent = "Jaa 🔗";
            }, 3000);
        });
    });

document.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        document.getElementById("check-btn").click();
    }
});

function showBack(fn) {
    const btn = document.getElementById("back-btn");
    btn.style.visibility = "visible";
    btn.onclick = fn;
}

function hideBack() {
    document.getElementById("back-btn").style.visibility = "hidden";
}

document.getElementById("overlay-view-btn").addEventListener("click", () => {
    document.getElementById("overlay").style.display = "none";
});

}); // end of DOMContentLoaded

// pyramid creation
function renderPyramid() {
    shuffledWords = [];
    const pyramid = document.getElementById("pyramid");
    let words = [
        ...puzzle.categories.flatMap(category => category.words),
        puzzle.lone_word
    ];

    while (words.length > 0) {
        let randomIndex = Math.floor(Math.random() * words.length);
        shuffledWords.push(words[randomIndex]);
        words.splice(randomIndex, 1);
    }

    const rowSizes = [1, 2, 3, 4, 5];
    shuffledWords.forEach((word, index) => {
        const newTile = document.createElement("div");
        newTile.textContent = word;
        newTile.classList.add("tile");

        let count = 0;
        for (let i = 0; i < rowSizes.length; i++) {
            count+= rowSizes[i];
            if (index < count) {
                const positionInRow = index - (count - rowSizes[i]);
                const tileSpan = 12;
                const rowWidth = rowSizes[i] * tileSpan;
                const rowStart = (COLS - rowWidth) / 2;
                const start = rowStart + (positionInRow * tileSpan) + 1;
                newTile.style.gridColumn = `${start} / ${start + tileSpan}`;
                newTile.style.gridRow = i + 1;
                break;
            }
        }
        newTile.addEventListener("click", () => {
            const currentlySelected = document.querySelectorAll(".tile.selected").length;
            if (!newTile.classList.contains("selected") && currentlySelected >= 5) return;

            newTile.classList.toggle("selected");
            updateSelectionColors();
        })
        pyramid.appendChild(newTile);
    })
}

function updateSelectionColors() {
    const selected = [...document.querySelectorAll(".tile.selected")];
    const count = selected.length;

    document.querySelectorAll(".tile").forEach(tile => {
        [1,2,3,4,5].forEach(n => tile.classList.remove(`selected-${n}`));

        if (tile.classList.contains("hinted") && !tile.classList.contains("selected")) {
        tile.style.background = tile.dataset.hintColor;
        }
    });

    selected.forEach(tile => {
    tile.classList.add(`selected-${count}`);
    if (tile.classList.contains("hinted")) {
        tile.style.background = "";
    }
    });
}

function repositionRemaining() {
    const freeTiles = [...document.querySelectorAll(".tile:not(.locked):not(.hinted)")];
    const lockedRows = new Set(
        [...document.querySelectorAll(".tile.locked"),
        ...document.querySelectorAll(".merged-block")
        ].map(t => t.style.gridRow)
    );

    const freeRows = [1,2,3,4,5].filter(r => !lockedRows.has(String(r)));
    const rowSizes = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 };

    const hintedCount = document.querySelectorAll(".tile.hinted").length;
    const expectedTiles = freeRows.reduce((sum, r) => sum + rowSizes[r], 0) - hintedCount;


    if (freeTiles.length !== expectedTiles) {
        console.log("BAILED OUT — counts don't match");
        return;
    }
        

    let tileIndex = 0;

    freeRows.forEach(row => {
        const size = rowSizes[row];
        const tileSpan = 12;
        const rowWidth = size * tileSpan;
        const rowStart = (COLS - rowWidth) / 2;

        // check if slot 1 of this row is taken by a hinted tile
        const slot1Column = `${rowStart + 1} / ${rowStart + 1 + tileSpan}`;
        const slot1Hinted = [...document.querySelectorAll(".tile.hinted")]
            .some(t => t.style.gridRow === String(row) && t.style.gridColumn === slot1Column);

        // start from slot 2 if slot 1 is hinted, slot 1 otherwise
        const startSlot = slot1Hinted ? 1 : 0;

        for (let i = startSlot; i < size; i++) {
            if (tileIndex >= freeTiles.length) break;
            const tile = freeTiles[tileIndex++];
            const start = rowStart + (i * tileSpan) + 1;
            tile.style.gridColumn = `${start} / ${start + tileSpan}`;
            tile.style.gridRow = row;
        }
    })
}

// changing instructions
function setInstruction(text, duration = 2000) {
    const el = document.getElementById("instruction");
    el.textContent = text;
    clearTimeout(window.instructionTimeout);
    window.instructionTimeout = setTimeout(() => {
        el.textContent = "Valitse yhteenkuuluvat sanat";
    }, duration);
}

function checkWin() {
    const remaining = document.querySelectorAll(".tile:not(.locked):not(.hinted)");
    const hinted = document.querySelectorAll(".tile.hinted");
    if (remaining.length === 0 && hinted.length === 0) {
        setTimeout(() => showOverlay("Ratkaistu! 🎉", "Oletko sinä se sanavelho?🧙🏼‍♂️"), 500);
        // here create your own button?
    }
}

function revealAndGameOver() {
    // remove all unlocked tiles
    document.querySelectorAll(".tile:not(.locked)").forEach(tile => tile.remove());

    // create merged blocks for each unsolved category
    puzzle.categories.forEach(category => {
        const alreadySolved = document.querySelector(`.merged-block[style*="grid-row: ${category.words.length}"]`);
        if (!alreadySolved) {
            createMergedBlock(category.label, category.words, category.color, category.words.length);
        }
    });

    // create lone word block if not already solved
    const loneAlreadySolved = document.querySelector(`.merged-block[style*="grid-row: 1"]`);
    if (!loneAlreadySolved) {
        createMergedBlock(puzzle.lone_word, [puzzle.lone_word], puzzle.lone_word_color, 1);
    }

    setTimeout(() => showOverlay("Peli ohi😔", "Seuraavalla kerralla onnistuu!🫡"), 600);
}

function showOverlay(title, message) {
    document.getElementById("overlay-title").textContent = title;
    document.getElementById("overlay-message").textContent = message;
    document.getElementById("overlay").style.display = "flex";
}

// creating a merged block
function createMergedBlock(label, words, color, gridRow) {
    const tileSpan = 12;
    const rowWidth = words.length * tileSpan;
    const rowStart = (COLS - rowWidth) / 2;

    const mergedBlock = document.createElement("div");
    mergedBlock.classList.add("locked", "merged-block");
    mergedBlock.style.gridColumn = `${rowStart + 1} / ${rowStart + 1 + rowWidth}`;
    mergedBlock.style.gridRow = gridRow;
    mergedBlock.style.background = color;
    mergedBlock.innerHTML = words.length > 1
        ? `<span class="merged-label">${label}</span><span class="merged-words">${words.join(", ")}</span>`
        : `<span class="merged-label">${label}</span>`;

    document.getElementById("pyramid").appendChild(mergedBlock);
    return mergedBlock;
}

function resetGame() {
    // restore default
    puzzle.categories = JSON.parse(JSON.stringify(defaultPuzzle.categories));
    puzzle.lone_word = defaultPuzzle.lone_word;
    puzzle.lone_word_color = defaultPuzzle.lone_word_color;

    shuffledWords = [];
    wrongGuesses = 0;
    nextHintSize = 5;
    previousGuesses = [];
    document.getElementById("pyramid").innerHTML = "";
    [1,2,3,4].forEach(n => {
        const dot = document.getElementById(`dot${n}`);
        if (dot) dot.textContent = "❤️";
    });
    document.getElementById("hint-btn").disabled = false;
    document.getElementById("hint-btn").style.opacity = "1";
    document.getElementById("share-section").style.display = "none";
}

// generate share code
function generateShareCode() {
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, "");  // "20240315"
    const time = now.getTime().toString(36);  // base36 of milliseconds, e.g. "lxk2f3"
    return `${date}-${time}`;  // "20240315-lxk2f3"
}

// save puzzle function
async function savePuzzle() {
    const shareCode = generateShareCode();
    const nameInput = document.getElementById("puzzle-name-input").value.trim();
    const isPublic = document.getElementById("is-public-toggle").checked;

    const defaultName = puzzle.categories.map(c => c.label).join(" • ");
    const name = nameInput || defaultName;
    
    const { data, error } = await supabaseClient
        .from("puzzles")
        .insert({
            share_code: shareCode,
            categories: puzzle.categories.map(c => ({ label: c.label, words: c.words })),
            lone_word: puzzle.lone_word,
            name: name,
            is_public: isPublic,
            is_daily: false,
            daily_date: null
        })
        .select();  // returns the saved record
    
    if (error) {
        console.error("Error saving puzzle:", error);
        return null;
    }
    
    console.log("Saved puzzle:", data);
    return shareCode;
}

// loading msg texts
const loadingMessages = [
    "Valmistellaan peliä...",
    "Ladataan kategorioita...",
    "Sekoitetaan sanoja...",
    "Kohta valmista...",
    "Valitsemassa värejä...",
    "Keksimässä hyviä vihjeita...",
    "❤️❤️❤️❤️",
    "KyLlä mUn MiEleStÄ jOo..",
    "Aika siisti peli eiks je?",
    "Teroitetaan kyniä...",
    "Plärätään sanakirjaa...",
    "Piilotetaan helpot...",
    "Tehdään vaikeammaksi...",
    "Konsultoidaan sanavelhoa...",
    "Varastetaan sanoja kirjastosta...",
    "Aakkosjärjestys, eiku ei...",
    "Säädetään vaikeustasoa...",
    "Melkein valmista, ehkä...",
    "Kysymässä äidiltä apua...",
    "Mom is typing..."
];

let messageInterval;
let lastIndex = -1;

function startLoadingMessages() {
    const el = document.getElementById("loading-text");
    const randomIndex = Math.floor(Math.random() * loadingMessages.length);
    lastIndex = randomIndex;
    el.textContent = loadingMessages[randomIndex];
    el.style.opacity = "1";

    messageInterval = setInterval(() => {
        // fade out
        el.style.opacity = "0";

        // wait for fade out, then change text and fade in
        setTimeout(() => {
            let randomIndex;
            do {
                randomIndex = Math.floor(Math.random() * loadingMessages.length);
            } while (randomIndex === lastIndex);
            lastIndex = randomIndex;
            el.textContent = loadingMessages[randomIndex];
            el.style.opacity = "1";
        }, 400);  // pause between fade out and fade in

    }, 1000);  // change every 2 seconds
}

function stopLoadingMessages() {
    clearInterval(messageInterval);
}
