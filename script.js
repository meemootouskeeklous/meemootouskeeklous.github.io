// ---------------------------------------------------------------
// v05: Διεύθυνση (domain) του site, ΜΟΝΟ για τα δομημένα δεδομένα JSON-LD (χωρίς / στο τέλος).
// Αν αλλάξει το domain, άλλαξέ το εδώ. Αν περιέχει το "YOUR-DOMAIN", τα JSON-LD των έργων ΔΕΝ εισάγονται.
// ---------------------------------------------------------------
const SITE_URL = "https://meemootouskeeklous.github.io";

function siteUrlIsSet() {
    return !SITE_URL.includes("YOUR-DOMAIN");
}

// v05: Προσθέτει ένα μπλοκ JSON-LD (δομημένα δεδομένα για μηχανές αναζήτησης) στο <head>
function addJsonLd(obj) {
    const tag = document.createElement("script");
    tag.type = "application/ld+json";
    tag.textContent = JSON.stringify(obj);
    document.head.appendChild(tag);
}

// v12: Συλλογές. Κάθε έργο έχει "collection_ids": ["c01", ...] (λίστα, ώστε να ανήκει σε περισσότερες συλλογές).
// Οι τίτλοι των συλλογών ορίζονται μία φορά στο portfolio.collections: [{ collection_id, collection_title }]
function artCollectionIds(art) {
    const v = art.collection_ids !== undefined ? art.collection_ids : art.collection_id;
    if (v === undefined || v === null || v === '') return [];
    return (Array.isArray(v) ? v : [v]).map(String);
}

function collectionTitleMap(data) {
    const map = {};
    ((data.portfolio && data.portfolio.collections) || []).forEach(c => {
        if (c && c.collection_id !== undefined) map[String(c.collection_id)] = c.collection_title || String(c.collection_id);
    });
    return map;
}

// v05: JSON-LD VisualArtwork για κάθε έργο (παράγεται από το data.json, δεν συντηρείται χειροκίνητα)
function addArtworkJsonLd(data) {
    if (!siteUrlIsSet()) return;
    const titles = collectionTitleMap(data);
    const artworks = data.portfolio.artworks.map(art => {
        const genres = artCollectionIds(art).map(id => titles[id]).filter(Boolean);
        const obj = {
        "@context": "https://schema.org",
        "@type": "VisualArtwork",
        "name": art.title,
        "description": plainText(art.description, " "),
        "image": SITE_URL + "/" + art.high_res_url,
        "thumbnailUrl": SITE_URL + "/" + art.thumbnail_url,
        "artform": "Digital art",
        "artMedium": "Digital",
        "creator": { "@type": "Person", "name": data.site_config.artist_name }
        };
        if (genres.length) obj.genre = genres.length === 1 ? genres[0] : genres;
        // v13: προαιρετικό πεδίο "tags": ["fractal", "gold"] -> keywords στο JSON-LD (δεν εμφανίζεται στη σελίδα)
        const tags = [...new Set((Array.isArray(art.tags) ? art.tags : [])
            .map(t => String(t).trim()).filter(Boolean))];
        if (tags.length) obj.keywords = tags.join(", ");
        return obj;
    });
    addJsonLd(artworks);
}

