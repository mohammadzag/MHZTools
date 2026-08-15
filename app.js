// --- MD5 Helper Function ---
function md5(str) {
    var rotateLeft = function(lValue, iShiftBits) {
        return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
    };

    var AddUnsigned = function(lX, lY) {
        var lX4, lY4, lX8, lY8, lResult;
        lX8 = (lX & 0x80000000);
        lY8 = (lY & 0x80000000);
        lX4 = (lX & 0x40000000);
        lY4 = (lY & 0x40000000);
        lResult = (lX & 0x3FFFFFFF) + (lY & 0x3FFFFFFF);
        if (lX4 & lY4) {
            return (lResult ^ 0x80000000 ^ lX8 ^ lY8);
        }
        if (lX4 | lY4) {
            if (lResult & 0x40000000) {
                return (lResult ^ 0xC0000000 ^ lX8 ^ lY8);
            } else {
                return (lResult ^ 0x40000000 ^ lX8 ^ lY8);
            }
        } else {
            return (lResult ^ lX8 ^ lY8);
        }
    };

    var F = function(x, y, z) { return (x & y) | ((~x) & z); };
    var G = function(x, y, z) { return (x & z) | (y & (~z)); };
    var H = function(x, y, z) { return (x ^ y ^ z); };
    var I = function(x, y, z) { return (y ^ (x | (~z))); };

    var FF = function(a, b, c, d, x, s, ac) {
        a = AddUnsigned(a, AddUnsigned(AddUnsigned(F(b, c, d), x), ac));
        return AddUnsigned(rotateLeft(a, s), b);
    };

    var GG = function(a, b, c, d, x, s, ac) {
        a = AddUnsigned(a, AddUnsigned(AddUnsigned(G(b, c, d), x), ac));
        return AddUnsigned(rotateLeft(a, s), b);
    };

    var HH = function(a, b, c, d, x, s, ac) {
        a = AddUnsigned(a, AddUnsigned(AddUnsigned(H(b, c, d), x), ac));
        return AddUnsigned(rotateLeft(a, s), b);
    };

    var II = function(a, b, c, d, x, s, ac) {
        a = AddUnsigned(a, AddUnsigned(AddUnsigned(I(b, c, d), x), ac));
        return AddUnsigned(rotateLeft(a, s), b);
    };

    var ConvertToWordArrayFromUint8 = function(bytes) {
        var lMessageLength = bytes.length;
        var lNumberOfWords_temp1 = lMessageLength + 8;
        var lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64;
        var lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
        var lWordArray = Array(lNumberOfWords);
        for (var idx = 0; idx < lWordArray.length; idx++) {
            lWordArray[idx] = 0;
        }
        var lWordCount;
        var lBytePosition = 0;
        var lByteCount = 0;
        while (lByteCount < lMessageLength) {
            lWordCount = (lByteCount - (lByteCount % 4)) / 4;
            lBytePosition = (lByteCount % 4) * 8;
            lWordArray[lWordCount] = (lWordArray[lWordCount] | (bytes[lByteCount] << lBytePosition));
            lByteCount++;
        }
        lWordCount = (lByteCount - (lByteCount % 4)) / 4;
        lBytePosition = (lByteCount % 4) * 8;
        lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
        lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
        lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
        return lWordArray;
    };

    var WordToHex = function(lValue) {
        var WordToHexValue = "", WordToHexValue_temp = "", lByte, lCount;
        for (lCount = 0; lCount <= 3; lCount++) {
            lByte = (lValue >>> (lCount * 8)) & 255;
            WordToHexValue_temp = "0" + lByte.toString(16);
            WordToHexValue = WordToHexValue + WordToHexValue_temp.substr(WordToHexValue_temp.length - 2, 2);
        }
        return WordToHexValue;
    };

    var Utf8Encode = function(string) {
        string = string.replace(/\r\n/g, "\n");
        var utftext = "";
        for (var n = 0; n < string.length; n++) {
            var c = string.charCodeAt(n);
            if (c < 128) {
                utftext += String.fromCharCode(c);
            } else if ((c > 127) && (c < 2048)) {
                utftext += String.fromCharCode((c >> 6) | 192);
                utftext += String.fromCharCode((c & 63) | 128);
            } else {
                utftext += String.fromCharCode((c >> 12) | 224);
                utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                utftext += String.fromCharCode((c & 63) | 128);
            }
        }
        return utftext;
    };

    var x = [];
    var k, AA, BB, CC, DD, a, b, c, d;
    var S11=7, S12=12, S13=17, S14=22;
    var S21=5, S22=9, S23=14, S24=20;
    var S31=4, S32=11, S33=16, S34=23;
    var S41=6, S42=10, S43=15, S44=21;

    var bytes;
    if (typeof str === 'string') {
        var string = Utf8Encode(str);
        bytes = new Uint8Array(string.length);
        for (var i = 0; i < string.length; i++) {
            bytes[i] = string.charCodeAt(i);
        }
    } else {
        bytes = str;
    }
    x = ConvertToWordArrayFromUint8(bytes);
    a = 0x67452301; b = 0xEFCDAB89; c = 0x98BADCFE; d = 0x10325476;

    for (k = 0; k < x.length; k += 16) {
        AA = a; BB = b; CC = c; DD = d;
        a = FF(a, b, c, d, x[k + 0], S11, 0xD76AA478);
        d = FF(d, a, b, c, x[k + 1], S12, 0xE8C7B756);
        c = FF(c, d, a, b, x[k + 2], S13, 0x242070DB);
        b = FF(b, c, d, a, x[k + 3], S14, 0xC1BDCEEE);
        a = FF(a, b, c, d, x[k + 4], S11, 0xF57C0FAF);
        d = FF(d, a, b, c, x[k + 5], S12, 0x4787C62A);
        c = FF(c, d, a, b, x[k + 6], S13, 0xA8304613);
        b = FF(b, c, d, a, x[k + 7], S14, 0xFD469501);
        a = FF(a, b, c, d, x[k + 8], S11, 0x698098D8);
        d = FF(d, a, b, c, x[k + 9], S12, 0x8B44F7AF);
        c = FF(c, d, a, b, x[k + 10], S13, 0xFFFF5BB1);
        b = FF(b, c, d, a, x[k + 11], S14, 0x895CD7BE);
        a = FF(a, b, c, d, x[k + 12], S11, 0x6B901122);
        d = FF(d, a, b, c, x[k + 13], S12, 0xFD987193);
        c = FF(c, d, a, b, x[k + 14], S13, 0xA679438E);
        b = FF(b, c, d, a, x[k + 15], S14, 0x49B40821);

        a = GG(a, b, c, d, x[k + 1], S21, 0xF61E2562);
        d = GG(d, a, b, c, x[k + 6], S22, 0xC040B340);
        c = GG(c, d, a, b, x[k + 11], S23, 0x265E5A51);
        b = GG(b, c, d, a, x[k + 0], S24, 0xE9B6C7AA);
        a = GG(a, b, c, d, x[k + 5], S21, 0xD62F105D);
        d = GG(d, a, b, c, x[k + 10], S22, 0x2441453);
        c = GG(c, d, a, b, x[k + 15], S23, 0xD8A1E681);
        b = GG(b, c, d, a, x[k + 4], S24, 0xE7D3FBC8);
        a = GG(a, b, c, d, x[k + 9], S21, 0x21E1CDE6);
        d = GG(d, a, b, c, x[k + 14], S22, 0xC33707D6);
        c = GG(c, d, a, b, x[k + 3], S23, 0xF4D50D87);
        b = GG(b, c, d, a, x[k + 8], S24, 0x455A14ED);
        a = GG(a, b, c, d, x[k + 13], S21, 0xA9E3E905);
        d = GG(d, a, b, c, x[k + 2], S22, 0xFCEFA3F8);
        c = GG(c, d, a, b, x[k + 7], S23, 0x676F02D9);
        b = GG(b, c, d, a, x[k + 12], S24, 0x8D2A4C8A);

        a = HH(a, b, c, d, x[k + 5], S31, 0xFFFA3942);
        d = HH(d, a, b, c, x[k + 8], S32, 0x8771F681);
        c = HH(c, d, a, b, x[k + 11], S33, 0x6D9D6122);
        b = HH(b, c, d, a, x[k + 14], S34, 0xFDE5380C);
        a = HH(a, b, c, d, x[k + 1], S31, 0xA4BEEA44);
        d = HH(d, a, b, c, x[k + 4], S32, 0x4BDECFA9);
        c = HH(c, d, a, b, x[k + 7], S33, 0xF6BB4B60);
        b = HH(b, c, d, a, x[k + 10], S34, 0xBEBFBC70);
        a = HH(a, b, c, d, x[k + 13], S31, 0x289B7EC6);
        d = HH(d, a, b, c, x[k + 0], S32, 0xEAA127FA);
        c = HH(c, d, a, b, x[k + 3], S33, 0xD4EF3085);
        b = HH(b, c, d, a, x[k + 6], S34, 0x4881D05);
        a = HH(a, b, c, d, x[k + 9], S31, 0xD9D4D039);
        d = HH(d, a, b, c, x[k + 12], S32, 0xE6DB99E5);
        c = HH(c, d, a, b, x[k + 15], S33, 0x1FA27CF8);
        b = HH(b, c, d, a, x[k + 2], S34, 0xC4AC5665);

        a = II(a, b, c, d, x[k + 0], S41, 0xF4292244);
        d = II(d, a, b, c, x[k + 7], S42, 0x432AFF97);
        c = II(c, d, a, b, x[k + 14], S43, 0xAB9423A7);
        b = II(b, c, d, a, x[k + 5], S44, 0xFC93A039);
        a = II(a, b, c, d, x[k + 12], S41, 0x655B59C3);
        d = II(d, a, b, c, x[k + 3], S42, 0x8F0CCC92);
        c = II(c, d, a, b, x[k + 10], S43, 0xFFEFF47D);
        b = II(b, c, d, a, x[k + 1], S44, 0x85845DD1);
        a = II(a, b, c, d, x[k + 8], S41, 0x6FA87E4F);
        d = II(d, a, b, c, x[k + 15], S42, 0xFE2CE6E0);
        c = II(c, d, a, b, x[k + 6], S43, 0xA3014314);
        b = II(b, c, d, a, x[k + 13], S44, 0x4E0811A1);
        a = II(a, b, c, d, x[k + 4], S41, 0xF7537E82);
        d = II(d, a, b, c, x[k + 11], S42, 0xBD3AF235);
        c = II(c, d, a, b, x[k + 2], S43, 0x2AD7D2BB);
        b = II(b, c, d, a, x[k + 9], S44, 0xEB86D391);

        a = AddUnsigned(a, AA);
        b = AddUnsigned(b, BB);
        c = AddUnsigned(c, CC);
        d = AddUnsigned(d, DD);
    }

    var temp = WordToHex(a) + WordToHex(b) + WordToHex(c) + WordToHex(d);
    return temp.toLowerCase();
}

