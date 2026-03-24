/**
 * AI Creator Studio — mock generator (no backend)
 * Topic OR image; style: viral | emotional | funny | luxury | minimal
 * Image mode: uses file name, dimensions, and simple color sampling (not true vision).
 */
(function () {
  "use strict";

  var STYLES = ["viral", "emotional", "funny", "luxury", "minimal"];
  var MAX_IMAGE_BYTES = 50 * 1024 * 1024;

  function normalizeTopic(raw) {
    var t = (raw || "").trim();
    if (!t) return "";
    return t.length > 80 ? t.slice(0, 80) + "…" : t;
  }

  function hashString(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) {
      h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
  }

  function pick(arr, seed, index) {
    if (!arr.length) return "";
    var i = (seed + index * 17) % arr.length;
    return arr[i];
  }

  function slugPart(text) {
    return (text || "content")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .join("") || "viral";
  }

  /** "IMG_1234.jpg" -> "img 1234"; "my-coffee-shop.png" -> "my coffee shop" */
  function humanLabelFromFileName(name) {
    var base = (name || "").replace(/^.*[\\/]/, "").replace(/\.[^.]+$/i, "");
    base = base.replace(/[_\-]+/g, " ").replace(/\s+/g, " ").trim();
    if (!base) return "this photo";
    return base.toLowerCase();
  }

  function displayLabel(humanLabel) {
    if (!humanLabel || humanLabel === "this photo") return "This shot";
    return humanLabel.charAt(0).toUpperCase() + humanLabel.slice(1);
  }

  function orientPhrase(w, h) {
    if (!w || !h) return "this layout";
    var r = w / h;
    if (r < 0.72) return "vertical framing (strong for TikTok / Shorts)";
    if (r > 1.35) return "wide horizontal framing";
    if (r > 0.92 && r < 1.08) return "square framing";
    return "mixed aspect ratio";
  }

  function sampleImageMeta(file, callback) {
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      var w = img.naturalWidth || 0;
      var h = img.naturalHeight || 0;
      var canvas = document.createElement("canvas");
      var s = 48;
      canvas.width = s;
      canvas.height = s;
      var ctx = canvas.getContext("2d");
      var mood = "";
      var contrastNote = "";
      try {
        ctx.drawImage(img, 0, 0, s, s);
        var data = ctx.getImageData(0, 0, s, s).data;
        var n = data.length / 4;
        var sumL = 0;
        var sumS = 0;
        var lums = [];
        for (var i = 0; i < data.length; i += 4) {
          var r = data[i];
          var g = data[i + 1];
          var b = data[i + 2];
          var L = 0.299 * r + 0.587 * g + 0.114 * b;
          lums.push(L);
          sumL += L;
          var mx = Math.max(r, g, b);
          var mn = Math.min(r, g, b);
          sumS += mx === 0 ? 0 : (mx - mn) / mx;
        }
        var avgL = sumL / n;
        var avgS = sumS / n;
        var varL = 0;
        for (var j = 0; j < lums.length; j++) {
          var d = lums[j] - avgL;
          varL += d * d;
        }
        varL = Math.sqrt(varL / n);
        if (avgL > 185) mood = "bright, airy overall tone";
        else if (avgL < 70) mood = "dark, moody overall tone";
        else mood = "balanced brightness";
        mood +=
          ", " +
          (avgS > 0.35 ? "vivid color" : avgS > 0.15 ? "natural color" : "muted color");
        contrastNote = varL > 55 ? "strong contrast" : varL < 25 ? "soft, low contrast" : "medium contrast";
      } catch (e) {
        mood = "visual tone (sample unavailable)";
        contrastNote = "";
      }
      URL.revokeObjectURL(url);
      callback({
        width: w,
        height: h,
        mood: mood,
        contrast: contrastNote
      });
    };
    img.onerror = function () {
      URL.revokeObjectURL(url);
      callback({ width: 0, height: 0, mood: "", contrast: "" });
    };
    img.src = url;
  }

  function hooksTopic(topic, style, seed) {
    var byStyle = {
      viral: [
        "Stop scrolling — " + topic + " has a plot twist you did not expect.",
        "3 seconds: everything you believe about " + topic + " is about to change.",
        "Nobody talks about this part of " + topic + " (but they should).",
        "If " + topic + " is your niche, this is your unfair advantage.",
        "This " + topic + " format is blowing up — here is the recipe.",
        "POV: you finally crack " + topic + " and the algorithm notices.",
        "The biggest mistake in " + topic + " content? Wasting the first second.",
        "Save this if " + topic + " is your 2025 growth bet.",
        "Hot take: " + topic + " is not crowded — boring hooks are.",
        "Watch twice: one line that reframes " + topic + " completely."
      ],
      emotional: [
        "Honest moment about " + topic + " — no filters, just truth.",
        "If " + topic + " ever felt heavy, this one is for you.",
        "You are not behind in " + topic + ". You are human.",
        "Small win in " + topic + " that still counts — celebrate it.",
        "The part of " + topic + " people rarely say out loud.",
        "This is the reminder you needed about " + topic + " today.",
        "You deserve to feel proud of your " + topic + " journey.",
        "Quiet progress in " + topic + " is still progress.",
        "When " + topic + " feels messy, start with one gentle step.",
        "Your story around " + topic + " matters — tell it."
      ],
      funny: [
        "Me explaining " + topic + " to my brain at 2am.",
        "My " + topic + " plan vs reality — a short documentary.",
        "Tell me you do " + topic + " without telling me… I'll go first.",
        "If " + topic + " was easy, everyone would be… oh wait.",
        "Plot twist: " + topic + " was the main character all along.",
        "That awkward moment when " + topic + " actually works.",
        "I did not choose " + topic + "; " + topic + " chose my calendar.",
        "Running on caffeine and " + topic + " ideas — send help.",
        "Breaking: local human attempts " + topic + ", survives.",
        "Rating my " + topic + " ideas: this one is a solid 11/10 delusion."
      ],
      luxury: [
        "Refined take: " + topic + " done with intention, not noise.",
        "Quiet luxury meets " + topic + " — less hype, more craft.",
        "Elevate the narrative around " + topic + " in one clean line.",
        "For those who treat " + topic + " as an art form.",
        "Understated. Precise. " + topic + " with timeless appeal.",
        "A signature perspective on " + topic + " — curated for your feed.",
        "Polished, minimal, unforgettable: " + topic + " edition.",
        "The elevated standard for " + topic + " content starts here.",
        "Crafted details. Thoughtful pacing. " + topic + " reimagined.",
        "Where quality meets " + topic + " — no excess, all signal."
      ],
      minimal: [
        topic + ".",
        "On " + topic + ".",
        "Notes on " + topic + ".",
        "Less noise. More " + topic + ".",
        "One idea: " + topic + ".",
        "Simple truth about " + topic + ".",
        topic + " — clear and direct.",
        "Focus: " + topic + ".",
        "Strip it back. " + topic + ".",
        "Start here: " + topic + "."
      ]
    };
    var pool = byStyle[style] || byStyle.viral;
    var out = [];
    for (var i = 0; i < 5; i++) out.push(pick(pool, seed, i));
    return out;
  }

  function hooksImage(style, seed, meta) {
    var L = meta.displayLabel;
    var orient = meta.orientPhrase;
    var mood = meta.mood || "a distinct visual mood";
    var contrast = meta.contrast ? meta.contrast + ", " : "";
    var fileHint = meta.humanLabel !== "this photo" ? ' (from your file name: "' + meta.humanLabel + '")' : "";

    var viral = [
      L + fileHint + " — " + orient + ". " + contrast + mood + " — that combo is built to stop the scroll.",
      "This frame screams " + L + ": " + orient + ", " + mood + ". Pair it with a caption that sounds like a headline.",
      "Your photo already did the hard part (" + orient + "). Now add one line people want to quote.",
      "Plot twist: " + L + " hits harder when the visual shows " + mood + " — lean into it in the first second.",
      "Save this template: strong image + " + orient + " + one bold claim about " + L + "."
    ];
    var emotional = [
      "There is a real story in " + L + " — " + orient + ", " + mood + ". You do not have to explain everything; let them feel it.",
      "Some photos do not need a perfect caption — this one (" + mood + ") just needs honesty.",
      "If " + L + " matters to you, this frame (" + orient + ") is enough proof you are showing up.",
      "Soft moment, loud impact: " + mood + " in a " + orient + " shot.",
      "Let people meet you through " + L + " — one line from the heart beats ten lines of hype."
    ];
    var funny = [
      "My camera roll: 200 attempts. The algorithm: this " + L + " one. Typical.",
      "Me: 'just one quick pic of " + L + "'. Also me: " + orient + ", drama, snacks.",
      "This photo said " + L + ". My Wi‑Fi said 'loading'. We are not the same.",
      "If " + L + " was easy, my gallery would not look like a crime scene.",
      "POV: " + orient + " and " + mood + " — main character energy, minor character sleep schedule."
    ];
    var luxury = [
      L + ", " + orient + ": composition and restraint. Let " + mood + " do the talking.",
      "Quiet confidence — " + mood + ", " + orient + ". No loud caption required… almost.",
      "Elevated feed energy: " + L + " captured with intentional framing (" + orient + ").",
      "Craft is visible here: " + contrast + mood + ". Match it with precise language.",
      "Timeless, not trendy — " + L + " in a " + orient + " frame."
    ];
    var minimal = [
      L + ".",
      orient + ".",
      "One frame: " + mood + ".",
      L + " — " + orient + ".",
      "Less setup. More " + L + "."
    ];

    var byStyle = { viral: viral, emotional: emotional, funny: funny, luxury: luxury, minimal: minimal };
    var pool = byStyle[style] || viral;
    var generics = [
      "This visual is doing numbers — here is why it stops the scroll.",
      "The first frame already won. Wait for the caption twist.",
      "Proof that one strong shot beats ten mediocre posts."
    ];
    var merged = pool.concat(generics);
    var out = [];
    for (var i = 0; i < 5; i++) out.push(pick(merged, seed, i));
    return out;
  }

  function captionsTopic(topic, style, seed) {
    var byStyle = {
      viral: [
        "Stop guessing what to post about " +
          topic +
          ". Lead with curiosity, drop a bold line, end with a save-worthy CTA — that is the loop that wins.",
        topic +
          " content wins when the first sentence feels like a pattern interrupt. Try this: one claim, one proof, one question in the comments.",
        "If " +
          topic +
          " is your niche, your caption should feel like a trailer, not a essay. Short beats, strong pacing, one clear next step.",
        "Hot take: " +
          topic +
          " is not saturated — weak hooks are. Rewrite the opener three times and pick the one that feels almost too direct.",
        "Algorithm-friendly tip for " +
          topic +
          ": speak to one person, name one pain, promise one outcome. Specificity reads as confidence."
      ],
      emotional: [
        "If " +
          topic +
          " has felt overwhelming lately, you are allowed to move slower. Share the real version — people connect to honesty before polish.",
        "This post is for anyone building something around " +
          topic +
          " without a blueprint. You are not late; you are learning in public.",
        "A gentle reminder: progress in " +
          topic +
          " does not have to look loud. Small steps still move mountains.",
        "You do not need permission to care deeply about " +
          topic +
          ". Say what you mean. Invite people into the conversation.",
        "Behind every " +
          topic +
          " post there is a human story. Lead with the feeling first — the likes follow."
      ],
      funny: [
        "My relationship with " +
          topic +
          " is mostly optimism, mild panic, and surprisingly good lighting. If you relate, we are officially friends.",
        "I told myself I would keep this " +
          topic +
          " caption serious. Anyway, here we are.",
        "Plot twist: I attempted " +
          topic +
          " and survived with dignity mostly intact.",
        "If " +
          topic +
          " was a group project, I would be the one doing the slides and the emotional labor.",
        "Breaking news: local human tries " +
          topic +
          ", consumes coffee, posts anyway. More at 11."
      ],
      luxury: [
        "A considered perspective on " +
          topic +
          ": prioritize clarity, refine the tone, and let quality signal trust more than volume ever could.",
        "Understated, intentional, precise — that is how we talk about " +
          topic +
          " when the brand values craft over noise.",
        "Elevate the narrative: " +
          topic +
          " is not a trend here; it is a standard.",
        "Less hype, more discernment. " +
          topic +
          " deserves captions that feel timeless.",
        "Polished does not mean cold. " +
          topic +
          ", delivered with warmth and restraint."
      ],
      minimal: [
        topic + ".",
        "On " + topic + " today.",
        "One line: " + topic + " matters.",
        "Keeping it simple — " + topic + ".",
        "Focus. " + topic + "."
      ]
    };
    var pool = byStyle[style] || byStyle.viral;
    var out = [];
    for (var i = 0; i < 5; i++) out.push(pick(pool, seed + 11, i));
    return out;
  }

  function captionsImage(style, seed, meta) {
    var L = meta.displayLabel;
    var orient = meta.orientPhrase;
    var mood = meta.mood || "its own visual mood";
    var contrast = meta.contrast || "natural contrast";
    var dims =
      meta.width && meta.height ? " (" + meta.width + "×" + meta.height + " px)" : "";

    var viral = [
      "Posting " +
        L +
        dims +
        ": your image uses " +
        orient +
        " with " +
        mood +
        " and " +
        contrast +
        ". Lead with what we see first, then one CTA that feels inevitable.",
      "This shot’s edge is visual: " +
        orient +
        ", " +
        mood +
        ". Caption job = one bold line + one question — let the photo carry the rest.",
      "Algorithm tip: images with " +
        contrast +
        " and " +
        mood +
        " often win saves. Name the feeling in one sentence, then tell them what to do next.",
      L +
        " reads instantly because of the framing (" +
        orient +
        "). Add a second line that sounds like insider knowledge.",
      "Your photo did the hook. Add: stakes + proof + CTA — all in 3 short lines, tuned to " + mood + "."
    ];
    var emotional = [
      "Whatever " +
        L +
        " means to you — this frame (" +
        orient +
        ", " +
        mood +
        ") can hold it. You do not owe a long story; you owe a true one.",
      "Some posts are not about polish. This one is about presence: " + mood + ", quietly powerful.",
      "If this image slowed you down for a second, write from that feeling. People will recognize it.",
      "There is room to be human here: " + orient + ", " + mood + " — invite them into the moment.",
      "Let the picture breathe. One gentle line about " + L + " is enough to start a thread in the comments."
    ];
    var funny = [
      "The photo: " +
        L +
        ", " +
        orient +
        ", " +
        mood +
        ". Me: pretending I meant it on the first try.",
      "My camera roll after this shoot: chaos. This post: curated lies. We love balance.",
      "Caption loading… just kidding, the image already said " + L + " better than I can.",
      "If this flopped I would delete my app. If it pops I would say 'effortless'.",
      "Energy: " + mood + ". Sleep schedule: deprecated."
    ];
    var luxury = [
      L +
        " — " +
        orient +
        ", " +
        mood +
        ". Keep the caption sharp: one refined observation, one calm invitation.",
      "Composition speaks first (" +
        contrast +
        "). Add language that feels intentional, not loud.",
      "Understated wins: let " + mood + " shine, then close with a single confident line.",
      "Quality is visible in the pixels — match it with diction that feels edited, not rushed.",
      "Polished feed, quiet power: " + orient + " framing with " + mood + "."
    ];
    var minimal = [
      L + ".",
      orient + ".",
      mood + ".",
      "This frame.",
      L + " — say less."
    ];

    var byStyle = { viral: viral, emotional: emotional, funny: funny, luxury: luxury, minimal: minimal };
    var pool = byStyle[style] || viral;
    var fallback = [
      "Your photo did the heavy lifting — add a line that feels like a headline.",
      "Let the picture lead, then drop one question in the last line."
    ];
    var merged = pool.concat(fallback);
    var out = [];
    for (var i = 0; i < 5; i++) out.push(pick(merged, seed + 11, i));
    return out;
  }

  function hashtagsFor(topicOrSlug, style, seed, isImage, humanLabel) {
    var base = isImage ? slugPart(humanLabel) + slugPart(style) : slugPart(topicOrSlug);
    if (base.length > 24) base = base.slice(0, 24);
    var words = (humanLabel || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .trim()
      .split(/\s+/)
      .filter(function (w) {
        return w.length > 2;
      })
      .slice(0, 3);
    var pool = [
      "#" + base,
      "#" + base + "2025",
      "#" + style + "content",
      "#viral",
      "#fyp",
      "#reels",
      "#shorts",
      "#creator",
      "#socialmedia",
      "#growth",
      "#aesthetic",
      "#brand",
      "#contentcreator",
      "#instagram",
      "#tiktok",
      "#explore",
      "#trending"
    ];
    for (var w = 0; w < words.length; w++) {
      pool.push("#" + words[w]);
    }
    var out = [];
    var used = {};
    var idx = 0;
    while (out.length < 10 && idx < 80) {
      var tag = pick(pool, seed + idx * 3, idx);
      if (!used[tag]) {
        used[tag] = true;
        out.push(tag);
      }
      idx++;
    }
    while (out.length < 10) {
      out.push("#content" + out.length);
    }
    return out;
  }

  function reelScript(topic, style, seed, isImage, meta) {
    var open;
    var mid;
    if (isImage && meta) {
      open =
        "[0-2s] Full-screen photo + text: '" +
        meta.displayLabel +
        "' — quick zoom on focal point (" +
        meta.orientPhrase +
        ")";
      mid =
        "[2-8s] Voiceover ties the mood to the viewer: mention " +
        (meta.mood || "the vibe") +
        " + one takeaway";
    } else {
      open =
        "[0-2s] Face cam + bold text: '" +
        pick(hooksTopic(topic, style, seed), seed, 0).slice(0, 42) +
        "…'";
      mid = "[2-8s] 3 quick tips about " + topic + " — one word each on screen";
    }
    var lines = [
      open,
      mid,
      "[8-14s] Social proof line: 'This is the kind of post people save'",
      "[14-20s] CTA: comment ONE word + follow for part 2",
      "[20-25s] End card: handle + 'Style: " + style + "'"
    ];
    return lines.join("\n");
  }

  function viralScore(seed, style, hasTopic) {
    var base = 52 + (seed % 32) + (STYLES.indexOf(style) >= 0 ? STYLES.indexOf(style) * 2 : 0);
    if (hasTopic) base += 4;
    return Math.min(97, Math.max(41, base));
  }

  function viralExplanation(score, style, imageNote) {
    var tail =
      " Tone goal: " +
      style +
      " — keep hooks and captions aligned with that voice.";
    var img = imageNote ? " " + imageNote : "";
    if (score >= 85) return "Strong potential: clear hook plus a decisive CTA." + img + tail;
    if (score >= 72) return "Solid package: tighten the first line and you are in viral range." + img + tail;
    if (score >= 60) return "Good baseline: add contrast (visual or wording) to lift saves and shares." + img + tail;
    return "Room to grow: shorten the opener and test a bolder second sentence." + img + tail;
  }

  window.AICreatorMock = {
    STYLES: STYLES,
    MAX_IMAGE_BYTES: MAX_IMAGE_BYTES,
    sampleImageMeta: sampleImageMeta,
    generate: function (opts) {
      var style = opts.style && STYLES.indexOf(opts.style) >= 0 ? opts.style : "viral";
      var hasImage = !!opts.hasImage;
      var topic = normalizeTopic(opts.topic || "");
      var imageName = (opts.imageName || "photo").toString();
      var im = opts.imageMeta || null;

      var humanLabel = humanLabelFromFileName(imageName);
      var displayL = displayLabel(humanLabel);
      var orient = im && im.width ? orientPhrase(im.width, im.height) : orientPhrase(0, 0);
      var seedKey =
        hasImage && im
          ? "img:" + imageName + ":" + style + ":" + im.width + "x" + im.height + ":" + (im.mood || "")
          : hasImage
            ? "img:" + imageName + ":" + style
            : topic || "empty";
      var seed = hashString(seedKey.toLowerCase());

      var meta = {
        humanLabel: humanLabel,
        displayLabel: displayL,
        orientPhrase: orient,
        mood: im ? im.mood : "",
        contrast: im ? im.contrast : "",
        width: im ? im.width : 0,
        height: im ? im.height : 0
      };

      var hooks = hasImage ? hooksImage(style, seed, meta) : hooksTopic(topic || "your niche", style, seed);
      var captions = hasImage ? captionsImage(style, seed, meta) : captionsTopic(topic || "your niche", style, seed);
      var hashtags = hashtagsFor(hasImage ? imageName : topic, style, seed, hasImage, humanLabel);
      var reel = reelScript(topic || "your topic", style, seed, hasImage, hasImage ? meta : null);
      var score = viralScore(seed, style, !hasImage && !!topic);

      var imageNote = hasImage
        ? "Image mode uses file name + layout + a quick color sample — not full scene AI; hook real vision later for tighter relevance."
        : "";

      return {
        mode: hasImage ? "image" : "topic",
        style: style,
        hooks: hooks,
        captions: captions,
        optimized_caption: captions.length ? captions[0] : "",
        hashtags: hashtags,
        reelScript: reel,
        viralScore: score,
        viralExplanation: viralExplanation(score, style, imageNote)
      };
    },

    viralIdeaCardsByPlatform: function (platform) {
      var p = String(platform || "instagram").toLowerCase();
      var seed = hashString(p);
      var cards = {
        instagram: [
          {
            title: "Stop scrolling — this Reel pattern still wins in 2025",
            description: "3-second text hook + jump-cut B-roll of your process. End with ‘save for later’ CTA.",
            format: "Reels — text-on-screen + montage",
            viral_score: 88
          },
          {
            title: "Before / after carousel they can’t swipe past",
            description: "Slide 1 problem, slides 2–4 micro-tips, last slide CTA + comment prompt.",
            format: "Carousel",
            viral_score: 84
          },
          {
            title: "Day-in-the-life: 15 seconds, zero fluff",
            description: "POV morning routine tied to your niche; one honest voiceover line.",
            format: "POV / talking head",
            viral_score: 81
          },
          {
            title: "The myth everyone in your niche believes",
            description: "Talking head debunk + on-screen bullet proof. Ask ‘agree?’ in caption.",
            format: "Talking head",
            viral_score: 86
          },
          {
            title: "Trend audio + your twist in the first frame",
            description: "Match beat drops to transformation or reveal; show face in frame 1.",
            format: "Trend lip-sync / transition",
            viral_score: 83
          }
        ],
        tiktok: [
          {
            title: "POV: you finally tried the thing everyone debates",
            description: "Start mid-action; add on-screen caption that names the controversy in 6 words.",
            format: "POV skit",
            viral_score: 90
          },
          {
            title: "Storytime that ends in a twist in 12 seconds",
            description: "Fast cuts, one sentence per beat, last line reframes the whole story.",
            format: "Storytime + jump cuts",
            viral_score: 87
          },
          {
            title: "Green screen hot take over a screenshot",
            description: "React to a comment, headline, or competitor post — add your nuance.",
            format: "Green screen reaction",
            viral_score: 85
          },
          {
            title: "‘Things I’d never do again’ list (niche edition)",
            description: "Quick listicle with finger-point + text; invite stitches with their #1.",
            format: "List + talking head",
            viral_score: 82
          },
          {
            title: "Silent tutorial — captions carry the story",
            description: "No voice, satisfying process shots; text explains each step.",
            format: "Silent montage",
            viral_score: 84
          }
        ],
        youtube_shorts: [
          {
            title: "One mistake costing you views (fixed in 20s)",
            description: "Hook with a bold claim, show old vs new behavior, end with subscribe reminder.",
            format: "Talking head",
            viral_score: 89
          },
          {
            title: "Split-screen: wrong way vs right way",
            description: "Parallel clips — great for tutorials; keep labels huge and readable.",
            format: "Split-screen demo",
            viral_score: 86
          },
          {
            title: "Clip from long video with ‘full story in bio’",
            description: "Tease the best moment; loop-friendly ending for replays.",
            format: "Clip + end card",
            viral_score: 80
          },
          {
            title: "Rapid-fire Q&A from comments",
            description: "Answer 3 questions in 30s; number each on screen.",
            format: "Q&A montage",
            viral_score: 83
          },
          {
            title: "Watch the result in the last 2 seconds",
            description: "Build curiosity for 25s, payoff reveal; strong retention curve.",
            format: "Build-up + reveal",
            viral_score: 88
          }
        ],
        linkedin: [
          {
            title: "The counter-intuitive lesson from my last 90 days",
            description: "Short professional story + bullet takeaway; invite thoughtful comments.",
            format: "Text post + line breaks",
            viral_score: 78
          },
          {
            title: "What I’d tell my past self about [niche topic]",
            description: "Vulnerable opener, 3 lessons, one question to the reader.",
            format: "Carousel or long text",
            viral_score: 76
          },
          {
            title: "Chart or framework they can steal",
            description: "Simple diagram image; caption explains when to use it.",
            format: "Document / carousel",
            viral_score: 81
          },
          {
            title: "Unpopular opinion (politely argued)",
            description: "Claim + evidence + how you still respect the other side — sparks debate safely.",
            format: "Opinion post",
            viral_score: 74
          },
          {
            title: "Mini case study: problem → action → metric",
            description: "Anonymize client; focus on process, not vanity numbers.",
            format: "Case snapshot",
            viral_score: 79
          }
        ],
        x: [
          {
            title: "One screenshot + 2 lines of context = thread starter",
            description: "Drop a spicy but accurate observation; promise thread in replies.",
            format: "Image + short text",
            viral_score: 85
          },
          {
            title: "Hot take in 280 characters — no thread needed",
            description: "Punchy claim + one supporting fact; quote-tweet bait.",
            format: "Single post",
            viral_score: 82
          },
          {
            title: "Live-tweet a lesson while you learn in public",
            description: "Numbered tweets or one thread with clear headers.",
            format: "Thread",
            viral_score: 80
          },
          {
            title: "Poll + follow-up post with results",
            description: "Binary poll on a niche debate; 24h later share what surprised you.",
            format: "Poll + follow-up",
            viral_score: 77
          },
          {
            title: "Meme template but on-brand",
            description: "Relatable humor that still signals expertise — keep it kind.",
            format: "Meme / image reply",
            viral_score: 83
          }
        ]
      };
      var set = cards[p] || cards.instagram;
      var out = [];
      for (var i = 0; i < set.length; i++) {
        var base = set[i];
        out.push({
          title: base.title,
          description: base.description,
          format: base.format,
          viral_score: Math.min(98, base.viral_score + ((seed + i) % 5))
        });
      }
      return out;
    },

    /**
     * 10 mock hooks — topic + platform + tone (English)
     */
    hooksTen: function (topic, platform, tone) {
      var t = (topic || "your niche").trim();
      if (t.length > 100) t = t.slice(0, 100) + "…";
      var p = String(platform || "instagram").toLowerCase();
      var ton = String(tone || "viral").toLowerCase();

      var platPrefix = {
        instagram: "On Reels,",
        tiktok: "On the FYP,",
        youtube_shorts: "On Shorts,",
        x: "On X,",
        linkedin: "On LinkedIn,"
      };
      var pre = platPrefix[p] || "";

      var pools = {
        viral: [
          "Nobody’s saying it: the game changed for {t}.",
          "Give me 3 seconds — what you know about {t} might be wrong.",
          "{p} what’s the biggest time-waster when you post about {t}?",
          "Stop scrolling: this is the format blowing up in {t} today.",
          "If you want to grow with {t}, your first line should sound like this.",
          "{t} is easier than you think — you just need the right hook.",
          "This one will split people who love {t}.",
          "Warning: almost everyone makes this mistake in {t} content.",
          "{p} is this the only thing you need to do for {t}?",
          "POV: you finally got engagement on {t}.",
          "Try one thing for {t} today — you won’t regret it.",
          "{t}? If you don’t spark curiosity in second one, you lose.",
          "The algorithm rewards this in {t} content (proof in the video).",
          "Not a secret: winners in {t} are doing this.",
          "{p} the minimal formula to go viral with {t}."
        ],
        educational: [
          "{p} {t} in 20 seconds — save this.",
          "{t}: the one framework you actually need.",
          "The {t} myth everyone gets wrong — here’s the fix.",
          "Starting {t}? Step one begins right here.",
          "Quick lesson: the 3 most common mistakes with {t}.",
          "{p} how to teach {t} without losing viewers.",
          "{t} explained like you’re five.",
          "Checklist: 5 things before you post {t} content.",
          "How pros think about {t} (in plain English).",
          "{t}: one simple chart that tells the story.",
          "One small skill for {t} that punches above its weight.",
          "{p} {t} training that ends with one action you can take today.",
          "Mixing up {t} terms? This video is for you.",
          "{t} 101: grasp this before anything else.",
          "{t} strategy = one tight paragraph."
        ],
        shocking: [
          "Could everything you heard about {t} be wrong?",
          "Hot take: the popular advice on {t} might hurt you.",
          "Nobody talks about the biggest risk with {t}.",
          "{p} this {t} claim will start a fight in the comments (I said what I said).",
          "The truth about {t} people won’t say to your face.",
          "Plot twist: the unexpected angle on {t}.",
          "This {t} video might split your account — in a good way.",
          "You won’t stand out in {t} without taking a risk; here we go.",
          "{t}: love it or hate it — no middle ground.",
          "Honest moment: most {t} content is boring.",
          "{p} the ‘forbidden’ idea for {t} that still works.",
          "{t} — uncomfortable, but accurate.",
          "Everyone’s posting {t}; few notice this pattern.",
          "Trigger warning: we’re pushing the line on {t} content.",
          "Cold shower on {t} — watch only if you’re ready."
        ],
        story: [
          "Last year {t} made me feel like this…",
          "The first breaking point on my {t} journey.",
          "Nobody believed me — until {t} worked.",
          "{p} my {t} story in 30 seconds.",
          "One small {t} decision changed everything.",
          "The {t} mistake I was ashamed of — and what I learned.",
          "If you’re overthinking {t} tonight, listen to this.",
          "One DM shifted everything for me with {t}.",
          "I started {t} from zero — here’s where I am now.",
          "The story: {t} + stubbornness + consistency.",
          "{p} honest mode: {t} and me.",
          "{t} is how I built a real bond with my audience.",
          "I was scared — then I posted about {t}.",
          "{t} storytelling: empathy first, CTA second.",
          "Final scene: {t} and a happy ending."
        ]
      };

      var pool = pools[ton] || pools.viral;
      var seed = hashString((t + p + ton).toLowerCase());
      var out = [];
      var used = {};
      var idx = 0;
      while (out.length < 10 && idx < 100) {
        var raw = pick(pool, seed, idx);
        var text = raw.replace(/\{t\}/g, t).replace(/\{p\}/g, pre);
        if (!used[text]) {
          used[text] = 1;
          var score = 66 + ((seed + idx * 11) % 30);
          if (ton === "viral") score += 3;
          out.push({ text: text, score: Math.min(98, Math.max(60, score)) });
        }
        idx++;
      }
      var k = 0;
      while (out.length < 10) {
        k++;
        out.push({
          text: t + " — hook variation " + k,
          score: Math.min(95, 68 + k)
        });
      }
      return out.slice(0, 10);
    },

    trendsPack: function (rawTopic) {
      var t = normalizeTopic(rawTopic) || "this niche";
      return [
        { title: "Story + tutorial hybrid", why: "Saves spike when you blend personal hook with how-to in " + t + "." },
        { title: "Contrarian “stop doing X” hooks", why: "Pattern interrupts still win in crowded " + t + " feeds." },
        { title: "Micro-series (parts 1–3)", why: "Return viewers; algorithm favors completion loops in " + t + "." },
        { title: "UGC-style authenticity", why: "Lower production, higher trust for " + t + " audiences." },
        { title: "Comment-driven part 2", why: "Threads train the algo to push your next " + t + " video." }
      ];
    },

    /**
     * Trend Detector — 5–8 sample cards (platform + category), English copy
     */
    trendDetectorCards: function (platform, category) {
      var p = String(platform || "instagram").toLowerCase();
      var c = String(category || "fitness").toLowerCase();
      var key = p + "|" + c;
      var seed = 0;
      for (var si = 0; si < key.length; si++) seed = (seed * 31 + key.charCodeAt(si)) | 0;
      var count = 5 + (Math.abs(seed) % 4);
      var platLine = {
        instagram: "in the Reels feed",
        tiktok: "on the TikTok FYP",
        youtube_shorts: "on Shorts",
        x: "on X",
        linkedin: "on LinkedIn"
      };
      var where = platLine[p] || "in short-form video";

      var pools = {
        fitness: [
          { title: "5-minute home workout", why: "Busy viewers stop for fast, clear wins.", how: "Show a timer on screen; number each move; end with one-line CTA.", format: "talking head + quick cuts" },
          { title: "Protein / nutrition myth bust", why: "Facts plus light debate drive comments and saves.", how: "State the myth, debunk in ~10s, leave one practical takeaway.", format: "talking head" },
          { title: "Squat (or any move) done wrong", why: "Form fixes are highly shareable — “that was me” energy.", how: "Show the mistake → slow-mo correct form → one safety tip.", format: "POV / coach" },
          { title: "First day at the gym — shy POV", why: "Story-led posts build trust and follow-backs.", how: "Lead with emotion for 2s, small win in the middle, question at the end.", format: "story / POV" },
          { title: "Sleep & recovery in 30 seconds", why: "Fitness audiences care about habits beyond the gym.", how: "One stat or one rule; on-screen headline; optional B-roll of a night routine.", format: "talking head + text overlay" },
          { title: "Cardio vs weights — pick a side", why: "Polar formats spark comment debates.", how: "15s per side; finish with “which team are you?”", format: "split screen / talking head" },
          { title: "Stretch routine (calm audio, simple visuals)", why: "Low effort, high replay and save potential.", how: "Three moves, 10 reps each; light music and a duration badge.", format: "montage / voiceover" },
          { title: "Daily step / movement challenge", why: "Simple challenges are easy to stitch and share.", how: "State the goal, day-in-the-life clips, end screen with results.", format: "vlog highlights" }
        ],
        business: [
          { title: "Role-play: telling the client the price", why: "B2B and freelance audiences recognize the scene instantly.", how: "Two tones or two “characters”; bad example → good example in 15s.", format: "talking head / skit" },
          { title: "Three questions before a meeting", why: "Productivity hooks perform well on LinkedIn and Reels.", how: "One sentence per question; recap slide; CTA in bio or comments.", format: "talking head + slides" },
          { title: "“One thing I learned this week” series", why: "Low-friction series build return viewers.", how: "Weekly theme + concrete example + tease next week.", format: "story series" },
          { title: "They said no — follow-up template", why: "Sales pain point with high empathy.", how: "Short story, then two copy-paste lines they can use.", format: "talking head" },
          { title: "You’re tracking the wrong KPI", why: "Data-literacy angles fuel discussion.", how: "Wrong metric example → right metric → one mini homework.", format: "screen record + voiceover" },
          { title: "Write that email in 20 seconds", why: "Quick tactics tend to perform well " + where + ".", how: "Bad subject line first; fixed version beside it.", format: "screen record" },
          { title: "One-line opener for networking", why: "Professionals love usable scripts.", how: "Read three variants; ask which they’d use in the comments.", format: "talking head" },
          { title: "Setting boundaries when you WFH", why: "Burnout themes stay timely and relatable.", how: "Tiny personal anecdote + two rules + a question for viewers.", format: "story" }
        ],
        motivation: [
          { title: "Small wins list (Monday reset)", why: "Monday motivation waves still ride the algorithm.", how: "Three bullets on screen, ~5s each; end with “your win today?”", format: "talking head + text" },
          { title: "“The one thing I won’t quit today”", why: "Personal stakes drive comments.", how: "~15s sincere talk; music low; CTA in comments.", format: "story / POV" },
          { title: "Two-minute rule vs procrastination", why: "Simple frameworks spread fast.", how: "Explain rule → tiny demo → “try it and reply”.", format: "talking head" },
          { title: "Failure story → what it taught me", why: "Vulnerability lifts saves and trust.", how: "10s story, 15s lesson, 5s question.", format: "storytelling" },
          { title: "Three energy drains around you", why: "List + curiosity headline stops the scroll.", how: "~8s per item; end with a positive flip.", format: "talking head" },
          { title: "One word on my goal card", why: "Minimal visuals are easy to repost.", how: "Show the card, say the word, one sentence why.", format: "close-up + voiceover" },
          { title: "Morning three questions for clarity", why: "Routine content gets rewatched.", how: "Questions on-screen; answers fast; full template in caption.", format: "talking head + on-screen text" },
          { title: "I’m building systems, not motivation", why: "Counter-narratives spark debate.", how: "Thesis → example → one small action.", format: "talking head" }
        ],
        ai: [
          { title: "Don’t write your prompt like this", why: "AI curiosity is high; fix-it clips hold attention.", how: "Bad prompt on screen → fixed version → contrast in output.", format: "screen record" },
          { title: "One AI step in your workflow", why: "Concrete use cases get traction " + where + ".", how: "Manual for 10s, same task with AI for 10s.", format: "screen record + voiceover" },
          { title: "Free tool vs paid — honest compare", why: "Side-by-sides extend watch time.", how: "Two columns; one task; verdict at the end.", format: "split / montage" },
          { title: "Three details to check in an AI image", why: "People want quick quality checks.", how: "Sample image; point and label; short checklist.", format: "talking head + still" },
          { title: "Ethical line: don’t use AI for this", why: "Ethics hooks create curiosity.", how: "One scenario + a better alternative.", format: "talking head" },
          { title: "Describe your data shape to ChatGPT", why: "Micro-lessons get saved.", how: "Input example → output → how to repeat.", format: "screen record" },
          { title: "Weekly AI news in 60 seconds", why: "Dense recaps attract subscribers.", how: "Three bullets, ~15s each; cite a source.", format: "news / talking head" },
          { title: "Ask this before you let AI write code", why: "Strong hook for builders and curious viewers.", how: "Show the question; 20s why; warn on blind copy-paste.", format: "screen record" }
        ],
        beauty: [
          { title: "Is your skincare order wrong?", why: "Routine debates drive comments.", how: "Wrong order motion → right order → one product suggestion.", format: "talking head + motion graphic" },
          { title: "GRWM in 60 seconds", why: "Fast GRWM clips " + where + " still hold watch time.", how: "Timestamp beats; only five products; final pose.", format: "montage / fast cuts" },
          { title: "Budget vs luxury — one product test", why: "Comparisons trigger curiosity.", how: "Half-face each side; call the difference; ask which they’d pick.", format: "split face" },
          { title: "Winter dryness — one rescue step", why: "Seasonal spikes work for reach.", how: "Problem close-up → routine; disclose if sponsored.", format: "close-up + talking head" },
          { title: "“Reverse” method for oily roots", why: "Hack claims stop the scroll.", how: "Claim first → steps → next-day result or text update.", format: "story / tutorial" },
          { title: "One-color makeup (monochrome)", why: "Simple rules unlock creative looks.", how: "Show palette; eyes/lips/cheek in one family.", format: "tutorial" },
          { title: "Morning puffiness — three quick moves", why: "Wellness × beauty crossover is trending.", how: "Massage or cold tool; use a timer.", format: "close-up" },
          { title: "Honest “empties” before the bottle’s gone", why: "Trust content for people ready to buy.", how: "~10s per product; clear thumbs up or down.", format: "talking head + product" }
        ]
      };

      var pool = pools[c] || pools.fitness;
      var start = Math.abs(seed) % pool.length;
      var out = [];
      for (var j = 0; j < count; j++) {
        var item = pool[(start + j) % pool.length];
        var score = Math.min(98, 76 + ((Math.abs(seed) + j * 7) % 23));
        out.push({
          title: item.title,
          why: item.why,
          suggestion: item.how,
          format: item.format,
          score: score
        });
      }
      return out;
    },

    /**
     * Hashtag Generator — viral + niche + trend buckets, 15–20 tags total (mock).
     */
    hashtagMixMock: function (topicRaw, platform) {
      var topic = String(topicRaw || "").trim();
      var slug = slugPart(topic);
      var slugCompact = slug.replace(/\s+/g, "") || "content";
      var words = topic
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .trim()
        .split(/\s+/)
        .filter(function (w) {
          return w.length > 2;
        })
        .slice(0, 5);

      var p = String(platform || "instagram").toLowerCase();
      var seed = hashString((slugCompact + p).toLowerCase());

      var viralPlatform = {
        instagram: ["#reels", "#instagram", "#explorepage", "#instadaily", "#igreels"],
        tiktok: ["#tiktok", "#fyp", "#foryou", "#tiktokviral", "#fypシ"],
        youtube_shorts: ["#shorts", "#youtubeshorts", "#ytshorts", "#subscribe", "#youtube"],
        x: ["#x", "#twitter", "#trending", "#timeline", "#post"],
        linkedin: ["#linkedin", "#networking", "#professional", "#career", "#thoughtleadership"]
      };
      var vp = viralPlatform[p] || viralPlatform.instagram;

      var viralPool = [
        "#viral",
        "#trending",
        "#foryou",
        "#explore",
        "#contentcreator",
        "#creator",
        "#socialmedia",
        "#growth",
        "#engagement",
        "#views"
      ].concat(vp);

      var nichePool = [];
      var wi;
      for (wi = 0; wi < words.length; wi++) {
        nichePool.push("#" + words[wi]);
        nichePool.push("#" + words[wi] + "tips");
        nichePool.push("#" + words[wi] + "life");
      }
      nichePool.push("#" + slugCompact);
      nichePool.push("#" + slugCompact + "community");
      nichePool.push("#" + slugCompact + "journey");
      nichePool.push("#learn" + slugCompact);
      nichePool.push("#real" + slugCompact);
      nichePool.push("#" + slugCompact + "daily");

      var trendPool = [
        "#nowtrending",
        "#rising",
        "#mustsee",
        "#watchthis",
        "#dontmiss",
        "#spotlight",
        "#2025",
        "#daily",
        "#today",
        "#firecontent",
        "#breakthescroll",
        "#algorithm"
      ];

      var layouts = [
        [6, 6, 6],
        [7, 6, 6],
        [6, 7, 6],
        [6, 6, 7],
        [7, 5, 7],
        [5, 7, 7],
        [7, 7, 6]
      ];
      var trip = layouts[seed % layouts.length];
      var vCount = trip[0];
      var nCount = trip[1];
      var tCount = trip[2];

      var used = {};

      function take(pool, count, offset) {
        var out = [];
        var idx = 0;
        while (out.length < count && idx < 150) {
          var tag = pick(pool, seed + offset, idx);
          tag = String(tag).replace(/\s+/g, "");
          if (tag.charAt(0) !== "#") tag = "#" + tag;
          var key = tag.toLowerCase();
          if (!used[key]) {
            used[key] = 1;
            out.push(tag);
          }
          idx++;
        }
        return out;
      }

      var viral = take(viralPool, vCount, 0);
      var niche = take(nichePool, nCount, 41);
      var trend = take(trendPool, tCount, 83);

      var pad = 0;
      while (niche.length < nCount) {
        pad++;
        var filler = "#" + slugCompact + "hq" + pad;
        if (!used[filler.toLowerCase()]) {
          used[filler.toLowerCase()] = 1;
          niche.push(filler);
        }
      }

      var all = viral.concat(niche, trend);
      var seenAll = {};
      var allDedup = [];
      for (var j = 0; j < all.length; j++) {
        var ak = all[j].toLowerCase();
        if (!seenAll[ak]) {
          seenAll[ak] = 1;
          allDedup.push(all[j]);
        }
      }

      return { viral: viral, niche: niche, trend: trend, all: allDedup };
    },

    competitorPack: function (competitor, context, platform) {
      var c = String(competitor || "this brand").trim() || "this brand";
      var ctx = String(context || "").trim();
      var plat = String(platform || "instagram").toLowerCase();
      var platName = {
        instagram: "Instagram",
        tiktok: "TikTok",
        youtube: "YouTube",
        x: "X",
        linkedin: "LinkedIn"
      };
      var pn = platName[plat] || "Instagram";

      var byPlat = {
        instagram: {
          strengths: [
            "Grid and Reels likely feel cohesive for " + c + " — familiar layout builds scroll-back.",
            "Story-style hooks and on-screen text match how people browse " + pn + ".",
            "Strong first-frame niche signal for " + c + " in Explore and Reels."
          ],
          gaps: [
            "Room for more carousel depth or saves-driven “how-to” series vs one-off posts.",
            "Comments and DM prompts could be stronger to train the algorithm on " + pn + ".",
            "Could test longer captions or threads where " + c + " only uses one-liners."
          ],
          angles: [
            "Reels hook " + c + " doesn’t use: pattern interrupt + proof in 2 seconds.",
            "Carousel: myth vs fact in your niche that " + c + " leaves implied.",
            "UGC-style duet or stitch idea that contrasts with " + c + "’s polished look."
          ]
        },
        tiktok: {
          strengths: [
            c + " probably leans on native TikTok pacing — fast cuts and sound trends.",
            "Loop-friendly structure so viewers rewatch " + c + "’s clips.",
            "Comment-bait lines that fit FYP discovery for " + c + "."
          ],
          gaps: [
            "Series potential: part 2–3 hooks " + c + " could use for return viewers.",
            "Live or reply-content gaps vs polished uploads on " + pn + ".",
            "Could test slightly longer educational beats if " + c + " is only doing trends."
          ],
          angles: [
            "Green-screen or text-on-video take that reframes what " + c + " said.",
            "“Day in the life” contrast: your workflow vs " + c + "’s public version.",
            "Niche hashtag + story hook " + c + " isn’t covering in your space."
          ]
        },
        youtube: {
          strengths: [
            c + " may win on titles and thumbnails tuned for " + pn + " search and browse.",
            "Retention tricks: pattern repeats or chapters that suit long- and short-form.",
            "Clear value promise in the first 10 seconds for " + c + "’s videos."
          ],
          gaps: [
            "Shorts vs long-form balance — " + c + " might over-index on one format.",
            "Community tab or pinned comment CTAs could be underused.",
            "Series playlists: room to own a keyword cluster " + c + " only touches once."
          ],
          angles: [
            "Short that teases a deep-dive " + c + " never made into a full video.",
            "Contrarian title format: same topic as " + c + ", opposite angle.",
            "Chapter-style Shorts series only you can host in your niche."
          ]
        },
        x: {
          strengths: [
            c + " likely threads or single-line hooks that fit " + pn + " timeline speed.",
            "Quote-tweet or hot-take rhythm that sparks replies around " + c + ".",
            "Consistent voice so " + c + " is recognizable in a busy feed."
          ],
          gaps: [
            "Visual cards or short clips could extend reach beyond text for " + c + ".",
            "Longer-form newsletter or link depth if " + c + " stays only on-platform.",
            "Community spaces or lists " + c + " could use for niche ownership."
          ],
          angles: [
            "Thread that debunks a vague claim " + c + " left hanging.",
            "One screenshot + one lesson your audience gets that " + c + " skips.",
            "Weekly “signal vs noise” post where you curate what " + c + " posts."
          ]
        },
        linkedin: {
          strengths: [
            c + " probably uses authority-led hooks and document carousels suited to " + pn + ".",
            "Professional tone that matches how buyers scroll " + c + "’s profile.",
            "Comment strategy that keeps " + c + " visible in niche conversations."
          ],
          gaps: [
            "Personal story posts vs pure tips — " + c + " might skew one way.",
            "Video or newsletter depth if " + c + " only posts short text.",
            "Clear CTA to profile or lead magnet beyond “follow for more.”"
          ],
          angles: [
            "Case-style post: outcome you drove vs how " + c + " describes the same topic.",
            "Carousel: framework " + c + " implies but never names.",
            "Founder POV thread on a mistake " + c + "’s advice glosses over."
          ]
        }
      };

      var pack = byPlat[plat] || byPlat.instagram;

      return {
        summary:
          pn +
          "-focused read on " +
          c +
          " (illustrative overview, not live account data): patterns below assume typical " +
          pn +
          " behavior, not private metrics. " +
          (ctx ? "Your niche or goal: " + ctx + "." : "Add your niche or goal for tighter angles."),
        strengths: pack.strengths,
        gaps: pack.gaps,
        content_angles: pack.angles.concat([
          "Contrast: what you believe vs what " + c + " typically shows on " + pn + ".",
          "Weekly series: micro-lessons only you can teach in this niche."
        ])
      };
    }
  };

  function showFormError(el, msg) {
    if (!el) return;
    el.textContent = msg || "";
    el.hidden = !msg;
  }

  function getGlobalStyle() {
    var el = document.getElementById("global-style");
    return el && el.value ? el.value : "viral";
  }

  /**
   * Production mode: use OpenAI when available, but fall back to mock on any API failure.
   * (No engine selector in the UI.)
   */
  function getGlobalEngine() {
    return "openai";
  }

  function getGoogleIdToken() {
    try {
      return sessionStorage.getItem("acs_google_id_token") || "";
    } catch (e) {
      return "";
    }
  }

  function openAiFetch(formData, submitBtn, onOk, onErr) {
    var btn = submitBtn;
    var orig = btn ? btn.textContent : "Generate";
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Generating…";
    }
    var token = getGoogleIdToken();
    var headers = token ? { "x-google-id-token": token } : {};
    fetch("/api/generate", { method: "POST", body: formData, headers: headers })
      .then(function (r) {
        return r.text().then(function (t) {
          var j = {};
          try {
            j = JSON.parse(t);
          } catch (ignore) {}
          return { ok: r.ok, body: j };
        });
      })
      .then(function (res) {
        if (btn) {
          btn.disabled = false;
          btn.textContent = orig;
        }
        if (!res.ok) {
          var msg = res.body.error || "Request failed";
          if (res.body.detail) msg += " — " + res.body.detail;
          onErr(msg);
          return;
        }
        onOk(res.body);
      })
      .catch(function () {
        if (btn) {
          btn.disabled = false;
          btn.textContent = orig;
        }
        onErr("Something went wrong. Please try again in a moment.");
      });
  }

  function bindImagePair(opts) {
    var topicEl = opts.topicEl;
    var fileInput = opts.fileInput;
    var clearBtn = opts.clearBtn;
    var previewWrap = opts.previewWrap;
    var previewImg = opts.previewImg;
    var errorEl = opts.errorEl;
    var maxBytes = opts.maxBytes;
    var previewObjectUrl = null;

    function clear() {
      if (previewObjectUrl) {
        URL.revokeObjectURL(previewObjectUrl);
        previewObjectUrl = null;
      }
      if (fileInput) fileInput.value = "";
      if (previewImg) {
        previewImg.removeAttribute("src");
        previewImg.alt = "";
      }
      if (previewWrap) previewWrap.hidden = true;
    }

    function onFile(file) {
      if (!file || !file.type || file.type.indexOf("image/") !== 0) {
        clear();
        return;
      }
      if (file.size > maxBytes) {
        showFormError(
          errorEl,
          "This image is too large. Maximum upload size is 50 MB. Try a smaller file or compress it."
        );
        if (fileInput) fileInput.value = "";
        clear();
        return;
      }
      showFormError(errorEl, "");
      if (topicEl) topicEl.value = "";
      if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
      previewObjectUrl = URL.createObjectURL(file);
      if (previewWrap && previewImg) {
        previewWrap.hidden = false;
        previewImg.alt = "Uploaded preview";
        previewImg.src = previewObjectUrl;
      }
    }

    if (fileInput) {
      fileInput.addEventListener("change", function () {
        var f = this.files && this.files[0];
        if (f) onFile(f);
        else clear();
        if (!f || f.size <= maxBytes) showFormError(errorEl, "");
      });
    }
    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        clear();
        showFormError(errorEl, "");
      });
    }
    if (topicEl) {
      topicEl.addEventListener("input", function () {
        if (topicEl.value.trim()) clear();
      });
    }
    return { clear: clear };
  }

  function initToolPage() {
    var form = document.getElementById("generator-form");
    var topicInput = document.getElementById("topic-input");
    var imageInput = document.getElementById("image-input");
    var imageClear = document.getElementById("image-clear");
    var imagePreview = document.getElementById("image-preview");
    var imagePreviewImg = document.getElementById("image-preview-img");
    var formError = document.getElementById("form-error");
    var results = document.getElementById("results");

    if (!form || !topicInput || !results) return;

    var hooksEl = document.getElementById("out-hooks");
    var capsEl = document.getElementById("out-captions");
    var tagsEl = document.getElementById("out-hashtags");
    var reelEl = document.getElementById("out-reel");
    var scoreEl = document.getElementById("out-score");
    var scoreNote = document.getElementById("out-score-note");
    var outOptimized = document.getElementById("out-optimized");
    var optWrap = document.getElementById("out-optimized-wrap");
    var submitBtn = form.querySelector('button[type="submit"]');

    var maxBytes = window.AICreatorMock.MAX_IMAGE_BYTES;
    var capImg = bindImagePair({
      topicEl: topicInput,
      fileInput: imageInput,
      clearBtn: imageClear,
      previewWrap: imagePreview,
      previewImg: imagePreviewImg,
      errorEl: formError,
      maxBytes: maxBytes
    });

    function normalizeUiPayload(d) {
      var vs = d.viralScore != null ? d.viralScore : d.viral_score;
      return {
        hooks: d.hooks || [],
        captions: d.captions || [],
        hashtags: d.hashtags || [],
        reelScript: d.reelScript || d.reel_script || "",
        viralScore: vs != null ? vs : "—",
        viralExplanation: d.viralExplanation || d.viral_explanation || "",
        optimized_caption: (d.optimized_caption || d.optimizedCaption || "").trim()
      };
    }

    function renderAll(data) {
      var n = normalizeUiPayload(data);
      lastPackData = data;
      renderList(hooksEl, n.hooks);
      renderList(capsEl, n.captions);
      renderHashtags(tagsEl, n.hashtags);
      reelEl.textContent = n.reelScript;
      scoreEl.textContent = String(n.viralScore);
      scoreNote.textContent = n.viralExplanation;
      if (outOptimized && optWrap) {
        outOptimized.textContent = n.optimized_caption;
        optWrap.hidden = !n.optimized_caption;
      }
      results.classList.add("visible");
      results.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function downloadBlob(filename, text, mimeType) {
      var blob = new Blob([text], { type: mimeType || "text/plain;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(function () {
        URL.revokeObjectURL(url);
        a.remove();
      }, 0);
    }

    function exportCurrentJson() {
      if (!lastPackData) return;
      downloadBlob("caption-generation.json", JSON.stringify(lastPackData, null, 2), "application/json");
    }

    function exportCurrentTxt() {
      if (!lastPackData) return;
      var n = normalizeUiPayload(lastPackData);
      var txt =
        "HOOKS\n" +
        n.hooks.map(function (h) { return "- " + h; }).join("\n") +
        "\n\nCAPTIONS\n" +
        n.captions.map(function (c) { return "- " + c; }).join("\n") +
        "\n\nOPTIMIZED CAPTION\n" +
        n.optimized_caption +
        "\n\nHASHTAGS\n" +
        n.hashtags.join(" ") +
        "\n\nREEL SCRIPT\n" +
        n.reelScript +
        "\n\nVIRAL SCORE\n" +
        String(n.viralScore) +
        "\n\nEXPLANATION\n" +
        n.viralExplanation +
        "\n";
      downloadBlob("caption-generation.txt", txt, "text/plain;charset=utf-8");
    }

    var exportJsonBtn = document.getElementById("export-current-json");
    var exportTxtBtn = document.getElementById("export-current-txt");
    var historyLoadBtn = document.getElementById("history-load-btn");
    var historyExportBtn = document.getElementById("history-export-json");
    var historyListEl = document.getElementById("pack-history-list");
    var historyHintEl = document.getElementById("pack-history-hint");
    var statusBadgeEl = document.getElementById("plan-status-badge");
    var restoreProBtn = document.getElementById("restore-pro-btn");

    var lastPackData = null;
    var lastHistoryItems = [];
    var isProUser = false;

    function setHistoryHint(msg) {
      if (!historyHintEl) return;
      if (!msg) {
        historyHintEl.textContent = "Sign in with Google to load your saved generations.";
        return;
      }
      historyHintEl.textContent = msg;
    }

    function applyPlanUi() {
      if (statusBadgeEl) {
        statusBadgeEl.classList.remove("plan-pro", "plan-free");
        if (isProUser) {
          statusBadgeEl.classList.add("plan-pro");
          statusBadgeEl.textContent = "Pro user 🚀";
        } else {
          statusBadgeEl.classList.add("plan-free");
          statusBadgeEl.textContent = "Free plan";
        }
      }
      if (historyLoadBtn) historyLoadBtn.disabled = !isProUser;
      if (historyExportBtn) historyExportBtn.disabled = !isProUser;
      if (restoreProBtn) restoreProBtn.hidden = Boolean(isProUser);
      if (!isProUser) {
        setHistoryHint("Upgrade to Pro to access history.");
      } else if (!lastHistoryItems.length) {
        setHistoryHint("Load recent to fetch your saved generations.");
      }
    }

    function fetchPlanStatus() {
      var token = getGoogleIdToken();
      var headers = token ? { "x-google-id-token": token } : {};
      return fetch("/api/me/status", { headers: headers })
        .then(function (r) { return r.json().catch(function () { return {}; }); })
        .then(function (d) {
          isProUser = Boolean(d && d.paid);
          applyPlanUi();
          return isProUser;
        })
        .catch(function () {
          isProUser = false;
          applyPlanUi();
          return false;
        });
    }

    applyPlanUi();
    fetchPlanStatus();
    if (typeof window !== "undefined") {
      window.addEventListener("acs-auth-changed", function () {
        lastHistoryItems = [];
        if (historyListEl) historyListEl.innerHTML = "";
        fetchPlanStatus();
      });
    }

    if (exportJsonBtn) exportJsonBtn.addEventListener("click", exportCurrentJson);
    if (exportTxtBtn) exportTxtBtn.addEventListener("click", exportCurrentTxt);

    var upgradeBtn = document.getElementById("upgrade-pro-btn");
    if (upgradeBtn) {
      upgradeBtn.addEventListener("click", function () {
        var token = getGoogleIdToken();
        if (!token) {
          showFormError(formError, "Please sign in with Google to upgrade.");
          return;
        }
        var orig = upgradeBtn.textContent;
        upgradeBtn.disabled = true;
        upgradeBtn.textContent = "Redirecting…";
        fetch("/create-checkout", {
          method: "POST",
          headers: Object.assign({ "x-google-id-token": token }, { "Content-Type": "application/json" }),
          body: JSON.stringify({})
        })
          .then(function (r) {
            return r.json().catch(function () { return {}; });
          })
          .then(function (d) {
            upgradeBtn.disabled = false;
            upgradeBtn.textContent = orig;
            if (d && d.url) {
              window.location.href = d.url;
              return;
            }
            showFormError(formError, (d && d.error) || "Upgrade failed. Check configuration.");
          })
          .catch(function () {
            upgradeBtn.disabled = false;
            upgradeBtn.textContent = orig;
            showFormError(formError, "Upgrade failed. Try again in a moment.");
          });
      });
    }

    if (restoreProBtn) {
      restoreProBtn.addEventListener("click", function () {
        var token = getGoogleIdToken();
        if (!token) {
          showFormError(formError, "Please sign in with Google first.");
          return;
        }
        var orig = restoreProBtn.textContent;
        restoreProBtn.disabled = true;
        restoreProBtn.textContent = "Checking…";
        fetch("/api/subscription/reconcile", {
          method: "POST",
          headers: { "x-google-id-token": token }
        })
          .then(function (r) {
            return r.json().catch(function () { return {}; }).then(function (d) {
              return { ok: r.ok, body: d };
            });
          })
          .then(function (res) {
            restoreProBtn.disabled = false;
            restoreProBtn.textContent = orig;
            if (res.ok && res.body && res.body.paid) {
              isProUser = true;
              applyPlanUi();
              showFormError(formError, "");
              setHistoryHint("Pro access restored.");
              return;
            }
            showFormError(
              formError,
              (res.body && res.body.error) || "No active subscription found for this account."
            );
          })
          .catch(function () {
            restoreProBtn.disabled = false;
            restoreProBtn.textContent = orig;
            showFormError(formError, "Restore failed. Please try again.");
          });
      });
    }

    if (historyLoadBtn) {
      historyLoadBtn.addEventListener("click", function () {
        if (!isProUser) {
          setHistoryHint("Upgrade to Pro to access history.");
          return;
        }
        var token = getGoogleIdToken();
        if (!token) {
          setHistoryHint("Please sign in and upgrade to Pro to access history.");
          if (formError) showFormError(formError, "Please sign in to load history.");
          return;
        }
        if (historyListEl) historyListEl.innerHTML = "";
        setHistoryHint("Loading history…");
        fetch("/api/history?limit=10", { headers: { "x-google-id-token": token } })
          .then(function (r) { return r.json(); })
          .then(function (data) {
            var items = data && Array.isArray(data.items) ? data.items : [];
            lastHistoryItems = items;
            if (!historyListEl) return;
            historyListEl.innerHTML = "";
            for (var i = 0; i < items.length; i++) {
              (function (it) {
                var li = document.createElement("li");
                li.className = "history-item-row";
                var meta = document.createElement("div");
                meta.className = "history-item-meta";
                var title = document.createElement("div");
                title.className = "history-item-title";
                var topic = it && it.input && it.input.topic ? String(it.input.topic).trim() : "";
                if (!topic && it && it.input && it.input.imageName) topic = "Image: " + it.input.imageName;
                if (!topic) topic = "(No topic)";
                title.textContent = topic;
                var subtitle = document.createElement("div");
                subtitle.className = "history-item-subtitle";
                subtitle.textContent = String(it.createdAt || "") + " • " + String(it.mode || "pack");
                meta.appendChild(title);
                meta.appendChild(subtitle);
                var btn = document.createElement("button");
                btn.type = "button";
                btn.className = "btn btn-ghost";
                btn.textContent = "Export";
                btn.addEventListener("click", function () {
                  var outObj = it && it.output ? it.output : it;
                  downloadBlob("history-item.json", JSON.stringify(outObj, null, 2), "application/json");
                });
                li.appendChild(meta);
                li.appendChild(btn);
                historyListEl.appendChild(li);
              })(items[i]);
            }
            setHistoryHint(items.length ? "Loaded." : "No history yet — generate your first pack.");
          })
          .catch(function () {
            setHistoryHint("Failed to load history. Try again.");
          });
      });
    }

    if (historyExportBtn) {
      historyExportBtn.addEventListener("click", function () {
        if (!isProUser) {
          setHistoryHint("Upgrade to Pro to access history.");
          return;
        }
        if (!lastHistoryItems || !lastHistoryItems.length) {
          setHistoryHint("No history to export yet.");
          return;
        }
        downloadBlob(
          "caption-history.json",
          JSON.stringify(lastHistoryItems, null, 2),
          "application/json"
        );
      });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var style = getGlobalStyle();
      var engine = getGlobalEngine();
      var file = imageInput && imageInput.files && imageInput.files[0];
      var topicVal = topicInput.value.trim();

      if (!file && !topicVal) {
        showFormError(
          formError,
          "Enter a topic or upload an image — captions will match what you provide."
        );
        return;
      }

      if (file && file.size > maxBytes) {
        showFormError(
          formError,
          "This image is too large. Maximum upload size is 50 MB."
        );
        if (imageInput) imageInput.value = "";
        capImg.clear();
        return;
      }

      showFormError(formError, "");

      if (engine === "openai") {
        var fd = new FormData();
        fd.append("mode", "pack");
        fd.append("topic", topicVal);
        fd.append("style", style);
        if (file) fd.append("image", file, file.name);
        openAiFetch(fd, submitBtn, renderAll, function (msg) {
          // Fallback to mock preview if OpenAI fails (misconfig / key missing / temporary outage).
          var m = String(msg || "");
          if (m.toLowerCase().indexOf("upgrade to pro") >= 0) {
            showFormError(formError, m);
            return;
          }
          showFormError(formError, "");
          if (file) {
            window.AICreatorMock.sampleImageMeta(file, function (meta) {
              var data = window.AICreatorMock.generate({
                topic: topicVal,
                style: style,
                hasImage: true,
                imageName: file.name,
                imageMeta: meta
              });
              renderAll(data);
            });
          } else {
            var data = window.AICreatorMock.generate({
              topic: topicVal,
              style: style,
              hasImage: false,
              imageName: "",
              imageMeta: null
            });
            renderAll(data);
          }
        });
        return;
      }

      if (file) {
        window.AICreatorMock.sampleImageMeta(file, function (meta) {
          var data = window.AICreatorMock.generate({
            topic: topicVal,
            style: style,
            hasImage: true,
            imageName: file.name,
            imageMeta: meta
          });
          renderAll(data);
        });
      } else {
        var data = window.AICreatorMock.generate({
          topic: topicVal,
          style: style,
          hasImage: false,
          imageName: "",
          imageMeta: null
        });
        renderAll(data);
      }
    });
  }

  function initSidebarNavigation() {
    var links = document.querySelectorAll(".sidebar-link[data-panel]");
    var panels = document.querySelectorAll(".tool-panel");
    var mobile = document.getElementById("mobile-panel-select");
    var styleWrap = document.getElementById("global-style-wrap");
    var globalBar = document.getElementById("tool-global-controls");

    function showPanel(id) {
      for (var i = 0; i < panels.length; i++) {
        panels[i].classList.toggle("is-active", panels[i].id === "panel-" + id);
      }
      for (var j = 0; j < links.length; j++) {
        var a = links[j];
        var on = a.getAttribute("data-panel") === id;
        a.classList.toggle("active", on);
        if (on) a.setAttribute("aria-current", "page");
        else a.removeAttribute("aria-current");
      }
      if (mobile) mobile.value = id;
      if (styleWrap) {
        var needStyle = id === "caption";
        styleWrap.style.display = needStyle ? "" : "none";
      }
      if (globalBar) {
        var showTone = id === "caption";
        globalBar.classList.toggle("is-hidden", !showTone);
      }
      if (typeof history !== "undefined" && history.replaceState) {
        history.replaceState(null, "", "#" + id);
      }
      if (id === "viral-ideas" && typeof window.__resetViralIdeasPanel === "function") {
        window.__resetViralIdeasPanel();
      }
    }

    for (var k = 0; k < links.length; k++) {
      (function (link) {
        link.addEventListener("click", function (e) {
          e.preventDefault();
          showPanel(link.getAttribute("data-panel"));
        });
      })(links[k]);
    }
    if (mobile) {
      mobile.addEventListener("change", function () {
        showPanel(mobile.value);
      });
    }
    var hash = (typeof location !== "undefined" ? location.hash : "").replace(/^#/, "");
    var ids = ["viral-ideas", "hooks", "trends", "competitor", "caption", "hashtags"];
    if (ids.indexOf(hash) >= 0) showPanel(hash);
    else showPanel("caption");

    return showPanel;
  }

  function initViralIdeasPanel(showPanelFn) {
    var stepPlat = document.getElementById("vi-step-platform");
    var stepIdeas = document.getElementById("vi-step-ideas");
    var cardsEl = document.getElementById("vi-cards");
    var err = document.getElementById("vi-error");
    var labelEl = document.getElementById("vi-platform-label");
    var changeBtn = document.getElementById("vi-change-platform");
    var platformBtns = document.querySelectorAll("#panel-viral-ideas .btn-platform[data-platform]");
    var topicInput = document.getElementById("topic-input");

    if (!stepPlat || !stepIdeas || !cardsEl) return;

    var platformLabels = {
      instagram: "Instagram",
      tiktok: "TikTok",
      youtube_shorts: "YouTube Shorts",
      linkedin: "LinkedIn",
      x: "X"
    };

    function reset() {
      showFormError(err, "");
      stepPlat.hidden = false;
      stepIdeas.hidden = true;
      cardsEl.innerHTML = "";
      if (labelEl) labelEl.innerHTML = "";
      for (var i = 0; i < platformBtns.length; i++) platformBtns[i].disabled = false;
    }

    window.__resetViralIdeasPanel = reset;

    function renderCards(ideas, platformKey) {
      cardsEl.innerHTML = "";
      var name = platformLabels[platformKey] || platformKey;
      if (labelEl) {
        labelEl.innerHTML = "Ideas for <strong>" + name + "</strong>";
      }
      for (var i = 0; i < ideas.length; i++) {
        var idea = ideas[i];
        var titleText =
          typeof idea === "string" ? idea : String(idea.title || idea.hook || "").trim();
        var desc =
          typeof idea === "string" ? "" : String(idea.description || idea.summary || "").trim();
        var fmt =
          typeof idea === "string"
            ? "Short-form"
            : String(idea.format || idea.content_format || "—").trim();
        var scoreRaw = typeof idea === "object" && idea ? idea.viral_score : null;
        var scoreNum = Number(scoreRaw);
        if (!Number.isFinite(scoreNum)) scoreNum = 75;

        var card = document.createElement("article");
        card.className = "vi-card";

        var h = document.createElement("h3");
        h.className = "vi-card-title";
        h.textContent = titleText;

        var p = document.createElement("p");
        p.className = "vi-card-desc";
        p.textContent = desc || "—";

        var meta = document.createElement("div");
        meta.className = "vi-card-meta";
        var fmtEl = document.createElement("span");
        fmtEl.className = "vi-card-format";
        fmtEl.textContent = fmt;
        var sc = document.createElement("span");
        sc.className = "vi-card-score";
        sc.textContent = Math.min(100, Math.max(0, Math.round(scoreNum))) + "/100";
        meta.appendChild(fmtEl);
        meta.appendChild(sc);

        var gen = document.createElement("button");
        gen.type = "button";
        gen.className = "btn btn-primary";
        gen.textContent = "Generate";
        (function (hookTitle) {
          gen.addEventListener("click", function () {
            if (topicInput) topicInput.value = hookTitle;
            showPanelFn("caption");
            reset();
            if (topicInput) {
              topicInput.focus();
              topicInput.scrollIntoView({ behavior: "smooth", block: "center" });
            }
          });
        })(titleText);

        card.appendChild(h);
        card.appendChild(p);
        card.appendChild(meta);
        card.appendChild(gen);
        cardsEl.appendChild(card);
      }
    }

    function loadIdeas(platformKey) {
      showFormError(err, "");
      for (var b = 0; b < platformBtns.length; b++) platformBtns[b].disabled = true;

      if (getGlobalEngine() === "openai") {
        var fd = new FormData();
        fd.append("mode", "viral_ideas");
        fd.append("platform", platformKey);
        fd.append("topic", "");
        fd.append("style", "viral");
        openAiFetch(
          fd,
          null,
          function (body) {
            for (var b2 = 0; b2 < platformBtns.length; b2++) platformBtns[b2].disabled = false;
            var ideas = body.ideas || [];
            stepPlat.hidden = true;
            stepIdeas.hidden = false;
            renderCards(ideas, platformKey);
            cardsEl.scrollIntoView({ behavior: "smooth", block: "start" });
          },
          function (msg) {
            for (var b3 = 0; b3 < platformBtns.length; b3++) platformBtns[b3].disabled = false;
            var m = String(msg || "");
            if (m.toLowerCase().indexOf("upgrade to pro") >= 0) {
              showFormError(err, m);
              return;
            }
            // Fallback to mock preview if OpenAI fails.
            stepPlat.hidden = true;
            stepIdeas.hidden = false;
            var mock = window.AICreatorMock.viralIdeaCardsByPlatform(platformKey);
            renderCards(mock, platformKey);
            cardsEl.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        );
      } else {
        for (var b4 = 0; b4 < platformBtns.length; b4++) platformBtns[b4].disabled = false;
        var mock = window.AICreatorMock.viralIdeaCardsByPlatform(platformKey);
        stepPlat.hidden = true;
        stepIdeas.hidden = false;
        renderCards(mock, platformKey);
        cardsEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }

    for (var j = 0; j < platformBtns.length; j++) {
      (function (btn) {
        btn.addEventListener("click", function () {
          loadIdeas(btn.getAttribute("data-platform"));
        });
      })(platformBtns[j]);
    }

    if (changeBtn) {
      changeBtn.addEventListener("click", function () {
        reset();
      });
    }
  }

  function wireHkOptionRow(container, dataAttr) {
    if (!container) return;
    var btns = container.querySelectorAll(".hk-opt[" + dataAttr + "]");
    for (var i = 0; i < btns.length; i++) {
      (function (btn) {
        btn.addEventListener("click", function () {
          for (var j = 0; j < btns.length; j++) btns[j].classList.remove("active");
          btn.classList.add("active");
        });
      })(btns[i]);
    }
  }

  function getHkActiveAttr(container, dataAttr) {
    if (!container) return null;
    var a = container.querySelector(".hk-opt.active");
    return a ? a.getAttribute(dataAttr) : null;
  }

  function copyTextTr(text, buttonEl, doneText) {
    doneText = doneText || "Copied";
    var orig = buttonEl.textContent;
    function done(ok) {
      buttonEl.textContent = ok ? doneText : orig;
      if (ok) setTimeout(function () { buttonEl.textContent = orig; }, 1400);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done(true); }).catch(function () { done(false); });
    } else {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        done(true);
      } catch (e) {
        done(false);
      }
      document.body.removeChild(ta);
    }
  }

  function initHooksPanel(showPanelFn) {
    var form = document.getElementById("form-hooks");
    var topicEl = document.getElementById("hk-topic");
    var err = document.getElementById("hk-error");
    var listEl = document.getElementById("hk-hooks-list");
    var res = document.getElementById("hk-results");
    var platformRow = document.getElementById("hk-platform-row");
    var toneRow = document.getElementById("hk-tone-row");
    var captionTopic = document.getElementById("topic-input");
    var submitBtn = form ? form.querySelector('button[type="submit"]') : null;

    if (!form || !topicEl || !listEl || !res) return;

    wireHkOptionRow(platformRow, "data-hk-platform");
    wireHkOptionRow(toneRow, "data-hk-tone");

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var topicVal = topicEl.value.trim();
      if (!topicVal) {
        showFormError(err, "Please enter a topic.");
        return;
      }
      showFormError(err, "");

      var platform = getHkActiveAttr(platformRow, "data-hk-platform") || "instagram";
      var tone = getHkActiveAttr(toneRow, "data-hk-tone") || "viral";

      function toneToStyle(t) {
        var m = {
          viral: "viral",
          educational: "minimal",
          shocking: "funny",
          story: "emotional"
        };
        return m[t] || "viral";
      }

      function renderItems(items) {
        listEl.innerHTML = "";
        for (var i = 0; i < items.length; i++) {
          var item = items[i] || {};
          var card = document.createElement("div");
          card.className = "hook-result-card";

          var p = document.createElement("p");
          p.className = "hook-result-text";
          p.textContent = item.text || "";

          var foot = document.createElement("div");
          foot.className = "hook-result-footer";

          var sc = document.createElement("span");
          sc.className = "hook-score";
          sc.textContent = String(item.score != null ? item.score : 75) + "/100";

          var copyBtn = document.createElement("button");
          copyBtn.type = "button";
          copyBtn.className = "btn-copy-tr";
          copyBtn.textContent = "Copy";
          (function (txt, b) {
            copyBtn.addEventListener("click", function () {
              copyTextTr(txt, b);
            });
          })(item.text || "", copyBtn);

          var useBtn = document.createElement("button");
          useBtn.type = "button";
          useBtn.className = "btn-use-tr";
          useBtn.textContent = "Use";
          (function (txt) {
            useBtn.addEventListener("click", function () {
              if (captionTopic) {
                captionTopic.value = txt;
                captionTopic.dispatchEvent(new Event("input", { bubbles: true }));
              }
              showPanelFn("caption");
              if (captionTopic) {
                captionTopic.focus();
                captionTopic.scrollIntoView({ behavior: "smooth", block: "center" });
              }
            });
          })(item.text || "");

          foot.appendChild(sc);
          foot.appendChild(copyBtn);
          foot.appendChild(useBtn);
          card.appendChild(p);
          card.appendChild(foot);
          listEl.appendChild(card);
        }

        res.classList.add("visible");
        res.scrollIntoView({ behavior: "smooth", block: "start" });
      }

      if (getGlobalEngine() === "openai") {
        var fd = new FormData();
        fd.append("mode", "hooks");
        fd.append("topic", topicVal);
        fd.append("platform", platform);
        fd.append("style", toneToStyle(tone));

        openAiFetch(
          fd,
          submitBtn,
          function (body) {
            var items = (body && body.hooks) || [];
            renderItems(items);
          },
          function (msg) {
            var m = String(msg || "");
            if (m.toLowerCase().indexOf("upgrade to pro") >= 0) {
              showFormError(err, m);
              return;
            }
            // Fallback to mock preview.
            showFormError(err, "");
            var mock = window.AICreatorMock.hooksTen(topicVal, platform, tone);
            renderItems(mock);
          }
        );
      } else {
        var mock = window.AICreatorMock.hooksTen(topicVal, platform, tone);
        renderItems(mock);
      }
    });
  }

  function initTrendsPanel(showPanelFn) {
    var form = document.getElementById("form-trends");
    var err = document.getElementById("tr-error");
    var listEl = document.getElementById("tr-trends-list");
    var res = document.getElementById("tr-results");
    var platformRow = document.getElementById("tr-platform-row");
    var categoryRow = document.getElementById("tr-category-row");
    var captionTopic = document.getElementById("topic-input");
    var submitBtn = form ? form.querySelector('button[type="submit"]') : null;
    if (!form || !listEl || !res) return;

    wireHkOptionRow(platformRow, "data-tr-platform");
    wireHkOptionRow(categoryRow, "data-tr-category");

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      showFormError(err, "");
      var platform = getHkActiveAttr(platformRow, "data-tr-platform") || "instagram";
      var category = getHkActiveAttr(categoryRow, "data-tr-category") || "fitness";
      function renderItems(items) {
        listEl.innerHTML = "";
        for (var i = 0; i < items.length; i++) {
          var item = items[i];
        var card = document.createElement("div");
        card.className = "tr-trend-card";

        var h = document.createElement("h4");
        h.className = "tr-trend-title";
        h.textContent = item.title;

        var whyP = document.createElement("p");
        whyP.className = "tr-trend-why";
        whyP.textContent = item.why;

        var sugLabel = document.createElement("span");
        sugLabel.className = "tr-trend-label";
        sugLabel.textContent = "How to create content";

        var sugP = document.createElement("p");
        sugP.className = "tr-trend-suggestion";
        sugP.textContent = item.suggestion;

        var fmt = document.createElement("span");
        fmt.className = "tr-trend-format";
        fmt.textContent = "Format: " + item.format;

        var foot = document.createElement("div");
        foot.className = "tr-trend-footer";

        var sc = document.createElement("span");
        sc.className = "hook-score tr-trend-score";
        sc.textContent = item.score + "/100";

        var cta = document.createElement("button");
        cta.type = "button";
        cta.className = "btn-use-tr btn-trend-cta";
        cta.textContent = "Create with this trend";
        (function (titleTxt) {
          cta.addEventListener("click", function () {
            if (captionTopic) {
              captionTopic.value = titleTxt;
              captionTopic.dispatchEvent(new Event("input", { bubbles: true }));
            }
            showPanelFn("caption");
            if (captionTopic) {
              captionTopic.focus();
              captionTopic.scrollIntoView({ behavior: "smooth", block: "center" });
            }
          });
        })(item.title);

        foot.appendChild(sc);
        foot.appendChild(cta);
        card.appendChild(h);
        card.appendChild(whyP);
        card.appendChild(sugLabel);
        card.appendChild(sugP);
        card.appendChild(fmt);
        card.appendChild(foot);
          listEl.appendChild(card);
        }

        res.classList.add("visible");
        res.scrollIntoView({ behavior: "smooth", block: "start" });
      }

      if (getGlobalEngine() === "openai") {
        var fd = new FormData();
        fd.append("mode", "trends");
        fd.append("platform", platform);
        fd.append("topic", category);
        fd.append("style", "viral");

        openAiFetch(
          fd,
          submitBtn,
          function (body) {
            var items = (body && body.trends) || [];
            renderItems(items);
          },
          function (msg) {
            var m = String(msg || "");
            if (m.toLowerCase().indexOf("upgrade to pro") >= 0) {
              showFormError(err, m);
              return;
            }
            showFormError(err, "");
            var mock = window.AICreatorMock.trendDetectorCards(platform, category);
            renderItems(mock);
          }
        );
      } else {
        var mock = window.AICreatorMock.trendDetectorCards(platform, category);
        renderItems(mock);
      }
    });
  }

  function initCompetitorPanel() {
    var form = document.getElementById("form-competitor");
    var comp = document.getElementById("cp-competitor");
    var ctx = document.getElementById("cp-context");
    var err = document.getElementById("cp-error");
    var res = document.getElementById("cp-results");
    var sum = document.getElementById("cp-summary");
    var st = document.getElementById("cp-strengths");
    var gaps = document.getElementById("cp-gaps");
    var ang = document.getElementById("cp-angles");
    var platformRow = document.getElementById("cp-platform-row");
    if (!form || !comp || !sum || !st || !gaps || !ang || !res) return;
    wireHkOptionRow(platformRow, "data-cp-platform");
    var btn = form.querySelector('button[type="submit"]');
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var c = comp.value.trim();
      var context = ctx ? ctx.value.trim() : "";
      var platform = getHkActiveAttr(platformRow, "data-cp-platform");
      if (!platform) {
        showFormError(err, "Please select a platform.");
        return;
      }
      if (!c) {
        showFormError(err, "Enter a competitor username or profile link.");
        return;
      }
      showFormError(err, "");
      if (getGlobalEngine() === "openai") {
        var fd = new FormData();
        fd.append("mode", "competitor");
        fd.append("competitor", c);
        fd.append("topic", context);
        fd.append("platform", platform);
        fd.append("style", "viral");
        openAiFetch(fd, btn, function (body) {
          sum.textContent = body.summary || "—";
          renderList(st, body.strengths || []);
          renderList(gaps, body.gaps || []);
          renderList(ang, body.content_angles || []);
          res.classList.add("visible");
          res.scrollIntoView({ behavior: "smooth", block: "start" });
        }, function (msg) {
          // Fallback to mock preview if OpenAI fails.
          var mErr = String(msg || "");
          if (mErr.toLowerCase().indexOf("upgrade to pro") >= 0) {
            showFormError(err, mErr);
            return;
          }
          showFormError(err, "");
          var m = window.AICreatorMock.competitorPack(c, context, platform);
          sum.textContent = m.summary;
          renderList(st, m.strengths);
          renderList(gaps, m.gaps);
          renderList(ang, m.content_angles);
          res.classList.add("visible");
          res.scrollIntoView({ behavior: "smooth", block: "start" });
        });
        return;
      }
      var m = window.AICreatorMock.competitorPack(c, context, platform);
      sum.textContent = m.summary;
      renderList(st, m.strengths);
      renderList(gaps, m.gaps);
      renderList(ang, m.content_angles);
      res.classList.add("visible");
      res.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function initHashtagsPanel() {
    var form = document.getElementById("form-hashtags");
    var topicEl = document.getElementById("ht-topic");
    var err = document.getElementById("ht-error");
    var res = document.getElementById("ht-results");
    var platformRow = document.getElementById("ht-platform-row");
    var inlineEl = document.getElementById("ht-all-inline");
    var copyAllBtn = document.getElementById("ht-copy-all");
    var outViral = document.getElementById("ht-viral");
    var outNiche = document.getElementById("ht-niche");
    var outTrend = document.getElementById("ht-trend");
    var submitBtn = form ? form.querySelector('button[type="submit"]') : null;
    if (!form || !topicEl || !res || !inlineEl || !outViral || !outNiche || !outTrend) return;

    wireHkOptionRow(platformRow, "data-ht-platform");

    if (copyAllBtn) {
      copyAllBtn.addEventListener("click", function () {
        var t = inlineEl.textContent.trim();
        if (!t) return;
        copyTextTr(t, copyAllBtn, "Copied");
      });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var topicVal = topicEl.value.trim();
      var platform = getHkActiveAttr(platformRow, "data-ht-platform");
      if (!platform) {
        showFormError(err, "Please select a platform.");
        return;
      }
      if (!topicVal) {
        showFormError(err, "Enter a topic.");
        return;
      }
      showFormError(err, "");

      function renderMix(mix) {
        inlineEl.textContent = (mix && mix.all ? mix.all : []).join(" ");
        renderHashtags(outViral, mix && mix.viral ? mix.viral : []);
        renderHashtags(outNiche, mix && mix.niche ? mix.niche : []);
        renderHashtags(outTrend, mix && mix.trend ? mix.trend : []);
        res.classList.add("visible");
        res.scrollIntoView({ behavior: "smooth", block: "start" });
      }

      if (getGlobalEngine() === "openai") {
        var fd = new FormData();
        fd.append("mode", "hashtags");
        fd.append("topic", topicVal);
        fd.append("platform", platform);
        fd.append("style", "viral");

        openAiFetch(
          fd,
          submitBtn,
          function (body) {
            var mix = {
              all: body && body.all ? body.all : [],
              viral: body && body.viral ? body.viral : [],
              niche: body && body.niche ? body.niche : [],
              trend: body && body.trend ? body.trend : []
            };
            renderMix(mix);
          },
          function (msg) {
            var m = String(msg || "");
            if (m.toLowerCase().indexOf("upgrade to pro") >= 0) {
              showFormError(err, m);
              return;
            }
            showFormError(err, "");
            var mock = window.AICreatorMock.hashtagMixMock(topicVal, platform);
            renderMix(mock);
          }
        );
      } else {
        var mock = window.AICreatorMock.hashtagMixMock(topicVal, platform);
        renderMix(mock);
      }
    });
  }

  function initUpgradeSuccessBanner() {
    var banner = document.getElementById("upgrade-success-banner");
    if (!banner) return;
    try {
      var url = new URL(window.location.href);
      var v = (url.searchParams.get("upgrade") || "").toLowerCase();
      if (v === "success") {
        banner.hidden = false;
        var refreshPlanUi = function () {
          try {
            document.dispatchEvent(new CustomEvent("acs-auth-changed"));
          } catch (e) {}
        };
        try {
          var token = getGoogleIdToken();
          if (token) {
            fetch("/api/subscription/reconcile", {
              method: "POST",
              headers: {
                "x-google-id-token": token
              }
            })
              .then(function () {
                refreshPlanUi();
                setTimeout(refreshPlanUi, 1500);
                setTimeout(refreshPlanUi, 4000);
              })
              .catch(function () {});
          }
        } catch (e) {}
        setTimeout(function () {
          if (banner) banner.hidden = true;
        }, 3000);
        // Keep URL clean after showing message once.
        url.searchParams.delete("upgrade");
        if (window.history && window.history.replaceState) {
          window.history.replaceState(null, "", url.pathname + (url.search ? url.search : "") + (url.hash || ""));
        }
      }
    } catch (e) {}
  }

  function initAllToolUi() {
    var showPanel = initSidebarNavigation();
    window.AICreatorStudioShowPanel = showPanel;
    initUpgradeSuccessBanner();
    initToolPage();
    initViralIdeasPanel(showPanel);
    initHooksPanel(showPanel);
    initTrendsPanel(showPanel);
    initCompetitorPanel();
    initHashtagsPanel();
  }

  function renderList(ul, items) {
    ul.innerHTML = "";
    for (var i = 0; i < items.length; i++) {
      var li = document.createElement("li");
      li.textContent = items[i];
      ul.appendChild(li);
    }
  }

  function renderHashtags(container, tags) {
    container.innerHTML = "";
    for (var i = 0; i < tags.length; i++) {
      var span = document.createElement("span");
      span.textContent = tags[i];
      container.appendChild(span);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAllToolUi);
  } else {
    initAllToolUi();
  }
})();
