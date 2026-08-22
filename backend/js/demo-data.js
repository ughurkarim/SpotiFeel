const ART_PALETTES = [
  ["#101a38", "#7c5cff", "#ef9a76"],
  ["#182725", "#72c7ad", "#f1cf8f"],
  ["#25172d", "#c171bb", "#f0a85f"],
  ["#17222c", "#6f9fca", "#e5c3ae"],
  ["#311a25", "#d27a8e", "#f1bf7d"],
  ["#152127", "#4ba49c", "#d7d18d"],
  ["#211b36", "#8a79c7", "#e68f96"],
  ["#252417", "#a6a758", "#e6ba7d"],
];

function escapeSvg(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
  })[character]);
}

function initials(value) {
  return String(value)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function demoArtwork(label, paletteIndex = 0, kind = "album") {
  const [base, accent, highlight] = ART_PALETTES[paletteIndex % ART_PALETTES.length];
  const safeLabel = escapeSvg(label);
  const mark = escapeSvg(initials(label));
  const shape = kind === "artist"
    ? '<circle cx="300" cy="278" r="152" fill="url(#g)"/><circle cx="300" cy="278" r="112" fill="none" stroke="rgba(255,255,255,.22)" stroke-width="2"/>'
    : '<path d="M44 420C125 226 228 493 330 236S506 109 574 46V600H44Z" fill="url(#g)"/><circle cx="448" cy="150" r="88" fill="none" stroke="rgba(255,255,255,.24)" stroke-width="2"/>';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${accent}"/><stop offset="1" stop-color="${highlight}"/></linearGradient></defs>
    <rect width="600" height="600" fill="${base}"/>
    <path d="M0 115L600 0v185L0 300Z" fill="${accent}" opacity=".18"/>
    ${shape}
    <text x="42" y="76" fill="rgba(255,255,255,.72)" font-family="Arial,sans-serif" font-size="18" letter-spacing="5">SPOTIFEEL DEMO</text>
    <text x="42" y="536" fill="#fff" font-family="Georgia,serif" font-size="58" font-weight="700">${mark}</text>
    <text x="42" y="570" fill="rgba(255,255,255,.72)" font-family="Arial,sans-serif" font-size="17" letter-spacing="2">${safeLabel.slice(0, 36)}</text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function slug(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function spotifySearchUrl(track, artist) {
  return `https://open.spotify.com/search/${encodeURIComponent(`${track} ${artist}`)}`;
}

function makeTrack(id, name, artist, album, year, durationMs, paletteIndex, popularity = 70) {
  const artistId = `demo-artist-${slug(artist)}`;
  const imageUrl = demoArtwork(album, paletteIndex);
  return {
    id: `demo-track-${id}`,
    uri: `spotify:track:demo-${id}`,
    name,
    artists: [{ id: artistId, name: artist }],
    album: {
      id: `demo-album-${slug(album)}`,
      name: album,
      release_date: `${year}-01-01`,
      images: [{ url: imageUrl, width: 600, height: 600 }],
    },
    image_url: imageUrl,
    duration_ms: durationMs,
    explicit: false,
    popularity,
    release_year: year,
    external_urls: { spotify: spotifySearchUrl(name, artist) },
  };
}

const TRACK_LIST = [
  makeTrack("billie-jean", "Billie Jean", "Michael Jackson", "Thriller", 1982, 294000, 4, 96),
  makeTrack("thriller", "Thriller", "Michael Jackson", "Thriller", 1982, 358000, 4, 94),
  makeTrack("beat-it", "Beat It", "Michael Jackson", "Thriller", 1982, 258000, 4, 93),
  makeTrack("pyt", "P.Y.T. (Pretty Young Thing)", "Michael Jackson", "Thriller", 1982, 239000, 4, 90),
  makeTrack("wanna-be-startin", "Wanna Be Startin' Somethin'", "Michael Jackson", "Thriller", 1982, 363000, 4, 91),
  makeTrack("smooth-criminal", "Smooth Criminal", "Michael Jackson", "Bad", 1987, 257000, 0, 93),
  makeTrack("man-in-mirror", "Man in the Mirror", "Michael Jackson", "Bad", 1987, 319000, 0, 91),
  makeTrack("way-you-make", "The Way You Make Me Feel", "Michael Jackson", "Bad", 1987, 298000, 0, 90),
  makeTrack("human-nature", "Human Nature", "Michael Jackson", "Thriller", 1982, 247000, 4, 89),
  makeTrack("dont-stop-til", "Don't Stop 'Til You Get Enough", "Michael Jackson", "Off the Wall", 1979, 365000, 2, 92),
  makeTrack("rock-with-you", "Rock with You", "Michael Jackson", "Off the Wall", 1979, 221000, 2, 92),
  makeTrack("black-or-white", "Black or White", "Michael Jackson", "Dangerous", 1991, 256000, 3, 90),
  makeTrack("dont-stop-me-now", "Don't Stop Me Now", "Queen", "Jazz", 1978, 209000, 4, 94),
  makeTrack("dreams", "Dreams", "Fleetwood Mac", "Rumours", 1977, 257000, 7, 93),
  makeTrack("september", "September", "Earth, Wind & Fire", "The Best of Earth, Wind & Fire, Vol. 1", 1978, 215000, 5, 94),
  makeTrack("superstition", "Superstition", "Stevie Wonder", "Talking Book", 1972, 246000, 6, 93),
  makeTrack("purple-rain", "Purple Rain", "Prince", "Purple Rain", 1984, 521000, 6, 94),
  makeTrack("dancing-queen", "Dancing Queen", "ABBA", "Arrival", 1976, 231000, 2, 94),
  makeTrack("i-wanna-dance", "I Wanna Dance with Somebody", "Whitney Houston", "Whitney", 1987, 291000, 4, 94),
  makeTrack("heroes", "Heroes", "David Bowie", "Heroes", 1977, 371000, 0, 90),
  makeTrack("here-comes-sun", "Here Comes the Sun", "The Beatles", "Abbey Road", 1969, 185000, 7, 95),
  makeTrack("tiny-dancer", "Tiny Dancer", "Elton John", "Madman Across the Water", 1971, 377000, 3, 91),
  makeTrack("you-make-my-dreams", "You Make My Dreams", "Daryl Hall & John Oates", "Voices", 1980, 190000, 1, 91),
  makeTrack("africa", "Africa", "TOTO", "Toto IV", 1982, 296000, 5, 94),
  makeTrack("everybody-wants", "Everybody Wants to Rule the World", "Tears for Fears", "Songs from the Big Chair", 1985, 251000, 1, 94),
  makeTrack("take-on-me", "Take on Me", "a-ha", "Hunting High and Low", 1985, 225000, 0, 94),
  makeTrack("dont-stop-believin", "Don't Stop Believin'", "Journey", "Escape", 1981, 251000, 4, 94),
  makeTrack("aint-no-mountain", "Ain't No Mountain High Enough", "Marvin Gaye & Tammi Terrell", "United", 1967, 151000, 5, 92),
  makeTrack("le-freak", "Le Freak", "CHIC", "C'est Chic", 1978, 330000, 2, 90),
  makeTrack("lets-groove", "Let's Groove", "Earth, Wind & Fire", "Raise!", 1981, 339000, 5, 92),
  makeTrack("good-times", "Good Times", "CHIC", "Risqué", 1979, 508000, 2, 90),
  makeTrack("be-my-baby", "Be My Baby", "The Ronettes", "Presenting the Fabulous Ronettes", 1963, 161000, 4, 76),
  makeTrack("gimme-shelter", "Gimme Shelter", "The Rolling Stones", "Let It Bleed", 1969, 271000, 7, 85),
  makeTrack("take-five", "Take Five", "The Dave Brubeck Quartet", "Time Out", 1959, 324000, 1, 77),
  makeTrack("favorite-things", "My Favorite Things", "John Coltrane", "My Favorite Things", 1961, 824000, 6, 69),
  makeTrack("enter-sandman", "Enter Sandman", "Metallica", "Metallica", 1991, 331000, 5, 87),
  makeTrack("trooper", "The Trooper", "Iron Maiden", "Piece of Mind", 1983, 252000, 7, 79),
  makeTrack("clair-de-lune", "Clair de Lune", "Claude Debussy", "Suite bergamasque", 1905, 300000, 3, 75),
  makeTrack("spring", "Spring", "Antonio Vivaldi", "The Four Seasons", 1725, 220000, 1, 72),
  makeTrack("one-more-time", "One More Time", "Daft Punk", "Discovery", 2000, 320000, 0, 92),
  makeTrack("levels", "Levels", "Avicii", "Levels", 2011, 203000, 2, 91),
  makeTrack("vogue", "Vogue", "Madonna", "I'm Breathless", 1990, 316000, 4, 91),
  makeTrack("wonderwall", "Wonderwall", "Oasis", "(What's the Story) Morning Glory?", 1995, 259000, 7, 93),
  makeTrack("i-want-it-that-way", "I Want It That Way", "Backstreet Boys", "Millennium", 1999, 213000, 1, 94),
  makeTrack("wannabe", "Wannabe", "Spice Girls", "Spice", 1996, 173000, 2, 92),
  makeTrack("juicy", "Juicy", "The Notorious B.I.G.", "Ready to Die", 1994, 303000, 6, 90),
  makeTrack("the-message", "The Message", "Grandmaster Flash & The Furious Five", "The Message", 1982, 431000, 7, 91),
  makeTrack("california-love", "California Love", "2Pac feat. Dr. Dre", "All Eyez on Me", 1996, 284000, 4, 93),
  makeTrack("lose-yourself", "Lose Yourself", "Eminem", "8 Mile", 2002, 326000, 5, 94),
  makeTrack("in-da-club", "In da Club", "50 Cent", "Get Rich or Die Tryin'", 2003, 193000, 6, 93),
  makeTrack("ms-jackson", "Ms. Jackson", "Outkast", "Stankonia", 2000, 270000, 2, 93),
  makeTrack("crazy-in-love", "Crazy in Love", "Beyoncé", "Dangerously in Love", 2003, 236000, 4, 94),
  makeTrack("hey-ya", "Hey Ya!", "Outkast", "Speakerboxxx/The Love Below", 2003, 235000, 5, 95),
  makeTrack("mr-brightside", "Mr. Brightside", "The Killers", "Hot Fuss", 2004, 223000, 7, 95),
  makeTrack("valerie", "Valerie", "Mark Ronson feat. Amy Winehouse", "Version", 2007, 219000, 3, 92),
  makeTrack("take-me-out", "Take Me Out", "Franz Ferdinand", "Franz Ferdinand", 2004, 237000, 5, 92),
  makeTrack("last-nite", "Last Nite", "The Strokes", "Is This It", 2001, 193000, 7, 91),
  makeTrack("such-great-heights", "Such Great Heights", "The Postal Service", "Give Up", 2003, 266000, 0, 89),
  makeTrack("kids", "Kids", "MGMT", "Oracular Spectacular", 2007, 302000, 2, 91),
  makeTrack("dog-days", "Dog Days Are Over", "Florence + The Machine", "Lungs", 2009, 252000, 4, 92),
  makeTrack("uptown-funk", "Uptown Funk", "Mark Ronson feat. Bruno Mars", "Uptown Special", 2014, 270000, 5, 94),
  makeTrack("rolling-deep", "Rolling in the Deep", "Adele", "21", 2010, 228000, 6, 94),
  makeTrack("get-lucky", "Get Lucky", "Daft Punk feat. Pharrell Williams", "Random Access Memories", 2013, 369000, 2, 94),
  makeTrack("happy", "Happy", "Pharrell Williams", "G I R L", 2013, 233000, 4, 92),
  makeTrack("blinding-lights", "Blinding Lights", "The Weeknd", "After Hours", 2020, 200000, 0, 95),
  makeTrack("levitating", "Levitating", "Dua Lipa", "Future Nostalgia", 2020, 203000, 2, 93),
  makeTrack("sandstorm", "Sandstorm", "Darude", "Before the Storm", 1999, 225000, 0, 91),
  makeTrack("insomnia", "Insomnia", "Faithless", "Reverence", 1995, 521000, 6, 91),
  makeTrack("better-off-alone", "Better Off Alone", "Alice Deejay", "Who Needs Guitars Anyway?", 1999, 214000, 2, 91),
];

export const DEMO_TRACKS = Object.fromEntries(TRACK_LIST.map((track) => [track.id.replace("demo-track-", ""), track]));

const ARTIST_META = {
  "Michael Jackson": ["pop", "dance pop", "funk", "soul"],
  "Queen": ["classic rock", "glam rock", "arena rock"],
  "Fleetwood Mac": ["classic rock", "soft rock", "album rock"],
  "Stevie Wonder": ["soul", "funk", "motown"],
  "Prince": ["funk", "pop", "rock"],
  "Earth, Wind & Fire": ["funk", "soul", "disco"],
  "Whitney Houston": ["pop", "dance pop", "r-n-b"],
  "David Bowie": ["art rock", "classic rock", "glam rock"],
};

function makeArtist(name, genres, index) {
  return {
    id: `demo-artist-${slug(name)}`,
    name,
    genres,
    image_url: demoArtwork(name, index, "artist"),
    spotify_url: `https://open.spotify.com/search/${encodeURIComponent(name)}`,
    followers: 1_200_000 + index * 713_000,
    popularity: 84 - index * 2,
  };
}

export const DEMO_ARTISTS = Object.fromEntries(
  Object.entries(ARTIST_META).map(([name, genres], index) => [slug(name), makeArtist(name, genres, index)])
);

export const DEMO_PROFILE = {
  id: "demo-listener",
  display_name: "Alex Morgan",
  image_url: demoArtwork("Alex Morgan", 5, "artist"),
  spotify_url: "",
  country: "US",
};

export const PRIMARY_TRACK_IDS = [
  "billie-jean", "thriller", "beat-it", "smooth-criminal", "rock-with-you", "human-nature",
  "dont-stop-til", "man-in-mirror", "september", "dreams", "superstition", "dont-stop-me-now",
];

export const TRACK_PROFILES = {
  "billie-jean": { genre: "dance-pop", tags: ["pop", "funk", "post-disco"], energy: .65, valence: .85, danceability: .92, tempo: 117, loudness: -5.2 },
  thriller: { genre: "pop", tags: ["pop", "funk", "dance"], energy: .89, valence: .73, danceability: .81, tempo: 118, loudness: -4.8 },
  "beat-it": { genre: "pop-rock", tags: ["pop", "rock", "dance"], energy: .82, valence: .87, danceability: .78, tempo: 139, loudness: -5.0 },
  "smooth-criminal": { genre: "dance-pop", tags: ["pop", "funk", "dance"], energy: .91, valence: .72, danceability: .85, tempo: 118, loudness: -4.6 },
  "human-nature": { genre: "pop", tags: ["pop", "soul", "quiet storm"], energy: .51, valence: .58, danceability: .63, tempo: 93, loudness: -7.4 },
};

export const PLAYLIST_SELECTIONS = {
  pop: ["billie-jean", "thriller", "i-wanna-dance", "dancing-queen", "take-on-me", "uptown-funk"],
  rock: ["dont-stop-me-now", "dreams", "heroes", "dont-stop-believin", "wonderwall", "mr-brightside"],
  "hip-hop": ["juicy", "the-message", "california-love", "lose-yourself", "in-da-club", "ms-jackson"],
  "indie-pop": ["mr-brightside", "wonderwall", "take-me-out", "last-nite", "such-great-heights", "kids"],
  jazz: ["take-five", "favorite-things", "human-nature", "superstition", "clair-de-lune", "dreams"],
  metal: ["enter-sandman", "trooper", "beat-it", "gimme-shelter", "dont-stop-me-now", "smooth-criminal"],
  classical: ["clair-de-lune", "spring", "favorite-things", "human-nature", "purple-rain", "here-comes-sun"],
  edm: ["one-more-time", "levels", "sandstorm", "insomnia", "better-off-alone", "get-lucky"],
  "60s": ["here-comes-sun", "aint-no-mountain", "be-my-baby", "gimme-shelter", "favorite-things", "take-five"],
  "70s": ["dont-stop-til", "rock-with-you", "september", "dreams", "dancing-queen", "superstition"],
  "80s": ["billie-jean", "thriller", "beat-it", "purple-rain", "i-wanna-dance", "take-on-me"],
  "90s": ["black-or-white", "vogue", "wonderwall", "i-want-it-that-way", "wannabe", "juicy"],
  "2000s": ["crazy-in-love", "hey-ya", "mr-brightside", "valerie", "one-more-time", "enter-sandman"],
  "2010s": ["uptown-funk", "rolling-deep", "get-lucky", "happy", "levels", "i-wanna-dance"],
  "2020s": ["blinding-lights", "levitating", "billie-jean", "dont-stop-me-now", "dreams", "september"],
  workout: ["beat-it", "smooth-criminal", "dont-stop-me-now", "uptown-funk", "levels", "i-wanna-dance"],
  "late night drive": ["billie-jean", "human-nature", "purple-rain", "everybody-wants", "dreams", "africa"],
  study: ["human-nature", "clair-de-lune", "dreams", "here-comes-sun", "favorite-things", "tiny-dancer"],
  focus: ["billie-jean", "human-nature", "superstition", "take-five", "clair-de-lune", "get-lucky"],
  party: ["billie-jean", "thriller", "september", "dancing-queen", "i-wanna-dance", "uptown-funk"],
  chill: ["human-nature", "rock-with-you", "dreams", "purple-rain", "tiny-dancer", "here-comes-sun"],
};

export function tracksForIds(ids = []) {
  return ids.map((id) => DEMO_TRACKS[id]).filter(Boolean);
}

export function cloneDemo(value) {
  return JSON.parse(JSON.stringify(value));
}
