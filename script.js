// puzzle
const puzzle = {
    categories: [
        {label: "animals", words: ["dog",  "cat", "mouse", "turtle", "lizard"], color: "#2a9d8f" },
        {label: "drinks", words: ["soda",  "coffee", "tea", "water"], color: "#f4a261" },
        {label: "waves", words: ["slab",  "a-frame", "mushy"], color: "#e63946" },
        {label: "plants", words: ["cactus",  "palm tree"], color: "#457b9d" },
    ],
    lone_word: "alien",
    lone_word_color: "#a8dadc"
}

// global variables
let shuffledWords = [];
const COLS = 60;

// pyramid creation
function renderPyramid() {
    const pyramid = document.getElementById("pyramid");
    let words = [
        ...puzzle.categories.flatMap(category => category.words),
        puzzle.lone_word
    ];

    console.log(`WORDS: ${words}`)

    while (words.length > 0) {
        let randomIndex = Math.floor(Math.random() * words.length);
        shuffledWords.push(words[randomIndex]);
        words.splice(randomIndex, 1);
    }
    console.log(`SHUFFLED words: ${shuffledWords}`)

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
                console.log(`COUNT: ${count} rowSizes[i]: ${rowSizes[i]} START: ${start}`)
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
    })
}

function updateSelectionColors() {
    const selected = [...document.querySelectorAll(".tile.selected")];
    const count = selected.length;

    document.querySelectorAll(".tile").forEach(tile => {
    [1,2,3,4,5].forEach(n => tile.classList.remove(`selected-${n}`));
    });

    selected.forEach(tile => {
    tile.classList.add(`selected-${count}`);
    });
}

console.log(renderPyramid());

// submit logic
const submitBtn = document.getElementById("submit-btn");
submitBtn.addEventListener("click", () => {
    const selected = [...document.querySelectorAll(".tile.selected")];
    const selectedWords = selected.map(t => t.textContent);

    if (selected.length === 0) {
        submitBtn.classList.add("shake");
        submitBtn.addEventListener("animationend", () => {
        submitBtn.classList.remove("shake");
        }, { once: true });
        return;
    } 

    const match = puzzle.categories.find(category => 
        category.words.every(word => selectedWords.includes(word)) &&
        selectedWords.every(word => category.words.includes(word))
    );

    if (match) {
        selected.forEach((tile, i) => {
            const tileSpan = 12;
            const rowWidth = match.words.length * tileSpan;
            const rowStart = (COLS - rowWidth) / 2;
            const start = rowStart + (i * tileSpan) + 1;

            setTimeout(() => {
            tile.style.gridColumn = `${start} / ${start + tileSpan}`;
            tile.style.gridRow = match.words.length;
            tile.style.background = match.color;
            }, 10);

            tile.style.gridColumn = `${start} / ${start + tileSpan}`;
            tile.style.gridRow = match.words.length;
            tile.style.background = match.color;

            tile.classList.remove("selected");
            tile.classList.add("locked");
            tile.style.pointerEvents = "none";
        });
        setTimeout(() => {
            repositionRemaining();
            checkWin();
        }, 50);
    }
    if (!match) {
        const isLoneWord = selectedWords.length === 1 && selectedWords[0] === puzzle.lone_word;

        if (isLoneWord) {
            const tile = selected[0];
            const tileSpan = 12;
            const rowStart = (COLS - tileSpan) / 2;
            const start = rowStart + 1;
            tile.style.gridColumn = `${start} / ${start + tileSpan}`;
            tile.style.gridRow = 1;
            tile.style.background = puzzle.lone_word_color;

            tile.classList.remove("selected");
            tile.classList.add("locked");
            tile.style.pointerEvents = "none";

            repositionRemaining();
        } else {
            selected.forEach(tile => {
                tile.classList.add("shake");
                tile.addEventListener("animationend", () => {
                tile.classList.remove("shake");
                }, {once: true});
            })
        }
    }
})

function repositionRemaining() {
    const freeTiles = [...document.querySelectorAll(".tile:not(.locked)")];
    const lockedRows = new Set(
        [...document.querySelectorAll(".tile.locked")]
        .map(t => t.style.gridRow)
    );
    const freeRows = [1,2,3,4,5].filter(r => !lockedRows.has(String(r)));

    const rowSizes = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 };
    let tileIndex = 0;

    freeRows.forEach(row => {
        const size = rowSizes[row];
        const tileSpan = 12;
        const rowWidth = size * tileSpan;
        const rowStart = (COLS - rowWidth) / 2;

        for (let i = 0; i < size; i++) {
            if (tileIndex >= freeTiles.length) break;
            const tile = freeTiles[tileIndex++];
            const start = rowStart + (i * tileSpan) + 1;
            tile.style.gridColumn = `${start} / ${start + tileSpan}`;
            tile.style.gridRow = row;
        }
    })
}

function checkWin() {
    const remaining = document.querySelectorAll(".tile:not(.locked)");
    if (remaining.length === 0) {
        setTimeout(() => showOverlay("You solved it! 🎉", "nice work!"), 500);
    }
}

function showOverlay(title, message) {
    document.getElementById("overlay-title").textContent = title;
    document.getElementById("overlay-message").textContent = message;
    document.getElementById("overlay").style.display = "flex";
}

document.getElementById("overlay-btn").addEventListener("click", () => {
    location.reload();
});