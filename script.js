"use strict";

// ==========================================
// SAFE LOCAL STORAGE HELPER
// ==========================================

const store = {
    get(key, fallback) {
        try {
            const value = JSON.parse(localStorage.getItem(key));
            return value === null ? fallback : value;
        } catch {
            return fallback;
        }
    },
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch {
            /* storage unavailable — app still works */
        }
    },
};

// ==========================================
// CONSTANTS & STATE
// ==========================================

const KG_PER_LB = 0.45359237;
const CM_PER_IN = 2.54;

// WHO classification boundaries
const BMI_RANGES = {
    underMax: 18.5,
    normalMax: 25,
    overweightMax: 30,
};

const CATEGORY_COLORS = {
    Underweight: "#5b8db8",
    Normal: "#4ca67d",
    Overweight: "#d99a3d",
    Obese: "#e05252",
};

/**
 * Build a contextual, professionally worded summary for a result.
 * Returns { lead, tips[] } — the lead frames the number, the tips
 * give concrete, non-judgemental next steps.
 */
function buildRecommendation(bmi, category, weightKg, heightCm) {
    const h = heightCm / 100;
    const minKg = BMI_RANGES.underMax * h * h;
    const maxKg = 24.9 * h * h;
    const fmt = (kg) => (unitSystem === "imperial"
        ? `${round1(kg / KG_PER_LB)} lb`
        : `${round1(kg)} kg`);

    switch (category) {
        case "Underweight":
            return {
                lead:
                    `At ${bmi.toFixed(1)}, your BMI sits below the healthy ` +
                    "range of 18.5\u201324.9. This usually reflects energy " +
                    "intake that falls short of your body's needs, rather than " +
                    "anything to be alarmed by.",
                tips: [
                    `Reaching the healthy range would involve gaining roughly ` +
                        `${fmt(minKg - weightKg)}; a gradual 0.25\u20130.5 kg ` +
                        "per week is a sustainable pace.",
                    "Focus on nutrient-dense meals \u2014 adequate protein, " +
                        "whole grains and healthy fats \u2014 supported by " +
                        "resistance-based exercise.",
                    "A conversation with your doctor or a registered dietitian " +
                        "can rule out underlying causes and personalise a plan.",
                ],
            };

        case "Normal":
            return {
                lead:
                    `At ${bmi.toFixed(1)}, your BMI sits within the healthy ` +
                    "range of 18.5\u201324.9 \u2014 the band associated with " +
                    "the lowest overall health risk.",
                tips: [
                    "Maintain steady habits: balanced meals, around 150 minutes " +
                        "of moderate activity each week, and sufficient sleep.",
                    "Small fluctuations within this range are entirely normal; " +
                        "a periodic recheck is enough.",
                ],
            };

        case "Overweight": {
            const excess = weightKg - maxKg;
            return {
                lead:
                    `At ${bmi.toFixed(1)}, your BMI is modestly above the ` +
                    "healthy range of 18.5\u201324.9. Even a small change \u2014 " +
                    "roughly 5\u201310% of body weight \u2014 meaningfully reduces " +
                    "long-term health risk.",
                tips: [
                    excess > 0
                        ? `Bringing your BMI to 24.9 corresponds to losing ` +
                          `about ${fmt(excess)}; a gradual 0.25\u20130.5 kg per ` +
                          "week is a sustainable pace."
                        : "A modest, gradual reduction in weight is a sound " +
                          "starting point.",
                    "Pair a moderate calorie deficit with regular activity you " +
                        "actually enjoy \u2014 consistency matters more than " +
                        "intensity.",
                    "Prioritise sleep and stress management; both influence " +
                        "appetite and weight regulation.",
                ],
            };
        }

        case "Obese":
            return {
                lead:
                    `At ${bmi.toFixed(1)}, your BMI falls within the obesity ` +
                    "range (30+), where health risks rise gradually rather than " +
                    "suddenly. The encouraging part: even modest, sustained " +
                    "weight loss produces outsized health benefits.",
                tips: [
                    "A healthcare professional can help design a plan that fits " +
                        "your circumstances \u2014 worth doing before making " +
                        "significant changes.",
                    "Sustained losses of 5\u201310% of body weight measurably " +
                        "improve blood pressure, blood sugar and energy levels.",
                    "Focus on changes you can keep: regular movement, " +
                        "protein-forward meals, and realistic weekly goals.",
                ],
            };
    }
}