// ---------------------------------------------------------------
// v06: Απλή μορφοποίηση κειμένου μέσα στο data.json.
//   ~(b ... ~)b  έντονο      ~(i ... ~)i  πλάγιο
//   ~(u ... ~)u  υπογράμμιση  ~(h ... ~)h  επισήμανση (highlight)
//   ~(L ... ~)L  αριστερά  ~(C ... ~)C  κέντρο  ~(R ... ~)R  δεξιά  ~(J ... ~)J  πλήρης στοίχιση (το τμήμα γίνεται δική του γραμμή)
// Συνδυάζονται (φωλιάζουν): ~(b έντονο ~(i και πλάγιο~)i~)b
// Για να φανεί κυριολεκτικά π.χ. "~(b", γράψε ένα επιπλέον ~ μπροστά: ~~(b
// Νέο στυλ: πρόσθεσε μία γραμμή στον πίνακα FORMATS (και, αν χρειάζεται, το γράμμα στις δύο regex παρακάτω).
// ---------------------------------------------------------------
const FORMATS = {
    b: ['<strong>', '</strong>'],
    i: ['<em>', '</em>'],
    u: ['<u>', '</u>'],
    h: ['<mark class="hl">', '</mark>'],
    // v08: στοίχιση τμήματος κειμένου (το τμήμα γίνεται δική του γραμμή/παράγραφος)
    L: ['<span class="al al-left">', '</span><!--/al-->'],
    C: ['<span class="al al-center">', '</span><!--/al-->'],
    R: ['<span class="al al-right">', '</span><!--/al-->'],
    J: ['<span class="al al-justify">', '</span><!--/al-->']
};
const FORMAT_CODES = Object.keys(FORMATS).join('');
const FORMAT_TOKEN = new RegExp('~([()])([' + FORMAT_CODES + '])', 'g');
const FORMAT_ESCAPED = new RegExp('~~(?=[()][' + FORMAT_CODES + '])', 'g');

