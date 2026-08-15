// =============================================================================
// MHZ TOOLS — Digital Forensics Suite Engine
// =============================================================================

function initForensicsSuite() {
    setupExifExtractor();
    setupHexCarver();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initForensicsSuite);
} else {
    initForensicsSuite();
}

function attachForensicsDropZone(dzId, inputId, onFileLoaded) {
    const dz = document.getElementById(dzId);
    const inp = document.getElementById(inputId);
    if (!dz || !inp) return;

    dz.onclick = () => inp.click();
    inp.onchange = (e) => {
        if (e.target.files && e.target.files[0]) onFileLoaded(e.target.files[0]);
    };
    dz.ondragover = (e) => { e.preventDefault(); dz.style.borderColor = 'var(--primary-color)'; };
    dz.ondragleave = () => { dz.style.borderColor = 'var(--border-color)'; };
    dz.ondrop = (e) => {
        e.preventDefault();
        dz.style.borderColor = 'var(--border-color)';
        if (e.dataTransfer.files && e.dataTransfer.files[0]) onFileLoaded(e.dataTransfer.files[0]);
    };
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function toHex(num, padding = 2) {
    return num.toString(16).toUpperCase().padStart(padding, '0');
}

function gcd(a, b) {
    return b === 0 ? a : gcd(b, a % b);
}

function formatExifDate(rawDateStr) {
    if (!rawDateStr) return null;
    const s = rawDateStr.trim();
    // Match "YYYY:MM:DD HH:MM:SS" or "YYYY-MM-DDTHH:MM:SS"
    const match = s.match(/^(\d{4})[:\-](\d{2})[:\-](\d{2})[T\s](\d{2}):(\d{2}):(\d{2})/);
    if (match) {
        const d = new Date(match[1], match[2] - 1, match[3], match[4], match[5], match[6]);
        if (!isNaN(d.getTime())) {
            return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) + ' at ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        }
    }
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
        return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) + ' at ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    }
    return s;
}

// =============================================================================
// 1. EXIF & MEDIA METADATA FORENSIC EXTRACTOR
// =============================================================================

function setupExifExtractor() {
    attachForensicsDropZone('dz-forensics-exif', 'forensics-exif-file-input', (file) => {
        const outputDiv = document.getElementById('forensics-exif-output');
        if (!outputDiv) return;
        outputDiv.classList.remove('hidden');

        document.getElementById('exif-file-name').textContent = file.name;
        document.getElementById('exif-file-size').textContent = formatBytes(file.size);
        document.getElementById('exif-file-type').textContent = file.type || 'image/jpeg';

        const reader = new FileReader();
        reader.onload = (e) => {
            const buffer = e.target.result;
            const bytes = new Uint8Array(buffer);
            const metadata = parseFileMetadata(bytes, file);
            renderExifMetadata(metadata, file);
        };
        reader.readAsArrayBuffer(file);
    });
}

function parseFileMetadata(bytes, file) {
    const fileDateStr = new Date(file.lastModified).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) + ' at ' + new Date(file.lastModified).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

    const meta = {
        general: {
            "File Name": file.name,
            "File Size": formatBytes(file.size) + ` (${file.size.toLocaleString()} bytes)`,
            "Last Modified": new Date(file.lastModified).toUTCString() + ' (' + new Date(file.lastModified).toLocaleString() + ')',
            "MIME Type": file.type || "image/jpeg"
        },
        dateTaken: null,
        rawDateStr: null,
        deviceModel: null,
        deviceBrand: null,
        deviceType: null,
        pixelDensity: null,
        dimensions: null,
        imageInfo: {},
        camera: {},
        gps: null,
        software: [],
        rawExif: []
    };

    // Check for JPEG (0xFFD8)
    if (bytes.length > 4 && bytes[0] === 0xFF && bytes[1] === 0xD8) {
        parseJpegFull(bytes, meta);
    } else if (bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
        parsePngMetadata(bytes, meta);
    } else if (bytes.length > 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
        parsePdfMetadata(bytes, meta);
    }

    // Scan entire file buffer for embedded XML / XMP RDF blocks (Common in iPhone / Lightroom / Photoshop)
    if (bytes.length > 32) {
        scanForXmpBlock(bytes, meta);
    }

    // Finalize date taken
    if (meta.rawDateStr) {
        meta.dateTaken = formatExifDate(meta.rawDateStr);
    } else if (meta.camera["DateTimeOriginal"]) {
        meta.dateTaken = formatExifDate(meta.camera["DateTimeOriginal"]);
    } else if (meta.camera["DateTimeDigitized"]) {
        meta.dateTaken = formatExifDate(meta.camera["DateTimeDigitized"]);
    } else if (meta.camera["DateTime"]) {
        meta.dateTaken = formatExifDate(meta.camera["DateTime"]);
    } else {
        meta.dateTaken = `${fileDateStr} (File Timestamp)`;
    }

    // Finalize device model identification
    finalizeDeviceIdentification(file.name, bytes, meta);

    return meta;
}