function initAppModule() {
    // Prevent default drag and drop behavior across window so Electron allows file drops
    window.addEventListener('dragover', (e) => e.preventDefault(), false);
    window.addEventListener('drop', (e) => e.preventDefault(), false);

    setupTheme();
    setupNavigation();
    setupHashCalc();
    setupHashCompare();
    setupPasswordGen();
    setupEncoderDecoder();
    setupSubnetCalc();
    setupEncrypter();
    setupLinkShaper();
    setupCopyButtons();

    // Listen for automatic Python & Libraries auto-install status
    if (window.electronAPI && window.electronAPI.onPythonStatus) {
        window.electronAPI.onPythonStatus((status) => {
            const badge = document.getElementById('secure-context-badge');
            if (badge) {
                if (status.ready) {
                    badge.style.borderColor = 'rgba(16, 185, 129, 0.4)';
                    badge.style.color = 'var(--success-color)';
                    badge.textContent = '✓ PYTHON & ANALYTICS READY';
                } else {
                    badge.style.borderColor = 'rgba(245, 158, 11, 0.4)';
                    badge.style.color = 'var(--warning-color)';
                    badge.textContent = '⚙️ ' + (status.message || 'CONFIGURING PYTHON...');
                }
            }
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAppModule);
} else {
    initAppModule();
}

// --- Theme Switcher (Dark / Light Mode) ---
function setupTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    if (!themeToggle) return;

    // Check saved settings from localStorage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        themeToggle.innerHTML = '<i data-lucide="moon"></i>';
        if (window.lucide && window.lucide.createIcons) lucide.createIcons();
    }

    themeToggle.addEventListener('click', () => {
        const isLight = document.body.classList.toggle('light-theme');
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
        themeToggle.innerHTML = `<i data-lucide="${isLight ? 'moon' : 'sun'}"></i>`;
        if (window.lucide && window.lucide.createIcons) lucide.createIcons();
    });
}

function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');
    const pageTitle = document.getElementById('page-title');
    const pageSubtitle = document.getElementById('page-subtitle');
    
    const encryptionGroup = document.getElementById('group-encryption');
    const encryptionHeader = document.getElementById('header-encryption');
    const analysisGroup = document.getElementById('group-analysis');
    const analysisHeader = document.getElementById('header-analysis');
    const malwareGroup = document.getElementById('group-malware');
    const malwareHeader = document.getElementById('header-malware');
    const forensicsGroup = document.getElementById('group-forensics');
    const forensicsHeader = document.getElementById('header-forensics');

    const pageMeta = {
        'hash-calc': {
            title: 'Hash Calculator',
            subtitle: 'Generate cryptographic checksums for data integrity verification.'
        },
        'hash-compare': {
            title: 'Hash Comparator & Verifier',
            subtitle: 'Compare inputs side-by-side or verify files/texts against known checksums.'
        },
        'password-gen': {
            title: 'Password Generator & Analyzer',
            subtitle: 'Create highly secure passwords and measure their entropy.'
        },
        'encoder-decoder': {
            title: 'Encoder / Decoder',
            subtitle: 'Translate raw payload strings between different system encodings.'
        },
        'subnet-calc': {
            title: 'IP Subnet Calculator',
            subtitle: 'Plan subnets and compute range diagnostics for networks.'
        },
        'encrypter': {
            title: 'Cryptography Suite',
            subtitle: 'Perform client-side symmetric ciphers or test Diffie-Hellman key exchanges.'
        },
        'link-shaper': {
            title: 'Link Shortener & Redirector',
            subtitle: 'Generate real short links via public APIs or build standalone offline redirect files.'
        },
        'analysis-import': {
            title: 'Dataset Import Studio',
            subtitle: 'Upload spreadsheets or paste raw text to load your dataset.'
        },
        'analysis-preview': {
            title: 'Data Explorer',
            subtitle: 'Browse, search, and page through raw entries in your dataset.'
        },
        'analysis-cleaning': {
            title: 'Data Cleaning Studio',
            subtitle: 'Purge duplicates, manage blank values, normalize text, and impute/remedy anomalies.'
        },
        'analysis-stats': {
            title: 'Summary Statistics',
            subtitle: 'Explore numerical counts, averages, spreads, and quartiles.'
        },
        'analysis-chi': {
            title: 'Chi-Square Independence Test',
            subtitle: 'Analyze associations between categorical attributes.'
        },
        'analysis-charts': {
            title: 'Visualisation Studio',
            subtitle: 'Plot shaded distributions, box plots, heatmaps, scatter, bar, or line charts.'
        },
        'analysis-export': {
            title: 'Export Results & Reports',
            subtitle: 'Download your cleaned dataset and generate customized executive summaries.'
        },
        'malware-hash-calc': {
            title: 'Malware Sample Hash Calculator',
            subtitle: 'Compute cryptographic checksums and Shannon entropy for malware files.'
        },
        'malware-hash-compare': {
            title: 'Threat Hash Verifier & Comparator',
            subtitle: 'Compare malware samples or verify hashes against known threat intelligence IOC feeds.'
        },
        'malware-pe-inspector': {
            title: 'PE Binary & Section Inspector',
            subtitle: 'Inspect Windows PE headers, subsystem, architecture, and section entropy.'
        },
        'malware-doc-inspector': {
            title: 'Document & PDF Static Analyst',
            subtitle: 'Scan PDF stream objects and Office document VBA macros for embedded payloads.'
        },
        'malware-virustotal-clone': {
            title: 'VirusTotal Threat Intelligence Center',
            subtitle: 'Scan files or lookup hashes against a 70-Security-Vendor matrix and MITRE ATT&CK TTP framework.'
        },
        'cpp-arch-converter': {
            title: 'C/C++ 64-Bit to 32-Bit Code Transformer',
            subtitle: 'Convert 64-bit C/C++ source code to 32-bit architecture offline without compiler installation.'
        },
        'forensics-exif-metadata': {
            title: 'EXIF & Media Metadata Forensics',
            subtitle: 'Extract EXIF tags, camera hardware profiles, photo capture date, and GPS pinpoint coordinates.'
        },
        'forensics-hex-carver': {
            title: 'Interactive Forensic Hex Inspector',
            subtitle: 'Inspect byte-level raw hexadecimal streams with offset tracking and ASCII searching.'
        },
        'about-me': {
            title: 'About Developer',
            subtitle: 'Professional background, academic history, and dedicated acknowledgements.'
        },
        'welcome': {
            title: 'Welcome',
            subtitle: 'Choose a tool from the sidebar to get started.'
        }
    };

    // Toggle collapsible groups when headers are clicked & auto-select first tab
    if (encryptionHeader && encryptionGroup) {
        encryptionHeader.addEventListener('click', () => {
            const isCollapsed = encryptionGroup.classList.toggle('collapsed');
            if (!isCollapsed) {
                const firstItem = encryptionGroup.querySelector('.nav-item');
                if (firstItem) firstItem.click();
            }
        });
    }
    
    if (analysisHeader && analysisGroup) {
        analysisHeader.addEventListener('click', () => {
            const isCollapsed = analysisGroup.classList.toggle('collapsed');
            if (!isCollapsed) {
                const firstItem = analysisGroup.querySelector('.nav-item');
                if (firstItem) firstItem.click();
            }
        });
    }

    if (malwareHeader && malwareGroup) {
        malwareHeader.addEventListener('click', () => {
            const isCollapsed = malwareGroup.classList.toggle('collapsed');
            if (!isCollapsed) {
                const firstItem = malwareGroup.querySelector('.nav-item');
                if (firstItem) firstItem.click();
            }
        });
    }

    if (forensicsHeader && forensicsGroup) {
        forensicsHeader.addEventListener('click', () => {
            const isCollapsed = forensicsGroup.classList.toggle('collapsed');
            if (!isCollapsed) {
                const firstItem = forensicsGroup.querySelector('.nav-item');
                if (firstItem) firstItem.click();
            }
        });
    }

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetTab = item.getAttribute('data-tab');

            // Toggle active classes on nav buttons
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Toggle active classes on sections
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === targetTab) {
                    content.classList.add('active');
                }
            });

            if (targetTab === 'cpp-arch-converter') {
                if (typeof window._wireCppButtons === 'function') window._wireCppButtons();
                if (typeof window.runCppTransformation === 'function') window.runCppTransformation();
            }

            // Adjust active group styling for Encryption group
            if (encryptionGroup) {
                if (item.closest('#group-encryption')) {
                    encryptionGroup.classList.add('active-group');
                } else {
                    encryptionGroup.classList.remove('active-group');
                }
            }

            // Adjust active group styling for Analysis group
            if (analysisGroup) {
                if (item.closest('#group-analysis')) {
                    analysisGroup.classList.add('active-group');
                } else {
                    analysisGroup.classList.remove('active-group');
                }
            }

            // Adjust active group styling for Malware group
            if (malwareGroup) {
                if (item.closest('#group-malware')) {
                    malwareGroup.classList.add('active-group');
                } else {
                    malwareGroup.classList.remove('active-group');
                }
            }

            // Adjust active group styling for Forensics group
            if (forensicsGroup) {
                if (item.closest('#group-forensics')) {
                    forensicsGroup.classList.add('active-group');
                } else {
                    forensicsGroup.classList.remove('active-group');
                }
            }

            // Update title text
            if (pageMeta[targetTab]) {
                pageTitle.textContent = pageMeta[targetTab].title;
                pageSubtitle.textContent = pageMeta[targetTab].subtitle;
            }

            // Trigger window resize event to force Plotly to refit its container size
            if (targetTab === 'analysis-charts') {
                setTimeout(() => {
                    window.dispatchEvent(new Event('resize'));
                }, 100);
            }

            // Lazy load statistics calculations only when viewing the statistics tab
            if (targetTab === 'analysis-stats') {
                if (typeof calculateSummaryStatistics === 'function') {
                    calculateSummaryStatistics();
                }
            }
        });
    });

    // Wire up "Go to Import Dataset" placeholder buttons
    document.querySelectorAll('.btn-goto-import').forEach(btn => {
        btn.addEventListener('click', () => {
            // Expand group if collapsed
            if (analysisGroup && analysisGroup.classList.contains('collapsed')) {
                analysisGroup.classList.remove('collapsed');
            }
            // Trigger click on import tab
            const importTabBtn = document.querySelector('.nav-item[data-tab="analysis-import"]');
            if (importTabBtn) importTabBtn.click();
        });
    });
}

