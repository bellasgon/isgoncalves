/* ===========================================================================
   Collaboration map
   Reads papers.yaml and plots one dot per co-author country.

   TO UPDATE: add the new co-author to PEOPLE below. Nothing else.
   Anyone missing gets named in the browser console, so nobody vanishes quietly.
   =========================================================================== */

(function () {
  "use strict";

  var SELF = "Isabella Gonçalves";     // your own affiliation is never plotted

  /* Country per co-author, ISO two-letter codes.
     For someone who changed institution, list the moves oldest first:
       "Name": [ { until: 2024, country: "IE" }, { country: "PT" } ]
     "until" means "up to and including that year". The last entry, with no
     "until", applies from then on. */
  var PEOPLE = {
    "Oliver Quiring":               "DE",
    "Marlene Strehler-Schaaf":      "DE",
    "Vicente Fenoll":               "ES",
    "Márton Bene":                  "HU",
    "Michael Bossetta":             "SE",
    "Adeola Abdulateef Elega":      "NG",
    "Allen Munoriyarwa":            "ZA",
    "Marcos G. Quiles":             "BR",
    "Wilson Ceron":                 "BR",
    "Maria C. Couto Lorena":        "BR",
    "Christina Ferraz Musse":       "BR",
    "C. R. Procópio":               "BR",
    "M. Procópio":                  "BR",
    "L. C. Batista":                "BR",
    "Talita Sousa Magnolo":         "BR",
    "Rosali Henriques":             "BR",

    "Mathias-Felipe de-Lima-Santos": [
      { until: 2022, country: "ES" },       // Universidad de Navarra, JOLT
      { until: 2024, country: "NL" },       // University of Amsterdam
      { country: "AU" }                     // Macquarie, then UNSW Sydney
    ],
    "Lúcia Mesquita": [
      { until: 2024, country: "IE" },       // Dublin City University
      { country: "PT" }                     // Universidade Lusófona
    ],
    "Yossi David": [
      { until: 2022, country: "DE" },       // JGU Mainz
      { country: "IL" }                     // Ben-Gurion University of the Negev
    ]
  };

  var CONFIG = {
    papers: "papers.yaml",   // relative to this page
    title: "Collaborations",
    world: "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"
  };

  // --- country codes to map geometry -----------------------------

  var NUM = {AF:"004",AL:"008",DZ:"012",AO:"024",AR:"032",AM:"051",AU:"036",AT:"040",AZ:"031",BH:"048",BD:"050",BY:"112",BE:"056",BJ:"204",BO:"068",BA:"070",BW:"072",BR:"076",BG:"100",BF:"854",KH:"116",CM:"120",CA:"124",TD:"148",CL:"152",CN:"156",CO:"170",CG:"178",CD:"180",CR:"188",CI:"384",HR:"191",CU:"192",CY:"196",CZ:"203",DK:"208",DO:"214",EC:"218",EG:"818",SV:"222",EE:"233",ET:"231",FJ:"242",FI:"246",FR:"250",GA:"266",GE:"268",DE:"276",GH:"288",GR:"300",GL:"304",GT:"320",GN:"324",GY:"328",HT:"332",HN:"340",HU:"348",IS:"352",IN:"356",ID:"360",IR:"364",IQ:"368",IE:"372",IL:"376",IT:"380",JM:"388",JP:"392",JO:"400",KZ:"398",KE:"404",KW:"414",KG:"417",LA:"418",LV:"428",LB:"422",LS:"426",LR:"430",LY:"434",LT:"440",LU:"442",MG:"450",MW:"454",MY:"458",ML:"466",MR:"478",MX:"484",MD:"498",MN:"496",ME:"499",MA:"504",MZ:"508",MM:"104",NA:"516",NP:"524",NL:"528",NZ:"554",NI:"558",NE:"562",NG:"566",KP:"408",MK:"807",NO:"578",OM:"512",PK:"586",PS:"275",PA:"591",PG:"598",PY:"600",PE:"604",PH:"608",PL:"616",PT:"620",PR:"630",QA:"634",RO:"642",RU:"643",RW:"646",SA:"682",SN:"686",RS:"688",SL:"694",SK:"703",SI:"705",SO:"706",ZA:"710",KR:"410",SS:"728",ES:"724",LK:"144",SD:"729",SR:"740",SE:"752",CH:"756",SY:"760",TW:"158",TJ:"762",TZ:"834",TH:"764",TL:"626",TG:"768",TT:"780",TN:"788",TR:"792",TM:"795",UG:"800",UA:"804",AE:"784",GB:"826",US:"840",UY:"858",UZ:"860",VE:"862",VN:"704",YE:"887",ZM:"894",ZW:"716",NC:"540",MO:"446"};

  // too small to exist in the 110m map
  var PIN = {SG:[103.8,1.35],HK:[114.17,22.32],MT:[14.4,35.9],MU:[57.55,-20.3],
             BB:[-59.55,13.2],TT:[-61.25,10.7],CY:[33.4,35.1],BH:[50.55,26.2],
             LU:[6.13,49.6],MC:[7.42,43.74],AD:[1.52,42.5],LI:[9.55,47.16],
             CV:[-23.6,15.1],KM:[43.35,-11.7],SC:[55.49,-4.68],FJ:[178.0,-17.7]};

  // --- small helpers ---------------------------------------------

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function norm(s) {
    return String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().replace(/[^a-z]/g, "");
  }
  var NAMES = (typeof Intl !== "undefined" && Intl.DisplayNames)
    ? new Intl.DisplayNames(["en"], { type: "region" }) : null;
  function countryName(cc) {
    try { return (NAMES && NAMES.of(cc)) || cc; } catch (e) { return cc; }
  }

  var BY_NAME = {};
  Object.keys(PEOPLE).forEach(function (k) { BY_NAME[norm(k)] = PEOPLE[k]; });
  var SELF_KEY = norm(SELF);

  // Which country was this person at, in this year?
  function countryFor(entry, year) {
    if (typeof entry === "string") return entry;
    var y = parseInt(year, 10);
    for (var i = 0; i < entry.length; i++) {
      if (entry[i].until == null) return entry[i].country;      // open-ended, last
      if (!isFinite(y) || y <= entry[i].until) return entry[i].country;
    }
    return entry[entry.length - 1].country;
  }

  // --- turn papers.yaml into country counts ----------------------

  function build(papers) {
    var byCountry = {}, coauthors = {}, missing = {}, solo = 0;

    papers.forEach(function (p) {
      var seen = {};
      (p.author || []).forEach(function (name) {
        var key = norm(name);
        if (key === SELF_KEY) return;
        coauthors[key] = name;
        var entry = BY_NAME[key];
        if (!entry) { missing[key] = name; return; }
        var cc = countryFor(entry, p.year);
        if (cc) seen[cc.toUpperCase()] = true;
      });

      var codes = Object.keys(seen);
      if (!codes.length) { solo++; return; }
      codes.forEach(function (cc) {
        if (!byCountry[cc]) byCountry[cc] = { code: cc, name: countryName(cc), works: [] };
        byCountry[cc].works.push({
          title: p.title ? String(p.title).trim() : "Untitled",
          year: p.year,
          link: p.pubopen || p.pubclosed || ""
        });
      });
    });

    var missingList = Object.keys(missing).map(function (k) { return missing[k]; });
    if (missingList.length) {
      console.warn("Collaboration map — no country set for: " + missingList.join(", ")
        + ". Add them to PEOPLE in collab-map.js.");
    }

    var countries = Object.keys(byCountry).map(function (cc) {
      var c = byCountry[cc];
      c.count = c.works.length;
      c.works.sort(function (a, b) { return (parseInt(b.year, 10) || 0) - (parseInt(a.year, 10) || 0); });
      return c;
    }).sort(function (a, b) { return b.count - a.count || a.name.localeCompare(b.name); });

    return {
      countries: countries,
      papers: papers.length,
      coauthors: Object.keys(coauthors).length,
      solo: solo
    };
  }

  // --- draw -------------------------------------------------------

  function render(root, data, world) {
    root.innerHTML = "";

    var land = topojson.feature(world, world.objects.countries);
    land.features = land.features.filter(function (f) { return f.id !== "010"; });

    var centroid = {};
    land.features.forEach(function (f) { centroid[f.id] = d3.geoCentroid(f); });
    function lonlat(cc) {
      var c = centroid[NUM[cc]];
      if (c && isFinite(c[0])) return c;
      return PIN[cc] || null;
    }

    var placed = data.countries.filter(function (c) {
      if (lonlat(c.code)) return true;
      console.warn("Collaboration map — no position for country code " + c.code);
      return false;
    });

    var head = el("div", "cm-head");
    head.appendChild(el("h2", "cm-title", CONFIG.title));
    var sub = el("p", "cm-sub");
    sub.innerHTML = "<b>" + data.coauthors + "</b> co-authors in <b>" + placed.length
      + "</b> countries, across <b>" + data.papers + "</b> publications.";
    head.appendChild(sub);
    root.appendChild(head);

    var body = el("div", "cm-body");
    var stage = el("div", "cm-stage");
    var panel = el("div", "cm-panel");
    body.appendChild(stage); body.appendChild(panel);
    root.appendChild(body);

    var W = 1000, H = 520, PAD = 34;
    var projection = d3.geoNaturalEarth1().fitSize([W, H], land);
    var path = d3.geoPath(projection);

    // Crop the canvas to what's actually drawn — a fixed viewBox leaves empty
    // bands above and below the continents.
    var b = path.bounds(land);
    var vb = {
      x: b[0][0] - PAD,
      y: b[0][1] - PAD,
      w: (b[1][0] - b[0][0]) + PAD * 2,
      h: (b[1][1] - b[0][1]) + PAD * 2
    };

    var svg = d3.select(stage).append("svg")
      .attr("viewBox", [vb.x, vb.y, vb.w, vb.h].join(" "))
      .attr("role", "img")
      .attr("aria-label", "World map of co-author countries");

    svg.append("g").selectAll("path")
      .data(land.features).join("path")
      .attr("class", "cm-land")
      .attr("d", path);

    var max = d3.max(placed, function (c) { return c.count; }) || 1;
    var r = d3.scaleSqrt().domain([1, max]).range([6, 30]);

    var tip = el("div", "cm-tip");
    stage.appendChild(tip);

    var dots = svg.append("g").selectAll("circle")
      .data(placed).join("circle")
      .attr("class", "cm-dot").attr("tabindex", 0)
      .attr("r", function (c) { return r(c.count); })
      .attr("cx", function (c) { return projection(lonlat(c.code))[0]; })
      .attr("cy", function (c) { return projection(lonlat(c.code))[1]; });

    dots.append("title").text(function (c) {
      return c.name + " — " + c.count + (c.count === 1 ? " publication" : " publications");
    });

    var rows = {};

    function highlight(code, on) {
      dots.classed("is-on", function (c) { return on && c.code === code; });
      svg.selectAll(".cm-land").classed("is-on", function (f) { return on && f.id === NUM[code]; });
      if (rows[code]) rows[code].classList.toggle("is-on", !!on);
      if (!on) { tip.classList.remove("is-on"); return; }
      var c = placed.find(function (x) { return x.code === code; });
      var p = projection(lonlat(code));
      tip.innerHTML = "<b>" + c.name + "</b> · " + c.count;
      tip.style.left = ((p[0] - vb.x) / vb.w * 100) + "%";
      tip.style.top = ((p[1] - vb.y) / vb.h * 100) + "%";
      tip.classList.add("is-on");
    }

    dots.on("mouseenter focus", function (e, c) { highlight(c.code, true); })
        .on("mouseleave blur", function (e, c) { highlight(c.code, false); })
        .on("click", function (e, c) { showWorks(c); })
        .on("keydown", function (e, c) {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); showWorks(c); }
        });

    function showList() {
      panel.innerHTML = "";
      panel.appendChild(el("h3", null, "By country"));
      var ul = el("ul", "cm-list");
      placed.forEach(function (c) {
        var b = el("button", "cm-row");
        b.appendChild(el("span", "cm-row-name", c.name));
        b.appendChild(el("span", "cm-row-n", String(c.count)));
        ["mouseenter", "focus"].forEach(function (ev) {
          b.addEventListener(ev, function () { highlight(c.code, true); });
        });
        ["mouseleave", "blur"].forEach(function (ev) {
          b.addEventListener(ev, function () { highlight(c.code, false); });
        });
        b.addEventListener("click", function () { showWorks(c); });
        rows[c.code] = b;
        var li = el("li"); li.appendChild(b); ul.appendChild(li);
      });
      panel.appendChild(ul);
    }

    function showWorks(c) {
      panel.innerHTML = "";
      rows = {};
      var back = el("button", "cm-back", "← All countries");
      back.addEventListener("click", function () { highlight(c.code, false); showList(); });
      panel.appendChild(back);
      panel.appendChild(el("h3", null, c.name + " · " + c.count));
      var ul = el("ul", "cm-works");
      c.works.forEach(function (w) {
        var li = el("li");
        if (w.link) {
          var a = el("a", null, w.title);
          a.href = w.link; a.target = "_blank"; a.rel = "noopener";
          li.appendChild(a);
        } else {
          li.appendChild(document.createTextNode(w.title));
        }
        if (w.year) {
          li.appendChild(document.createTextNode(" "));
          li.appendChild(el("span", "cm-yr", String(w.year)));
        }
        ul.appendChild(li);
      });
      panel.appendChild(ul);
      highlight(c.code, true);
    }

    showList();

    var note = el("p", "cm-note",
      "Built from my publication list. A country counts once per publication"
      + (data.solo ? "; " + data.solo + " single-authored works are not shown" : "") + ".");
    root.appendChild(note);
  }

  // --- go ----------------------------------------------------------

  function start() {
    var root = document.getElementById("collab-map");
    if (!root) return;

    function fail(text, err) {
      root.innerHTML = "";
      root.appendChild(el("p", "cm-msg", text));
      if (err) console.error("Collaboration map:", err);
    }

    if (typeof d3 === "undefined" || typeof topojson === "undefined" || typeof jsyaml === "undefined") {
      return fail("Map libraries didn't load. Check the script tags on this page.");
    }

    root.appendChild(el("p", "cm-msg", "Loading…"));

    var papersP = fetch(CONFIG.papers)
      .then(function (r) {
        if (r.status === 404) {
          throw new Error(CONFIG.papers + " wasn't copied into the built site. "
            + "Add it under project: resources: in _quarto.yml.");
        }
        if (!r.ok) throw new Error(CONFIG.papers + " returned " + r.status);
        return r.text();
      })
      .then(function (text) {
        var list = jsyaml.load(text);
        if (!Array.isArray(list)) throw new Error(CONFIG.papers + " is not a list of publications.");
        return list;
      });

    var worldP = fetch(CONFIG.world).then(function (r) {
      if (!r.ok) throw new Error("world map file returned " + r.status);
      return r.json();
    });

    Promise.all([papersP, worldP])
      .then(function (res) { render(root, build(res[0]), res[1]); })
      .catch(function (err) { fail("Couldn't build the map — " + err.message, err); });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
