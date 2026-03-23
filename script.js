// puzzle
const puzzle = {
    categories: [
        {label: "suu", words: ["nuolee",  "pussaa", "kuolaa", "viheltää", "röyhtäisee"], color: "#2a9d8f" },
        {label: "silmät", words: ["kostuu",  "itkee", "siristää", "näkee"], color: "#f4a261" },
        {label: "nenä", words: ["haistaa",  "nyrpistää", "tuhahtaa"], color: "#e63946" },
        {label: "korvat", words: ["kuulee",  "punastuu"], color: "#457b9d" },
    ],
    lone_word: "aistii",
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
function loadFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get("puzzle");
    console.log("encoded:", encoded);
    if (!encoded) return false;

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


document.addEventListener("DOMContentLoaded", () => {
    hideBack();
    const loadedFromUrl = loadFromUrl();
    console.log("loadedFromUrl:", loadedFromUrl); 
    if (loadedFromUrl) {
        console.log("choice screen display:", document.getElementById("choice-screen").style.display);
        console.log("rendering game from URL");  // ADD THIS
        document.getElementById("choice-screen").style.display = "none";
        console.log("choice screen after:", document.getElementById("choice-screen").style.display);
        document.getElementById("game").style.display = "block";
        console.log("game display:", document.getElementById("game").style.display); // ADD
        renderPyramid();
        console.log("tiles in pyramid:", document.querySelectorAll(".tile").length);

        showBack(() => {
            document.getElementById("game").style.display = "none";
            document.getElementById("choice-screen").style.display = "flex";
            resetGame();
            hideBack();
        });
    }


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

// start choice
document.getElementById("example-btn").addEventListener("click", () => {
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

        setInstruction("Select at least one word");

        return;
    } 

    const guessKey = [...selectedWords].sort().join(",");

    if (previousGuesses.includes(guessKey)) {
        setInstruction("You already tried this! 🤔");
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
        setInstruction(`Nice one!👍🏻`, 2000);

        selected.forEach(tile => {
            tile.remove();
        });

        // create the merged block
        const tileSpan = 12;
        const rowWidth = match.words.length * tileSpan;
        const rowStart = (COLS - rowWidth) / 2;

        const mergedBlock = document.createElement("div");
        mergedBlock.classList.add("locked", "merged-block");
        mergedBlock.style.gridColumn = `${rowStart + 1} / ${rowStart + 1 + rowWidth}`;
        mergedBlock.style.gridRow = match.words.length;
        mergedBlock.style.background = match.color;

        // label on top, words below
        mergedBlock.innerHTML = `
            <span class="merged-label">${match.label}</span>
            <span class="merged-words">${match.words.join(", ")}</span>
        `;

        document.getElementById("pyramid").appendChild(mergedBlock);

        setTimeout(() => {
            repositionRemaining();
            checkWin();
        }, 50);
    }
    if (!match) {
        const isLoneWord = selectedWords.length === 1 && selectedWords[0] === puzzle.lone_word;

        if (isLoneWord) {
            setInstruction(`Nice one!👍🏻`, 2000);
            const tile = selected[0];
            tile.remove();
            const tileSpan = 12;
            const rowStart = (COLS - tileSpan) / 2;

            const mergedBlock = document.createElement("div");
            mergedBlock.classList.add("locked", "merged-block");
            mergedBlock.style.gridColumn = `${rowStart + 1} / ${rowStart + 1 + tileSpan}`;
            mergedBlock.style.gridRow = 1;
            mergedBlock.style.background = puzzle.lone_word_color;
            mergedBlock.innerHTML = `
                <span class="merged-label">${puzzle.lone_word}</span>
            `;

            document.getElementById("pyramid").appendChild(mergedBlock);
            repositionRemaining();
            checkWin();
        } else {
            // check if one away from any category
            const oneAway = puzzle.categories.find(category => {
                const matches = selectedWords.filter(w => category.words.includes(w)).length;
                const extras = selectedWords.filter(w => !category.words.includes(w)).length;
                console.log(category.label, "matches:", matches, "extras:", extras, "needed:", category.words.length - 1);
                return matches === category.words.length - 1 && extras === 1;
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
                setInstruction(`Need ${onTrack.words.length - selectedWords.length} more!`);
            } else if (oneAway) {
                setInstruction("One away...");
            } else {
                setInstruction("Nope🙂‍↔️");
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
document.getElementById("generate-btn").addEventListener("click", () => {
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
        validationMsg.textContent = "All category labels must be filled in";
        validationMsg.style.display = "block";
        return;
    }
    const wrongCount = categories.find(c => c.words.length !== c.size);
    if (wrongCount) {
        validationMsg.textContent = `"${wrongCount.label}" needs exactly ${wrongCount.size} words`;
        validationMsg.style.display = "block";
        return;
    }
    if (!loneWord) {
        validationMsg.textContent = "Please enter a lone word";
        validationMsg.style.display = "block";
        return;
    }
    const allWords = [...categories.flatMap(c => c.words), loneWord];
    if (new Set(allWords).size !== allWords.length) {
        validationMsg.textContent = "All words must be unique";
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

    // generate link
    const encoded = btoa(JSON.stringify({
        categories: puzzle.categories,
        lone_word: puzzle.lone_word,
        lone_word_color: puzzle.lone_word_color
    }));
    const shareUrl = `${window.location.origin}${window.location.pathname}?puzzle=${encoded}`;
    window.generatedShareUrl = shareUrl; 

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
    navigator.clipboard.writeText(window.generatedShareUrl).then(() => {
        document.getElementById("copy-btn").textContent = "Copied!✅";
        setTimeout(() => {
            document.getElementById("copy-btn").textContent = "Share Puzzle 🔗";
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
    console.log("renderPyramid called, puzzle:", puzzle);
    const pyramid = document.getElementById("pyramid");
    console.log("pyramid:", pyramid);  // is this null?
    console.log("game display:", document.getElementById("game").style.display); 
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
            newTile.classList.toggle("selected");
            updateSelectionColors();
        })
        pyramid.appendChild(newTile);
        console.log("appending tile:", word);
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

    console.log("--- repositionRemaining ---");
    console.log("freeTiles:", freeTiles.length, freeTiles.map(t => t.textContent));
    console.log("lockedRows:", [...lockedRows]);
    console.log("freeRows:", freeRows);
    console.log("expectedTiles:", expectedTiles);
    console.log("match?", freeTiles.length === expectedTiles);

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
        el.textContent = "Select words that belong together";
    }, duration);
}

function checkWin() {
    const remaining = document.querySelectorAll(".tile:not(.locked):not(.hinted)");
    const hinted = document.querySelectorAll(".tile.hinted");
    if (remaining.length === 0 && hinted.length === 0) {
        setTimeout(() => showOverlay("You solved it! 🎉"), 500);
        // here create your own button?
    }
}

function revealAndGameOver() {
    document.querySelectorAll(".tile:not(.locked)").forEach(tile => {
        const word = tile.textContent;
        const category = puzzle.categories.find(c => c.words.includes(word));

    if (category) {
        const tileSpan = 12;
        const rowWidth = category.words.length * tileSpan;
        const rowStart = (COLS - rowWidth) / 2;
        const positionInCategory = category.words.indexOf(word);
        const start = rowStart + (positionInCategory * tileSpan) + 1;

        setTimeout(() => {
            tile.style.gridColumn = `${start} / ${start + tileSpan}`;
            tile.style.gridRow = category.words.length;
            tile.style.background = category.color;
        }, 10);

        tile.classList.add("locked");
        tile.style.pointerEvents = "none";
    } else {
        const tileSpan = 12;
        const rowStart = (COLS - tileSpan) / 2;
        const start = rowStart + 1;

        setTimeout(() => {
            tile.style.gridColumn = `${start} / ${start + tileSpan}`;
            tile.style.gridRow = 1;
            tile.style.background = puzzle.lone_word_color;
        }, 10);

        tile.classList.add("locked");
        tile.style.pointerEvents = "none";
    }   
    });

    setTimeout(() => showOverlay("Game Over 😔"), 600);
}

function showOverlay(title, message) {
    document.getElementById("overlay-title").textContent = title;
    document.getElementById("overlay-message").textContent = message;
    document.getElementById("overlay").style.display = "flex";
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