function parseJpegFull(bytes, meta) {
    let offset = 2;
    const len = bytes.length;
    let dpiVal = null;

    while (offset < len - 4) {
        if (bytes[offset] !== 0xFF) {
            offset++;
            continue;
        }
        const marker = bytes[offset + 1];
        if (marker === 0xDA || marker === 0xD9) break; // SOS or EOI

        // Variable length markers
        const segmentLength = (bytes[offset + 2] << 8) | bytes[offset + 3];
        if (segmentLength < 2 || offset + 2 + segmentLength > len) break;

        const segmentBytes = bytes.slice(offset + 4, offset + 2 + segmentLength);

        // APP0 (0xE0) — JFIF
        if (marker === 0xE0) {
            const jfifSig = String.fromCharCode(...segmentBytes.slice(0, 5));
            if (jfifSig.startsWith('JFIF')) {
                const major = segmentBytes[5];
                const minor = segmentBytes[6];
                const units = segmentBytes[7]; // 1: DPI, 2: DPCM
                const xDens = (segmentBytes[8] << 8) | segmentBytes[9];
                const yDens = (segmentBytes[10] << 8) | segmentBytes[11];
                const unitStr = units === 1 ? 'DPI' : (units === 2 ? 'DPCM' : 'Pixels');
                dpiVal = `${xDens} ${unitStr}`;
                meta.imageInfo['JFIF Version'] = `${major}.${minor < 10 ? '0' + minor : minor}`;
                meta.imageInfo['Resolution Density'] = `${xDens} × ${yDens} ${unitStr}`;
                meta.rawExif.push({ tag: 'APP0_JFIF', name: 'Resolution Density', value: `${xDens} × ${yDens} ${unitStr}` });
            }
        }
        // APP1 (0xE1) — EXIF or XMP
        else if (marker === 0xE1) {
            const headerStr = String.fromCharCode(...segmentBytes.slice(0, 6));
            if (headerStr.startsWith('Exif')) {
                parseTiffHeader(segmentBytes, 6, meta);
            } else {
                parseXmpString(new TextDecoder('utf-8', { fatal: false }).decode(segmentBytes), meta);
            }
        }
        // APP2 (0xE2) — ICC Color Profile
        else if (marker === 0xE2) {
            const iccSig = String.fromCharCode(...segmentBytes.slice(0, 11));
            if (iccSig.startsWith('ICC_PROFILE')) {
                const str = new TextDecoder('latin1').decode(segmentBytes);
                const descMatch = str.match(/desc[\s\S]{4,20}?([A-Za-z0-9\s._\-]{4,40})/);
                if (descMatch && descMatch[1]) {
                    const profName = descMatch[1].replace(/[\x00-\x1F]/g, '').trim();
                    meta.imageInfo['Color Profile'] = profName || 'Display P3 / sRGB';
                    meta.rawExif.push({ tag: 'APP2_ICC', name: 'Color Profile Description', value: profName });
                }
            }
        }
        // APP13 (0xED) — Photoshop / IPTC
        else if (marker === 0xED) {
            meta.software.push("Adobe Photoshop / IPTC Image Resource Block");
            meta.rawExif.push({ tag: 'APP13_IPTC', name: 'Photoshop Resources', value: 'Present' });
        }
        // SOF0 (0xC0), SOF1 (0xC1), SOF2 (0xC2) — Image Dimensions & Pixel Geometry
        else if (marker === 0xC0 || marker === 0xC1 || marker === 0xC2) {
            const precision = segmentBytes[0];
            const height = (segmentBytes[1] << 8) | segmentBytes[2];
            const width = (segmentBytes[3] << 8) | segmentBytes[4];
            const channels = segmentBytes[5];
            const type = (marker === 0xC2) ? 'Progressive JPEG' : 'Baseline DCT JPEG';
            const mp = ((width * height) / 1000000).toFixed(2);

            const div = gcd(width, height);
            const aspectW = Math.round(width / div);
            const aspectH = Math.round(height / div);
            const aspectStr = (aspectW <= 16 && aspectH <= 16) ? `${aspectW}:${aspectH}` : `${(width / height).toFixed(2)}:1`;

            meta.dimensions = { width, height, mp, aspectStr };
            meta.pixelDensity = `${width} × ${height} px (${mp} MP, ${aspectStr})${dpiVal ? ' • ' + dpiVal : ''}`;

            meta.imageInfo['Pixel Resolution'] = `${width} × ${height} pixels (${mp} Megapixels)`;
            meta.imageInfo['Aspect Ratio'] = aspectStr;
            meta.imageInfo['Total Sensor Pixels'] = `${(width * height).toLocaleString()} px`;
            meta.imageInfo['Encoding Type'] = type;
            meta.imageInfo['Color Depth'] = `${precision}-bit per channel (${channels === 3 ? 'RGB / YCbCr 3-Channel' : (channels === 1 ? 'Grayscale' : '4-Channel')})`;

            meta.rawExif.push({ tag: 'SOF_GEO', name: 'Pixel Resolution', value: `${width} × ${height} (${mp} MP)` });
            meta.rawExif.push({ tag: 'SOF_ENC', name: 'Compression Format', value: type });
        }
        // COM (0xFE) — Comment
        else if (marker === 0xFE) {
            const comment = new TextDecoder('latin1').decode(segmentBytes).trim();
            if (comment) {
                meta.rawExif.push({ tag: 'COM', name: 'User Comment', value: comment });
            }
        }

        offset += 2 + segmentLength;
    }
}