// --- Hash Calculator Implementation ---
function setupHashCalc() {
    const hashInput = document.getElementById('hash-input');
    const md5Output = document.getElementById('hash-md5');
    const sha1Output = document.getElementById('hash-sha1');
    const sha256Output = document.getElementById('hash-sha256');
    const sha512Output = document.getElementById('hash-sha512');

    // Navigation sub-tabs
    const modeTextBtn = document.getElementById('hash-mode-text');
    const modeFileBtn = document.getElementById('hash-mode-file');
    const textContainer = document.getElementById('hash-text-container');
    const fileContainer = document.getElementById('hash-file-container');

    modeTextBtn.addEventListener('click', () => {
        modeTextBtn.classList.add('active');
        modeFileBtn.classList.remove('active');
        textContainer.classList.remove('hidden');
        fileContainer.classList.add('hidden');
    });

    modeFileBtn.addEventListener('click', () => {
        modeFileBtn.classList.add('active');
        modeTextBtn.classList.remove('active');
        fileContainer.classList.remove('hidden');
        textContainer.classList.add('hidden');
        if (window.lucide && window.lucide.createIcons) lucide.createIcons(); // Refresh icons inside drop zone
    });

    // --- Text Mode ---
    async function generateSubtleHash(text, algorithm) {
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(text);
            const hashBuffer = await crypto.subtle.digest(algorithm, data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (e) {
            return "Execution Error";
        }
    }

    async function updateHashes() {
        const text = hashInput.value;
        if (!text) {
            md5Output.value = '';
            sha1Output.value = '';
            sha256Output.value = '';
            sha512Output.value = '';
            return;
        }

        md5Output.value = md5(text);
        sha1Output.value = await generateSubtleHash(text, 'SHA-1');
        sha256Output.value = await generateSubtleHash(text, 'SHA-256');
        sha512Output.value = await generateSubtleHash(text, 'SHA-512');
    }

    hashInput.addEventListener('input', updateHashes);

    // --- File/Folder Mode ---
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const folderInput = document.getElementById('folder-input');
    const btnSelectFiles = document.getElementById('btn-select-files');
    const btnSelectFolder = document.getElementById('btn-select-folder');
    const fileListContainer = document.getElementById('file-list-container');
    const fileListBody = document.getElementById('file-list-body');

    // Trigger select dialogs
    btnSelectFiles.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
    });
    btnSelectFolder.addEventListener('click', (e) => {
        e.stopPropagation();
        folderInput.click();
    });

    // Make drop zone clickable (general file select)
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    // Drag over styles
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('dragover');
        }, false);
    });

    // Handle dropped items
    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        
        // Check if directories were dropped (standard HTML5 DataTransferItem API)
        if (dt.items && dt.items.length > 0) {
            const files = [];
            const entriesPromises = [];

            for (let i = 0; i < dt.items.length; i++) {
                const item = dt.items[i];
                if (item.kind === 'file') {
                    const entry = item.webkitGetAsEntry();
                    if (entry) {
                        entriesPromises.push(traverseFileTree(entry, '', files));
                    }
                }
            }

            if (entriesPromises.length > 0) {
                Promise.all(entriesPromises).then(() => {
                    if (files.length > 0) {
                        processSelectedFiles(files);
                    }
                });
            }
        } else {
            const files = Array.from(dt.files);
            if (files.length > 0) {
                processSelectedFiles(files);
            }
        }
    });

    // Traversal recursive handler for directories dropped
    function traverseFileTree(item, path, fileList) {
        return new Promise((resolve) => {
            if (item.isFile) {
                item.file((file) => {
                    // attach relative path property
                    file.relativePath = path + item.name;
                    fileList.push(file);
                    resolve();
                });
            } else if (item.isDirectory) {
                const dirReader = item.createReader();
                readAllEntries(dirReader).then((entries) => {
                    const promises = [];
                    for (let i = 0; i < entries.length; i++) {
                        promises.push(traverseFileTree(entries[i], path + item.name + '/', fileList));
                    }
                    Promise.all(promises).then(resolve);
                });
            } else {
                resolve();
            }
        });
    }

    // Workaround for directory readers capping at 100 entries
    function readAllEntries(dirReader) {
        const entries = [];
        return new Promise((resolve) => {
            function read() {
                dirReader.readEntries((results) => {
                    if (results.length === 0) {
                        resolve(entries);
                    } else {
                        entries.push(...results);
                        read();
                    }
                }, () => resolve(entries));
            }
            read();
        });
    }

    // Input change handlers
    fileInput.addEventListener('change', () => {
        const files = Array.from(fileInput.files);
        if (files.length > 0) {
            processSelectedFiles(files);
        }
    });

    folderInput.addEventListener('change', () => {
        const files = Array.from(folderInput.files).map(file => {
            // attach relative path for webkitRelativePath
            file.relativePath = file.webkitRelativePath || file.name;
            return file;
        });
        if (files.length > 0) {
            processSelectedFiles(files);
        }
    });

    function formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    // Process and render queue
    function processSelectedFiles(files) {
        fileListContainer.classList.remove('hidden');
        fileListBody.innerHTML = ''; // Clear previous results

        files.forEach((file, index) => {
            const relPath = file.relativePath || file.name;
            const dirPath = relPath.substring(0, relPath.lastIndexOf('/')) || '/';
            const fileName = file.name;
            const fileSize = formatBytes(file.size);

            const row = document.createElement('tr');
            row.id = `file-row-${index}`;
            row.className = 'file-row';
            row.innerHTML = `
                <td><strong>${fileName}</strong></td>
                <td class="dim">${dirPath}</td>
                <td class="dim">${fileSize}</td>
                <td id="file-status-${index}">
                    <span class="file-status-badge pending">Pending</span>
                    <div class="mini-progress-container hidden" id="file-progress-container-${index}">
                        <div class="mini-progress-bar" id="file-progress-${index}"></div>
                    </div>
                </td>
                <td id="file-action-${index}">-</td>
            `;

            const detailRow = document.createElement('tr');
            detailRow.id = `file-detail-row-${index}`;
            detailRow.className = 'detail-row';
            detailRow.innerHTML = `
                <td colspan="5">
                    <div class="detail-content" id="file-detail-content-${index}">
                        <div class="detail-hash-grid">
                            <div class="detail-hash-row">
                                <span class="detail-hash-label">MD5</span>
                                <span class="detail-hash-value" id="file-hash-md5-${index}">Calculating...</span>
                                <button class="btn-icon detail-hash-copy hidden" id="copy-md5-${index}"><i data-lucide="copy"></i></button>
                            </div>
                            <div class="detail-hash-row">
                                <span class="detail-hash-label">SHA-1</span>
                                <span class="detail-hash-value" id="file-hash-sha1-${index}">Calculating...</span>
                                <button class="btn-icon detail-hash-copy hidden" id="copy-sha1-${index}"><i data-lucide="copy"></i></button>
                            </div>
                            <div class="detail-hash-row">
                                <span class="detail-hash-label">SHA-256</span>
                                <span class="detail-hash-value" id="file-hash-sha256-${index}">Calculating...</span>
                                <button class="btn-icon detail-hash-copy hidden" id="copy-sha256-${index}"><i data-lucide="copy"></i></button>
                            </div>
                            <div class="detail-hash-row">
                                <span class="detail-hash-label">SHA-512</span>
                                <span class="detail-hash-value" id="file-hash-sha512-${index}">Calculating...</span>
                                <button class="btn-icon detail-hash-copy hidden" id="copy-sha512-${index}"><i data-lucide="copy"></i></button>
                            </div>
                        </div>
                    </div>
                </td>
            `;

            row.addEventListener('click', () => {
                const isOpen = detailRow.classList.contains('open');
                document.querySelectorAll('.detail-row').forEach(r => r.classList.remove('open'));
                document.querySelectorAll('.file-row').forEach(r => r.classList.remove('expanded'));

                if (!isOpen) {
                    detailRow.classList.add('open');
                    row.classList.add('expanded');
                }
            });

            fileListBody.appendChild(row);
            fileListBody.appendChild(detailRow);

            // Compute hash for each file in sequence
            setTimeout(() => {
                hashFile(file, index);
            }, index * 100);
        });
    }

    // Clipboard copy helper with preventPropagation
    function setupCopyBtn(btnId, value) {
        const btn = document.getElementById(btnId);
        if (!btn) return;
        btn.addEventListener('click', (ev) => {
            ev.stopPropagation(); // Prevent row expand/collapse
            navigator.clipboard.writeText(value).then(() => {
                const originalHTML = btn.innerHTML;
                btn.innerHTML = `<i data-lucide="check" style="color: var(--success-color)"></i>`;
                if (window.lucide && window.lucide.createIcons) lucide.createIcons();
                setTimeout(() => {
                    btn.innerHTML = originalHTML;
                    if (window.lucide && window.lucide.createIcons) lucide.createIcons();
                }, 2000);
            });
        });
    }

    function fillHashDetail(textId, btnId, value) {
        const textEl = document.getElementById(textId);
        const btn = document.getElementById(btnId);
        if (textEl) textEl.textContent = value;
        if (btn) {
            btn.classList.remove('hidden');
            setupCopyBtn(btnId, value);
        }
    }

    // Hash file using FileReader and SubtleCrypto
    function hashFile(file, index) {
        const statusEl = document.getElementById(`file-status-${index}`);
        const actionEl = document.getElementById(`file-action-${index}`);
        const progressContainer = document.getElementById(`file-progress-container-${index}`);
        const progressBar = document.getElementById(`file-progress-${index}`);

        const reader = new FileReader();

        reader.onloadstart = () => {
            statusEl.innerHTML = '';
            statusEl.appendChild(progressContainer);
            progressContainer.classList.remove('hidden');
        };

        reader.onprogress = (e) => {
            if (e.lengthComputable) {
                const percentage = Math.round((e.loaded / e.total) * 100);
                progressBar.style.width = `${percentage}%`;
            }
        };

        reader.onload = async (e) => {
            try {
                const arrayBuffer = e.target.result;
                
                // Calculate MD5
                const uint8 = new Uint8Array(arrayBuffer);
                const md5Hash = md5(uint8);

                // Subtle Crypto digest helper
                const getHash = async (algo) => {
                    const buf = await crypto.subtle.digest(algo, arrayBuffer);
                    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
                };

                // Compute standard hashes
                const sha1Hash = await getHash('SHA-1');
                const sha256Hash = await getHash('SHA-256');
                const sha512Hash = await getHash('SHA-512');

                // Render result (SHA-256 on main row + Indicator)
                statusEl.innerHTML = `<span class="mono">${sha256Hash}</span> <span class="badge" style="margin-left: 8px; font-size: 9px; padding: 2px 6px;">+3 MORE</span>`;
                
                // Add copy button for SHA-256 on main row
                const btnId = `btn-copy-file-${index}`;
                actionEl.innerHTML = `
                    <button class="btn-icon copy-file-btn" id="${btnId}">
                        <i data-lucide="copy"></i>
                    </button>
                `;
                if (window.lucide && window.lucide.createIcons) lucide.createIcons();
                setupCopyBtn(btnId, sha256Hash);

                // Fill expanded detail hashes
                fillHashDetail(`file-hash-md5-${index}`, `copy-md5-${index}`, md5Hash);
                fillHashDetail(`file-hash-sha1-${index}`, `copy-sha1-${index}`, sha1Hash);
                fillHashDetail(`file-hash-sha256-${index}`, `copy-sha256-${index}`, sha256Hash);
                fillHashDetail(`file-hash-sha512-${index}`, `copy-sha512-${index}`, sha512Hash);
                
                if (window.lucide && window.lucide.createIcons) lucide.createIcons();

            } catch (err) {
                statusEl.innerHTML = `<span class="file-status-badge error">Hash Failed</span>`;
                console.error(err);
            }
        };

        reader.onerror = () => {
            statusEl.innerHTML = `<span class="file-status-badge error">Read Error</span>`;
        };

        reader.readAsArrayBuffer(file);
    }
}

