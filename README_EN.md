# ∑ Super Calculator

> A powerful all-in-one calculator with a built-in formula library, function plotting, calculus visualization, statistics charts, and a 3D surface engine — all in a single HTML file.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Version](https://img.shields.io/badge/version-3.0.0-blue.svg)](CHANGELOG.md)

🌐 **Live demo**: https://boboidvtw.github.io/

---

## Table of Contents

- [Introduction](#introduction)
- [What's New in v3.0 ⭐](#whats-new-in-v30-)
- [Feature Overview](#feature-overview)
- [Quick Start](#quick-start)
- [Usage](#usage)
- [Architecture](#architecture)
- [Mathematical Verification](#mathematical-verification)
- [Multilingual Support](#multilingual-support)
- [Formula Library](#formula-library)
- [FAQ](#faq)
- [Developer Guide](#developer-guide)
- [Changelog](#changelog)
- [License](#license)

---

## Introduction

Super Calculator is a browser-based calculator and math visualization tool built with **pure HTML + JavaScript** — **single file, zero dependencies, ready to use**. Beyond basic and scientific calculation, it integrates a complete formula library, interactive function plotting, calculus tools, statistics charts, and a custom-built 3D surface plotting engine.

### Design Philosophy

- 🎯 **Zero dependencies**: Single HTML file, no installation, no internet — just double-click
- 📚 **Education-first**: Visualize complex math concepts (derivatives, integrals, regression, 3D surfaces)
- 🌐 **Fully offline**: All computation and rendering happen locally on Canvas
- 🔒 **Security-conscious**: User input is XSS-protected and expressions run in isolated scope
- 🌏 **Cross-platform**: Works on desktop, tablet, and mobile browsers
- 🌍 **Multilingual**: Full i18n for Traditional Chinese, English, Simplified Chinese, and Japanese

---

## What's New in v3.0 ⭐

### 📐 Phase 5 — Calculus Visualization

| Tool | Description | Algorithm |
|------|-------------|-----------|
| **Tangent line** | Click any curve to display the tangent + numerical derivative | Central difference (h=1e-5) |
| **Integral shading** | Click two points to shade ∫ region with computed value | Simpson's 1/3 rule (n=1000) |
| **Slope field** | 22×14 grid of slope direction indicators | Numerical derivative per cell |

**Verification examples**:
- `f(x) = x²` tangent slope at `x=2` = **4.000** (analytical `2x|x=2 = 4` ✓)
- `∫₋₂³ x² dx` = **11.667** (analytical `35/3 ≈ 11.6667` ✓)

### ⊕ Phase 6 — Equation Solver (Multi-Function Intersections)

Click the "⊕ Intersect" button to automatically find all pairwise intersections of visible functions.

- Algorithm: 800-point scan → sign-change detection → **bisection refinement** (1e-9 precision, max 60 iterations)
- Auto-deduplication of nearby candidate roots
- More robust than Newton-Raphson — guaranteed convergence on sign-change intervals

**Verification example**:
- `x² ∩ (x+6)` → finds exact intersections **(-2, 4)** and **(3, 9)**
- Analytical solution: `x²-x-6=0` → `x∈{-2, 3}` ✓

### 📊 Phase 7 — Statistics Mode

Switch to "📉 Statistics" mode and enter data to plot:

| Chart Type | Output | Use Case |
|------------|--------|----------|
| **Histogram** | 12 bins, frequency, `n/mean/σ/min/max` | Univariate distribution |
| **Scatter + Linear Regression** | `y = mx + b`, `R²` | Correlation analysis |
| **Box Plot** | Five-number summary + IQR + outliers | Distribution spread |

**Verification examples**:
- N(5, 2) sample (n=200) → `mean=5.052`, `σ=1.955` (error < 3%)
- Linear regression `y=2x+3+noise` → `y=1.999x+3.136`, **R²=0.9962**
- 50 normal + 2 outliers → correctly identifies `outliers=2`

### 🎲 Phase 8 — 3D Surface Plotting (z = f(x,y))

Switch to "🎲 3D" mode and enter `z = f(x,y)` to render an interactive 3D surface:

- **Custom lightweight 3D engine**: Pure Canvas 2D, no WebGL/Three.js
- **Three render styles**: Surface (filled with heat-map color) / Wireframe / Contour (10-step elevation)
- **HSL heat-map**: Low z → blue (240°), high z → red (0°)
- **Interaction**: Mouse drag rotates, scroll wheel zooms (0.2× ~ 5×)
- **Painter's algorithm**: 32×32 = 1024 faces sorted by average z-depth

**Classic examples**:
- `z = sin(x)*cos(y)` → saddle surface (clear saddle point)
- `z = sin(sqrt(x²+y²))` → concentric ripples
- `z = x²-y²` → hyperbolic paraboloid

---

## Feature Overview

### 🧮 Basic & Scientific Calculation
- Four arithmetic operations, parentheses precedence, backspace, clear
- Trig (sin/cos/tan + inverses), exponential & log, square root, cube root, nth root
- Factorial, permutation, combination, base conversion, deg/rad toggle, matrix ops, unit conversion

### 📚 Built-in Formula Library
- **Geometry**: Circle area, sphere volume, Pythagorean theorem... (20+ formulas)
- **Physics**: Newton's 2nd law, Ohm's law, kinetic energy... (30+ formulas)
- **Chemistry**: Ideal gas law, pH calculation, molar concentration... (15+ formulas)
- **Finance**: Compound interest, loan payment, NPV, IRR... (10+ formulas)

### 📈 Function Plotting (v2.0)
- Display 2-6 functions simultaneously with auto-coloring
- **Parameter animation**: Sliders auto-generated for `a, b, c...` in expressions, real-time redraw
- **Special points**: Zero detection (sign change), extrema (3-point derivative approximation)
- **Export**: PNG (Canvas blob) / SVG (DOM-reconstructed with axes & legend)
- **Click marking**: Click curves to mark coordinates with auto-snap
- **Hover tooltip**: Mouse over curve to see real-time `(x, f(x))` coordinates

### 📐 Calculus Tools (v3.0 New)
- Tangent visualization, integral shading, slope field

### ⊕ Equation Solver (v3.0 New)
- Multi-function intersection detection (bisection-refined)

### 📊 Statistics Charts (v3.0 New)
- Histogram, scatter + linear regression, box plot

### 🎲 3D Surface Plotting (v3.0 New)
- z=f(x,y) custom Canvas 2D engine, three render styles, interactive rotation & zoom

### 🌐 Multilingual
- Traditional Chinese, English, Simplified Chinese, Japanese — full i18n

### 🎨 Theme Switching
- Light / Dark mode driven by CSS Variables

---

## Quick Start

### Online (Recommended)

Visit → **https://boboidvtw.github.io/**

### Offline

```bash
# Method 1: Direct download
curl -O https://raw.githubusercontent.com/boboidvtw/boboidvtw.github.io/main/index.html
# Double-click index.html to open

# Method 2: Clone the entire repo
git clone https://github.com/boboidvtw/boboidvtw.github.io.git
cd boboidvtw.github.io
# Double-click index.html or:
python3 -m http.server 8080
# Open http://localhost:8080 in browser
```

---

## Usage

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `0–9` | Digit input |
| `+ - * /` | Arithmetic operators |
| `Enter` / `=` | Evaluate |
| `Escape` | All Clear (AC) |
| `Backspace` | Delete last digit |
| `(` `)` | Parentheses |

### Function Plotting Workflow

1. **Open the plotter**: Click "📈 Graph" on the main interface
2. **Choose mode**: Top tabs switch between "📊 Function / 📉 Statistics / 🎲 3D"
3. **Enter functions**: e.g. `x^2`, `sin(x)`, `a*sin(b*x)`
4. **Set range**: X min/max (default `-10` to `10`)

#### 📊 Function Mode — Advanced Tools

Select a tool from the bottom toolbar:
- 🟢 **Mark** — Click curve to mark coordinates
- 📐 **Tangent** — Click curve to display tangent line (click again to clear)
- ∫ **Integral** — Click start, then end — auto-shades the integral region
- 〽️ **Slope field** — Visualize the derivative direction field (click again to disable)
- ⊕ **Intersect** — Auto-find all pairwise function intersections

#### 📉 Statistics Mode

1. Select chart type (Histogram / Scatter / Box plot)
2. Enter data:
   - **Single column** (histogram, box plot): `1.5, 2.3, 3.1, 4.2, ...`
   - **x,y pairs** (scatter): `0,1; 1,3; 2,5; 3,7; ...`
3. Click "Draw"

#### 🎲 3D Mode

1. Enter `z = f(x,y)` expression (e.g. `sin(x)*cos(y)`)
2. Set X / Y range
3. Choose render style (Surface / Wireframe / Contour)
4. Click "Render"
5. **Drag to rotate**, **scroll to zoom**

### Expression Syntax Reference

| Syntax | Meaning |
|--------|---------|
| `x^2` | x² |
| `sqrt(x)`, `x^0.5` | √x |
| `sin(x)`, `cos(x)`, `tan(x)` | Trig (radians) |
| `asin(x)`, `acos(x)`, `atan(x)` | Inverse trig |
| `e^x`, `exp(x)` | Exponential |
| `ln(x)`, `log(x)` | Natural log, common log |
| `abs(x)` | Absolute value |
| `pi`, `e` | π, e (Math.PI / Math.E) |
| `a*sin(b*x)` | With parameters a, b (auto slider) |

### Using the Formula Library

1. Click the "Formula Library" button to open the panel
2. Select a category (Math / Physics / Chemistry / Finance)
3. Click a formula — it auto-fills the input field
4. Enter values and press `=` to calculate

---

## Architecture

```
boboidvtw.github.io/
├── index.html                  # Main app (225 KB, single-file)
│   ├── HTML structure          # Calculator UI + plot modal (3-mode tabs)
│   ├── CSS styles              # Responsive, CSS Variables theming
│   └── JavaScript              # ~4,300 lines
│       ├── Calculation engine  # Expression parser, arithmetic, scientific
│       ├── Formula library     # Math/physics/chemistry/finance
│       ├── Plotting v2.0       # Multi-function, animation, special points, export
│       ├── Calculus tools      # Tangent, integral, slope field
│       ├── Equation solver     # Bisection intersection finder
│       ├── Statistics          # Histogram, scatter, box plot
│       └── 3D engine           # Custom Canvas 2D rotation projection
├── docs/
│   ├── FORMULAS.md             # Complete formula list
│   ├── FAQ.md                  # Frequently asked questions
│   ├── PHASE5-8_COMPLETION.md  # v3.0 technical completion report
│   ├── RELEASE_NOTES.md        # User-facing release notes
│   └── GRAPHING_FEATURE.md     # v2.0 plotting technical reference
├── CHANGELOG.md
├── CLAUDE.md / Design.md       # AI tool design guide
├── LICENSE
├── README.md / README_EN.md
└── .gitignore
```

### Tech Stack Choices

| Domain | Choice | Rationale |
|--------|--------|-----------|
| Rendering | Canvas 2D | Zero deps, broad compat, easy to control |
| 3D | Custom rotation projection + painter's algorithm | Educational, no WebGL needed |
| Numerical derivative | Central difference | 2nd-order accuracy, simple |
| Numerical integration | Simpson's 1/3 | 4th-order accuracy, fast convergence |
| Root finding | Bisection | Robust, guaranteed convergence |
| Regression | Least squares | Closed-form, no iteration |
| Storage | localStorage | Pure frontend, no server |
| i18n | data-i18n attributes + JSON dictionary | Pure frontend, extensible |

### Numerical Methods Detail

```javascript
// Central difference (Phase 5 tangent)
numericalDerivative(fn, x, params, h=1e-5)
  → (fn(x+h) - fn(x-h)) / (2*h)
  → 2nd-order accuracy O(h²)

// Simpson's 1/3 rule (Phase 5 integral)
numericalIntegral(fn, a, b, params, n=1000)
  → (h/3) * [f(x₀) + 4·Σf(x_odd) + 2·Σf(x_even) + f(xₙ)]
  → 4th-order accuracy O(h⁴)

// Bisection (Phase 6 intersection refinement)
refinePairBisection(fA, fB, lo, hi, params)
  → bisect g(x) = fA(x) - fB(x)
  → converges when |g(mid)| < 1e-9 or (hi-lo)/2 < tol

// 3D projection (Phase 8)
project3D(x, y, z, state, w, h)
  → 1. X-axis rotation (elevation rotX)
  → 2. Y-axis rotation (azimuth rotY)
  → 3. Orthogonal projection (preferred for science viz)
  → 4. Zoom scaling
```

---

## Mathematical Verification

| Test Case | Expected | Actual | Status |
|-----------|----------|--------|:------:|
| `d/dx(x²)` at `x=2` | 4 | 4.000 | ✅ |
| `∫₋₂³ x² dx` | 35/3 ≈ 11.667 | 11.667 | ✅ |
| `x² ∩ (x+6)` roots | `{-2, 3}` | `{-2.000, 3.000}` | ✅ |
| `N(5, 2)` sample (n=200) mean | ≈ 5 | 5.052 | ✅ |
| `N(5, 2)` sample (n=200) σ | ≈ 2 | 1.955 | ✅ |
| Linear regression `y=2x+3+noise` | `(m, b) = (2, 3)` | `(1.999, 3.136), R²=0.9962` | ✅ |
| `z=sin(x)cos(y)` range | `[-1, 1]` | `[-1.00, 1.00]` | ✅ |

Full technical details in [docs/PHASE5-8_COMPLETION.md](docs/PHASE5-8_COMPLETION.md).

---

## Multilingual Support

| Language | Calc | Formulas | Plot | Stats | 3D | Status |
|----------|:----:|:--------:|:----:|:-----:|:--:|:------:|
| Traditional Chinese (zh-TW) | ✅ | ✅ | ✅ | ✅ | ✅ | Complete (default) |
| English (en) | ✅ | ✅ | ✅ | ✅ | ✅ | Complete |
| Simplified Chinese (zh-CN) | ✅ | ✅ | ✅ | ✅ | ✅ | Complete |
| Japanese (ja) | ✅ | ✅ | ✅ | ✅ | ✅ | Complete |

**Switch language**: Click the language selector in the top-right corner. All UI elements (buttons, labels, hints, error messages, plotter toolbar) update instantly. v3.0 added 22 i18n keys × 4 languages = **88 translations**.

---

## Formula Library

See [docs/FORMULAS.md](docs/FORMULAS.md) for the complete formula list.

### Category Overview

| Category | Count | Examples |
|----------|-------|----------|
| Geometry | 20+ | Circle area `A=πr²`, sphere volume `V=⁴⁄₃πr³`, Pythagoras |
| Physics | 30+ | Newton's 2nd law `F=ma`, Ohm's law `V=IR`, kinetic energy `E=½mv²` |
| Chemistry | 15+ | Ideal gas law `PV=nRT`, pH = -log[H⁺] |
| Finance | 10+ | Compound interest `A=P(1+r)ⁿ`, NPV, IRR, monthly loan payment |

---

## FAQ

See [docs/FAQ.md](docs/FAQ.md) for the full FAQ.

**Q: Does it require an internet connection?**
A: No. Once `index.html` is downloaded, it runs completely offline. All computation (including 3D rendering) happens locally.

**Q: Which browsers are supported?**
A: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+. 3D mode performs best on hardware from 2018 or later.

**Q: Why Canvas 2D instead of WebGL for 3D?**
A: Education first. Hand-rolled rotation matrices + painter's algorithm let learners fully understand 3D rendering principles, with no WebGL context compatibility issues. 32×32 resolution runs smoothly on most devices.

**Q: How complex can expressions be?**
A: Most JavaScript `Math.*` functions are supported, including nested parentheses. Example: `a*sin(b*x) + cos(c*x²) - sqrt(abs(x))`. We avoid `eval` — all expressions are compiled in isolated scope via `new Function`.

**Q: Is calculation history saved?**
A: Yes, stored in browser `localStorage`. Cleared when browser cache is cleared. No data is uploaded.

**Q: Why bisection instead of Newton-Raphson for intersections?**
A: Bisection **guarantees convergence** on any sign-change interval, avoiding Newton's divergence risk near inflection points. The slower convergence is imperceptible — 1e-9 precision needs only ~30 iterations.

---

## Developer Guide

### Local Development

```bash
git clone https://github.com/boboidvtw/boboidvtw.github.io.git
cd boboidvtw.github.io

# Serve with any static HTTP server
python3 -m http.server 8080
# or
npx serve .

# Open http://localhost:8080 in browser
```

### Adding a Formula

Add an entry to the formula library object in `index.html`:

```javascript
{
  name: "Formula Name",
  formula: "f(x) = ...",
  variables: ["x", "y"],
  category: "geometry",  // geometry | physics | chemistry | finance
  description: "Brief description"
}
```

### Adding a 3D Preset Surface

Edit the `default3DExpr` presets:

```javascript
const presets = [
  { name: "Saddle", expr: "sin(x)*cos(y)" },
  { name: "Ripple", expr: "sin(sqrt(x*x+y*y))" },
  // Add here
  { name: "Gaussian", expr: "exp(-(x*x+y*y))" }
];
```

### Contributing

1. Fork this repo
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Develop and test (manual browser verification + math correctness check)
4. Commit: `git commit -m 'feat: add some feature'`
5. Push: `git push origin feat/your-feature`
6. Open a Pull Request with test notes and screenshots

### Coding Standards

- Pure Vanilla JS — avoid framework dependencies (preserves single-file portability)
- Expression evaluation must run via `new Function` in isolated scope (no `eval`)
- All user input must be passed through `escapeHTML()` / `escapeXML()`
- Numerical algorithms must include theoretical-value verification (analytical vs implementation)
- New UI elements must include `data-i18n` attributes and translations in all 4 languages

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for the full history.

### v3.0.0 (2026-05-08) ⭐
- 📐 Calculus visualization (tangent / integral / slope field)
- ⊕ Equation solver (bisection multi-function intersections)
- 📊 Statistics charts (histogram / scatter+regression / box plot)
- 🎲 3D surface plotting (custom Canvas 2D engine)
- 🌍 i18n +22 keys × 4 languages

### v2.0.0 (2026-05-07)
- 📈 Multi-function plotting system (2-6 functions)
- 🎮 Parameter animation (auto-generated sliders)
- 📥 PNG / SVG export
- 🖱️ Click-to-mark, special point detection (zeros / extrema)
- 🔒 XSS protection, expression isolation

### v1.0.0 (2026-04-21)
- 🎉 Initial release
- ✅ Basic arithmetic
- ✅ Scientific calculation
- ✅ Formula library system
- ✅ Bilingual support (zh-TW + en)

---

## License

This project is licensed under the [MIT License](LICENSE).

Copyright © 2026

---

## Credits

- **Implementation**: Amy Agent (Claude Haiku 4.5 + Opus 4.7 collaboration)
- **Architecture**: Phase-based TDD incremental development
- **QA**: Pure browser integration testing + mathematical correctness verification
- **Documentation**: Complete bilingual README + technical completion reports

---

*Have a question or suggestion? Open an [Issue](https://github.com/boboidvtw/boboidvtw.github.io/issues) or submit a [Pull Request](https://github.com/boboidvtw/boboidvtw.github.io/pulls).*

**🌸 Made with care by Amy Agent.**