function parseTiffHeader(bytes, start, meta) {
    if (start + 8 > bytes.length) return;
    const isLE = bytes[start] === 0x49 && bytes[start + 1] === 0x49; // 'II' vs 'MM'
    const read16 = (off) => isLE ? (bytes[off] | (bytes[off + 1] << 8)) : ((bytes[off] << 8) | bytes[off + 1]);
    const read32 = (off) => isLE ? ((bytes[off]) | (bytes[off + 1] << 8) | (bytes[off + 2] << 16) | (bytes[off + 3] << 24)) >>> 0 :
                                   ((bytes[off] << 24) | (bytes[off + 1] << 16) | (bytes[off + 2] << 8) | bytes[off + 3]) >>> 0;

    const firstIFDOffset = read32(start + 4);
    if (firstIFDOffset < 8 || start + firstIFDOffset >= bytes.length) return;

    parseIFD(bytes, start, start + firstIFDOffset, isLE, read16, read32, meta);
}

function parseIFD(bytes, tiffStart, ifdOffset, isLE, read16, read32, meta) {
    if (ifdOffset >= bytes.length - 2) return;
    const entries = read16(ifdOffset);
    let cur = ifdOffset + 2;

    const tagNames = {
        0x010E: "ImageDescription",
        0x010F: "Make",
        0x0110: "Model",
        0x0112: "Orientation",
        0x011A: "XResolution",
        0x011B: "YResolution",
        0x0131: "Software",
        0x0132: "DateTime",
        0x013B: "Artist",
        0x8298: "Copyright",
        0x8769: "ExifIFDPointer",
        0x8825: "GPSInfoIFDPointer",
        0x829A: "ExposureTime",
        0x829D: "FNumber",
        0x8827: "ISOSpeedRatings",
        0x9000: "ExifVersion",
        0x9003: "DateTimeOriginal",
        0x9004: "DateTimeDigitized",
        0x9201: "ShutterSpeedValue",
        0x9202: "ApertureValue",
        0x9204: "ExposureBiasValue",
        0x9207: "MeteringMode",
        0x9208: "LightSource",
        0x9209: "Flash",
        0x920A: "FocalLength",
        0x9286: "UserComment",
        0xA001: "ColorSpace",
        0xA002: "ExifImageWidth",
        0xA003: "ExifImageHeight",
        0xA405: "FocalLengthIn35mmFilm",
        0xA431: "BodySerialNumber",
        0xA432: "LensSpecification",
        0xA433: "LensMake",
        0xA434: "LensModel"
    };

    let exifSubIFD = 0;
    let gpsSubIFD = 0;

    for (let i = 0; i < entries; i++) {
        if (cur + 12 > bytes.length) break;
        const tag = read16(cur);
        const type = read16(cur + 2);
        const count = read32(cur + 4);
        const valOffset = read32(cur + 8);

        const tagName = tagNames[tag] || `Tag_0x${toHex(tag, 4)}`;

        if (tag === 0x8769) exifSubIFD = valOffset;
        if (tag === 0x8825) gpsSubIFD = valOffset;

        let valStr = "";
        if (type === 2) { // ASCII String
            const strStart = count <= 4 ? (cur + 8) : (tiffStart + valOffset);
            if (strStart < bytes.length) {
                valStr = String.fromCharCode(...bytes.slice(strStart, strStart + Math.min(count, 120))).replace(/\0+$/, '').trim();
            }
        } else if (type === 3) { // SHORT
            const shortVal = isLE ? (bytes[cur + 8] | (bytes[cur + 9] << 8)) : ((bytes[cur + 8] << 8) | bytes[cur + 9]);
            valStr = shortVal.toString();
        } else if (type === 4) { // LONG
            valStr = valOffset.toString();
        } else if (type === 5 || type === 10) { // RATIONAL
            const off = tiffStart + valOffset;
            if (off + 8 <= bytes.length) {
                const num = read32(off);
                const den = read32(off + 4);
                if (den === 1) {
                    valStr = num.toString();
                } else if (den > 0) {
                    if (tag === 0x829A && num === 1) {
                        valStr = `1/${den} sec`;
                    } else if (tag === 0x829D) {
                        valStr = `f/${(num / den).toFixed(1)}`;
                    } else if (tag === 0x920A) {
                        valStr = `${(num / den).toFixed(1)} mm`;
                    } else {
                        valStr = (num / den).toFixed(2);
                    }
                }
            }
        }

        if (valStr) {
            if (["Make", "Model", "LensModel", "DateTimeOriginal", "DateTimeDigitized", "ExposureTime", "FNumber", "ISOSpeedRatings", "FocalLength"].includes(tagName)) {
                meta.camera[tagName] = valStr;
            }
            if (tagName === "DateTimeOriginal" || tagName === "DateTimeDigitized") {
                meta.rawDateStr = valStr;
            }
            if (tagName === "Make" || tagName === "Model") {
                const make = meta.camera["Make"] || "";
                const model = meta.camera["Model"] || "";
                if (make) meta.deviceBrand = make;
                meta.deviceModel = model.includes(make) ? model : `${make} ${model}`.trim();
            }
            if (tagName === "Software" || tagName === "Artist" || tagName === "Copyright") {
                meta.software.push(`${tagName}: ${valStr}`);
            }
            meta.rawExif.push({ tag: `0x${toHex(tag, 4)}`, name: tagName, value: valStr });
        }
        cur += 12;
    }

    if (exifSubIFD > 0 && tiffStart + exifSubIFD < bytes.length) {
        parseIFD(bytes, tiffStart, tiffStart + exifSubIFD, isLE, read16, read32, meta);
    }
    if (gpsSubIFD > 0 && tiffStart + gpsSubIFD < bytes.length) {
        parseGPSIFD(bytes, tiffStart, tiffStart + gpsSubIFD, isLE, read16, read32, meta);
    }
}