// --- Password Generator & Security Analysis ---
function setupPasswordGen() {
    const lengthSlider = document.getElementById('pass-length');
    const lengthValText = document.getElementById('length-val');
    const includeUpper = document.getElementById('include-upper');
    const includeLower = document.getElementById('include-lower');
    const includeNumbers = document.getElementById('include-numbers');
    const includeSymbols = document.getElementById('include-symbols');
    const generateBtn = document.getElementById('generate-btn');
    const generatedOutput = document.getElementById('generated-password');
    const strengthBar = document.getElementById('strength-bar');
    const strengthText = document.getElementById('strength-text');
    const entropyValue = document.getElementById('entropy-value');
    const crackTimeValue = document.getElementById('crack-time');

    lengthSlider.addEventListener('input', () => {
        lengthValText.textContent = lengthSlider.value;
    });

    function generateSecurePassword() {
        const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const lowercase = 'abcdefghijklmnopqrstuvwxyz';
        const numbers = '0123456789';
        const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

        let allowedChars = '';
        if (includeUpper.checked) allowedChars += uppercase;
        if (includeLower.checked) allowedChars += lowercase;
        if (includeNumbers.checked) allowedChars += numbers;
        if (includeSymbols.checked) allowedChars += symbols;

        if (!allowedChars) {
            generatedOutput.value = 'Please select at least 1 checkbox!';
            updateStrengthMeter('', 0);
            return;
        }

        const length = parseInt(lengthSlider.value, 10);
        let password = '';

        // Fill character list securely
        const randomValues = new Uint32Array(length);
        crypto.getRandomValues(randomValues);

        for (let i = 0; i < length; i++) {
            password += allowedChars[randomValues[i] % allowedChars.length];
        }

        generatedOutput.value = password;
        
        // Calculate Pool size
        let poolSize = 0;
        if (includeUpper.checked) poolSize += 26;
        if (includeLower.checked) poolSize += 26;
        if (includeNumbers.checked) poolSize += 10;
        if (includeSymbols.checked) poolSize += symbols.length;

        const entropy = Math.round(length * Math.log2(poolSize));
        updateStrengthMeter(password, entropy);
    }

    function updateStrengthMeter(password, entropy) {
        entropyValue.textContent = entropy;
        
        // Remove old classes
        strengthText.className = 'strength-badge';
        
        let strength = 'Weak';
        let barColor = 'var(--danger-color)';
        let barWidth = '20%';

        if (entropy >= 35 && entropy < 60) {
            strength = 'Medium';
            barColor = 'var(--warning-color)';
            barWidth = '60%';
            strengthText.classList.add('medium');
        } else if (entropy >= 60) {
            strength = 'Strong';
            barColor = 'var(--success-color)';
            barWidth = '100%';
            strengthText.classList.add('strong');
        } else {
            strengthText.classList.add('weak');
        }

        strengthText.textContent = strength;
        strengthBar.style.backgroundColor = barColor;
        strengthBar.style.width = barWidth;

        // Estimate Crack Time
        // Assuming 100 billion guesses per second (High performance GPU rig)
        if (!password) {
            crackTimeValue.textContent = 'Instant';
            return;
        }

        const guesses = Math.pow(2, entropy);
        const guessesPerSec = 100000000000;
        const seconds = guesses / guessesPerSec;

        if (seconds < 1) {
            crackTimeValue.textContent = 'Instant';
        } else if (seconds < 60) {
            crackTimeValue.textContent = Math.round(seconds) + ' seconds';
        } else if (seconds < 3600) {
            crackTimeValue.textContent = Math.round(seconds / 60) + ' minutes';
        } else if (seconds < 86400) {
            crackTimeValue.textContent = Math.round(seconds / 3600) + ' hours';
        } else if (seconds < 31536000) {
            crackTimeValue.textContent = Math.round(seconds / 86400) + ' days';
        } else if (seconds < 3153600000) {
            crackTimeValue.textContent = Math.round(seconds / 31536000) + ' years';
        } else {
            const centuries = seconds / (31536000 * 100);
            if (centuries > 1000000) {
                crackTimeValue.textContent = 'Eons';
            } else {
                crackTimeValue.textContent = Math.round(centuries) + ' centuries';
            }
        }
    }

    generateBtn.addEventListener('click', generateSecurePassword);
    
    // Trigger initial generation
    generateSecurePassword();
}

// --- Encoder / Decoder Implementation ---
function setupEncoderDecoder() {
    const input = document.getElementById('codec-input');
    const format = document.getElementById('codec-format');
    const output = document.getElementById('codec-output');
    const encodeBtn = document.getElementById('encode-btn');
    const decodeBtn = document.getElementById('decode-btn');

    function encodeData() {
        const text = input.value;
        const mode = format.value;

        if (!text) {
            output.value = '';
            return;
        }

        try {
            if (mode === 'base64') {
                output.value = btoa(unescape(encodeURIComponent(text)));
            } else if (mode === 'hex') {
                const encoder = new TextEncoder();
                const bytes = encoder.encode(text);
                output.value = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
            } else if (mode === 'url') {
                output.value = encodeURIComponent(text);
            }
        } catch (err) {
            output.value = "Encoding Error: " + err.message;
        }
    }

    function decodeData() {
        const text = input.value.trim();
        const mode = format.value;

        if (!text) {
            output.value = '';
            return;
        }

        try {
            if (mode === 'base64') {
                output.value = decodeURIComponent(escape(atob(text)));
            } else if (mode === 'hex') {
                const cleanHex = text.replace(/[^0-9A-Fa-f]/g, '');
                if (cleanHex.length % 2 !== 0) {
                    throw new Error("Invalid hex string length");
                }
                const bytes = new Uint8Array(cleanHex.length / 2);
                for (let i = 0; i < cleanHex.length; i += 2) {
                    bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
                }
                const decoder = new TextDecoder();
                output.value = decoder.decode(bytes);
            } else if (mode === 'url') {
                output.value = decodeURIComponent(text);
            }
        } catch (err) {
            output.value = "Decoding Error: " + err.message;
        }
    }

    encodeBtn.addEventListener('click', encodeData);
    decodeBtn.addEventListener('click', decodeData);
}

// --- IP Subnet Calculator Implementation ---
function setupSubnetCalc() {
    const ipInput = document.getElementById('ip-address');
    const cidrSelect = document.getElementById('cidr-select');
    const calcBtn = document.getElementById('calculate-subnet');

    const subnetMaskEl = document.getElementById('subnet-mask');
    const netAddressEl = document.getElementById('net-address');
    const broadcastAddressEl = document.getElementById('broadcast-address');
    const usableRangeEl = document.getElementById('usable-range');
    const totalHostsEl = document.getElementById('total-hosts');

    // Populate CIDR dropdown dynamically
    for (let i = 32; i >= 1; i--) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `/${i}`;
        if (i === 24) option.selected = true; // default value
        cidrSelect.appendChild(option);
    }

    function ipToInt(ip) {
        return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
    }

    function intToIp(int) {
        return [
            (int >>> 24) & 255,
            (int >>> 16) & 255,
            (int >>> 8) & 255,
            int & 255
        ].join('.');
    }

    function calculateSubnet() {
        const ip = ipInput.value.trim();
        const cidr = parseInt(cidrSelect.value, 10);

        // Simple IPv4 regex validation
        const ipPattern = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        if (!ipPattern.test(ip)) {
            alert('Please enter a valid IPv4 Address.');
            return;
        }

        const ipNum = ipToInt(ip);
        const maskNum = (cidr === 0) ? 0 : (~0 << (32 - cidr)) >>> 0;
        
        const netNum = (ipNum & maskNum) >>> 0;
        const wildNum = (~maskNum) >>> 0;
        const broadcastNum = (netNum | wildNum) >>> 0;

        let totalHosts = 0;
        let firstUsable = '';
        let lastUsable = '';

        if (cidr <= 30) {
            totalHosts = (broadcastNum - netNum) - 1;
            firstUsable = intToIp(netNum + 1);
            lastUsable = intToIp(broadcastNum - 1);
        } else if (cidr === 31) {
            // Point-to-point RFC 3021 link
            totalHosts = 2;
            firstUsable = intToIp(netNum);
            lastUsable = intToIp(broadcastNum);
        } else {
            // /32 Single Host
            totalHosts = 1;
            firstUsable = intToIp(netNum);
            lastUsable = intToIp(netNum);
        }

        subnetMaskEl.textContent = intToIp(maskNum);
        netAddressEl.textContent = intToIp(netNum) + ` /${cidr}`;
        broadcastAddressEl.textContent = intToIp(broadcastNum);
        
        if (cidr === 32) {
            usableRangeEl.textContent = firstUsable;
        } else {
            usableRangeEl.textContent = `${firstUsable} - ${lastUsable}`;
        }
        
        totalHostsEl.textContent = totalHosts.toLocaleString();
    }

    calcBtn.addEventListener('click', calculateSubnet);
    
    // Initial run
    calculateSubnet();
}

