# MHZTools
# MHZ Tools - Cybersecurity & Cryptography Utility Suite

MHZ Tools is a single-window desktop application built using HTML, CSS, JavaScript, and Electron. It features a modern dark/light green cybersecurity dashboard with glowing elements, transitions, and offline-first tools designed for security practitioners and developers.

---

## Core Features

### 1. Hash Calculator
- **Drag-and-Drop Integrity Checking**: Traverse files and entire folders recursively.
- **Parallel Multi-Hash Calculations**: Computes and displays checksums for **MD5**, **SHA-1**, **SHA-256**, and **SHA-512** concurrently.
- **Detailed Row Expansions**: Click on any file row to expand a complete hash results grid with individual copy-to-clipboard buttons.

### 2. Password Generator & Analyzer
- **Customizable Criteria**: Toggle lengths, upper/lower cases, numbers, and symbols.
- **Brute-Force Strength Meter**: Measures Shannon entropy in bits and calculates estimated crack times.

### 3. Encoder / Decoder
- **Translation Options**: Instantly translate text payloads between **Base64**, **Hexadecimal**, and **URL encoding** modes.

### 4. IP Subnet Calculator
- **IPv4 Address Planning**: Select CIDR masks (from `/32` down to `/1`) to compute netmasks, network addresses, broadcast boundaries, usable ranges, and host counts.

### 5. Cryptography Suite
- **Symmetric Ciphers**: Support for **AES-GCM (256-bit)**, **Triple DES (3DES)**, and legacy **DES (56-bit)** with standard warning alerts.
- **Diffie-Hellman Key Exchange Simulator**: Interactive walkthrough explaining key exchange math ($g^x \bmod p$) with high-precision `BigInt` calculations. Includes presets for moduli primes and a shared secret validation banner.

### 6. URL Shortener & Redirector
- **TinyURL Integration**: Shortens URLs online using public TinyURL APIs.
- **Offline HTML Redirector**: Compiles local redirect packages (`.html` files) featuring secure redirect layouts.
- **QR Code Generator**: Generates scannable QR Code graphics offline.

### 7. Dual Theme Toggling
- **Theme Switcher**: Switch between the default **Dark Green Theme** and a high-contrast **Light Green Theme**.
- **State Persistence**: Saves user preferences using local browser storage.

---

## Technology Stack
- **Framework**: Electron (with secure `contextIsolation` and `sandbox` configurations)
- **GUI Engine**: HTML5, Vanilla CSS3 (Custom design systems), Vanilla ES6 JavaScript
- **Cryptographic Libraries**: Web Crypto APIs (PBKDF2/AES-GCM), `crypto-js` (DES/3DES)
- **QR Engine**: `qrious.js`

---

## Local Development & Installation

### Prerequisites
- Node.js (v16.0.0 or higher recommended)
- npm

### 1. Clone and Install Dependencies
```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/mhz-tools.git
cd mhz-tools

# Install node dependencies
npm install
```

### 2. Run the Application locally
```bash
npm start
```

### 3. Build standalone executable
To build a portable, single-file Windows executable (.exe) inside the `dist/` directory:
```bash
npm run package
```

---

## Dedicated Acknowledgements

### Special Thanks to Dr. Yazan Alsariera
I would like to express my deepest gratitude to **Dr. Yazan Alsariera** for his endless guidance, support, and mentorship. Thank you for igniting my passion for cybersecurity, mapping out the roadmap to expand my skills, and providing the direction that shaped who I am today.

### Acknowledgement to Tafilah Technical University
I am proud to be a graduate of **Tafilah Technical University (TTU)**. I extend my sincere thanks to every professor, doctor, and instructor at the university who contributed to my academic growth and supported my education.

---

## Author
- **Developer**: Mohammad Hussain Alzaghameem
- **Email**: [mohzag615@gmail.com](mailto:mohzag615@gmail.com)
- **LinkedIn**: [Mohammad Zaghameem](https://www.linkedin.com/in/mohammad-zaghameem-0b01511b6/)
- **Phone**: [+962799919621](tel:+962799919621)