function parseGPSIFD(bytes, tiffStart, gpsOffset, isLE, read16, read32, meta) {
    if (gpsOffset >= bytes.length - 2) return;
    const entries = read16(gpsOffset);
    let cur = gpsOffset + 2;

    let latRef = 'N', lonRef = 'E';
    let lat = null, lon = null;
    let alt = null;

    const readRational = (off) => {
        const num = read32(off);
        const den = read32(off + 4);
        return den === 0 ? 0 : (num / den);
    };

    for (let i = 0; i < entries; i++) {
        if (cur + 12 > bytes.length) break;
        const tag = read16(cur);
        const valOffset = read32(cur + 8);

        if (tag === 1) latRef = String.fromCharCode(bytes[cur + 8]);
        if (tag === 3) lonRef = String.fromCharCode(bytes[cur + 8]);
        if (tag === 2) {
            const off = tiffStart + valOffset;
            if (off + 24 <= bytes.length) {
                const deg = readRational(off);
                const min = readRational(off + 8);
                const sec = readRational(off + 16);
                lat = deg + (min / 60) + (sec / 3600);
            }
        }
        if (tag === 4) {
            const off = tiffStart + valOffset;
            if (off + 24 <= bytes.length) {
                const deg = readRational(off);
                const min = readRational(off + 8);
                const sec = readRational(off + 16);
                lon = deg + (min / 60) + (sec / 3600);
            }
        }
        if (tag === 6) {
            const off = tiffStart + valOffset;
            if (off + 8 <= bytes.length) {
                alt = readRational(off);
            }
        }
        cur += 12;
    }

    if (lat !== null && lon !== null && !isNaN(lat) && !isNaN(lon)) {
        if (latRef === 'S') lat = -lat;
        if (lonRef === 'W') lon = -lon;
        meta.gps = {
            latitude: lat.toFixed(6),
            longitude: lon.toFixed(6),
            latRef: latRef,
            lonRef: lonRef,
            altitude: alt ? `${alt.toFixed(1)} meters` : null
        };
        meta.rawExif.push({ tag: 'GPS_LAT', name: 'GPS Latitude', value: `${lat.toFixed(6)} (${latRef})` });
        meta.rawExif.push({ tag: 'GPS_LON', name: 'GPS Longitude', value: `${lon.toFixed(6)} (${lonRef})` });
    }
}

function scanForXmpBlock(bytes, meta) {
    const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, Math.min(bytes.length, 1048576)));
    if (text.includes('<x:xmpmeta') || text.includes('<rdf:RDF') || text.includes('http://ns.adobe.com')) {
        parseXmpString(text, meta);
    }
}

function parseXmpString(xmlStr, meta) {
    const extractXmlValue = (pattern) => {
        const match = xmlStr.match(pattern);
        return match ? match[1].replace(/<[^>]+>/g, '').trim() : null;
    };

    const make = extractXmlValue(/<tiff:Make>([^<]+)<\/tiff:Make>/i) || extractXmlValue(/tiff:Make="([^"]+)"/i);
    const model = extractXmlValue(/<tiff:Model>([^<]+)<\/tiff:Model>/i) || extractXmlValue(/tiff:Model="([^"]+)"/i);
    const lens = extractXmlValue(/<exif:LensModel>([^<]+)<\/exif:LensModel>/i) || extractXmlValue(/exif:LensModel="([^"]+)"/i);
    const dateOrig = extractXmlValue(/<exif:DateTimeOriginal>([^<]+)<\/exif:DateTimeOriginal>/i) || extractXmlValue(/<xmp:CreateDate>([^<]+)<\/xmp:CreateDate>/i) || extractXmlValue(/<photoshop:DateCreated>([^<]+)<\/photoshop:DateCreated>/i);
    const creatorTool = extractXmlValue(/<xmp:CreatorTool>([^<]+)<\/xmp:CreatorTool>/i) || extractXmlValue(/xmp:CreatorTool="([^"]+)"/i);
    const software = extractXmlValue(/<tiff:Software>([^<]+)<\/tiff:Software>/i);

    if (dateOrig) {
        meta.rawDateStr = dateOrig;
        meta.camera['DateTimeOriginal'] = dateOrig;
        meta.rawExif.push({ tag: 'XMP_DATE', name: 'Original Capture Timestamp', value: dateOrig });
    }
    if (make) { meta.camera['Make'] = make; meta.deviceBrand = make; meta.rawExif.push({ tag: 'XMP_MAKE', name: 'Camera Make', value: make }); }
    if (model) { meta.camera['Model'] = model; meta.rawExif.push({ tag: 'XMP_MODEL', name: 'Camera Model', value: model }); }
    if (make || model) {
        const m = make || "";
        const mod = model || "";
        meta.deviceModel = mod.includes(m) ? mod : `${m} ${mod}`.trim();
    }
    if (lens) { meta.camera['LensModel'] = lens; meta.rawExif.push({ tag: 'XMP_LENS', name: 'Lens Profile', value: lens }); }
    if (creatorTool) { meta.software.push(`Creator Tool: ${creatorTool}`); meta.rawExif.push({ tag: 'XMP_TOOL', name: 'Creator Software Tool', value: creatorTool }); }
    if (software) { meta.software.push(`Software: ${software}`); meta.rawExif.push({ tag: 'XMP_SOFT', name: 'Software', value: software }); }

    // XMP GPS parsing
    const gpsLatStr = extractXmlValue(/<exif:GPSLatitude>([^<]+)<\/exif:GPSLatitude>/i) || extractXmlValue(/exif:GPSLatitude="([^"]+)"/i);
    const gpsLonStr = extractXmlValue(/<exif:GPSLongitude>([^<]+)<\/exif:GPSLongitude>/i) || extractXmlValue(/exif:GPSLongitude="([^"]+)"/i);

    if (gpsLatStr && gpsLonStr && !meta.gps) {
        const parseXmpCoord = (coordStr) => {
            const parts = coordStr.replace(/[^\d.,NWSE]/gi, ' ').trim().split(/\s+/);
            if (parts.length >= 3) {
                const deg = parseFloat(parts[0]) || 0;
                const min = parseFloat(parts[1]) || 0;
                const sec = parseFloat(parts[2]) || 0;
                return deg + (min / 60) + (sec / 3600);
            }
            return parseFloat(coordStr) || 0;
        };

        const latVal = parseXmpCoord(gpsLatStr);
        const lonVal = parseXmpCoord(gpsLonStr);
        const latRef = gpsLatStr.includes('S') ? 'S' : 'N';
        const lonRef = gpsLonStr.includes('W') ? 'W' : 'E';

        if (latVal !== 0 && lonVal !== 0) {
            meta.gps = {
                latitude: (latRef === 'S' ? -latVal : latVal).toFixed(6),
                longitude: (lonRef === 'W' ? -lonVal : lonVal).toFixed(6),
                latRef: latRef,
                lonRef: lonRef,
                altitude: null
            };
            meta.rawExif.push({ tag: 'XMP_GPS', name: 'XMP GPS Coordinates', value: `${latVal.toFixed(6)}, ${lonVal.toFixed(6)}` });
        }
    }
}