// --- Text Symmetric Encrypter (AES-GCM Web Crypto) ---
// --- Text Cryptography (AES, DES, 3DES & Diffie-Hellman) ---
function setupEncrypter() {
    const textInput = document.getElementById('crypt-text');
    const keyInput = document.getElementById('crypt-key');
    const toggleKeyBtn = document.getElementById('toggle-key-visibility');
    const encryptBtn = document.getElementById('encrypt-btn');
    const decryptBtn = document.getElementById('decrypt-btn');
    const resultOutput = document.getElementById('crypt-result');
    const algoSelect = document.getElementById('crypt-algo');
    const warningBox = document.getElementById('crypt-warning-box');

    // Inner navigation sub-tabs
    const subTabSymmetric = document.getElementById('crypto-mode-symmetric');
    const subTabDH = document.getElementById('crypto-mode-dh');
    const symmetricPanel = document.getElementById('crypto-symmetric-container');
    const dhPanel = document.getElementById('crypto-dh-container');

    subTabSymmetric.addEventListener('click', () => {
        subTabSymmetric.classList.add('active');
        subTabDH.classList.remove('active');
        symmetricPanel.classList.remove('hidden');
        dhPanel.classList.add('hidden');
    });

    subTabDH.addEventListener('click', () => {
        subTabDH.classList.add('active');
        subTabSymmetric.classList.remove('active');
        dhPanel.classList.remove('hidden');
        symmetricPanel.classList.add('hidden');
        if (window.lucide && window.lucide.createIcons) lucide.createIcons();
    });

    // Algo warning trigger for legacy DES/3DES
    algoSelect.addEventListener('change', () => {
        const val = algoSelect.value;
        if (val === 'des' || val === '3des') {
            warningBox.classList.remove('hidden');
        } else {
            warningBox.classList.add('hidden');
        }
        if (window.lucide && window.lucide.createIcons) lucide.createIcons();
    });

    toggleKeyBtn.addEventListener('click', () => {
        const isPassword = keyInput.type === 'password';
        keyInput.type = isPassword ? 'text' : 'password';
        toggleKeyBtn.innerHTML = `<i data-lucide="${isPassword ? 'eye-off' : 'eye'}"></i>`;
        if (window.lucide && window.lucide.createIcons) lucide.createIcons();
    });

    // Derive cryptographic key using PBKDF2 for AES-GCM
    async function deriveKey(password, salt) {
        const textEncoder = new TextEncoder();
        const baseKey = await crypto.subtle.importKey(
            'raw',
            textEncoder.encode(password),
            { name: 'PBKDF2' },
            false,
            ['deriveKey']
        );
        return crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            baseKey,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    }

    async function encryptText() {
        const text = textInput.value;
        const keyText = keyInput.value;
        const algo = algoSelect.value;

        if (!text || !keyText) {
            alert('Please enter both the payload text and secret key.');
            return;
        }

        if (algo === 'aes-gcm') {
            try {
                const encoder = new TextEncoder();
                const salt = crypto.getRandomValues(new Uint8Array(16));
                const iv = crypto.getRandomValues(new Uint8Array(12));

                const cryptoKey = await deriveKey(keyText, salt);
                const ciphertextBuffer = await crypto.subtle.encrypt(
                    { name: 'AES-GCM', iv: iv },
                    cryptoKey,
                    encoder.encode(text)
                );

                const packageObj = {
                    v: 'AES-GCM-256',
                    salt: btoa(String.fromCharCode(...salt)),
                    iv: btoa(String.fromCharCode(...iv)),
                    ct: btoa(String.fromCharCode(...new Uint8Array(ciphertextBuffer)))
                };

                resultOutput.value = JSON.stringify(packageObj, null, 2);
            } catch (err) {
                resultOutput.value = "Encryption Failed: " + err.message;
            }
        } else if (algo === 'des') {
            try {
                const encrypted = CryptoJS.DES.encrypt(text, keyText);
                resultOutput.value = encrypted.toString();
            } catch (err) {
                resultOutput.value = "DES Encryption Failed: " + err.message;
            }
        } else if (algo === '3des') {
            try {
                const encrypted = CryptoJS.TripleDES.encrypt(text, keyText);
                resultOutput.value = encrypted.toString();
            } catch (err) {
                resultOutput.value = "3DES Encryption Failed: " + err.message;
            }
        }
    }

    async function decryptText() {
        const text = textInput.value.trim();
        const keyText = keyInput.value;
        const algo = algoSelect.value;

        if (!text || !keyText) {
            alert('Please enter both the ciphertext and secret key.');
            return;
        }

        if (algo === 'aes-gcm') {
            try {
                const packageObj = JSON.parse(text);
                if (packageObj.v !== 'AES-GCM-256' || !packageObj.salt || !packageObj.iv || !packageObj.ct) {
                    throw new Error("Invalid encrypted format package");
                }

                const salt = new Uint8Array(atob(packageObj.salt).split('').map(c => c.charCodeAt(0)));
                const iv = new Uint8Array(atob(packageObj.iv).split('').map(c => c.charCodeAt(0)));
                const ciphertext = new Uint8Array(atob(packageObj.ct).split('').map(c => c.charCodeAt(0)));

                const cryptoKey = await deriveKey(keyText, salt);
                const decryptedBuffer = await crypto.subtle.decrypt(
                    { name: 'AES-GCM', iv: iv },
                    cryptoKey,
                    ciphertext
                );

                const decoder = new TextDecoder();
                resultOutput.value = decoder.decode(decryptedBuffer);
            } catch (err) {
                resultOutput.value = "Decryption Failed. Check key or package integrity.\nDetails: " + err.message;
            }
        } else if (algo === 'des') {
            try {
                const decrypted = CryptoJS.DES.decrypt(text, keyText);
                const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
                if (!decryptedText) throw new Error("Incorrect key or corrupted cipher payload.");
                resultOutput.value = decryptedText;
            } catch (err) {
                resultOutput.value = "DES Decryption Failed. Check key or key strength.\nDetails: " + err.message;
            }
        } else if (algo === '3des') {
            try {
                const decrypted = CryptoJS.TripleDES.decrypt(text, keyText);
                const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
                if (!decryptedText) throw new Error("Incorrect key or corrupted cipher payload.");
                resultOutput.value = decryptedText;
            } catch (err) {
                resultOutput.value = "3DES Decryption Failed. Check key or key strength.\nDetails: " + err.message;
            }
        }
    }

    encryptBtn.addEventListener('click', encryptText);
    decryptBtn.addEventListener('click', decryptText);

    // --- Diffie-Hellman Simulator Engine ---
    const dhPInput = document.getElementById('dh-p');
    const dhGInput = document.getElementById('dh-g');
    const dhGenParamsBtn = document.getElementById('btn-dh-generate-params');

    const dhAlicePriv = document.getElementById('dh-alice-priv');
    const dhAlicePubBtn = document.getElementById('btn-dh-alice-pub');
    const dhAlicePubVal = document.getElementById('dh-alice-pub-val');
    const dhAliceBobPub = document.getElementById('dh-alice-bob-pub');
    const dhAliceSecretBtn = document.getElementById('btn-dh-alice-secret');

    const dhBobPriv = document.getElementById('dh-bob-priv');
    const dhBobPubBtn = document.getElementById('btn-dh-bob-pub');
    const dhBobPubVal = document.getElementById('dh-bob-pub-val');
    const dhBobAlicePub = document.getElementById('dh-bob-alice-pub');
    const dhBobSecretBtn = document.getElementById('btn-dh-bob-secret');

    const dhMatchBanner = document.getElementById('dh-match-banner');
    const dhSharedKeyVal = document.getElementById('dh-shared-key-val');

    let aliceSecret = null;
    let bobSecret = null;

    const DH_PRIME_PRESETS = [
        { p: '9999999900000001', g: '2' },
        { p: '18446744073709551557', g: '2' },
        { p: '10000000000000000039', g: '2' },
        { p: '4294967291', g: '2' },
        { p: '999999999999999989', g: '2' }
    ];

    dhGenParamsBtn.addEventListener('click', () => {
        const randPreset = DH_PRIME_PRESETS[Math.floor(Math.random() * DH_PRIME_PRESETS.length)];
        dhPInput.value = randPreset.p;
        dhGInput.value = randPreset.g;
        clearDHOutputs();
    });

    function clearDHOutputs() {
        dhAlicePubVal.value = '';
        dhBobPubVal.value = '';
        aliceSecret = null;
        bobSecret = null;
        dhMatchBanner.classList.add('hidden');
    }

    function bigIntModPow(base, exponent, modulus) {
        if (modulus === 1n) return 0n;
        let result = 1n;
        base = base % modulus;
        while (exponent > 0n) {
            if (exponent % 2n === 1n) {
                result = (result * base) % modulus;
            }
            exponent = exponent >> 1n;
            base = (base * base) % modulus;
        }
        return result;
    }

    dhAlicePubBtn.addEventListener('click', () => {
        try {
            const p = BigInt(dhPInput.value.trim());
            const g = BigInt(dhGInput.value.trim());
            const a = BigInt(dhAlicePriv.value.trim());
            
            if (a >= p) {
                alert("Private Key (a) should be less than Prime Modulus (p)!");
                return;
            }

            const A = bigIntModPow(g, a, p);
            dhAlicePubVal.value = A.toString();
        } catch (e) {
            alert('Error calculating Alice\'s Public Key. Check parameters formatting.');
        }
    });

    dhBobPubBtn.addEventListener('click', () => {
        try {
            const p = BigInt(dhPInput.value.trim());
            const g = BigInt(dhGInput.value.trim());
            const b = BigInt(dhBobPriv.value.trim());
            
            if (b >= p) {
                alert("Private Key (b) should be less than Prime Modulus (p)!");
                return;
            }

            const B = bigIntModPow(g, b, p);
            dhBobPubVal.value = B.toString();
        } catch (e) {
            alert('Error calculating Bob\'s Public Key. Check parameters formatting.');
        }
    });

    dhAliceSecretBtn.addEventListener('click', () => {
        try {
            const p = BigInt(dhPInput.value.trim());
            const a = BigInt(dhAlicePriv.value.trim());
            const B = BigInt(dhAliceBobPub.value.trim());

            aliceSecret = bigIntModPow(B, a, p);
            checkDHSecrets();
        } catch (e) {
            alert('Error calculating shared secret for Alice. Ensure Bob\'s Public Key is filled.');
        }
    });

    dhBobSecretBtn.addEventListener('click', () => {
        try {
            const p = BigInt(dhPInput.value.trim());
            const b = BigInt(dhBobPriv.value.trim());
            const A = BigInt(dhBobAlicePub.value.trim());

            bobSecret = bigIntModPow(A, b, p);
            checkDHSecrets();
        } catch (e) {
            alert('Error calculating shared secret for Bob. Ensure Alice\'s Public Key is filled.');
        }
    });

    function checkDHSecrets() {
        if (aliceSecret !== null && bobSecret !== null) {
            if (aliceSecret === bobSecret) {
                dhSharedKeyVal.textContent = aliceSecret.toString(16).toUpperCase() + ` (Dec: ${aliceSecret.toString()})`;
                dhMatchBanner.classList.remove('hidden');
                if (window.lucide && window.lucide.createIcons) lucide.createIcons();
            } else {
                dhMatchBanner.classList.add('hidden');
                alert('Secrets do not match! Check modulo parameters or key values.');
            }
        }
    }
}

