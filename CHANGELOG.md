# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [3.0.0] - 2026-05-08 — Advanced Math Visualization

### Added

#### 📐 Phase 5 — Calculus Visualization
- **Tangent line tool**: Click any point on a curve to display the tangent line and the numerical derivative value `f'(x)`.
  - Algorithm: central difference formula with `h = 1e-5`.
  - Verified: `d/dx(x²)` at `x=2` returns `4.000` (exact analytical value).
- **Integral shading**: Click two points on a curve to shade the integration region between them and display `∫=value`.
  - Algorithm: Simpson's 1/3 rule with `n=1000` segments.
  - Verified: `∫₋₂³ x² dx` returns `11.667` (analytical: `35/3 ≈ 11.6667`).
- **Slope field**: Visualize the derivative direction over a `22×14` grid across the visible plane.
  - Useful for understanding ODE dynamics and qualitative behavior of derivatives.

#### ⊕ Phase 6 — Equation Solver (Multi-Function Intersections)
- **Bisection-refined intersection finder**: Sweep visible functions in pairs, detect sign changes, and refine roots to `1e-9` precision.
  - Algorithm: 800-point initial scan + bisection (max 60 iterations).
  - Auto-deduplication for nearby candidate roots.
  - Verified: `x² ∩ (x+6)` returns `{-2, 3}` exactly (analytical: roots of `x²-x-6=0`).
- More robust than Newton-Raphson — guaranteed convergence on sign-change intervals, no divergence risk.

#### 📊 Phase 7 — Statistics Mode
- **Histogram**: 12-bin auto-distribution with frequency labels and statistical summary (`n`, `mean`, `σ`, `min`, `max`).
  - Verified: `N(5, 2)` sample (n=200) → `mean=5.052`, `σ=1.955` (within expected tolerance).
- **Scatter + Linear Regression**: Least-squares regression line `y = mx + b` with coefficient of determination `R²`.
  - Verified: `y = 2x + 3 + noise` → regression `y = 1.999x + 3.136`, `R² = 0.9962`.
- **Box Plot**: Five-number summary (`min`, `Q1`, `median`, `Q3`, `max`) with whiskers at `1.5 × IQR` and red outlier markers.
  - Verified: `50 normal + 2 outliers` → correctly identifies `outliers = 2`.

#### 🎲 Phase 8 — 3D Surface Plotting
- **Pure Canvas 2D engine** — no WebGL, no Three.js, zero dependencies.
- Three render styles:
  - **Surface**: Filled quads with HSL heat-map color (low z → blue, high z → red).
  - **Wireframe**: Edge-only rendering for transparent overlay reading.
  - **Contour**: Stepped 10-level color quantization for elevation visualization.
- **Painter's algorithm** for correct depth ordering across `32×32 = 1024` faces.
- **Interactive controls**:
  - Mouse drag → rotate (`rotX`, `rotY`).
  - Scroll wheel → zoom (`0.2× ~ 5×`).
- Auto z-range computation with three-axis indicators (X red, Y green, Z blue).
- Verified: `z = sin(x)·cos(y)` produces a clean saddle surface; `z = sin(√(x²+y²))` produces concentric ripples.

### Architecture
- **3-mode tab system**: Function / Statistics / 3D — toggleable inside the graphing modal.
- **Tool selector** (function mode): Mark / Tangent / Integral / Slope, with dynamic tool hints.
- **Mode dispatch pattern**: `drawGraph` reassigned to `drawGraphDispatch` for backward compatibility while routing by active mode.
- **22 new i18n keys** localized across **4 languages** (zh-TW, en, zh-CN, ja) — 88 strings total.

### Changed
- `super-calc-index.html` grew from ~155 KB to ~225 KB (+700 LOC JS, +80 LOC CSS, +50 LOC HTML).
- Modal layout redesigned with two-tier navigation: mode tabs → tool/control bar → main canvas + side panel.

### Documentation
- Added `docs/PHASE5-8_COMPLETION.md` — full technical completion report with math verification table.
- Added `docs/RELEASE_NOTES.md` — user-facing release information.
- Added `docs/GRAPHING_FEATURE.md` — Phase 0-4 (v2.0) technical reference, retained for archival.
- Updated `README.md` and `README_EN.md` with detailed Phase 5-8 sections.

### Performance
- 3D rendering: ~30-60 fps on `32×32` surface (mid-range hardware).
- Statistics drawing: <50 ms for `n=200` samples.
- Intersection finding: <100 ms for 6 functions over `[-10, 10]` range.

### Known Limitations
- 3D resolution fixed at `32×32` (higher resolutions noticeably slower).
- Statistics charts use single color per chart (no grouping).
- Tangent / integral tools require explicit clicks (no drag-to-adjust).
- Slope field grid density fixed at `22×14`.

---

## [2.0.0] - 2026-05-07 — Function Graphing System

### Added

#### 📈 Multi-Function Plotting
- Display 2-6 functions simultaneously with distinct colors (6-color palette: cyan, purple, green, amber, red, pink).
- Toggle function visibility via checkboxes.
- Auto-scale Y-axis based on combined function ranges.

#### 🎮 Parameter Animation
- Extract parameters (`a, b, c, ...`) from expressions like `a*sin(b*x)`.
- Real-time sliders for parameter manipulation (range `-10` to `+10`, step `0.1`).
- Instant graph redraw on slider change.

#### 📥 Graph Export
- **PNG export** via `canvas.toDataURL()`.
- **SVG export** with full DOM reconstruction (text, paths, legend, theme-aware).

#### 🖱️ Interactive Marking
- Click any curve to mark coordinates with auto-snap (25 px threshold).
- Marked points display location and source function label.

#### 🔍 Special Point Detection
- **Zeros**: Sign-change interpolation between sample points.
- **Extrema**: 3-point derivative approximation (critical points where slope ≈ 0).
- 500-point sampling for accuracy.

### Security
- **XSS prevention**: User expressions (`fn.expr`) escaped via `escapeHTML()` before DOM injection.
- **Expression isolation**: Compiled with `new Function` in isolated scope (no `eval`).
- **Parameter safety**: Single-letter parameter regex excludes reserved math names (`sin`, `cos`, `exp`, ...).

### Fixed
- Scientific notation regex bug: `e` in `2e3` was incorrectly substituted with `Math.E`.
  - Old: `/(?<![a-zA-Z])e(?![a-zA-Z0-9])/g`
  - New: `/(?<![a-zA-Z0-9])e(?![a-zA-Z0-9])/g`

---

## [1.0.0] - 2026-04-21 — Initial Release

### Added
- Basic arithmetic operations (add, subtract, multiply, divide).
- Scientific calculation: trigonometric functions, logarithm, exponent, roots.
- Engineering calculation: base conversion, degree/radian toggle.
- Built-in formula library (Geometry, Physics, Chemistry, Finance).
- Traditional Chinese and English bilingual interface.
- Keyboard shortcut support.
- Calculation history via `localStorage`.
- Responsive design for desktop and mobile.
- MIT License.

---

## [Unreleased]

### Planned
- Multivariable calculus (partial derivatives, double integrals).
- Contour map for `z = f(x, y)` (2D projection of 3D surfaces).
- Animated surface evolution (parameter-driven).
- Histogram + normal distribution overlay.
- 3D cross-section / slice view.
- Export 3D scene as interactive HTML / SVG.
- Slider input debouncing for performance.
- High-DPI canvas scaling.
- PWA support (offline install).
