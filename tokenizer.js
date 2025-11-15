export async function loadWords() {
    const res = await fetch("data/words.json");
    return await res.json();
}

// -----------------------------------------------------------
// TOKENIZER (split text → words)
// -----------------------------------------------------------
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

// -----------------------------------------------------------
// MAIN CLASSIFIER (token → noun tree)
// -----------------------------------------------------------
export function classify(tokens, words) {
    let results = [];

    for (let t of tokens) {
        let result = splitNoun(t, words);
        results.push(result);
    }

    return results;
}

// -----------------------------------------------------------
// WORD SPLITTER TREE LOGIC
// -----------------------------------------------------------
function splitNoun(word, dict) {
    let original = word;

    // 1. Irregular plural
    if (dict.irregular_plurals[word]) {
        return {
            original,
            success: true,
            parts: [
                {
                    value: dict.irregular_plurals[word],
                    type: "plural_root_irregular",
                    children: []
                }
            ]
        };
    }

    // 2. Regular plural
    let pluralCheck = checkRegularPlural(word, dict);
    if (pluralCheck) return pluralCheck;

    // 3. Prefix rule B
    let prefixCheck = checkPrefix(word, dict);
    if (prefixCheck) return prefixCheck;

    // 4. Suffix rule B
    let suffixCheck = checkSuffix(word, dict);
    if (suffixCheck) return suffixCheck;

    // 5. Compound split (loose)
    let compoundCheck = checkCompound(word, dict);
    if (compoundCheck) return compoundCheck;

    // 6. Fallback
    return {
        original,
        success: false,
        parts: [
            {
                value: original,
                type: "unknown",
                children: []
            }
        ]
    };
}

// -----------------------------------------------------------
// CHECK REGULAR PLURAL
// -----------------------------------------------------------
function checkRegularPlural(word, dict) {

    function isNoun(w) {
        let c = w[0];
        if (!dict.nouns[c]) return false;
        return dict.nouns[c].includes(w);
    }

    // ies → y
    if (word.endsWith("ies")) {
        let root = word.slice(0, -3) + "y";
        if (isNoun(root)) {
            return {
                original: word,
                success: true,
                parts: [
                    { value: root, type: "plural_root", children: [] },
                    { value: "ies", type: "plural_suffix", children: [] }
                ]
            };
        }
    }

    // ves → f/fe
    if (word.endsWith("ves")) {
        let root_f = word.slice(0, -3) + "f";
        let root_fe = word.slice(0, -3) + "fe";

        if (isNoun(root_f)) {
            return {
                original: word,
                success: true,
                parts: [
                    { value: root_f, type: "plural_root", children: [] },
                    { value: "ves", type: "plural_suffix", children: [] }
                ]
            };
        }

        if (isNoun(root_fe)) {
            return {
                original: word,
                success: true,
                parts: [
                    { value: root_fe, type: "plural_root", children: [] },
                    { value: "ves", type: "plural_suffix", children: [] }
                ]
            };
        }
    }

    // es
    if (word.endsWith("es")) {
        let root = word.slice(0, -2);
        if (isNoun(root)) {
            return {
                original: word,
                success: true,
                parts: [
                    { value: root, type: "plural_root", children: [] },
                    { value: "es", type: "plural_suffix", children: [] }
                ]
            };
        }
    }

    // s
    if (word.endsWith("s")) {
        let root = word.slice(0, -1);
        if (isNoun(root)) {
            return {
                original: word,
                success: true,
                parts: [
                    { value: root, type: "plural_root", children: [] },
                    { value: "s", type: "plural_suffix", children: [] }
                ]
            };
        }
    }

    return null;
}

// -----------------------------------------------------------
// CHECK PREFIX RULE B
// -----------------------------------------------------------
function checkPrefix(word, dict) {

    function isNoun(w) {
        let c = w[0];
        if (!dict.nouns[c]) return false;
        return dict.nouns[c].includes(w);
    }

    for (let p of dict.prefixes) {
        if (word.startsWith(p)) {
            let rest = word.slice(p.length);
            if (rest.length > 0 && isNoun(rest)) {
                return {
                    original: word,
                    success: true,
                    parts: [
                        { value: p, type: "prefix", children: [] },
                        { value: rest, type: "noun", children: [] }
                    ]
                };
            }
        }
    }
    return null;
}

// -----------------------------------------------------------
// CHECK SUFFIX RULE B
// -----------------------------------------------------------
function checkSuffix(word, dict) {

    function isNoun(w) {
        let c = w[0];
        if (!dict.nouns[c]) return false;
        return dict.nouns[c].includes(w);
    }

    for (let s of dict.suffixes) {
        if (word.endsWith(s)) {
            let root = word.slice(0, -s.length);
            if (root.length > 0 && isNoun(root)) {
                return {
                    original: word,
                    success: true,
                    parts: [
                        { value: root, type: "noun", children: [] },
                        { value: s, type: "suffix", children: [] }
                    ]
                };
            }
        }
    }
    return null;
}

// -----------------------------------------------------------
// CHECK COMPOUND (LOOSE MODE)
// -----------------------------------------------------------
function checkCompound(word, dict) {

    function isNoun(w) {
        let c = w[0];
        if (!dict.nouns[c]) return false;
        return dict.nouns[c].includes(w);
    }

    function isRoot(w) {
        return dict.compound_roots.includes(w) || isNoun(w);
    }

    for (let i = 1; i < word.length - 1; i++) {
        let left = word.slice(0, i);
        let right = word.slice(i);

        if (isRoot(left) && isRoot(right)) {
            return {
                original: word,
                success: true,
                parts: [
                    { value: left, type: "compound_root", children: [] },
                    { value: right, type: "compound_root", children: [] }
                ]
            };
        }
    }
    return null;
}