function finalizeDeviceIdentification(filename, bytes, meta) {
    const fn = (filename || '').toLowerCase();
    const strHeader = new TextDecoder('latin1').decode(bytes.slice(0, Math.min(bytes.length, 16384)));

    // Case 1: Apple iPhone & iOS Devices
    if (meta.deviceModel && meta.deviceModel.toLowerCase().includes('iphone')) {
        meta.deviceBrand = "Apple";
        meta.deviceType = "Smartphone (Apple iPhone)";
        meta.camera['Device Category'] = "Apple iPhone Mobile Camera";
        return;
    }

    if (fn.startsWith('fullsizerender') || strHeader.includes('Apple') || strHeader.includes('iPhone') || strHeader.includes('Display P3') || (meta.imageInfo['Color Profile'] && meta.imageInfo['Color Profile'].includes('Display P3'))) {
        meta.deviceBrand = "Apple";
        meta.deviceType = "Smartphone (Apple iPhone)";
        meta.deviceModel = "📱 Apple iPhone (iOS Camera / Photos Render)";
        meta.camera['Make'] = "Apple Inc.";
        meta.camera['Device Family'] = "Apple iPhone iOS Device";
        meta.camera['Color Profile Engine'] = "Apple Wide Color Display P3";
        return;
    }

    // Case 2: Google Pixel
    if (fn.startsWith('pxl_') || strHeader.includes('Google') || strHeader.includes('Pixel')) {
        meta.deviceBrand = "Google";
        meta.deviceType = "Smartphone (Google Pixel)";
        meta.deviceModel = meta.deviceModel || "📱 Google Pixel (Android HDR+ Camera)";
        meta.camera['Make'] = "Google";
        meta.camera['Device Family'] = "Google Pixel Android Device";
        return;
    }

    // Case 3: Samsung Galaxy
    if (fn.startsWith('sam_') || fn.includes('samsung') || strHeader.includes('samsung') || strHeader.includes('SEC_')) {
        meta.deviceBrand = "Samsung";
        meta.deviceType = "Smartphone (Samsung Galaxy)";
        meta.deviceModel = meta.deviceModel || "📱 Samsung Galaxy (Android Camera)";
        meta.camera['Make'] = "Samsung Electronics";
        meta.camera['Device Family'] = "Samsung Galaxy Android Device";
        return;
    }

    // Case 4: Xiaomi / POCO / Redmi
    if (fn.startsWith('img_20') && strHeader.includes('Xiaomi') || strHeader.includes('Redmi')) {
        meta.deviceBrand = "Xiaomi";
        meta.deviceType = "Smartphone (Xiaomi / Redmi)";
        meta.deviceModel = meta.deviceModel || "📱 Xiaomi / Redmi Camera";
        meta.camera['Make'] = "Xiaomi";
        return;
    }

    // Case 5: DJI Drone
    if (fn.startsWith('dji_') || strHeader.includes('DJI')) {
        meta.deviceBrand = "DJI";
        meta.deviceType = "Aerial Drone Camera";
        meta.deviceModel = meta.deviceModel || "🚁 DJI Drone Aerial Camera";
        meta.camera['Make'] = "DJI Technology";
        return;
    }

    // Case 6: DSLR / Mirrorless
    if (fn.startsWith('dsc_') || fn.startsWith('_dsc') || strHeader.includes('NIKON') || strHeader.includes('SONY') || strHeader.includes('Canon')) {
        meta.deviceBrand = "Digital SLR";
        meta.deviceType = "DSLR / Mirrorless Camera";
        meta.deviceModel = meta.deviceModel || "📷 Digital SLR / Mirrorless Camera";
        meta.camera['Device Category'] = "Professional Digital Camera";
        return;
    }

    // Default Fallback
    if (meta.dimensions) {
        meta.deviceModel = meta.deviceModel || `📷 Digital Camera (${meta.dimensions.mp} MP Sensor)`;
        meta.deviceType = "Digital Camera Device";
    } else {
        meta.deviceModel = "Generic Digital Image Capture Device";
        meta.deviceType = "Digital Media";
    }
}

