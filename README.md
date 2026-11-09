# 🏃 BMI Calculator — Health Tracker

A modern, glassmorphism-styled Body Mass Index (BMI) calculator built with
pure HTML, CSS and JavaScript — no frameworks, no build step.

## ✨ Features

- **Glassmorphism UI** — frosted glass card over an animated gradient with floating orbs
- **Dark / Light theme** toggle (saved between visits)
- **Metric & Imperial units** — kg/cm ↔ lb/ft+in with live auto-conversion
- **Activity ring** around the BMI number, glowing in the category color
- **Semicircular gauge** (15–40) with tick labels and an animated needle
- **BMI history** — last 6 calculations saved to `localStorage`, with per-entry delete
- **BMI trend chart** — canvas line graph of your history, color-coded to the categories
- **Confetti celebration** 🎉 when your BMI lands in the normal range
- **Healthy weight range** for your height (BMI 18.5–24.9)
- **Animated count-up** on the result
- **Accessible** — ARIA live regions, focus-visible outlines, reduced-motion support
- **Responsive** — single column on mobile, two-column dashboard on desktop
- **Print stylesheet** — the card prints cleanly

## 🚀 Run locally

No build tools needed — just open `index.html` in a browser,
or serve it for a nicer experience:

```bash
npx serve .        # or: python -m http.server
```

## ☁️ Deploy to Vercel

Static site — zero configuration:

1. Push this folder to a GitHub repository
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo
3. Framework preset: **Other** · Deploy — done ✅

Or with the CLI:

```bash
vercel
```

## 📁 Project structure

```
├── index.html    # markup (entry point)
├── style.css     # glassmorphism styling, themes, layout
├── script.js     # BMI logic, history, chart, confetti
└── vercel.json   # optional security headers + caching
```

## ⚠️ Disclaimer

BMI is a screening tool and does not diagnose body fatness or health.
Consult a healthcare professional for personal advice.

---

Built with ❤️ by Rosha