function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Ένα string -> ασφαλές HTML με τη μορφοποίηση εφαρμοσμένη.
// Ό,τι μένει ανοιχτό κλείνει αυτόματα στο τέλος του string (και βγαίνει προειδοποίηση στην Console).
function formatInline(text) {
    let s = escapeHtml(String(text)).replace(FORMAT_ESCAPED, '\u0001');
    const stack = [];
    s = s.replace(FORMAT_TOKEN, (m, kind, code) => {
        if (kind === '(') {
            stack.push(code);
            return FORMATS[code][0];
        }
        if (stack.length && stack[stack.length - 1] === code) {
            stack.pop();
            return FORMATS[code][1];
        }
        console.warn('Μορφοποίηση: το ' + m + ' δεν αντιστοιχεί σε ανοιχτό στυλ, στο κείμενο: "' + text + '"');
        return m;
    });
    while (stack.length) {
        const code = stack.pop();
        console.warn('Μορφοποίηση: λείπει το ~)' + code + ' στο κείμενο: "' + text + '"');
        s += FORMATS[code][1];
    }
    // v07: το \n του JSON γίνεται αλλαγή γραμμής (<br>), όπως πριν με το innerText
    s = s.replace(/\u0001/g, '~').replace(/\n/g, '<br>');
    // v08: ένα <br> ακριβώς πριν/μετά από τμήμα με στοίχιση θα έδινε κενή γραμμή, αφού το τμήμα ήδη ξεκινά σε νέα γραμμή
    return s.replace(/(<br>)+(?=<span class="al )/g, '').replace(/(<!--\/al-->)(<br>)+/g, '$1');
}

// Όπως το joinText, αλλά με μορφοποίηση. Επιστρέφει HTML.
//   - τα \n μέσα στα strings γίνονται <br> (από το formatInline)
//   - πίνακας: τα στοιχεία ενώνονται με το sep (εμφωλευμένος πίνακας: οι προτάσεις ενώνονται με κενό)
function richHtml(value, sep) {
    if (Array.isArray(value)) {
        return value.map(v => Array.isArray(v) ? v.map(formatInline).join(' ') : formatInline(v)).join(sep);
    }
    return formatInline(value === undefined || value === null ? '' : value);
}

// Κείμενο χωρίς τα σύμβολα μορφοποίησης (για JSON-LD, alt κλπ).
function stripMarkup(text) {
    return String(text)
        .replace(FORMAT_ESCAPED, '\u0001')
        .replace(FORMAT_TOKEN, '')
        .replace(/\u0001/g, '~');
}

function plainText(value, sep) {
    return stripMarkup(joinText(value, sep) || '');
}

// v01: Ενώνει κείμενο που στο data.json μπορεί να είναι string Ή πίνακας από strings.
// Πίνακας -> τα στοιχεία ενώνονται με το sep. Εμφωλευμένος πίνακας -> κάθε υπο-πίνακας ενώνεται με κενό.
function joinText(value, sep) {
    if (Array.isArray(value)) {
        return value.map(v => Array.isArray(v) ? v.join(' ') : v).join(sep);
    }
    return value;
}

let globalData = null; // Θα αποθηκεύσουμε τα δεδομένα εδώ για να τα χρησιμοποιούμε εύκολα

// v02: Φορτώνει ένα εξωτερικό αρχείο HTML σε ένα στοιχείο της σελίδας.
// Επιστρέφει Promise ώστε ο καλών να περιμένει μέχρι να μπει το HTML στο DOM.
async function loadComponent(placeholderId, filePath) {
    const response = await fetch(filePath);
    if (!response.ok) {
        throw new Error('Αποτυχία φόρτωσης του αρχείου: ' + filePath);
    }
    document.getElementById(placeholderId).innerHTML = await response.text();
}

// v09: Ταξινόμηση έργων: display_tier (αύξουσα) και μετά id, όπως είναι γραμμένα.
// Αν λείπει το display_tier, το έργο θεωρείται με τη μεγαλύτερη τιμή (εμφανίζεται τελευταίο).
function sortArtworks(artworks) {
    const nat = (a, b) => String(a).localeCompare(String(b), undefined, { numeric: true });
    const has = a => a.display_tier !== undefined && a.display_tier !== null && a.display_tier !== '';
    artworks.sort((a, b) => {
        if (has(a) !== has(b)) return has(a) ? -1 : 1;
        if (has(a)) { const c = nat(a.display_tier, b.display_tier); if (c) return c; }
        return nat(a.id, b.id);
    });
}

// v02: Ένα ενιαίο σημείο εκκίνησης με σίγουρη σειρά:
//   1) φόρτωση header HTML  2) φόρτωση data.json  3) χτίσιμο header/μενού  4) χτίσιμο σελίδας
// (αντικαθιστά το window.onload + το setTimeout των 100ms που δημιουργούσαν race condition)
async function initSite() {
    try {
        await loadComponent('globalheader-placeholder', 'global-header.html');

        const response = await fetch('data.json');
        globalData = await response.json();

        // v09: ταξινόμηση έργων (display_tier + id)
        if (globalData.portfolio && Array.isArray(globalData.portfolio.artworks)) {
            sortArtworks(globalData.portfolio.artworks);
            // v10: έργα με "hidden": true αφαιρούνται από παντού (My Art, αρχική, lightbox, JSON-LD)
            globalData.hiddenIds = new Set(
                globalData.portfolio.artworks.filter(a => a.hidden === true).map(a => a.id)
            );
            globalData.portfolio.artworks = globalData.portfolio.artworks.filter(a => a.hidden !== true);
        }

        // v05: γενικό φόντο των έργων (για εικόνες με διαφάνεια), όταν ένα έργο δεν ορίζει δικό του
        if (globalData.site_config.default_art_background) {
            document.documentElement.style.setProperty('--art-default-bg', globalData.site_config.default_art_background);
        }

        buildHeader(globalData);
        initializeMenu();

        // Έλεγχος σε ποια σελίδα βρισκόμαστε για να τρέξουμε την αντίστοιχη συνάρτηση
        if (document.getElementById('home-works-grid')) {
            buildHomePage(globalData);
        } else if (document.getElementById('portfolio-grid')) {
            buildMyArtPage(globalData);
            addArtworkJsonLd(globalData);
        } else if (document.getElementById('about-story')) {
            buildAboutPage(globalData);
        } else if (document.getElementById('contact-message')) {
            buildContactPage(globalData);
        }
    } catch (error) {
        console.error("Σφάλμα αρχικοποίησης του site:", error);
    }
}

// Σημαδεύει το κουμπί της τρέχουσας σελίδας (.current). Καλείται αφού έχει χτιστεί το μενού.
function initializeMenu() {
    const currentUrl = window.location.pathname;
    const menuLinks = document.querySelectorAll("#menu-list a");

    menuLinks.forEach(link => {
        const linkPage = link.getAttribute("href");

        // Έλεγχος αν το URL περιλαμβάνει το όνομα του αρχείου ή αν είμαστε στην αρχική
        if (currentUrl.endsWith(linkPage) || ((currentUrl.endsWith("/") || currentUrl.endsWith("index.html")) && linkPage === "home.html")) {
            link.classList.add("current");
        } else {
            link.classList.remove("current");
        }
    });
}

function buildHeader(data) {
    document.getElementById('artist-name').innerText = data.site_config.artist_name;
    document.getElementById('artist-avatar').src = data.site_config.avatar_url;
    document.getElementById('artist-avatar').alt = data.site_config.avatar_alt || data.site_config.artist_name;

    // Φόρτωση του Banner
    if (document.getElementById('hero-img')) {
        document.getElementById('hero-img').src = data.site_config.hero_banner_url;
    }

    const menuList = document.getElementById('menu-list');
    menuList.innerHTML = ''; // Καθαρισμός για σιγουριά
    data.menu.forEach(item => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = item.url;
        a.innerText = item.title;
        li.appendChild(a);
        menuList.appendChild(li);
    });

    // Λειτουργικότητα Hamburger Menu (v02: μόνο εδώ, μία φορά)
    const hamburger = document.getElementById('hamburger');
    if (hamburger) {
        hamburger.addEventListener('click', () => {
            menuList.classList.toggle('active');
        });
    }
}

// ---------------------------------------------------------------
// v05: Masonry με σειρά αριστερά→δεξιά.
// Το επόμενο έργο μπαίνει πάντα στη χαμηλότερη στήλη, άρα η σειρά του data.json διατηρείται κατά προσέγγιση.
// ---------------------------------------------------------------
const MASONRY_COL_WIDTH = 300; // ελάχιστο πλάτος στήλης σε px (άλλαξέ το για περισσότερες/λιγότερες στήλες)
const MASONRY_GAP = 20;        // να ταιριάζει με το gap στο style.css (.art-grid / .masonry-col)
const masonryGrids = new Set();

function masonryColumnCount(grid) {
    const w = grid.clientWidth || grid.parentElement.clientWidth || window.innerWidth;
    return Math.max(1, Math.floor((w + MASONRY_GAP) / (MASONRY_COL_WIDTH + MASONRY_GAP)));
}

function layoutMasonry(grid) {
    const cards = grid._cards || [];
    const n = masonryColumnCount(grid);
    const cols = [];
    for (let i = 0; i < n; i++) {
        const col = document.createElement('div');
        col.className = 'masonry-col';
        cols.push(col);
    }
    grid.replaceChildren(...cols);
    grid._colCount = n;
    cards.forEach(card => {
        let target = cols[0];
        cols.forEach(col => { if (col.offsetHeight < target.offsetHeight) target = col; });
        target.appendChild(card);
    });
}

function setMasonryCards(grid, cards) {
    grid._cards = cards;
    masonryGrids.add(grid);
    layoutMasonry(grid);
}

let masonryTimer = null;
function scheduleMasonry(force) {
    cancelAnimationFrame(masonryTimer);
    masonryTimer = requestAnimationFrame(() => {
        masonryGrids.forEach(grid => {
            if (!document.body.contains(grid)) { masonryGrids.delete(grid); return; }
            if (force || masonryColumnCount(grid) !== grid._colCount) layoutMasonry(grid);
        });
    });
}
window.addEventListener('resize', () => scheduleMasonry(false));

function buildHomePage(data) {
    document.getElementById('elevator-pitch').innerHTML = richHtml(data.pages.home.elevator_pitch, ' ');
    const aboutBtn = document.getElementById('about-btn');
    aboutBtn.innerText = data.pages.home.about_button_text;
    aboutBtn.href = "about.html";
    document.getElementById('selected-works-title').innerText = data.pages.home.selected_works_title;
    // -----------------------------------------------------
    // Selected Works
    // -----------------------------------------------------
    const grid = document.getElementById('home-works-grid');
    grid.innerHTML = '';
    const selectedIds = data.pages.home.selected_works_ids || [];

    // v03: πρώτα συγκεντρώνουμε τα επιλεγμένα έργα, ώστε το lightbox να πλοηγείται μέσα σε αυτά
    const selectedArts = [];
    selectedIds.forEach(id => {
        const art = data.portfolio.artworks.find(
            artwork => artwork.id === id
        );

        if (!art) {
            if (!(data.hiddenIds && data.hiddenIds.has(id))) console.warn(`Selected work not found: ${id}`);
            return;
        }
        selectedArts.push(art);
    });

    // v05: οι κάρτες μπαίνουν στο masonry
    setMasonryCards(grid, selectedArts.map(art => createArtworkCard(art, selectedArts)));

    // Lightbox
    setupLightbox();
}

function buildAboutPage(data) {
    document.getElementById('about-story').innerHTML = richHtml(data.pages.about.full_story, '<br><br>');
}

function buildContactPage(data) {
    document.getElementById('contact-message').innerHTML = richHtml(data.pages.contact.message, ' ');
    
    const emailLink = document.getElementById('contact-email');
    const email = data.pages.contact.email;
    emailLink.href = `mailto:${email}`;
    emailLink.innerText = email;

    // v16: κουμπί "Copy address" - αντιγράφει τη διεύθυνση στο πρόχειρο
    const copyBtn = document.getElementById('copy-email');
    if (copyBtn) {
        const label = copyBtn.innerText;
        copyBtn.addEventListener('click', async () => {
            let ok = false;
            try {
                await navigator.clipboard.writeText(email);
                ok = true;
            } catch (e) {
                // εφεδρική μέθοδος (π.χ. παλιότεροι browsers ή χωρίς https)
                const ta = document.createElement('textarea');
                ta.value = email;
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.select();
                try { ok = document.execCommand('copy'); } catch (e2) { ok = false; }
                ta.remove();
            }
            copyBtn.innerText = ok ? 'Copied!' : 'Copy failed';
            setTimeout(() => { copyBtn.innerText = label; }, 2000);
        });
    }

    // v11: κατάστημα/καταστήματα (προαιρετικά) - pages.contact.shops: [{ text, url, hidden }]
    const shopsBox = document.getElementById('contact-shops');
    if (shopsBox) {
        shopsBox.innerHTML = '';
        (data.pages.contact.shops || []).forEach(shop => {
            if (!shop || !shop.url || shop.hidden === true) return;
            const a = document.createElement('a');
            a.className = 'btn';
            a.href = shop.url;
            a.target = '_blank';
            a.rel = 'noopener';
            a.innerText = shop.text || shop.url;
            shopsBox.appendChild(a);
        });
    }

    // v07: το μπλοκ social links μπορεί να είναι σε σχόλιο στο contact.html (δεν υπάρχουν social προς το παρόν)
    const socialContainer = document.getElementById('social-links');
    if (!socialContainer) return;
    socialContainer.innerHTML = '';
    
    const socials = data.site_config.social_links || {};
    for (const [platform, url] of Object.entries(socials)) {
        const a = document.createElement('a');
        a.href = url;
        a.target = "_blank";
        a.innerText = platform.charAt(0).toUpperCase() + platform.slice(1);
        a.classList.add('social-btn');
        socialContainer.appendChild(a);
    }
}

// --- ΝΕΟΣ ΚΩΔΙΚΑΣ ΓΙΑ ΤΗ ΣΕΛΙΔΑ MY ART ---

function buildMyArtPage(data) {
    const filtersContainer = document.getElementById('filters-container');
    const grid = document.getElementById('portfolio-grid');
    
    // 1. Δημιουργία των Φίλτρων: "All" + μία συλλογή ανά κουμπί (από το portfolio.collections)
    const titles = collectionTitleMap(data);
    const used = new Set();
    data.portfolio.artworks.forEach(art => {
        artCollectionIds(art).forEach(id => {
            if (titles[id] === undefined) console.warn(`Το έργο ${art.id} έχει άγνωστο collection_id: ${id}`);
            else used.add(id);
        });
    });
    // κουμπιά μόνο για συλλογές που έχουν ορατά έργα, με τη σειρά του portfolio.collections
    const filters = [{ value: 'All', label: 'All' }].concat(
        (data.portfolio.collections || [])
            .filter(c => used.has(String(c.collection_id)))
            .map(c => ({ value: String(c.collection_id), label: titles[String(c.collection_id)] }))
    );
    filters.forEach(filter => {
        const btn = document.createElement('button');
        btn.classList.add('filter-btn');
        btn.innerText = filter.label;
        if(filter.value === 'All') btn.classList.add('active'); // Προεπιλογή το "All"
        
        // Λειτουργία φιλτραρίσματος όταν πατάμε το κουμπί
        btn.addEventListener('click', () => {
            // Καθαρίζει το active class από όλα τα κουμπιά και το δίνει στο πατημένο
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderGrid(filter.value, data.portfolio.artworks);
        });
        
        filtersContainer.appendChild(btn);
    });

    // 2. Εμφάνιση Όλων των έργων κατά την πρώτη φόρτωση
    renderGrid('All', data.portfolio.artworks);
    
    // 3. Στήσιμο του Lightbox Modal
    setupLightbox();
}

// Συνάρτηση που "ζωγραφίζει" τα thumbnails στο grid
function renderGrid(filterValue, artworks) {
    const grid = document.getElementById('portfolio-grid');
    grid.innerHTML = '';

    // v03: η λίστα των έργων που φαίνονται τώρα (για την πλοήγηση μέσα στο lightbox)
    const visible = artworks.filter(
        art => filterValue === 'All' || artCollectionIds(art).includes(filterValue)
    );
    // v05: οι κάρτες μπαίνουν στο masonry
    setMasonryCards(grid, visible.map(art => createArtworkCard(art, visible)));
}

// ---------------------------------------------------------------
// Lightbox (Modal) - v03: τίτλος, πλοήγηση, πληκτρολόγιο, swipe, loading
// ---------------------------------------------------------------
let lightboxList = [];    // τα έργα μέσα στα οποία πλοηγούμαστε
let lightboxIndex = 0;    // ποιο έργο φαίνεται τώρα
let lightboxToken = 0;    // για να αγνοούμε καθυστερημένες φορτώσεις εικόνας
let lightboxReady = false;

function isLightboxOpen() {
    const lightbox = document.getElementById('lightbox');
    return lightbox && !lightbox.classList.contains('hidden');
}

function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    if (!lightbox) return;
    lightbox.classList.add('hidden');
    document.body.style.overflow = '';
    lightboxToken++; // ακυρώνει τυχόν εκκρεμή φόρτωση
}

