# MHZ Tools 2.0 — Comprehensive Security, Data Analysis & Digital Forensics Suite

![MHZ Tools 2.0](https://img.shields.io/badge/MHZ_Tools-v2.0.0-10b981.svg?style=for-the-badge&logo=shield)
![Platform](https://img.shields.io/badge/Platform-Windows_x64_%7C_ia32-0284c7.svg?style=for-the-badge&logo=windows)
![Architecture](https://img.shields.io/badge/Client--Side-Zero_Data_Leakage-10b981.svg?style=for-the-badge)
![License](https://img.shields.io/badge/License-ISC-64748b.svg?style=for-the-badge)

**MHZ Tools 2.0** is an all-in-one, offline-first desktop application designed for cybersecurity researchers, malware analysts, data scientists, digital forensics investigators, and developers. Built with high performance and privacy in mind, all operations are executed entirely on the local machine with zero external telemetry.

---

## 🌟 What's New in Version 2.0

- 🔬 **Digital Forensics Suite**: Deep EXIF metadata extraction with photo capture dates, camera specs, smartphone identification (iPhone, Pixel, Galaxy, DSLR, Drone), embedded GPS pinpointing with Google Maps integration, and an interactive byte-level Hex Inspector.
- ⚙️ **C/C++ 64-Bit to 32-Bit Code Transformer**: Offline source-level code transformation engine with integrated MinGW-w64 32-bit GCC compiler support for generating Win32 executables (`.exe`), assembly code (`.s`), and syntax verification.
- 🦠 **Malware Static Analysis Suite**: Windows PE binary & section entropy inspector, document & PDF static payload analyzer (streams/VBA macros), and a 70-vendor VirusTotal threat intelligence matrix.
- 📊 **Enhanced Data Analysis Suite**: XLSX/CSV dataset ingestion, automatic missing value imputation, Chi-Square independence & goodness of fit tests, OLS regression, and high-resolution light-mode Matplotlib / Plotly popup visualization charts with export tools.
- ⚡ **Native Electron Save Dialogs**: Save transformed C/C++, assembly, executables, charts, and forensic reports with native OS file selection prompts.

---

## 🚀 Core Module Breakdown

### 1. 🔐 Encryption & Security Suite
- **Multi-Hash Integrity Calculator**: Drag-and-drop file and directory scanner with concurrent checksum generation for **MD5**, **SHA-1**, **SHA-256**, and **SHA-512**.
- **Hash Comparator & Verifier**: Compare two inputs side-by-side or verify files against known security threat hashes.
- **Password Generator & Entropy Meter**: Generate cryptographically secure passwords with custom character sets and real-time Shannon entropy strength measurement.
- **Payload Encoder / Decoder**: Real-time translation between **Base64**, **Hexadecimal**, and **URL-encoded** strings.
- **IPv4 Subnet Planner**: CIDR mask calculations (`/32` to `/1`), subnet boundaries, broadcast addresses, usable IP host ranges, and wildcard masks.
- **Symmetric Cryptography Engine**: High-security **AES-GCM (256-bit)**, **Triple DES (3DES)**, and legacy **DES (56-bit)** encryption and decryption.
- **Diffie-Hellman Key Exchange Simulator**: Step-by-step interactive cryptographic mathematical exchange ($g^x \bmod p$) with `BigInt` precision and secret key validation.
- **URL Redirection & QR Code Generator**: Offline secure HTML redirect package generator and QR code matrix generator.

---

### 2. 📊 Data Analysis & Visualization Suite
- **Dataset Ingestion**: Native parser for **Excel (`.xlsx`, `.xls`)** and **CSV (`.csv`)** files with dynamic type detection.
- **Data Cleaning & Imputation**: Fill missing numeric and categorical cells using Mean, Median, Mode, or custom values.
- **Summary & Advanced Statistics**: Mean, median, mode, standard deviation, variance, skewness, kurtosis, and quartiles.
- **Hypothesis Testing (Chi-Square Engine)**:
  - Chi-Square Test of Independence (Contingency Matrix, Degrees of Freedom, P-Value, Cramér's V).
  - Chi-Square Goodness of Fit Test with observed vs expected distributions.
- **OLS Linear Regression**: Best-fit line slope, intercept, $R^2$ coefficient of determination, correlation coefficient ($r$), and scatter plot overlays.
- **Interactive Light-Theme Popup Charts**: High-contrast Matplotlib / Plotly pop-up charts with navigation toolbars, panning, zooming, and high-res PNG download.

---

### 3. 🦠 Malware Static Analysis Suite
- **Malware File Hashing & IOC Matcher**: Rapid MD5/SHA-256 hashing with threat IOC lookup.
- **Windows PE Binary & Section Entropy Inspector**: Decodes DOS header, PE signature, architecture (x86/x64), subsystem, compilation timestamp, and Shannon entropy per section (`.text`, `.data`, `.rdata`, `.rsrc`) to detect packed or encrypted malware samples.
- **Document & PDF Static Analyst**: Inspects embedded PDF streams (`/JavaScript`, `/Launch`, `/EmbeddedFiles`, `/OpenAction`) and Microsoft Office VBA macros without executing files.
- **VirusTotal Threat Intelligence Center**: 70-vendor detection matrix simulation, threat classifications, risk scores, and MITRE ATT&CK TTP mapping.

---

### 4. ⚙️ C/C++ 64-Bit to 32-Bit Architecture Transformer
- **Automated Source Transformation**: Real-time refactoring of 64-bit data types (`uint64_t`, `int64_t`, `size_t`, `uintptr_t`) to Win32/x86 equivalents (`uint32_t`, `int32_t`, `DWORD`, `ULONG_PTR`).
- **Bitmask & Pointer Width Adjustments**: Converts 64-bit bitmasks (`0xFFFFFFFFFFFFFFFFULL`, `0x8000000000000000ULL`) to 32-bit representations.
- **Offline GCC MinGW Toolchain Integration**:
  - Compiles 32-bit Win32 executables (`gcc -m32 -O2`).
  - Generates 32-bit x86 assembly source files (`gcc -m32 -S`).
  - Runs instant syntax validation checks (`gcc -m32 -fsyntax-only`).
- **Interactive Transformation Audit**: Line-by-line diff highlighting and refactoring change logs.

---

### 5. 🔬 Digital Forensics Suite
- **EXIF & Media Metadata Extractor**:
  - Extracts camera make, model, lens profile, focal length, exposure time, F-number, ISO speed ratings, and color space.
  - Formats **Photo Capture Date & Time** (`DateTimeOriginal`, `DateTimeDigitized`, `xmp:CreateDate`).
  - Automatically identifies shooting devices: **Apple iPhone (iOS Camera / Photos Render)**, **Google Pixel**, **Samsung Galaxy**, **DJI Drones**, and **DSLR / Mirrorless cameras**.
  - Decodes embedded **GPS Pinpoint Coordinates** (Latitude & Longitude) with direct links to **Google Maps** and **OpenStreetMap**.
  - Displays **Pixel Resolution & Density Breakdown** (Width $\times$ Height in pixels, total sensor Megapixels, aspect ratio, and DPI density).
- **Interactive Forensic Hex Inspector**:
  - Side-by-side hexadecimal offset, 16-byte raw hex representation, and decoded ASCII stream.
  - Multi-page pagination for fast inspection of large binary files.
  - Real-time search filter across hex bytes and text strings.

---

## 🛠️ Technology Stack

- **Desktop Framework**: Electron 22.x (configured with strict `contextIsolation`, `preload` scripts, and sandboxed architecture)
- **Frontend Core**: Vanilla HTML5, Vanilla CSS3 (Custom responsive design system with Dark/Light cybersecurity palettes), Vanilla ES6+ JavaScript
- **Compiler Integration**: Portable GCC MinGW-w64 toolchain (32-bit & 64-bit cross-compilation)
- **Data & Math Engines**: `crypto-js`, `qrious`, `xlsx`, `plotly.js`, Python 3 scientific backend (`numpy`, `pandas`, `scipy`, `matplotlib`, `statsmodels`)
- **Packaging**: Electron Builder (NSIS Windows Installer & Single-File Portable Executables)

---

## 💻 Installation & Local Development

### Prerequisites
- Node.js (v16.0.0 or higher recommended)
- npm (v8.0.0 or higher)
- Python 3.8+ (Optional, for advanced statistics engine)

### 1. Clone the Repository
```bash
git clone https://github.com/mohammadzag/MHZTools.git
cd MHZTools
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run in Development Mode
```bash
npm start
```

### 4. Build Production Executables

#### Windows (Setup Installer & Portable .exe):
```bash
npm run package:win
```
Output binaries in `dist/`:
- `dist/MHZTools 2.0 Setup 2.0.0.exe` (NSIS Windows Installer)
- `dist/MHZTools 2.0 2.0.0.exe` (Standalone Portable Executable)

#### Linux (Setup Installer Wizard & Portable Packages):
```bash
npm run package:linux
```
Output packages in `dist/`:
- `dist/MHZTools-2.0-Setup-Linux.run` (Self-Extracting Setup Installer Wizard)
- `dist/MHZTools-2.0-Setup-Linux.sh` (Bash Setup Installer Script)
- `dist/mhz-tools-2.0.0.tar.gz` (Universal Linux Tarball)
- `dist/mhz-tools-2.0.0.zip` (Universal Linux Zip)
- `dist/linux-unpacked/` (Pre-extracted portable directory)

To install on any Linux system (Ubuntu, Debian, Kali, Fedora, Arch, CentOS, Manjaro, openSUSE):
```bash
# Run the Setup Wizard Installer (creates menu launcher, desktop shortcut & bin symlink)
chmod +x MHZTools-2.0-Setup-Linux.run
./MHZTools-2.0-Setup-Linux.run
```

Or run standalone without installing:
```bash
tar -xzf mhz-tools-2.0.0.tar.gz
cd linux-unpacked
chmod +x mhztools
./mhztools
```

---

## 👨‍💻 Developer Profile

- **Author**: Mohammad Hussain Alzaghameem
- **Education**: Tafilah Technical University (TTU)
- **Portfolio**: [mohammadzag.github.io/Portofolio](https://mohammadzag.github.io/Portofolio/)
- **Email**: [mohzag615@gmail.com](mailto:mohzag615@gmail.com)
- **LinkedIn**: [Mohammad Alzaghameem](https://www.linkedin.com/in/mohammad-zaghameem-0b01511b6/)
- **Phone**: [+962799919621](tel:+962799919621)

---

## 🎓 Dedicated Acknowledgements

### Special Thanks to Dr. Yazan Alsariera
I would like to express my deepest gratitude to **Dr. Yazan Alsariera** for his exceptional mentorship, encouragement, and guidance throughout my academic and cybersecurity journey. His passion and insights have been instrumental in shaping this project and my professional career.

---

## 📜 License
This project is licensed under the **ISC License**.
