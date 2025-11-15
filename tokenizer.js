// ================================
// 1. LOAD WORDS.JSON
// ================================
export async function loadWords() {
    const res = await fetch("data/words.json");
    const data = await res.json();
    return data;
}



// ================================
// 2. SIMPLE TOKEN SPLITTING
// ================================
export function tokenize(text) {
    let tokens = [];
    let current = "";

    for (let i = 0; i < text.length; i++) {
        let c = text[i].toLowerCase();

        if (c >= "a" && c <= "z") {
            current += c;
        } else {
            if (current.length > 0) {
                tokens.push(current);
                current = "";
            }
        }
    }

    if (current.length > 0) tokens.push(current);
    return tokens;
}



// ================================
// 3. CHECK HELPERS
// ================================
function isNoun(word, wordsData) {
    const letter = word[0];
    if (!wordsData.nouns[letter]) return false;
    return wordsData.nouns[letter].includes(word);
}

function makeNode(value, type, children = []) {
    return { value, type, children };
}



// ================================
// 4. SPLITTING LOGIC FOR NOUNS
// ================================
export function splitNoun(word, words) {
    let original = word;

    // ------------------------------------------
    // A) IRREGULAR PLURALS
    // ------------------------------------------
    if (words.irregular_plurals[word]) {
        let root = words.irregular_plurals[word];
        return {
            original,
            success: true,
            parts: [
                makeNode(root, "plural_root_irregular", [])
            ]
        };
    }


    // ------------------------------------------
    // B) REGULAR PLURALS
    // ------------------------------------------
    // 1. -ies → -y
    if (word.endsWith("ies")) {
        let root = word.slice(0, -3) + "y";
        if (isNoun(root, words)) {
            return {
                original,
                success: true,
                parts: [
                    makeNode(root, "plural_root", []),
                    makeNode("ies", "plural_suffix", [])
                ]
            };
        }
    }

    // 2. -ves → f/fe
    if (word.endsWith("ves")) {
        let base = word.slice(0, -3);
        let rootF = base + "f";
        let rootFE = base + "fe";

        if (isNoun(rootF, words)) {
            return {
                original,
                success: true,
                parts: [
                    makeNode(rootF, "plural_root", []),
                    makeNode("ves", "plural_suffix", [])
                ]
            };
        }
        if (isNoun(rootFE, words)) {
            return {
                original,
                success: true,
                parts: [
                    makeNode(rootFE, "plural_root", []),
                    makeNode("ves", "plural_suffix", [])
                ]
            };
        }
    }

    // 3. -es
    if (word.endsWith("es")) {
        let root = word.slice(0, -2);
        if (isNoun(root, words)) {
            return {
                original,
                success: true,
                parts: [
                    makeNode(root, "plural_root", []),
                    makeNode("es", "plural_suffix", [])
                ]
            };
        }
    }

    // 4. -s
    if (word.endsWith("s")) {
        let root = word.slice(0, -1);
        if (isNoun(root, words)) {
            return {
                original,
                success: true,
                parts: [
                    makeNode(root, "plural_root", []),
                    makeNode("s", "plural_suffix", [])
                ]
            };
        }
    }



    // ------------------------------------------
    // C) PREFIX SPLIT (RULE B)
    // ------------------------------------------
    for (let prefix of words.prefixes) {
        if (word.startsWith(prefix)) {
            let rest = word.slice(prefix.length);

            if (isNoun(rest, words)) {
                return {
                    original,
                    success: true,
                    parts: [
                        makeNode(prefix, "prefix", []),
                        makeNode(rest, "noun", [])
                    ]
                };
            }
        }
    }



    // ------------------------------------------
    // D) SUFFIX SPLIT (RULE B)
    // ------------------------------------------
    for (let suffix of words.suffixes) {
        if (word.endsWith(suffix)) {
            let root = word.slice(0, -suffix.length);

            if (isNoun(root, words)) {
                return {
                    original,
                    success: true,
                    parts: [
                        makeNode(root, "noun", []),
                        makeNode(suffix, "suffix", [])
                    ]
                };
            }
        }
    }



    // ------------------------------------------
    // E) COMPOUND SPLIT (OPTION A = STRICT)
    // ------------------------------------------
    for (let i = 1; i < word.length; i++) {
        let left = word.slice(0, i);
        let right = word.slice(i);

        if (isNoun(left, words) && isNoun(right, words)) {
            return {
                original,
                success: true,
                parts: [
                    makeNode(left, "compound_root", []),
                    makeNode(right, "compound_root", [])
                ]
            };
        }
    }



    // ------------------------------------------
    // F) NOTHING WORKED → UNKNOWN
    // ------------------------------------------
    return {
        original,
        success: false,
        parts: [
            makeNode(original, "unknown", [])
        ]
    };
}



// ================================
// 5. CLASSIFY ALL TOKENS
// ================================
export function classify(tokens, words) {
    let output = [];

    for (let t of tokens) {
        let breakdown = splitNoun(t, words);

        output.push({
            token: t,
            tree: breakdown
        });
    }

    return output;
}



// ================================
// 6. HIGH-LEVEL PROCESS FUNCTION
// ================================
export async function process(text) {
    const wordsData = await loadWords();
    const tokens = tokenize(text);
    const results = classify(tokens, wordsData);

    return results;
}
