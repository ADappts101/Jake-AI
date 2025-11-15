// ------------------------------
// Step 1: Load JSON Dictionary
// ------------------------------
export async function loadWords() {
    const res = await fetch("data/words.json");
    const data = await res.json();
    return data;
}



// ------------------------------
// Step 2: Basic Tokenizer
// Splits text into lowercase words
// ------------------------------
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

    if (current.length > 0) {
        tokens.push(current);
    }

    return tokens;
}



// ------------------------------
// Step 3: Classify each token as noun/unknown using words.json
// ------------------------------
export function classify(tokens, words) {
    let result = [];

    for (let t of tokens) {
        let first = t[0];
        let nounList = words.nouns[first] || [];

        if (nounList.includes(t)) {
            result.push({
                token: t,
                type: "noun"
            });
        } else {
            result.push({
                token: t,
                type: "unknown"
            });
        }
    }

    return result;
}



// ------------------------------
// INTERNAL UTILS
// ------------------------------
function isNoun(word, words) {
    let letter = word[0];
    return words.nouns[letter] && words.nouns[letter].includes(word);
}

function makeNode(value, type, children = []) {
    return {
        value: value,
        type: type,
        children: children
    };
}



// ------------------------------
// Step 4: Main Noun Splitter (TREE BUILDER)
// The heart of the tokenizer
// ------------------------------
export function splitNoun(word, words) {

    // ROOT of tree:
    let tree = {
        original: word,
        success: false,
        parts: []
    };

    // --------------------------------
    // 1. Irregular Plurals
    // --------------------------------
    if (words.irregular_plurals[word]) {
        let root = words.irregular_plurals[word];

        tree.success = true;
        tree.parts.push(makeNode(root, "plural_root_irregular"));
        return tree;
    }



    // --------------------------------
    // 2. Regular Plurals
    // --------------------------------
    let pluralCheck = checkRegularPlural(word, words);
    if (pluralCheck) {
        tree.success = true;
        tree.parts = pluralCheck; 
        return tree;
    }



    // --------------------------------
    // 3. Prefix Rule B
    // split only if second part is a valid noun
    // --------------------------------
    for (let prefix of words.prefixes) {
        if (word.startsWith(prefix)) {
            let rest = word.slice(prefix.length);

            if (rest.length > 0 && isNoun(rest, words)) {
                tree.success = true;
                tree.parts.push(makeNode(prefix, "prefix"));
                tree.parts.push(makeNode(rest, "noun"));
                return tree;
            }
        }
    }



    // --------------------------------
    // 4. Suffix Rule B
    // split only if root is a valid noun
    // --------------------------------
    for (let suffix of words.suffixes) {
        if (word.endsWith(suffix)) {
            let root = word.slice(0, -suffix.length);

            if (root.length > 0 && isNoun(root, words)) {
                tree.success = true;
                tree.parts.push(makeNode(root, "noun"));
                tree.parts.push(makeNode(suffix, "suffix"));
                return tree;
            }
        }
    }



    // --------------------------------
    // 5. Compound Splitting (strict mode)
    // must be EXACTLY 2 real nouns or roots
    // --------------------------------
    for (let i = 1; i < word.length - 1; i++) {
        let left = word.slice(0, i);
        let right = word.slice(i);

        if (isNoun(left, words) && isNoun(right, words)) {
            tree.success = true;
            tree.parts.push(makeNode(left, "compound_root"));
            tree.parts.push(makeNode(right, "compound_root"));
            return tree;
        }
    }



    // --------------------------------
    // 6. Fallback — unknown noun
    // --------------------------------
    tree.success = false;
    tree.parts.push(makeNode(word, "unknown"));
    return tree;
}



// ------------------------------
// Step 5: Regular Plural Logic
// ------------------------------
function checkRegularPlural(word, words) {
    // CASE: -ies
    if (word.endsWith("ies") && word.length > 3) {
        let root = word.slice(0, -3) + "y";
        if (isNoun(root, words)) {
            return [
                makeNode(root, "plural_root"),
                makeNode("ies", "plural_suffix")
            ];
        }
    }

    // CASE: -ves
    if (word.endsWith("ves") && word.length > 3) {
        let maybeF = word.slice(0, -3) + "f";
        let maybeFe = word.slice(0, -3) + "fe";

        if (isNoun(maybeF, words)) {
            return [
                makeNode(maybeF, "plural_root"),
                makeNode("ves", "plural_suffix")
            ];
        }

        if (isNoun(maybeFe, words)) {
            return [
                makeNode(maybeFe, "plural_root"),
                makeNode("ves", "plural_suffix")
            ];
        }
    }

    // CASE: -es
    if (word.endsWith("es") && word.length > 2) {
        let root = word.slice(0, -2);
        if (isNoun(root, words)) {
            return [
                makeNode(root, "plural_root"),
                makeNode("es", "plural_suffix")
            ];
        }
    }

    // CASE: -s
    if (word.endsWith("s") && word.length > 1) {
        let root = word.slice(0, -1);
        if (isNoun(root, words)) {
            return [
                makeNode(root, "plural_root"),
                makeNode("s", "plural_suffix")
            ];
        }
    }

    return null;
}