function parsePngMetadata(bytes, meta) {
    let offset = 8;
    const len = bytes.length;

    if (len > 24) {
        const width = (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19];
        const height = (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23];
        const bitDepth = bytes[24];
        const colorType = bytes[25];
        const colorNames = { 0: 'Grayscale', 2: 'RGB', 3: 'Indexed/Palette', 4: 'Grayscale + Alpha', 6: 'RGBA Truecolor' };

        const div = gcd(width, height);
        const aspectW = Math.round(width / div);
        const aspectH = Math.round(height / div);
        const aspectStr = (aspectW <= 16 && aspectH <= 16) ? `${aspectW}:${aspectH}` : `${(width / height).toFixed(2)}:1`;

        meta.dimensions = { width, height, mp: ((width * height) / 1000000).toFixed(2), aspectStr };
        meta.pixelDensity = `${width} × ${height} px (${meta.dimensions.mp} MP, ${aspectStr})`;

        meta.imageInfo['Pixel Resolution'] = `${width} × ${height} pixels (${meta.dimensions.mp} MP)`;
        meta.imageInfo['Aspect Ratio'] = aspectStr;
        meta.imageInfo['Total Sensor Pixels'] = `${(width * height).toLocaleString()} px`;
        meta.imageInfo['Color Format'] = `${colorNames[colorType] || 'Color'} (${bitDepth}-bit)`;
        meta.rawExif.push({ tag: 'PNG_IHDR', name: 'Resolution', value: `${width} × ${height} (${meta.dimensions.mp} MP)` });
    }

    while (offset < len - 12) {
        const chunkLen = (bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3];
        const chunkType = String.fromCharCode(...bytes.slice(offset + 4, offset + 8));
        if (chunkType === 'tEXt' || chunkType === 'zTXt' || chunkType === 'iTXt') {
            const strData = new TextDecoder('latin1').decode(bytes.slice(offset + 8, offset + 8 + Math.min(chunkLen, 2048)));
            const parts = strData.split('\0');
            if (parts.length >= 2) {
                meta.rawExif.push({ tag: 'PNG_' + chunkType, name: parts[0], value: parts[1] });
                if (parts[0].toLowerCase().includes('software') || parts[0].toLowerCase().includes('tool') || parts[0].toLowerCase().includes('creator')) {
                    meta.software.push(`${parts[0]}: ${parts[1]}`);
                }
                if (parts[0].toLowerCase().includes('date') || parts[0].toLowerCase().includes('time') || parts[0].toLowerCase().includes('creation')) {
                    meta.rawDateStr = parts[1];
                }
            }
        }
        offset += 12 + chunkLen;
        if (chunkType === 'IEND') break;
    }
}

function parsePdfMetadata(bytes, meta) {
    const text = new TextDecoder('latin1').decode(bytes.slice(0, Math.min(bytes.length, 131072)));
    const extractField = (name) => {
        const match = text.match(new RegExp(`/${name}\\s*\\(([^)]+)\\)`));
        return match ? match[1] : null;
    };

    ['Title', 'Author', 'Creator', 'Producer', 'CreationDate', 'ModDate'].forEach(f => {
        const val = extractField(f);
        if (val) {
            meta.rawExif.push({ tag: 'PDF_' + f.toUpperCase(), name: f, value: val });
            if (f === 'Creator' || f === 'Producer') meta.software.push(`${f}: ${val}`);
            if (f === 'CreationDate' || f === 'ModDate') meta.rawDateStr = val;
        }
    });
}