// --- Clipboard Copy Setup Helper ---
function setupCopyButtons() {
    const copyBtns = document.querySelectorAll('.copy-btn');
    
    copyBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const targetEl = document.getElementById(targetId);
            
            if (targetEl && targetEl.value) {
                navigator.clipboard.writeText(targetEl.value).then(() => {
                    // Visual feedback
                    btn.classList.add('copied');
                    const originalHTML = btn.innerHTML;
                    btn.innerHTML = `<i data-lucide="check"></i>`;
                    if (window.lucide && window.lucide.createIcons) lucide.createIcons();
                    
                    setTimeout(() => {
                        btn.classList.remove('copied');
                        btn.innerHTML = originalHTML;
                        if (window.lucide && window.lucide.createIcons) lucide.createIcons();
                    }, 2000);
                }).catch(err => {
                    console.error("Clipboard copy failed: ", err);
                });
            }
        });
    });
}

// --- Link Shortener & Redirector ---
function setupLinkShaper() {
    const linkInput = document.getElementById('link-input');
    const methodOnline = document.getElementById('method-online');
    const methodOffline = document.getElementById('method-offline');
    const shapeBtn = document.getElementById('shape-link-btn');
    const shapedOutput = document.getElementById('shaped-link-output');
    const downloadContainer = document.getElementById('redirect-download-container');
    const downloadBtn = document.getElementById('download-redirect-btn');
    const qrContainer = document.getElementById('qr-code-container');
    const qrCanvas = document.getElementById('qr-canvas');

    let currentRedirectBlobUrl = null;

    shapeBtn.addEventListener('click', async () => {
        let urlText = linkInput.value.trim();
        if (!urlText) {
            alert('Please enter a link to shorten.');
            return;
        }

        // Add scheme if missing
        if (!/^https?:\/\//i.test(urlText)) {
            urlText = 'https://' + urlText;
        }

        try {
            // Validate URL format
            new URL(urlText);

            if (methodOnline.checked) {
                // ONLINE MODE: Call TinyURL API
                shapedOutput.value = "Shortening link, please wait...";
                qrContainer.classList.add('hidden');
                downloadContainer.classList.add('hidden');

                try {
                    const response = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(urlText)}`);
                    if (!response.ok) throw new Error("TinyURL API request failed");
                    
                    const shortUrl = await response.text();
                    shapedOutput.value = shortUrl.trim();

                    // Generate QR Code
                    qrContainer.classList.remove('hidden');
                    new QRious({
                        element: qrCanvas,
                        value: shortUrl.trim(),
                        size: 150,
                        background: '#ffffff',
                        foreground: '#060b07',
                        level: 'H'
                    });

                } catch (apiErr) {
                    shapedOutput.value = "Error: Failed to reach TinyURL API. You may be offline.\nFallback details: " + apiErr.message;
                }

            } else {
                // OFFLINE MODE: Standalone HTML Redirect File
                shapedOutput.value = "Redirect HTML File Generated successfully!";
                downloadContainer.classList.remove('hidden');
                qrContainer.classList.remove('hidden');

                // Generate QR Code
                new QRious({
                    element: qrCanvas,
                    value: urlText,
                    size: 150,
                    background: '#ffffff',
                    foreground: '#060b07',
                    level: 'H'
                });

                // Clean up previous blob
                if (currentRedirectBlobUrl) {
                    URL.revokeObjectURL(currentRedirectBlobUrl);
                }

                const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta http-equiv="refresh" content="0; url=${urlText}">
    <title>Redirecting...</title>
    <style>
        body { background-color: #060b07; color: #10b981; font-family: monospace; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
        .box { border: 1px solid #10b981; padding: 25px; border-radius: 8px; text-align: center; box-shadow: 0 0 15px rgba(16, 185, 129, 0.15); max-width: 500px; width: 90%; }
        code { display: block; margin: 15px 0; word-break: break-all; padding: 10px; background: #0c150e; border: 1px solid #182c1b; border-radius: 4px; color: #e2f1e6; }
        .spinner { border: 3px solid #0c150e; border-radius: 50%; border-top: 3px solid #10b981; width: 24px; height: 24px; animation: spin 1s linear infinite; margin: 15px auto; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <div class="box">
        <h2 style="margin-top:0;">MHZ SECURE REDIRECT</h2>
        <p>Redirecting you safely to:</p>
        <code>${urlText}</code>
        <div class="spinner"></div>
        <p style="font-size: 12px; color: #558060;">Developed by Mohammad Hussain Alzaghameem</p>
    </div>
    <script>
        setTimeout(() => {
            window.location.replace("${urlText}");
        }, 500);
    </script>
</body>
</html>`;

                const blob = new Blob([htmlContent], { type: 'text/html' });
                currentRedirectBlobUrl = URL.createObjectURL(blob);
                downloadBtn.onclick = () => {
                    const a = document.createElement('a');
                    a.href = currentRedirectBlobUrl;
                    a.download = 'mhz_redirect.html';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                };
            }

        } catch (err) {
            shapedOutput.value = "Error: Invalid URL. Ensure scheme and format are correct. Details: " + err.message;
            qrContainer.classList.add('hidden');
            downloadContainer.classList.add('hidden');
        }
    });
}

