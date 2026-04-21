# ∑ Super Calculator

> A powerful all-in-one calculator with a built-in formula library, supporting scientific computation, engineering calculation, and multilingual interface.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

---

## Table of Contents

- [Introduction](#introduction)
- [Features](#features)
- [Usage](#usage)
- [Architecture](#architecture)
- [Multilingual Support](#multilingual-support)
- [Formula Library](#formula-library)
- [FAQ](#faq)
- [Developer Guide](#developer-guide)
- [Changelog](#changelog)
- [License](#license)

---

## Introduction

Super Calculator is a browser-based calculator built with pure HTML + JavaScript — **no installation, no internet connection required**.

Design philosophy:
- **Zero dependencies**: Single HTML file, works out of the box
- **Formula library**: Built-in formulas across math, physics, chemistry, and finance
- **Intuitive UX**: Keyboard and mouse support
- **Cross-platform**: Works on desktop and mobile browsers

---

## Features

### Basic Calculation
- Four arithmetic operations (add, subtract, multiply, divide)
- Decimal and fraction support
- Parentheses and operator precedence
- Clear (C), All Clear (AC), Backspace (⌫)

### Scientific Calculation
- Trigonometric functions (sin, cos, tan and inverses)
- Exponential and logarithm (log, ln, e^x)
- Square root, cube root, nth root
- Factorial, permutation, combination (n!, P, C)

### Engineering Calculation
- Base conversion (binary, octal, hexadecimal)
- Degree / radian mode toggle
- Basic matrix operations
- Unit conversion

### Formula Library
- Geometry (area, volume, perimeter)
- Physics (mechanics, electromagnetism, thermodynamics)
- Chemistry (ideal gas law, molar calculation)
- Finance (compound interest, loan, ROI)

---

## Usage

### Quick Start

1. Download or copy `index.html`
2. Open it in any browser (double-click the file)
3. Start calculating!

```bash
# Or clone this repo
git clone https://github.com/boboidvtw/super-calculator.git
cd super-calculator
# Open index.html in your browser
```

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `0–9` | Digit input |
| `+ - * /` | Arithmetic operators |
| `Enter` / `=` | Evaluate |
| `Escape` | All Clear (AC) |
| `Backspace` | Delete last digit |
| `(` `)` | Parentheses |

### Using the Formula Library

1. Click the "Formula Library" button to open the panel
2. Select a category (Math / Physics / Chemistry / Finance)
3. Click a formula — it auto-fills the input field
4. Enter values and press `=` to calculate

---

## Architecture

```
super-calculator/
├── index.html          # Main app (single-file application)
│   ├── HTML structure  # Calculator UI
│   ├── CSS styles      # Responsive design
│   └── JavaScript      # Calculation logic + formula library
├── docs/
│   ├── FORMULAS.md     # Complete formula list
│   └── FAQ.md          # Frequently asked questions
├── assets/
│   └── screenshots/    # App screenshots
├── CHANGELOG.md
├── LICENSE
└── README.md
```

**Tech stack**:
- Pure HTML5 / CSS3 / Vanilla JavaScript
- No external framework dependencies
- Browser `localStorage` for calculation history

---

## Multilingual Support

| Language | Status |
|----------|--------|
| Traditional Chinese | ✅ Full support |
| English | ✅ Full support |
| Simplified Chinese | Planned |
| Japanese | Planned |

Switch language via the language selector in the top-right corner.

---

## Formula Library

See [docs/FORMULAS.md](docs/FORMULAS.md) for the complete formula list.

### Category Overview

| Category | Count | Examples |
|----------|-------|---------|
| Geometry | 20+ | Circle area, sphere volume |
| Physics | 30+ | Newton's 2nd law, Ohm's law |
| Chemistry | 15+ | Ideal gas law, pH calculation |
| Finance | 10+ | Compound interest, NPV |

---

## FAQ

See [docs/FAQ.md](docs/FAQ.md) for the full FAQ.

**Q: Does it require an internet connection?**
A: No, it runs completely offline.

**Q: Which browsers are supported?**
A: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+.

**Q: Is calculation history saved?**
A: Yes, stored in browser `localStorage`. History is cleared when browser cache is cleared.

---

## Developer Guide

### Local Development

```bash
git clone https://github.com/boboidvtw/super-calculator.git
cd super-calculator
# Serve with any static HTTP server
npx serve .
# or
python -m http.server 8080
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

### Contributing

1. Fork this repo
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit: `git commit -m 'feat: add some feature'`
4. Push: `git push origin feat/your-feature`
5. Open a Pull Request

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for the full history.

### v1.0.0 (2026-04-21)
- Initial release
- Basic arithmetic operations
- Scientific calculation functions
- Formula library system
- Traditional Chinese and English bilingual support

---

## License

This project is licensed under the [MIT License](LICENSE).

Copyright © 2026

---

*Have a question or suggestion? Open an [Issue](https://github.com/boboidvtw/super-calculator/issues).*