function setupLightbox() {
    const lightbox = document.getElementById('lightbox');
    if (!lightbox || lightboxReady) return;
    lightboxReady = true;

    // Κλείσιμο με το κουμπί 'Χ'
    document.getElementById('close-lightbox').addEventListener('click', closeLightbox);

    // Κλείσιμο πατώντας οπουδήποτε στο σκούρο φόντο
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) closeLightbox();
    });

    // Βέλη
    document.getElementById('lightbox-prev').addEventListener('click', () => showLightboxStep(-1));
    document.getElementById('lightbox-next').addEventListener('click', () => showLightboxStep(1));

    // Πληκτρολόγιο: Esc / βέλη
    document.addEventListener('keydown', (e) => {
        if (!isLightboxOpen()) return;
        if (e.key === 'Escape') closeLightbox();
        else if (e.key === 'ArrowLeft') showLightboxStep(-1);
        else if (e.key === 'ArrowRight') showLightboxStep(1);
    });

    // Swipe σε οθόνη αφής
    let touchX = 0, touchY = 0;
    lightbox.addEventListener('touchstart', (e) => {
        touchX = e.changedTouches[0].clientX;
        touchY = e.changedTouches[0].clientY;
    }, { passive: true });
    lightbox.addEventListener('touchend', (e) => {
        const dx = e.changedTouches[0].clientX - touchX;
        const dy = e.changedTouches[0].clientY - touchY;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
            showLightboxStep(dx < 0 ? 1 : -1); // σύρσιμο αριστερά = επόμενο
        }
    }, { passive: true });
}