function renderRecommendation(result) {
    const rec = buildRecommendation(
        result.bmi,
        result.category,
        result.weightKg,
        result.heightCm
    );
    recommendationLead.textContent = rec.lead;
    recommendationTips.innerHTML = "";
    rec.tips.forEach((tip) => {
        const li = document.createElement("li");
        li.textContent = tip;
        recommendationTips.appendChild(li);
    });
    recommendationTips.hidden = false;
}

let unitSystem = store.get("bmi-units", "metric");   // "metric" | "imperial"
let lastResult = null;                               // most recent calculation
let countAnim = null;                                // count-up animation handle

const RECOMMENDATION_PLACEHOLDER =
    "Enter your height and weight to receive a personalised summary.";

// ==========================================
// GET HTML ELEMENTS
// ==========================================

const unitMetricBtn = document.getElementById("unitMetric");
const unitImperialBtn = document.getElementById("unitImperial");

const bmiForm = document.getElementById("bmiForm");
const resetBtn = document.getElementById("resetBtn");
const weightInput = document.getElementById("weight");
const weightUnit = document.getElementById("weightUnit");
const heightMetricGroup = document.getElementById("heightMetricGroup");
const heightImperialGroup = document.getElementById("heightImperialGroup");
const heightFtInput = document.getElementById("heightFt");
const heightInInput = document.getElementById("heightIn");
const heightMetricInput = document.getElementById("height");

const errorElement = document.getElementById("error");
const bmiElement = document.getElementById("bmiValue");
const categoryTextElement = document.getElementById("categoryText");
const catDotElement = document.getElementById("catDot");
const healthyRangeElement = document.getElementById("healthyRange");
const recommendationLead = document.getElementById("recommendationLead");
const recommendationTips = document.getElementById("recommendationTips");
const gaugeMarker = document.getElementById("gaugeMarker");
const gaugeDot = gaugeMarker ? gaugeMarker.querySelector("circle") : null;
const scoreBlock = document.getElementById("scoreBlock");

const historyList = document.getElementById("historyList");
const historyEmpty = document.getElementById("historyEmpty");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");

const trendChart = document.getElementById("trendChart");
const chartBlock = document.getElementById("chartBlock");

const DEFAULT_BMI_COLOR = "var(--text-muted)";

const dateFmt = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
});

// ==========================================
// UNIT SYSTEM
// ==========================================

function round1(value) {
    return Math.round(value * 10) / 10;
}

function convertInputsOnSwitch(target) {
    const weight = parseFloat(weightInput.value);

    if (target === "imperial" && !isNaN(weight)) {
        // kg -> lb, cm -> ft + in
        weightInput.value = String(round1(weight / KG_PER_LB));
        const cm = parseFloat(heightMetricInput.value);
        if (!isNaN(cm)) {
            const totalInches = cm / CM_PER_IN;
            let ft = Math.floor(totalInches / 12);
            let inches = round1(totalInches - ft * 12);
            if (inches >= 12) {
                ft += 1;
                inches = 0;
            }
            heightFtInput.value = String(ft);
            heightInInput.value = String(inches);
        }
    }

    if (target === "metric" && !isNaN(weight)) {
        // lb -> kg, ft + in -> cm
        weightInput.value = String(round1(weight * KG_PER_LB));
        const ft = parseFloat(heightFtInput.value) || 0;
        const inches = parseFloat(heightInInput.value) || 0;
        if (ft > 0 || inches > 0) {
            heightMetricInput.value =
                String(round1((ft * 12 + inches) * CM_PER_IN));
        }
    }
}

