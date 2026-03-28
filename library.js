// database connection
const supabaseUrl = "https://golunduallnunwyvnpyb.supabase.co"; 
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvbHVuZHVhbGxudW53eXZucHliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMDA1MzYsImV4cCI6MjA4OTg3NjUzNn0.AFiEhAmiflXXb1AFLjcXAMMzRu8wgtCvZMcpdgbfgl4"; 
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

const CACHE_KEY = "library_cache";

async function loadLibrary() {
    // cached data if available
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
        renderLibrary(JSON.parse(cached));
    }

    const today = new Date().toISOString().slice(0, 10);

    const [dailyResult, { data: community }] = await Promise.all([
        supabaseClient.from("puzzles").select("*").eq("is_daily", true).lte("daily_date", today).order("daily_date", { ascending: false }).limit(1).maybeSingle(),
        supabaseClient.from("puzzles").select("*").eq("is_public", true).order("created_at", { ascending: false })
    ]);

    const daily = dailyResult?.data;

    const freshData = { daily, community };
    
    // update cache
    localStorage.setItem(CACHE_KEY, JSON.stringify(freshData));
    
    // re-render with fresh data
    renderLibrary(freshData);
}

function renderLibrary({ daily, community }) {
    if (daily) {
        document.getElementById("daily-puzzle").innerHTML = `
            <div class="puzzle-card" onclick="playPuzzle('${daily.share_code}')">
                <h3>${daily.name}</h3>
            </div>
        `;
    } else {
        document.getElementById("daily-puzzle").innerHTML = `<p class="empty">No puzzle of the day yet</p>`;
    }

    if (community && community.length > 0) {
        document.getElementById("community-puzzles").innerHTML = community.map(p => `
            <div class="puzzle-card" onclick="playPuzzle('${p.share_code}')">
                <h3>${p.name}</h3>
            </div>
        `).join("");
    } else {
        document.getElementById("community-puzzles").innerHTML = `<p class="empty">No community puzzles yet</p>`;
    }
}

function playPuzzle(shareCode) {
    window.location.href = `index.html?puzzle=${shareCode}&from=library`;
}

loadLibrary();