// Μετακίνηση στο προηγούμενο (-1) / επόμενο (+1) έργο, κυκλικά
function showLightboxStep(step) {
    if (lightboxList.length < 2) return;
    lightboxIndex = (lightboxIndex + step + lightboxList.length) % lightboxList.length;
    showLightboxArtwork();
}

// Ανοίγει το lightbox για το έργο list[index]
function openLightbox(list, index) {
    // Ασφάλεια: αν δεν υπάρχει Lightbox, δεν κάνουμε τίποτα.
    if (!document.getElementById('lightbox')) return;

    lightboxList = list;
    lightboxIndex = index;
    document.getElementById('lightbox').classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // η σελίδα από πίσω δεν κυλάει
    showLightboxArtwork();
}

function showLightboxArtwork() {
    const art = lightboxList[lightboxIndex];
    const img = document.getElementById('lightbox-img');
    const loading = document.getElementById('lightbox-loading');
    const token = ++lightboxToken;

    document.getElementById('lightbox-title').innerText = art.title || '';
    document.getElementById('lightbox-text').innerHTML = richHtml(art.description, ' ');
    document.getElementById('lightbox-counter').innerText = (lightboxIndex + 1) + ' / ' + lightboxList.length;
    img.alt = art.alt || art.title || 'Artwork';

    // Τα βέλη φαίνονται μόνο αν υπάρχουν >1 έργα
    const multiple = lightboxList.length > 1;
    document.getElementById('lightbox-prev').classList.toggle('hidden', !multiple);
    document.getElementById('lightbox-next').classList.toggle('hidden', !multiple);

    // v05: φόντο ανά έργο (προαιρετικό) και σχήμα εικόνας (για να καλύπτει το φόντο ακριβώς την εικόνα)
    if (art.background) {
        img.style.setProperty('--art-bg', art.background);
    } else {
        img.style.removeProperty('--art-bg');
    }
    if (art.thumb_width && art.thumb_height) {
        img.style.setProperty('--ar', art.thumb_width / art.thumb_height);
    } else {
        const probe = new Image();
        probe.onload = () => {
            if (token === lightboxToken && probe.naturalHeight) {
                img.style.setProperty('--ar', probe.naturalWidth / probe.naturalHeight);
            }
        };
        probe.src = art.thumbnail_url;
    }

    // Πρώτα το thumbnail (θολό) + ένδειξη Loading, μέχρι να φορτώσει η high-res
    img.src = art.thumbnail_url;
    img.classList.add('loading');
    loading.classList.remove('hidden');

    const full = new Image();
    full.onload = full.onerror = () => {
        if (token !== lightboxToken) return; // στο μεταξύ άλλαξε το έργο
        img.src = art.high_res_url;
        img.classList.remove('loading');
        loading.classList.add('hidden');
    };
    full.src = art.high_res_url;
}