function setUnitSystem(system, { convert = true } = {}) {
    if (convert) convertInputsOnSwitch(system);
    unitSystem = system;
    store.set("bmi-units", system);

    const metric = system === "metric";
    unitMetricBtn.classList.toggle("active", metric);
    unitImperialBtn.classList.toggle("active", !metric);
    unitMetricBtn.setAttribute("aria-pressed", String(metric));
    unitImperialBtn.setAttribute("aria-pressed", String(!metric));

    weightInput.placeholder = metric ? "e.g. 70" : "e.g. 154";
    weightUnit.textContent = metric ? "(kg)" : "(lb)";
    heightMetricGroup.hidden = !metric;
    heightImperialGroup.hidden = metric;

    errorElement.textContent = "";

    // Re-render unit-dependent text if a result exists
    if (lastResult) {
        healthyRangeElement.innerHTML =
            `Healthy weight for your height: <strong>${healthyWeightLabel(lastResult.heightCm)}</strong>`;
        renderRecommendation(lastResult);
        renderHistory();
    }
}

unitMetricBtn.addEventListener("click", () => {
    if (unitSystem !== "metric") setUnitSystem("metric");
});

unitImperialBtn.addEventListener("click", () => {
    if (unitSystem !== "imperial") setUnitSystem("imperial");
});

// ==========================================
// HELPERS
// ==========================================

/**
 * Read the weight/height inputs in whichever unit system is active
 * and return {weightKg, heightCm} after validation, or null.
 */
function getValidInputs() {
    const weightRaw = parseFloat(weightInput.value);

    let weightKg;
    let heightCm;

    if (unitSystem === "metric") {
        const heightRaw = parseFloat(heightMetricInput.value);
        if (isNaN(weightRaw) || isNaN(heightRaw)) {
            errorElement.textContent =
                "Please enter both your weight and height.";
            return null;
        }
        weightKg = weightRaw;
        heightCm = heightRaw;
    } else {
        const ft = parseFloat(heightFtInput.value);
        const inches = parseFloat(heightInInput.value);
        if (isNaN(weightRaw) || isNaN(ft) || isNaN(inches) ||
            (ft === 0 && inches === 0)) {
            errorElement.textContent =
                "Please enter your weight and height (feet and inches).";
            return null;
        }
        weightKg = weightRaw * KG_PER_LB;
        heightCm = (ft * 12 + inches) * CM_PER_IN;
    }

    if (weightKg <= 0 || heightCm <= 0) {
        errorElement.textContent =
            "Weight and height must be positive numbers.";
        return null;
    }

    if (weightKg < 1 || weightKg > 500 || heightCm < 50 || heightCm > 260) {
        errorElement.textContent =
            "Please enter realistic values (weight 1\u2013500 kg / height 50\u2013260 cm).";
        return null;
    }

    return { weightKg, heightCm };
}

/**
 * Healthy weight range in the active unit system.
 */
function healthyWeightLabel(heightCm) {
    const heightM = heightCm / 100;
    const minKg = BMI_RANGES.underMax * heightM * heightM;
    const maxKg = (BMI_RANGES.normalMax - 0.1) * heightM * heightM;

    if (unitSystem === "imperial") {
        return `${round1(minKg / KG_PER_LB)}\u2013${round1(maxKg / KG_PER_LB)} lb`;
    }
    return `${round1(minKg)}\u2013${round1(maxKg)} kg`;
}

/**
 * Move the gauge marker along the semicircle (scale 15 → 40).
 * Values outside the displayed range are clamped to the nearest edge,
 * and the marker takes the category colour so the reading stays clear.
 */
function setGauge(bmi, color) {
    const clamped = Math.min(Math.max(bmi, 15), 40);
    const deg = ((clamped - 15) / 25) * 180;
    gaugeMarker.style.opacity = "1";
    gaugeMarker.style.transform = `rotate(${deg}deg)`;
    if (gaugeDot) gaugeDot.style.fill = color;
}

/**
 * Gentle emphasis animation when a new result lands —
 * replaces the old full-screen confetti.
 */
function pulseResult() {
    if (!scoreBlock) return;
    scoreBlock.classList.remove("pulse");
    void scoreBlock.offsetWidth; // restart the animation
    scoreBlock.classList.add("pulse");
}

function classify(bmi) {
    if (bmi < BMI_RANGES.underMax) return "Underweight";
    if (bmi < BMI_RANGES.normalMax) return "Normal";
    if (bmi < BMI_RANGES.overweightMax) return "Overweight";
    return "Obese";
}