function renderExifMetadata(meta, file) {
    const cameraDiv = document.getElementById('exif-camera-details');
    const gpsDiv = document.getElementById('exif-gps-details');
    const softwareDiv = document.getElementById('exif-software-details');
    const rawTbody = document.getElementById('exif-raw-table-body');
    const deviceModelEl = document.getElementById('exif-device-model');
    const pixelDensityEl = document.getElementById('exif-pixel-density');
    const dateTakenEl = document.getElementById('exif-date-taken');
    const heroCardDiv = document.getElementById('exif-device-hero-card');

    // Update Top Overview Badges
    if (deviceModelEl) {
        deviceModelEl.textContent = meta.deviceModel || 'Camera Device Not Stated';
    }
    if (pixelDensityEl) {
        pixelDensityEl.textContent = meta.pixelDensity || (meta.dimensions ? `${meta.dimensions.width} × ${meta.dimensions.height} px (${meta.dimensions.mp} MP)` : 'N/A');
    }
    if (dateTakenEl) {
        dateTakenEl.textContent = meta.dateTaken || 'Date Not Found';
    }

    // Render Hero Banner for Device / Phone Type
    if (heroCardDiv) {
        const isPhone = (meta.deviceType && meta.deviceType.toLowerCase().includes('phone')) || (meta.deviceModel && (meta.deviceModel.includes('iPhone') || meta.deviceModel.includes('Pixel') || meta.deviceModel.includes('Galaxy')));
        const iconName = isPhone ? 'smartphone' : 'camera';
        const brandBadge = meta.deviceBrand ? `<span style="background:rgba(16,185,129,0.2); color:#34d399; font-size:11px; font-weight:700; padding:2px 8px; border-radius:12px; text-transform:uppercase;">${meta.deviceBrand}</span>` : '';

        heroCardDiv.innerHTML = `
            <div style="background:linear-gradient(135deg, rgba(16,185,129,0.12), rgba(6,78,59,0.2)); border:1px solid rgba(16,185,129,0.35); border-radius:8px; padding:16px 20px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:15px;">
                <div style="display:flex; align-items:center; gap:14px;">
                    <div style="background:rgba(16,185,129,0.2); border:1px solid rgba(16,185,129,0.4); border-radius:8px; width:46px; height:46px; display:flex; align-items:center; justify-content:center; color:#10b981; font-size:24px;">
                        <i data-lucide="${iconName}"></i>
                    </div>
                    <div>
                        <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                            <span style="font-size:11px; color:var(--text-muted); text-transform:uppercase; font-weight:600; letter-spacing:0.5px;">Identified Shooting Device / Phone Model</span>
                            ${brandBadge}
                        </div>
                        <h3 style="margin:0; font-size:17px; font-weight:700; color:var(--text-main); font-family:var(--font-sans);">${meta.deviceModel}</h3>
                    </div>
                </div>
                <div style="display:flex; gap:12px; flex-wrap:wrap;">
                    <div style="background:var(--bg-surface); border:1px solid var(--border-color); padding:6px 12px; border-radius:6px; text-align:right;">
                        <span style="font-size:10px; color:var(--text-muted); text-transform:uppercase; display:block;">Date &amp; Time Taken</span>
                        <strong style="font-size:12px; color:#34d399; font-family:var(--font-mono);">${meta.dateTaken}</strong>
                    </div>
                    <div style="background:var(--bg-surface); border:1px solid var(--border-color); padding:6px 12px; border-radius:6px; text-align:right;">
                        <span style="font-size:10px; color:var(--text-muted); text-transform:uppercase; display:block;">Sensor Resolution</span>
                        <strong style="font-size:12px; color:var(--primary-color); font-family:var(--font-mono);">${meta.dimensions ? `${meta.dimensions.width} × ${meta.dimensions.height} px` : 'Auto'}</strong>
                    </div>
                </div>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
    }

    // Camera & Hardware Profile Grid
    const cameraEntries = Object.entries(meta.camera);
    const imageInfoEntries = Object.entries(meta.imageInfo);

    if (cameraEntries.length > 0 || imageInfoEntries.length > 0) {
        const allSpecs = [
            ['Shooting Phone / Camera Device', meta.deviceModel || 'Digital Device'],
            ['Photo Capture Date & Time', meta.dateTaken || 'N/A'],
            ...imageInfoEntries,
            ...cameraEntries
        ];
        cameraDiv.innerHTML = allSpecs.map(([k, v]) => `
            <div style="background:var(--bg-surface); padding:10px 14px; border-radius:4px; border:1px solid var(--border-color); font-size:12px;">
                <span style="color:var(--text-muted); display:block; font-size:10px; text-transform:uppercase; margin-bottom:2px;">${k}</span>
                <strong style="color:var(--text-main); font-family:var(--font-mono); font-size:13px;">${v}</strong>
            </div>
        `).join('');
    } else {
        cameraDiv.innerHTML = `
            <div style="grid-column: 1 / -1; background:var(--bg-surface); border:1px solid var(--border-color); border-radius:4px; padding:12px; font-size:12px; color:var(--text-muted);">
                ℹ️ <strong>Sanitized / Web Rendered Image:</strong> Direct camera hardware tags were stripped or sanitized. Pixel geometry and format parameters extracted above.
            </div>
        `;
    }

    // GPS Details & Interactive Map Link
    if (meta.gps) {
        gpsDiv.innerHTML = `
            <div style="background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.3); border-radius:6px; padding:15px;">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
                    <div>
                        <strong style="color:#10b981; font-size:14px; display:block; margin-bottom:4px;">📍 GPS Pinpoint Location Coordinates Extracted</strong>
                        <span style="font-family:var(--font-mono); font-size:13px; color:var(--text-main); display:block;">
                            Latitude: <strong>${meta.gps.latitude}° ${meta.gps.latRef}</strong> | Longitude: <strong>${meta.gps.longitude}° ${meta.gps.lonRef}</strong>
                            ${meta.gps.altitude ? ` | Altitude: <strong>${meta.gps.altitude}</strong>` : ''}
                        </span>
                    </div>
                    <div style="display:flex; gap:8px; flex-wrap:wrap;">
                        <a href="https://www.google.com/maps?q=${meta.gps.latitude},${meta.gps.longitude}" target="_blank" class="btn btn-primary btn-sm" style="text-decoration:none; display:inline-flex; align-items:center; gap:6px; background:#10b981;">
                            <i data-lucide="map-pin"></i> View on Google Maps
                        </a>
                        <a href="https://www.openstreetmap.org/?mlat=${meta.gps.latitude}&mlon=${meta.gps.longitude}#map=16/${meta.gps.latitude}/${meta.gps.longitude}" target="_blank" class="btn btn-secondary btn-sm" style="text-decoration:none; display:inline-flex; align-items:center; gap:6px;">
                            <i data-lucide="compass"></i> OpenStreetMap
                        </a>
                    </div>
                </div>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
    } else {
        gpsDiv.innerHTML = '<div style="background:var(--bg-base); border:1px solid var(--border-color); border-radius:4px; padding:8px 12px; font-size:12px; color:var(--text-muted);">No embedded GPS geolocation tags found in this file header.</div>';
    }

    // Software / Editing Traces
    if (meta.software.length > 0) {
        softwareDiv.innerHTML = meta.software.map(s => `
            <div style="background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.3); border-radius:4px; padding:8px 12px; font-size:12px; color:#f87171;">
                <strong>Software Signature:</strong> ${s}
            </div>
        `).join('');
    } else {
        softwareDiv.innerHTML = '<p class="dim" style="font-size:12px; margin:0;">No digital editing tool or manipulation signatures detected.</p>';
    }

    // Raw Metadata Table
    if (meta.rawExif.length > 0) {
        rawTbody.innerHTML = meta.rawExif.map(r => `
            <tr>
                <td style="font-family:var(--font-mono); font-size:11px; color:var(--primary-color);">${r.tag}</td>
                <td style="font-weight:600; color:var(--text-main); font-size:12px;">${r.name}</td>
                <td style="font-family:var(--font-mono); font-size:12px; color:var(--text-main); word-break:break-all;">${r.value}</td>
            </tr>
        `).join('');
    } else {
        rawTbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:var(--text-muted); padding:15px;">No raw metadata records parsed.</td></tr>';
    }
}