// list = η λίστα έργων μέσα στην οποία πλοηγείται το lightbox
function createArtworkCard(art, list) {
    const div = document.createElement('div');
    div.classList.add('art-item');

    // Thumbnail
    const img = document.createElement('img');
    img.src = art.thumbnail_url;
    img.alt = art.alt || art.title;
    // v04: αν υπάρχουν οι διαστάσεις του thumbnail στο data.json, κρατάμε τον χώρο πριν φορτώσει η εικόνα (αποφεύγει τα "πηδήματα")
    if (art.thumb_width && art.thumb_height) {
        img.width = art.thumb_width;
        img.height = art.thumb_height;
    }

    // v05: φόντο ανά έργο (προαιρετικό). Αν λείπει, ισχύει το γενικό default_art_background.
    if (art.background) {
        img.style.setProperty('--art-bg', art.background);
    }
    // v05: αν δεν είναι γνωστές οι διαστάσεις, ξαναϋπολογίζουμε τις στήλες όταν φορτώσει η εικόνα
    if (!(art.thumb_width && art.thumb_height)) {
        img.addEventListener('load', () => scheduleMasonry(true));
    }

    // Click -> Lightbox
    img.addEventListener('click', () => {
        const items = list || [art];
        openLightbox(items, items.indexOf(art));
    });

    div.appendChild(img);

    // Title
    const title = document.createElement('div');
    title.classList.add('art-title');
    title.innerText = art.title;
    div.appendChild(title);

    return div;
}

document.addEventListener('DOMContentLoaded', initSite);