/**
 * Animate the BMI number from its current value to the target.
 */
function animateBmiValue(target) {
    if (countAnim) cancelAnimationFrame(countAnim);

    const from = parseFloat(bmiElement.textContent);
    if (isNaN(from) || from === target) {
        bmiElement.textContent = target.toFixed(2);
        return;
    }

    const start = performance.now();
    const duration = 650;

    function frame(now) {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
        bmiElement.textContent = (from + (target - from) * eased).toFixed(2);
        if (t < 1) countAnim = requestAnimationFrame(frame);
    }

    countAnim = requestAnimationFrame(frame);
}

/**
 * Human-readable "70 kg" or "154 lb · 5′9″" using the active units.
 */
function measurementsLabel(weightKg, heightCm) {
    if (unitSystem === "imperial") {
        const totalInches = heightCm / CM_PER_IN;
        const ft = Math.floor(totalInches / 12);
        const inches = round1(totalInches - ft * 12);
        return `${round1(weightKg / KG_PER_LB)} lb \u00b7 ${ft}\u2032${inches}\u2033`;
    }
    return `${round1(weightKg)} kg \u00b7 ${round1(heightCm)} cm`;
}

// ==========================================
// HISTORY
// ==========================================

function getHistory() {
    return store.get("bmi-history", []);
}

function addHistoryEntry(entry) {
    const history = getHistory();
    history.unshift(entry);           // newest first
    store.set("bmi-history", history.slice(0, 6));
    renderHistory();
}

function renderHistory() {
    const history = getHistory();

    historyEmpty.hidden = history.length > 0;
    clearHistoryBtn.hidden = history.length === 0;
    historyList.innerHTML = "";

    history.forEach((item, index) => {
        const li = document.createElement("li");
        li.className = "history-item";

        const label = measurementsLabel(item.weightKg, item.heightCm);

        li.innerHTML = `
            <span class="history-dot" style="background:${item.color}"></span>
            <span class="history-info">
                <span class="history-value">
                    ${item.bmi}
                    <span class="history-cat"
                          style="color:${item.color}">${item.category}</span>
                </span>
                <span class="history-meta">${label} \u00b7 ${item.date}</span>
            </span>
            <button type="button" class="history-delete"
                    data-index="${index}" aria-label="Delete entry">\u00d7</button>
        `;

        historyList.appendChild(li);
    });

    renderTrendChart();
}

historyList.addEventListener("click", (event) => {
    const btn = event.target.closest(".history-delete");
    if (!btn) return;

    const history = getHistory();
    history.splice(Number(btn.dataset.index), 1);
    store.set("bmi-history", history);
    renderHistory();
});

clearHistoryBtn.addEventListener("click", () => {
    store.set("bmi-history", []);
    renderHistory();
});

// ==========================================
// BMI TREND CHART (canvas, no libraries)
// ==========================================

