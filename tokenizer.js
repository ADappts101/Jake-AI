// tokenizer.js
// Pure JS tokenizer + noun splitter (no libs). Exports: loadWords, tokenize, splitNoun, processText

// ---------- Load dictionary ----------
export async function loadWords(path = "data/words.json") {
  const res = await fetch(path);
  if (!res.ok) throw new Error("Failed to load words.json");
  return await res.json();
}

// ---------- Simple character-level tokenizer ----------
// returns lowercase word tokens (letters a-z)
export function tokenize(text) {
  const tokens = [];
  let cur = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const lower = ch.toLowerCase();
    if (lower >= "a" && lower <= "z") {
      cur += lower;
    } else {
      if (cur.length) {
        tokens.push(cur);
        cur = "";
      }
    }
  }
  if (cur.length) tokens.push(cur);
  return tokens;
}

// ---------- Helper: quick noun check ----------
function isNoun(word, words) {
  if (!word || word.length === 0) return false;
  const first = word[0];
  const list = words.nouns?.[first];
  if (!list) return false;
  return list.includes(word);
}

// ---------- splitNoun: returns the breakdown tree for ONE word ----------
export function splitNoun(wordOrig, words) {
  const word = (wordOrig || "").toLowerCase();
  const tree = {
    original: wordOrig,
    success: false,
    parts: []
  };

  if (!word) {
    tree.parts.push({ value: "", type: "unknown", children: [] });
    return tree;
  }

  // quick hit: exact noun
  if (isNoun(word, words)) {
    tree.success = true;
    tree.parts.push({ value: word, type: "noun", children: [] });
    return tree;
  }

  // 1) Irregular plurals map
  const irr = words.irregular_plurals || {};
  if (irr[word]) {
    tree.success = true;
    tree.parts.push({
      value: irr[word],
      type: "plural_root_irregular",
      children: []
    });
    return tree;
  }

  // 2) Regular plural rules (try multiple candidates and check dictionary)
  // order: ies -> y, ves -> f/fe, es, s
  const tryRoots = [];

  if (word.endsWith("ies") && word.length > 3) {
    tryRoots.push({ root: word.slice(0, -3) + "y", suffix: "ies" });
  }
  if (word.endsWith("ves") && word.length > 3) {
    tryRoots.push({ root: word.slice(0, -3) + "f", suffix: "ves" });
    tryRoots.push({ root: word.slice(0, -3) + "fe", suffix: "ves" });
  }
  if (word.endsWith("es") && word.length > 2) {
    tryRoots.push({ root: word.slice(0, -2), suffix: "es" });
  }
  if (word.endsWith("s") && word.length > 1) {
    tryRoots.push({ root: word.slice(0, -1), suffix: "s" });
  }

  for (const candidate of tryRoots) {
    if (isNoun(candidate.root, words)) {
      tree.success = true;
      tree.parts.push({
        value: candidate.root,
        type: "plural_root",
        children: []
      });
      tree.parts.push({
        value: candidate.suffix,
        type: "plural_suffix",
        children: []
      });
      return tree;
    }
  }

  // 3) Prefix rule B: split only if remainder is a noun
  const prefixes = words.prefixes || [];
  for (const p of prefixes) {
    if (word.startsWith(p) && p.length < word.length - 1) {
      const rest = word.slice(p.length);
      if (isNoun(rest, words)) {
        tree.success = true;
        tree.parts.push({ value: p, type: "prefix", children: [] });
        tree.parts.push({ value: rest, type: "noun", children: [] });
        return tree;
      }
    }
  }

  // 4) Suffix rule B: split only if left part is a noun
  const suffixes = words.suffixes || [];
  for (const s of suffixes) {
    if (word.endsWith(s) && s.length < word.length - 1) {
      const left = word.slice(0, word.length - s.length);
      if (isNoun(left, words)) {
        tree.success = true;
        tree.parts.push({ value: left, type: "noun", children: [] });
        tree.parts.push({ value: s, type: "suffix", children: [] });
        return tree;
      }
    }
  }

  // 5) Compound splitting (LOOSE): try every split; prefer both parts nouns,
  // if none, accept split where one side is in compound_roots
  const compoundRoots = new Set(words.compound_roots || []);
  const len = word.length;
  const candidates = [];

  for (let i = 2; i <= len - 2; i++) {
    const left = word.slice(0, i);
    const right = word.slice(i);

    const leftIsN = isNoun(left, words);
    const rightIsN = isNoun(right, words);
    const leftIsRoot = compoundRoots.has(left);
    const rightIsRoot = compoundRoots.has(right);

    if (leftIsN && rightIsN) {
      // best candidate
      candidates.unshift({ left, right, score: 3 });
    } else if (leftIsN && rightIsRoot) {
      candidates.push({ left, right, score: 2 });
    } else if (leftIsRoot && rightIsN) {
      candidates.push({ left, right, score: 2 });
    } else if (leftIsRoot && rightIsRoot) {
      candidates.push({ left, right, score: 1 });
    } else {
      // loose rule: allow split if each side length >=3 (avoid tiny splits)
      if (left.length >= 3 && right.length >= 3) {
        candidates.push({ left, right, score: 0 });
      }
    }
  }

  // pick best candidate by highest score, else none
  if (candidates.length > 0) {
    candidates.sort((a, b) => b.score - a.score); // highest score first
    const pick = candidates[0];
    tree.success = true;
    tree.parts.push({ value: pick.left, type: "compound_root", children: [] });
    tree.parts.push({ value: pick.right, type: "compound_root", children: [] });
    return tree;
  }

  // 6) fallback: return unknown single part
  tree.parts.push({ value: word, type: "unknown", children: [] });
  tree.success = false;
  return tree;
}

// ---------- processText: tokenize sentence and split each token ----------
export async function processText(text, dictPath = "data/words.json") {
  const words = await loadWords(dictPath);
  const tokens = tokenize(text);
  const results = tokens.map(tok => splitNoun(tok, words));
  return results;
}

// ---------- small helper for quick testing in console ----------
export async function demo(text) {
  const out = await processText(text);
  console.log(JSON.stringify(out, null, 2));
  return out;
}