// --- Hash Comparator Implementation ---
function setupHashCompare() {
    // Mode Switching selectors
    const modeTextBtn = document.getElementById('compare-mode-text');
    const modeFileBtn = document.getElementById('compare-mode-file');
    const modeVerifyBtn = document.getElementById('compare-mode-verify');

    const containerText = document.getElementById('compare-text-container');
    const containerFile = document.getElementById('compare-file-container');
    const containerVerify = document.getElementById('compare-verify-container');

    // Tab buttons activation
    modeTextBtn.addEventListener('click', () => {
        setActiveSubMode(modeTextBtn, containerText);
    });
    modeFileBtn.addEventListener('click', () => {
        setActiveSubMode(modeFileBtn, containerFile);
    });
    modeVerifyBtn.addEventListener('click', () => {
        setActiveSubMode(modeVerifyBtn, containerVerify);
    });

    function setActiveSubMode(activeBtn, activeContainer) {
        [modeTextBtn, modeFileBtn, modeVerifyBtn].forEach(btn => btn.classList.remove('active'));
        [containerText, containerFile, containerVerify].forEach(c => c.classList.add('hidden'));
        
        activeBtn.classList.add('active');
        activeContainer.classList.remove('hidden');
        if (window.lucide && window.lucide.createIcons) lucide.createIcons();
    }

    // Helper functions for hash calculation
    async function generateSubtleHash(text, algorithm) {
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(text);
            const hashBuffer = await crypto.subtle.digest(algorithm, data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (e) {
            return "Error";
        }
    }

    // Common status icons
    const okIcon = `<i data-lucide="check" class="match-icon-ok"></i>`;
    const failIcon = `<i data-lucide="x" class="match-icon-fail"></i>`;

    // ==========================================
    // 1. Text vs Text Mode Logic
    // ==========================================
    const txtA = document.getElementById('compare-text-a');
    const txtB = document.getElementById('compare-text-b');
    const txtStatus = document.getElementById('compare-text-status');

    const compTxtAMd5 = document.getElementById('comp-txt-a-md5');
    const compTxtBMd5 = document.getElementById('comp-txt-b-md5');
    const compTxtMatchMd5 = document.getElementById('comp-txt-match-md5');

    const compTxtASha1 = document.getElementById('comp-txt-a-sha1');
    const compTxtBSha1 = document.getElementById('comp-txt-b-sha1');
    const compTxtMatchSha1 = document.getElementById('comp-txt-match-sha1');

    const compTxtASha256 = document.getElementById('comp-txt-a-sha256');
    const compTxtBSha256 = document.getElementById('comp-txt-b-sha256');
    const compTxtMatchSha256 = document.getElementById('comp-txt-match-sha256');

    const compTxtASha512 = document.getElementById('comp-txt-a-sha512');
    const compTxtBSha512 = document.getElementById('comp-txt-b-sha512');
    const compTxtMatchSha512 = document.getElementById('comp-txt-match-sha512');

    async function updateTextComparison() {
        const valA = txtA.value;
        const valB = txtB.value;

        if (!valA && !valB) {
            // Reset table
            const cells = [compTxtAMd5, compTxtBMd5, compTxtMatchMd5, compTxtASha1, compTxtBSha1, compTxtMatchSha1, compTxtASha256, compTxtBSha256, compTxtMatchSha256, compTxtASha512, compTxtBSha512, compTxtMatchSha512];
            cells.forEach(c => { if (c) c.textContent = '-'; });
            txtStatus.className = 'compare-status-banner hidden';
            txtStatus.innerHTML = '';
            return;
        }

        // Calculate A hashes
        const md5A = md5(valA);
        const sha1A = await generateSubtleHash(valA, 'SHA-1');
        const sha256A = await generateSubtleHash(valA, 'SHA-256');
        const sha512A = await generateSubtleHash(valA, 'SHA-512');

        // Calculate B hashes
        const md5B = md5(valB);
        const sha1B = await generateSubtleHash(valB, 'SHA-1');
        const sha256B = await generateSubtleHash(valB, 'SHA-256');
        const sha512B = await generateSubtleHash(valB, 'SHA-512');

        // Display A hashes
        compTxtAMd5.textContent = md5A;
        compTxtASha1.textContent = sha1A;
        compTxtASha256.textContent = sha256A;
        compTxtASha512.textContent = sha512A;

        // Display B hashes
        compTxtBMd5.textContent = md5B;
        compTxtBSha1.textContent = sha1B;
        compTxtBSha256.textContent = sha256B;
        compTxtBSha512.textContent = sha512B;

        // Check matches
        const matches = {
            md5: md5A === md5B,
            sha1: sha1A === sha1B,
            sha256: sha256A === sha256B,
            sha512: sha512A === sha512B
        };

        compTxtMatchMd5.innerHTML = matches.md5 ? okIcon : failIcon;
        compTxtMatchSha1.innerHTML = matches.sha1 ? okIcon : failIcon;
        compTxtMatchSha256.innerHTML = matches.sha256 ? okIcon : failIcon;
        compTxtMatchSha512.innerHTML = matches.sha512 ? okIcon : failIcon;

        // Highlight matching table rows
        toggleRowHighlight('compare-text-row-md5', matches.md5);
        toggleRowHighlight('compare-text-row-sha1', matches.sha1);
        toggleRowHighlight('compare-text-row-sha256', matches.sha256);
        toggleRowHighlight('compare-text-row-sha512', matches.sha512);

        // Overall status banner
        txtStatus.classList.remove('hidden');
        if (valA === valB) {
            txtStatus.className = 'compare-status-banner match';
            txtStatus.innerHTML = `<i data-lucide="shield-check"></i> <span>Perfect Match! The input texts are identical character-for-character.</span>`;
        } else {
            txtStatus.className = 'compare-status-banner mismatch';
            txtStatus.innerHTML = `<i data-lucide="shield-alert"></i> <span>Mismatch! The input texts are different.</span>`;
        }
        if (window.lucide && window.lucide.createIcons) lucide.createIcons();
    }

    function toggleRowHighlight(rowId, shouldHighlight) {
        const row = document.getElementById(rowId);
        if (!row) return;
        if (shouldHighlight) {
            row.classList.add('highlight-row');
        } else {
            row.classList.remove('highlight-row');
        }
    }

    txtA.addEventListener('input', updateTextComparison);
    txtB.addEventListener('input', updateTextComparison);

    // ==========================================
    // 2. File vs File Mode Logic
    // ==========================================
    const dropZoneCompA = document.getElementById('drop-zone-comp-a');
    const dropZoneCompB = document.getElementById('drop-zone-comp-b');
    const compFileAInput = document.getElementById('comp-file-a-input');
    const compFileBInput = document.getElementById('comp-file-b-input');

    const compFileAName = document.getElementById('comp-file-a-name');
    const compFileBName = document.getElementById('comp-file-b-name');

    const progressContainerA = document.getElementById('comp-file-a-progress-container');
    const progressContainerB = document.getElementById('comp-file-b-progress-container');
    const progressBarA = document.getElementById('comp-file-a-progress');
    const progressBarB = document.getElementById('comp-file-b-progress');

    const compFileAMd5 = document.getElementById('comp-file-a-md5');
    const compFileBMd5 = document.getElementById('comp-file-b-md5');
    const compFileMatchMd5 = document.getElementById('comp-file-match-md5');

    const compFileASha1 = document.getElementById('comp-file-a-sha1');
    const compFileBSha1 = document.getElementById('comp-file-b-sha1');
    const compFileMatchSha1 = document.getElementById('comp-file-match-sha1');

    const compFileASha256 = document.getElementById('comp-file-a-sha256');
    const compFileBSha256 = document.getElementById('comp-file-b-sha256');
    const compFileMatchSha256 = document.getElementById('comp-file-match-sha256');

    const compFileASha512 = document.getElementById('comp-file-a-sha512');
    const compFileBSha512 = document.getElementById('comp-file-b-sha512');
    const compFileMatchSha512 = document.getElementById('comp-file-match-sha512');

    const fileStatus = document.getElementById('compare-file-status');

    let hashesFileA = null;
    let hashesFileB = null;

    // Trigger select dialogs
    dropZoneCompA.addEventListener('click', () => compFileAInput.click());
    dropZoneCompB.addEventListener('click', () => compFileBInput.click());

    // Drag-over styling
    [dropZoneCompA, dropZoneCompB].forEach(zone => {
        ['dragenter', 'dragover'].forEach(eventName => {
            zone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                zone.classList.add('dragover');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            zone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                zone.classList.remove('dragover');
            }, false);
        });
    });

    dropZoneCompA.addEventListener('drop', (e) => {
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelection(file, 'A');
    });

    dropZoneCompB.addEventListener('drop', (e) => {
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelection(file, 'B');
    });

    compFileAInput.addEventListener('change', () => {
        const file = compFileAInput.files[0];
        if (file) handleFileSelection(file, 'A');
    });

    compFileBInput.addEventListener('change', () => {
        const file = compFileBInput.files[0];
        if (file) handleFileSelection(file, 'B');
    });

    function handleFileSelection(file, target) {
        const nameEl = target === 'A' ? compFileAName : compFileBName;
        const progressCont = target === 'A' ? progressContainerA : progressContainerB;
        const progBar = target === 'A' ? progressBarA : progressBarB;

        nameEl.innerHTML = `<strong>${file.name}</strong><br><span style="font-size:11px; opacity:0.8;">(${formatBytes(file.size)})</span>`;
        progressCont.classList.remove('hidden');
        progBar.style.width = '0%';

        const reader = new FileReader();
        reader.onprogress = (e) => {
            if (e.lengthComputable) {
                const percentage = Math.round((e.loaded / e.total) * 100);
                progBar.style.width = `${percentage}%`;
            }
        };

        reader.onload = async (e) => {
            try {
                const buffer = e.target.result;
                const uint8 = new Uint8Array(buffer);
                
                // Calculate
                const md5Val = md5(uint8);
                const sha1Val = await crypto.subtle.digest('SHA-1', buffer).then(buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join(''));
                const sha256Val = await crypto.subtle.digest('SHA-256', buffer).then(buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join(''));
                const sha512Val = await crypto.subtle.digest('SHA-512', buffer).then(buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join(''));

                const results = { md5: md5Val, sha1: sha1Val, sha256: sha256Val, sha512: sha512Val };

                if (target === 'A') {
                    hashesFileA = results;
                    compFileAMd5.textContent = md5Val;
                    compFileASha1.textContent = sha1Val;
                    compFileASha256.textContent = sha256Val;
                    compFileASha512.textContent = sha512Val;
                } else {
                    hashesFileB = results;
                    compFileBMd5.textContent = md5Val;
                    compFileBSha1.textContent = sha1Val;
                    compFileBSha256.textContent = sha256Val;
                    compFileBSha512.textContent = sha512Val;
                }

                progressCont.classList.add('hidden');
                checkFileComparison();

            } catch (err) {
                console.error(err);
                nameEl.textContent = "Error hashing file!";
            }
        };

        reader.readAsArrayBuffer(file);
    }

    function checkFileComparison() {
        if (!hashesFileA || !hashesFileB) return;

        const matches = {
            md5: hashesFileA.md5 === hashesFileB.md5,
            sha1: hashesFileA.sha1 === hashesFileB.sha1,
            sha256: hashesFileA.sha256 === hashesFileB.sha256,
            sha512: hashesFileA.sha512 === hashesFileB.sha512
        };

        compFileMatchMd5.innerHTML = matches.md5 ? okIcon : failIcon;
        compFileMatchSha1.innerHTML = matches.sha1 ? okIcon : failIcon;
        compFileMatchSha256.innerHTML = matches.sha256 ? okIcon : failIcon;
        compFileMatchSha512.innerHTML = matches.sha512 ? okIcon : failIcon;

        toggleRowHighlight('compare-file-row-md5', matches.md5);
        toggleRowHighlight('compare-file-row-sha1', matches.sha1);
        toggleRowHighlight('compare-file-row-sha256', matches.sha256);
        toggleRowHighlight('compare-file-row-sha512', matches.sha512);

        fileStatus.classList.remove('hidden');
        if (matches.sha256) {
            fileStatus.className = 'compare-status-banner match';
            fileStatus.innerHTML = `<i data-lucide="shield-check"></i> <span>Perfect Match! The files are cryptographically identical (SHA-256 matches).</span>`;
        } else {
            fileStatus.className = 'compare-status-banner mismatch';
            fileStatus.innerHTML = `<i data-lucide="shield-alert"></i> <span>Mismatch! The files have different checksums.</span>`;
        }
        if (window.lucide && window.lucide.createIcons) lucide.createIcons();
    }

    // ==========================================
    // 3. Verify Hash Mode Logic (Pasted Hash vs Input)
    // ==========================================
    const verifySrcTextBtn = document.getElementById('verify-src-mode-text');
    const verifySrcFileBtn = document.getElementById('verify-src-mode-file');
    const verifySrcTextWrapper = document.getElementById('verify-src-text-wrapper');
    const verifySrcFileWrapper = document.getElementById('verify-src-file-wrapper');

    const verifySrcText = document.getElementById('verify-src-text');
    const dropZoneVerifyFile = document.getElementById('drop-zone-verify-file');
    const verifyFileInput = document.getElementById('verify-file-input');
    const verifyFileName = document.getElementById('verify-file-name');
    const verifyFileProgressContainer = document.getElementById('verify-file-progress-container');
    const verifyFileProgress = document.getElementById('verify-file-progress');

    const verifyTargetHash = document.getElementById('verify-target-hash');
    const verifyDetection = document.getElementById('verify-hash-detection');
    const verifyStatusBanner = document.getElementById('verify-status-banner');

    const verifyCalcMd5 = document.getElementById('verify-calc-md5');
    const verifyCalcSha1 = document.getElementById('verify-calc-sha1');
    const verifyCalcSha256 = document.getElementById('verify-calc-sha256');
    const verifyCalcSha512 = document.getElementById('verify-calc-sha512');

    const verifyMatchMd5 = document.getElementById('verify-match-md5');
    const verifyMatchSha1 = document.getElementById('verify-match-sha1');
    const verifyMatchSha256 = document.getElementById('verify-match-sha256');
    const verifyMatchSha512 = document.getElementById('verify-match-sha512');

    let currentSourceHashes = null;
    let verifySourceMode = 'text'; // or 'file'

    // Source Mode Toggle
    verifySrcTextBtn.addEventListener('click', () => {
        verifySourceMode = 'text';
        verifySrcTextBtn.classList.add('active');
        verifySrcFileBtn.classList.remove('active');
        verifySrcTextWrapper.classList.remove('hidden');
        verifySrcFileWrapper.classList.add('hidden');
        calculateVerifySource();
    });

    verifySrcFileBtn.addEventListener('click', () => {
        verifySourceMode = 'file';
        verifySrcFileBtn.classList.add('active');
        verifySrcTextBtn.classList.remove('active');
        verifySrcFileWrapper.classList.remove('hidden');
        verifySrcTextWrapper.classList.add('hidden');
        if (window.lucide && window.lucide.createIcons) lucide.createIcons();
        calculateVerifySource();
    });

    // File Drag-Drop & Input
    dropZoneVerifyFile.addEventListener('click', () => verifyFileInput.click());

    dropZoneVerifyFile.addEventListener('dragenter', (e) => { e.preventDefault(); dropZoneVerifyFile.classList.add('dragover'); });
    dropZoneVerifyFile.addEventListener('dragover', (e) => { e.preventDefault(); dropZoneVerifyFile.classList.add('dragover'); });
    dropZoneVerifyFile.addEventListener('dragleave', () => dropZoneVerifyFile.classList.remove('dragover'));
    dropZoneVerifyFile.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZoneVerifyFile.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file) handleVerifyFileSelection(file);
    });

    verifyFileInput.addEventListener('change', () => {
        const file = verifyFileInput.files[0];
        if (file) handleVerifyFileSelection(file);
    });

    function handleVerifyFileSelection(file) {
        verifyFileName.innerHTML = `<strong>${file.name}</strong><br><span style="font-size:11px; opacity:0.8;">(${formatBytes(file.size)})</span>`;
        verifyFileProgressContainer.classList.remove('hidden');
        verifyFileProgress.style.width = '0%';

        const reader = new FileReader();
        reader.onprogress = (e) => {
            if (e.lengthComputable) {
                const percentage = Math.round((e.loaded / e.total) * 100);
                verifyFileProgress.style.width = `${percentage}%`;
            }
        };

        reader.onload = async (e) => {
            try {
                const buffer = e.target.result;
                const uint8 = new Uint8Array(buffer);

                const md5Val = md5(uint8);
                const sha1Val = await crypto.subtle.digest('SHA-1', buffer).then(buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join(''));
                const sha256Val = await crypto.subtle.digest('SHA-256', buffer).then(buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join(''));
                const sha512Val = await crypto.subtle.digest('SHA-512', buffer).then(buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join(''));

                currentSourceHashes = { md5: md5Val, sha1: sha1Val, sha256: sha256Val, sha512: sha512Val };

                // Display
                verifyCalcMd5.textContent = md5Val;
                verifyCalcSha1.textContent = sha1Val;
                verifyCalcSha256.textContent = sha256Val;
                verifyCalcSha512.textContent = sha512Val;

                verifyFileProgressContainer.classList.add('hidden');
                performVerification();

            } catch (err) {
                console.error(err);
                verifyFileName.textContent = "Error hashing file!";
            }
        };

        reader.readAsArrayBuffer(file);
    }

    async function calculateVerifySource() {
        if (verifySourceMode === 'text') {
            const val = verifySrcText.value;
            if (!val) {
                currentSourceHashes = null;
                const cells = [verifyCalcMd5, verifyCalcSha1, verifyCalcSha256, verifyCalcSha512, verifyMatchMd5, verifyMatchSha1, verifyMatchSha256, verifyMatchSha512];
                cells.forEach(c => { if (c) c.textContent = '-'; });
                verifyStatusBanner.className = 'compare-status-banner hidden';
                verifyStatusBanner.innerHTML = '';
                return;
            }

            const md5Val = md5(val);
            const sha1Val = await generateSubtleHash(val, 'SHA-1');
            const sha256Val = await generateSubtleHash(val, 'SHA-256');
            const sha512Val = await generateSubtleHash(val, 'SHA-512');

            currentSourceHashes = { md5: md5Val, sha1: sha1Val, sha256: sha256Val, sha512: sha512Val };

            verifyCalcMd5.textContent = md5Val;
            verifyCalcSha1.textContent = sha1Val;
            verifyCalcSha256.textContent = sha256Val;
            verifyCalcSha512.textContent = sha512Val;

            performVerification();
        } else {
            // Handled when file is loaded
            if (!currentSourceHashes) {
                const cells = [verifyCalcMd5, verifyCalcSha1, verifyCalcSha256, verifyCalcSha512, verifyMatchMd5, verifyMatchSha1, verifyMatchSha256, verifyMatchSha512];
                cells.forEach(c => { if (c) c.textContent = '-'; });
            }
        }
    }

    verifySrcText.addEventListener('input', calculateVerifySource);
    verifyTargetHash.addEventListener('input', performVerification);

    function performVerification() {
        const target = verifyTargetHash.value.trim().toLowerCase();
        
        if (!target) {
            verifyDetection.innerHTML = 'Detected type: <strong>None</strong>';
            verifyStatusBanner.className = 'compare-status-banner hidden';
            [verifyMatchMd5, verifyMatchSha1, verifyMatchSha256, verifyMatchSha512].forEach(m => m.textContent = '-');
            ['verify-row-md5', 'verify-row-sha1', 'verify-row-sha256', 'verify-row-sha512'].forEach(r => toggleRowHighlight(r, false));
            return;
        }

        // Auto-detect algorithm based on length
        let algo = 'unknown';
        if (target.length === 32 && /^[0-9a-f]+$/i.test(target)) algo = 'MD5';
        else if (target.length === 40 && /^[0-9a-f]+$/i.test(target)) algo = 'SHA-1';
        else if (target.length === 64 && /^[0-9a-f]+$/i.test(target)) algo = 'SHA-256';
        else if (target.length === 128 && /^[0-9a-f]+$/i.test(target)) algo = 'SHA-512';

        verifyDetection.innerHTML = `Detected type: <strong style="color: var(--primary-color); text-shadow: 0 0 5px var(--primary-glow);">${algo.toUpperCase()}</strong>`;

        if (!currentSourceHashes) {
            [verifyMatchMd5, verifyMatchSha1, verifyMatchSha256, verifyMatchSha512].forEach(m => m.textContent = '-');
            return;
        }

        // Perform matches
        const matches = {
            md5: algo === 'MD5' && currentSourceHashes.md5 === target,
            sha1: algo === 'SHA-1' && currentSourceHashes.sha1 === target,
            sha256: algo === 'SHA-256' && currentSourceHashes.sha256 === target,
            sha512: algo === 'SHA-512' && currentSourceHashes.sha512 === target
        };

        verifyMatchMd5.innerHTML = algo === 'MD5' ? (matches.md5 ? okIcon : failIcon) : '-';
        verifyMatchSha1.innerHTML = algo === 'SHA-1' ? (matches.sha1 ? okIcon : failIcon) : '-';
        verifyMatchSha256.innerHTML = algo === 'SHA-256' ? (matches.sha256 ? okIcon : failIcon) : '-';
        verifyMatchSha512.innerHTML = algo === 'SHA-512' ? (matches.sha512 ? okIcon : failIcon) : '-';

        toggleRowHighlight('verify-row-md5', matches.md5);
        toggleRowHighlight('verify-row-sha1', matches.sha1);
        toggleRowHighlight('verify-row-sha256', matches.sha256);
        toggleRowHighlight('verify-row-sha512', matches.sha512);

        // Overall status banner
        const isMatched = matches.md5 || matches.sha1 || matches.sha256 || matches.sha512;
        verifyStatusBanner.classList.remove('hidden');
        if (isMatched) {
            verifyStatusBanner.className = 'compare-status-banner match';
            verifyStatusBanner.innerHTML = `<i data-lucide="shield-check"></i> <span>Verification Succeeded! The source matches the target checksum (${algo}).</span>`;
        } else {
            verifyStatusBanner.className = 'compare-status-banner mismatch';
            if (algo === 'unknown') {
                verifyStatusBanner.className = 'compare-status-banner pending';
                verifyStatusBanner.innerHTML = `<i data-lucide="info"></i> <span>Invalid or unrecognized checksum length (${target.length} chars).</span>`;
            } else {
                verifyStatusBanner.innerHTML = `<i data-lucide="shield-alert"></i> <span>Verification Failed! The source calculated ${algo} does not match the target checksum.</span>`;
            }
        }
        if (window.lucide && window.lucide.createIcons) lucide.createIcons();
    }

    // Helper for size display
    function formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
}