function renderTrendChart() {
    const data = [...getHistory()].reverse(); // oldest -> newest

    if (data.length < 2) {
        chartBlock.hidden = true;
        return;
    }
    chartBlock.hidden = false;

    const dpr = window.devicePixelRatio || 1;
    const W = trendChart.clientWidth;
    const H = trendChart.clientHeight;
    trendChart.width = Math.round(W * dpr);
    trendChart.height = Math.round(H * dpr);

    const ctx = trendChart.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    const styles = getComputedStyle(document.documentElement);
    const textMain = styles.getPropertyValue("--text").trim() || "#ece5d8";

    const values = data.map((d) => parseFloat(d.bmi));
    const lo = Math.min(...values) - 1.5;
    const hi = Math.max(...values) + 1.5;
    const padX = 12;
    const padY = 16;

    const xPos = (i) => padX + (i / (data.length - 1)) * (W - padX * 2);
    const yPos = (v) => padY + (1 - (v - lo) / (hi - lo)) * (H - padY * 2);

    // Healthy-range zone bands (under / normal / over / obese)
    const zones = [
        [lo, 18.5, "91, 141, 184"],
        [18.5, 25, "76, 166, 125"],
        [25, 30, "217, 154, 61"],
        [30, hi, "224, 82, 82"],
    ];
    zones.forEach(([from, to, rgb]) => {
        if (to <= lo || from >= hi) return;
        const y1 = yPos(Math.max(from, lo));
        const y2 = yPos(Math.min(to, hi));
        ctx.fillStyle = `rgba(${rgb}, 0.14)`;
        ctx.fillRect(
            padX - 8,
            Math.min(y1, y2),
            W - (padX - 8) * 2,
            Math.abs(y2 - y1)
        );
    });

    // Trend line
    const gradient = ctx.createLinearGradient(0, 0, W, 0);
    gradient.addColorStop(0, "#d95f42");
    gradient.addColorStop(1, "#f08b70");
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.beginPath();
    values.forEach((v, i) => {
        const x = xPos(i);
        const y = yPos(v);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Points, with the latest one highlighted and labelled
    data.forEach((item, i) => {
        const x = xPos(i);
        const y = yPos(values[i]);
        ctx.beginPath();
        ctx.arc(x, y, i === data.length - 1 ? 5 : 3.5, 0, Math.PI * 2);
        ctx.fillStyle = item.color;
        ctx.fill();
        if (i === data.length - 1) {
            ctx.lineWidth = 2;
            ctx.strokeStyle = textMain;
            ctx.stroke();
            ctx.fillStyle = textMain;
            ctx.font = "700 11px Inter, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(values[i].toFixed(1), x, y - 11);
        }
    });
}

// ==========================================
// FORM SUBMISSION (Enter key + button)
// ==========================================

bmiForm.addEventListener("submit", function (event) {
    event.preventDefault();
    errorElement.textContent = "";

    const inputs = getValidInputs();
    if (!inputs) return;

    const { weightKg, heightCm } = inputs;
    const heightM = heightCm / 100;

    // BMI formula
    const bmi = weightKg / (heightM * heightM);
    const category = classify(bmi);
    const color = CATEGORY_COLORS[category];
    const range = healthyWeightLabel(heightCm);

    // Keep a record for copy / unit switching
    lastResult = { bmi, category, color, range, weightKg, heightCm };

    // Display result
    animateBmiValue(bmi);
    categoryTextElement.textContent = category;
    categoryTextElement.parentElement.style.color = color;
    catDotElement.style.background = color;
    bmiElement.style.color = color;
    renderRecommendation(lastResult);
    healthyRangeElement.innerHTML =
        `Healthy weight for your height: <strong>${range}</strong>`;

    setGauge(bmi, color);
    pulseResult();

    // Save to history
    addHistoryEntry({
        bmi: bmi.toFixed(2),
        category,
        color,
        weightKg,
        heightCm,
        date: dateFmt.format(new Date()),
    });
});

// ==========================================
// RESET BUTTON
// ==========================================

resetBtn.addEventListener("click", function () {
    bmiForm.reset();
    errorElement.textContent = "";

    lastResult = null;
    if (countAnim) cancelAnimationFrame(countAnim);

    // Reset BMI
    bmiElement.textContent = "--";
    bmiElement.style.color = DEFAULT_BMI_COLOR;

    // Reset category
    categoryTextElement.textContent = "Enter your details above";
    categoryTextElement.parentElement.style.color = "";
    catDotElement.style.background = "transparent";

    // Reset healthy range
    healthyRangeElement.textContent = "";

    // Reset recommendation
    recommendationLead.textContent = RECOMMENDATION_PLACEHOLDER;
    recommendationTips.hidden = true;
    recommendationTips.innerHTML = "";

    // Reset gauge
    if (gaugeDot) gaugeDot.style.fill = "";
    gaugeMarker.style.opacity = "0";
    gaugeMarker.style.transform = "rotate(0deg)";
});

// ==========================================
// CLEAR ERROR WHILE TYPING
// ==========================================

[weightInput, heightMetricInput, heightFtInput, heightInInput]
    .forEach((input) =>
        input.addEventListener("input", () => {
            errorElement.textContent = "";
        })
    );

// ==========================================
// INITIALIZE
// ==========================================

setUnitSystem(unitSystem, { convert: false });
renderHistory();