// =============================================================================
// 2. INTERACTIVE FORENSIC HEX VIEWER & DATA INSPECTOR
// =============================================================================

let activeHexFileBytes = null;
let currentHexPage = 0;
const HEX_PAGE_SIZE = 1024; // 1 KB per page (64 lines of 16 bytes)

function setupHexCarver() {
    attachForensicsDropZone('dz-forensics-hex', 'forensics-hex-file-input', (file) => {
        const outputDiv = document.getElementById('forensics-hex-output');
        if (!outputDiv) return;
        outputDiv.classList.remove('hidden');

        document.getElementById('hex-file-title').textContent = `${file.name} (${formatBytes(file.size)})`;

        const reader = new FileReader();
        reader.onload = (e) => {
            activeHexFileBytes = new Uint8Array(e.target.result);
            currentHexPage = 0;
            renderHexView();
        };
        reader.readAsArrayBuffer(file);
    });

    const searchInput = document.getElementById('hex-search-input');
    if (searchInput) {
        searchInput.oninput = () => {
            renderHexView(searchInput.value.trim());
        };
    }
}

function renderHexView(filter = "") {
    if (!activeHexFileBytes) return;

    const container = document.getElementById('hex-dump-container');
    const pageLabel = document.getElementById('hex-page-label');
    if (!container) return;

    const totalBytes = activeHexFileBytes.length;
    const totalPages = Math.ceil(totalBytes / HEX_PAGE_SIZE) || 1;

    if (pageLabel) pageLabel.textContent = `Page ${currentHexPage + 1} of ${totalPages} (${totalBytes.toLocaleString()} bytes)`;

    const start = currentHexPage * HEX_PAGE_SIZE;
    const end = Math.min(start + HEX_PAGE_SIZE, totalBytes);

    let html = '';

    for (let i = start; i < end; i += 16) {
        const offsetStr = toHex(i, 8);
        const chunk = activeHexFileBytes.slice(i, Math.min(i + 16, totalBytes));

        let hexPart = '';
        let asciiPart = '';

        for (let j = 0; j < 16; j++) {
            if (j < chunk.length) {
                const b = chunk[j];
                const hexByte = toHex(b, 2);

                let isMatch = false;
                if (filter && (hexByte.toLowerCase().includes(filter.toLowerCase()) || String.fromCharCode(b).toLowerCase().includes(filter.toLowerCase()))) {
                    isMatch = true;
                }

                const style = isMatch ? 'background:rgba(234,179,8,0.3); color:#facc15;' : (b === 0 ? 'color:#52525b;' : 'color:var(--text-main);');
                hexPart += `<span style="${style}">${hexByte}</span> `;
                asciiPart += (b >= 32 && b <= 126) ? `<span style="${isMatch ? 'background:#facc15;color:#000;' : ''}">${escapeHtml(String.fromCharCode(b))}</span>` : '<span style="color:#52525b;">.</span>';
            } else {
                hexPart += '   ';
                asciiPart += ' ';
            }
            if (j === 7) hexPart += ' '; // Mid-line gutter
        }

        html += `<div style="display:flex; line-height:1.6; font-family:var(--font-mono); font-size:12px;">` +
            `<span style="color:var(--primary-color); width:85px; user-select:none;">${offsetStr}</span>` +
            `<span style="width:360px; margin-right:15px;">${hexPart}</span>` +
            `<span style="color:var(--text-muted);">${asciiPart}</span>` +
        `</div>`;
    }

    container.innerHTML = html || '<p class="dim" style="padding:15px;">No bytes to display.</p>';
}

function nextHexPage() {
    if (!activeHexFileBytes) return;
    const totalPages = Math.ceil(activeHexFileBytes.length / HEX_PAGE_SIZE);
    if (currentHexPage < totalPages - 1) {
        currentHexPage++;
        renderHexView();
    }
}

function prevHexPage() {
    if (!activeHexFileBytes) return;
    if (currentHexPage > 0) {
        currentHexPage--;
        renderHexView();
    }
}

function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// Global functions for inline UI clicks
window.nextHexPage = nextHexPage;
window.prevHexPage = prevHexPage;
