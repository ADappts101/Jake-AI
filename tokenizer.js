// =====================================================
// 1. LOAD WORDS.JSON
// =====================================================
export async function loadWords() {
    const res = await fetch("data/words.json");
    if (!res.ok) throw new Error("Failed to load words.json");
    return await res.json();
}

// =====================================================
// 2. TOKENIZE TEXT INTO WORDS
// =====================================================
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

// =====================================================
// 3. CLASSIFY USING splitNoun()
// =====================================================
export function classify(tokens, words) {
    let result = [];

    for (let t of tokens) {
        let tree = splitNoun(t, words);
        result.push(tree);
    }

    return result;
}

// =====================================================
// HELPER: check if noun exists
// =====================================================
function nounExists(word, words) {
    let first = word[0];
    if (!words.nouns[first]) return false;
    return words.nouns[first].includes(word);
}

// =====================================================
// HELPER: create tree node
// =====================================================
function node(value, type, children = []) {
    return { value, type, children };
}

// =====================================================
// 4. MAIN: SPLIT NOUN INTO PREFIX / ROOT / SUFFIX / PLURAL / COMPOUND
// =====================================================
export function splitNoun(word, words) {
    let original = word.toLowerCase();

    // 1) irregular plural
    if (words.irregular_plurals[original]) {
        return {
            original,
            success: true,
            parts: [
                node(words.irregular_plurals[original], "plural_root_irregular")
            ]
        };
    }

    // 2) regular plural
    let reg = checkRegularPlural(original, words);
    if (reg) return reg;

    // 3) prefix rule B
    for (let p of words.prefixes) {
        if (original.startsWith(p)) {
            let rest = original.slice(p.length);
            if (nounExists(rest, words)) {
                return {
                    original,
                    success: true,
                    parts: [
                        node(p, "prefix"),
                        node(rest, "noun")
                    ]
                };
            }
        }
    }

    // 4) suffix rule B
    for (let s of words.suffixes) {
        if (original.endsWith(s)) {
            let root = original.slice(0, original.length - s.length);
            if (nounExists(root, words)) {
                return {
                    original,
                    success: true,
                    parts: [
                        node(root, "noun"),
                        node(s, "suffix")
                    ]
                };
            }
        }
    }

    // 5) compound splitting (loose mode)
    for (let i = 2; i < original.length - 1; i++) {
        let left = original.slice(0, i);
        let right = original.slice(i);

        if (nounExists(left, words) && nounExists(right, words)) {
            return {
                original,
                success: true,
                parts: [
                    node(left, "compound_root"),
                    node(right, "compound_root")
                ]
            };
        }
    }

    // fallback
    return {
        original,
        success: false,
        parts: [node(original, "unknown")]
    };
}

// =====================================================
// REGULAR PLURAL CHECKS
// =====================================================
function checkRegularPlural(word, words) {
    // -ies → y
    if (word.endsWith("ies")) {
        let root = word.slice(0, -3) + "y";
        if (nounExists(root, words))
            return {
                original: word,
                success: true,
                parts: [
                    node(root, "plural_root"),
                    node("ies", "plural_suffix")
                ]
            };
    }

    // -ves → f or fe
    if (word.endsWith("ves")) {
        let root1 = word.slice(0, -3) + "f";
        let root2 = word.slice(0, -3) + "fe";

        if (nounExists(root1, words))
            return {
                original: word,
                success: true,
                parts: [
                    node(root1, "plural_root"),
                    node("ves", "plural_suffix")
                ]
            };

        if (nounExists(root2, words))
            return {
                original: word,
                success: true,
                parts: [
                    node(root2, "plural_root"),
                    node("ves", "plural_suffix")
                ]
            };
    }

    // -es
    if (word.endsWith("es")) {
        let root = word.slice(0, -2);
        if (nounExists(root, words))
            return {
                original: word,
                success: true,
                parts: [
                    node(root, "plural_root"),
                    node("es", "plural_suffix")
                ]
            };
    }

    // -s
    if (word.endsWith("s")) {
        let root = word.slice(0, -1);
        if (nounExists(root, words))
            return {
                original: word,
                success: true,
                parts: [
                    node(root, "plural_root"),
                    node("s", "plural_suffix")
                ]
            };
    }

    return null;
}
