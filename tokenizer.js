// tokenizer.js
// SAME as yours — only small clean fixes.

export async function loadWords(path = "data/words.json") {
  const res = await fetch(path);
  if (!res.ok) throw new Error("Failed to load words.json");
  return await res.json();
}

export function tokenize(text) {
  const tokens = [];
  let cur = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const lower = ch.toLowerCase();
    if (lower >= "a" && lower <= "z") {
      cur += lower;
    } else {
      if (cur) {
        tokens.push(cur);
        cur = "";
      }
    }
  }
  if (cur) tokens.push(cur);
  return tokens;
}

function isNoun(w, words) {
  if (!w) return false;
  const list = words.nouns[w[0]];
  return list ? list.includes(w) : false;
}

export function splitNoun(original, words) {
  const word = (original || "").toLowerCase();

  const tree = {
    original,
    success: false,
    parts: []
  };

  if (!word) {
    tree.parts.push({ value: "", type: "unknown", children: [] });
    return tree;
  }

  // exact noun
  if (isNoun(word, words)) {
    tree.success = true;
    tree.parts.push({ value: word, type: "noun", children: [] });
    return tree;
  }

  // irregular
  if (words.irregular_plurals[word]) {
    tree.success = true;
    tree.parts.push({
      value: words.irregular_plurals[word],
      type: "plural_root_irregular",
      children: []
    });
    return tree;
  }

  // plural roots
  const tries = [];
  if (word.endsWith("ies")) tries.push({ root: word.slice(0, -3) + "y", suffix: "ies" });
  if (word.endsWith("ves")) {
    tries.push({ root: word.slice(0, -3) + "f", suffix: "ves" });
    tries.push({ root: word.slice(0, -3) + "fe", suffix: "ves" });
  }
  if (word.endsWith("es")) tries.push({ root: word.slice(0, -2), suffix: "es" });
  if (word.endsWith("s")) tries.push({ root: word.slice(0, -1), suffix: "s" });

  for (const t of tries) {
    if (isNoun(t.root, words)) {
      tree.success = true;
      tree.parts.push({ value: t.root, type: "plural_root", children: [] });
      tree.parts.push({ value: t.suffix, type: "plural_suffix", children: [] });
      return tree;
    }
  }

  // prefix rule
  for (const p of words.prefixes) {
    if (word.startsWith(p)) {
      const rest = word.slice(p.length);
      if (isNoun(rest, words)) {
        tree.success = true;
        tree.parts.push({ value: p, type: "prefix", children: [] });
        tree.parts.push({ value: rest, type: "noun", children: [] });
        return tree;
      }
    }
  }

  // suffix rule
  for (const s of words.suffixes) {
    if (word.endsWith(s)) {
      const left = word.slice(0, -s.length);
      if (isNoun(left, words)) {
        tree.success = true;
        tree.parts.push({ value: left, type: "noun", children: [] });
        tree.parts.push({ value: s, type: "suffix", children: [] });
        return tree;
      }
    }
  }

  // compound
  const roots = new Set(words.compound_roots);
  const cand = [];
  for (let i = 2; i < word.length - 1; i++) {
    const L = word.slice(0, i);
    const R = word.slice(i);

    const LN = isNoun(L, words);
    const RN = isNoun(R, words);
    const LR = roots.has(L);
    const RR = roots.has(R);

    if (LN && RN) cand.push({ L, R, s: 3 });
    else if (LN && RR) cand.push({ L, R, s: 2 });
    else if (LR && RN) cand.push({ L, R, s: 2 });
    else if (LR && RR) cand.push({ L, R, s: 1 });
  }

  if (cand.length) {
    cand.sort((a, b) => b.s - a.s);
    const pick = cand[0];
    tree.success = true;
    tree.parts.push({ value: pick.L, type: "compound_root", children: [] });
    tree.parts.push({ value: pick.R, type: "compound_root", children: [] });
    return tree;
  }

  // fallback
  tree.parts.push({ value: word, type: "unknown", children: [] });
  return tree;
}

export async function processText(text, dictPath = "data/words.json") {
  const words = await loadWords(dictPath);
  return tokenize(text).map(t => splitNoun(t, words));
}

export async function demo(t) {
  console.log(JSON.stringify(await processText(t), null, 2));
}
