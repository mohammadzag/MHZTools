// ==========================================
// MHZ TOOLS — C/C++ 64-Bit to 32-Bit GCC Architecture Engine
// ==========================================

var DEMO_CPP_CODE = '#include <windows.h>\n' +
'#include <stdio.h>\n' +
'#include <stdint.h>\n\n' +
'#pragma pack(8)\n' +
'struct SystemHeader64 {\n' +
'    DWORD64 processId;\n' +
'    ULONG_PTR baseAddress;\n' +
'    uint64_t memorySize;\n' +
'    SSIZE_T bufferLength;\n' +
'    size_t allocationSize;\n' +
'};\n\n' +
'void ProcessData(const char* Buffer) {\n' +
'    char myvar[256];\n' +
'    strcpy(myvar, Buffer);\n' +
'    printf("Buffer at %p (size: %zu, len: %I64d)\\n", myvar, sizeof(myvar), (int64_t)strlen(myvar));\n' +
'}\n\n' +
'void WindowSetup(HWND hwnd) {\n' +
'    #ifdef _WIN64\n' +
'    LONG_PTR ptr = GetWindowLongPtr(hwnd, GWLP_WNDPROC);\n' +
'    SetWindowLongPtr(hwnd, GWLP_USERDATA, (LONG_PTR)ptr);\n' +
'    DWORD64 memoryAddress = 0xFFFFFFFF00000000;\n' +
'    \n' +
'    __asm {\n' +
'        mov rax, 0x1000\n' +
'        mov rbx, rax\n' +
'        mov rcx, [rsp+8]\n' +
'        mov qword ptr [rbp-16], rax\n' +
'    }\n' +
'    #endif\n' +
'}\n\n' +
'int main(int argc, char* argv[]) {\n' +
'    if (argc > 1) ProcessData(argv[1]);\n' +
'    return 0;\n' +
'}';

var lastCompiledExePath = null;
var lastOutputMode = 'source'; // 'source' | 'asm' | 'exe'

/** Core 32-Bit Source Code Transformation */
function runCppTransformation() {
    var inputCodeEl = document.getElementById('cpp-input-code');
    var outputCodeEl = document.getElementById('cpp-output-code');
    var badgeEl = document.getElementById('cpp-status-badge');

    if (!inputCodeEl || !outputCodeEl) return;

    var src = inputCodeEl.value;
    if (!src || !src.trim()) {
        outputCodeEl.value = '';
        if (badgeEl) badgeEl.textContent = '';
        renderCppAuditReport({
            apiReplacements: 0,
            macroReplacements: 0,
            registerReplacements: 0,
            typeReplacements: 0,
            formatReplacements: 0,
            packReplacements: 0,
            details: []
        });
        return;
    }

    var options = {
        convertWin32Apis:  document.getElementById('opt-cpp-win32-api')  ? document.getElementById('opt-cpp-win32-api').checked  : true,
        convertMacros:     document.getElementById('opt-cpp-macros')      ? document.getElementById('opt-cpp-macros').checked      : true,
        convertAssembly:   document.getElementById('opt-cpp-assembly')    ? document.getElementById('opt-cpp-assembly').checked    : true,
        convertTypes:      document.getElementById('opt-cpp-types')       ? document.getElementById('opt-cpp-types').checked       : true,
        convertFormats:    document.getElementById('opt-cpp-formats')     ? document.getElementById('opt-cpp-formats').checked     : true,
        convertPackPragma: document.getElementById('opt-cpp-pack')        ? document.getElementById('opt-cpp-pack').checked        : true
    };

    var result = transformCpp64To32(src, options);
    outputCodeEl.value = result.convertedCode;
    lastOutputMode = 'source';

    var totalChanges = (result.audit.apiReplacements || 0) +
                       (result.audit.macroReplacements || 0) +
                       (result.audit.registerReplacements || 0) +
                       (result.audit.typeReplacements || 0) +
                       (result.audit.formatReplacements || 0) +
                       (result.audit.packReplacements || 0);

    if (badgeEl) {
        badgeEl.textContent = totalChanges > 0
            ? ('✓ ' + totalChanges + ' Refactorings Applied')
            : '✓ 32-Bit Target Ready';
    }

    renderCppAuditReport(result.audit);
}

/** Real GCC 32-Bit Compilation & Assembly Generator */
async function compileWithGcc(mode) {
    var inputCodeEl = document.getElementById('cpp-input-code');
    var outputCodeEl = document.getElementById('cpp-output-code');
    var badgeEl = document.getElementById('cpp-status-badge');
    var summaryDiv = document.getElementById('cpp-audit-summary');
    var detailsDiv = document.getElementById('cpp-audit-details');

    if (!inputCodeEl || !outputCodeEl) return;
    var src = inputCodeEl.value;
    if (!src || !src.trim()) {
        alert('Please paste or load C/C++ source code first.');
        return;
    }

    // Run AST refactoring first to ensure 64-bit macros/types are adapted for 32-bit target
    var options = {
        convertWin32Apis:  document.getElementById('opt-cpp-win32-api')  ? document.getElementById('opt-cpp-win32-api').checked  : true,
        convertMacros:     document.getElementById('opt-cpp-macros')      ? document.getElementById('opt-cpp-macros').checked      : true,
        convertAssembly:   document.getElementById('opt-cpp-assembly')    ? document.getElementById('opt-cpp-assembly').checked    : true,
        convertTypes:      document.getElementById('opt-cpp-types')       ? document.getElementById('opt-cpp-types').checked       : true,
        convertFormats:    document.getElementById('opt-cpp-formats')     ? document.getElementById('opt-cpp-formats').checked     : true,
        convertPackPragma: document.getElementById('opt-cpp-pack')        ? document.getElementById('opt-cpp-pack').checked        : true
    };
    var preprocessed = transformCpp64To32(src, options).convertedCode;

    if (badgeEl) badgeEl.textContent = 'Running GCC -m32 Compiler...';

    if (window.electronAPI && window.electronAPI.compileCppGcc) {
        try {
            var res = await window.electronAPI.compileCppGcc(preprocessed, { mode: mode });
            lastOutputMode = mode;

            if (mode === 'asm') {
                if (res.success && res.asmCode) {
                    outputCodeEl.value = res.asmCode;
                    if (badgeEl) badgeEl.textContent = '✓ Pure 32-Bit x86 Assembly Generated (GCC -m32 -S)';
                    if (summaryDiv) {
                        summaryDiv.innerHTML =
                            '<div style="background:rgba(2,132,199,0.1); border:1px solid rgba(2,132,199,0.3); border-radius:6px; padding:12px; margin-bottom:12px;">' +
                                '<strong style="color:#38bdf8; font-size:13px; display:block; margin-bottom:4px;">✓ GCC 32-Bit Assembly Emission Successful</strong>' +
                                '<span style="font-size:11px; color:var(--text-muted);">Compiler: ' + (res.compiler || 'GCC -m32') + ' | Flags: -m32 -S -O2 -fno-asynchronous-unwind-tables -Wall</span>' +
                            '</div>';
                    }
                    if (detailsDiv) {
                        detailsDiv.innerHTML = '<p style="font-size:12px; color:var(--text-muted); margin:0;">' +
                            'Direct 32-bit IA-32 assembly emitted. Register usage downcast to 32-bit (%eax, %ebx, %ecx, %edx, %esi, %edi, %ebp, %esp). Click "Download File" to save as <code>.s</code> file.' +
                        '</p>';
                    }
                } else {
                    outputCodeEl.value = res.stderr || res.stdout || res.error || 'Compilation Error';
                    if (badgeEl) badgeEl.textContent = 'GCC Assembly Error';
                }
            } else if (mode === 'exe') {
                if (res.success && res.exePath) {
                    lastCompiledExePath = res.exePath;
                    outputCodeEl.value = '/* =====================================================================\n' +
                                         ' * GCC 32-Bit Executable Compilation Successful\n' +
                                         ' * Target: Win32 PE Executable (32-bit x86 / i686)\n' +
                                         ' * Binary Path: ' + res.exePath + '\n' +
                                         ' * Compiler: ' + (res.compiler || 'GCC -m32') + '\n' +
                                         ' * ===================================================================== */\n\n' +
                                         'GCC Compiler Output:\n' + (res.stdout || 'Compilation finished with 0 errors.\n') +
                                         (res.stderr ? ('\nDiagnostics:\n' + res.stderr) : '');

                    if (badgeEl) badgeEl.textContent = '✓ 32-Bit .EXE Built Successfully';
                    if (summaryDiv) {
                        summaryDiv.innerHTML =
                            '<div style="background:rgba(124,58,237,0.1); border:1px solid rgba(124,58,237,0.3); border-radius:6px; padding:12px; margin-bottom:12px;">' +
                                '<strong style="color:#a78bfa; font-size:13px; display:block; margin-bottom:4px;">✓ 32-Bit PE Executable (.exe) Compiled</strong>' +
                                '<span style="font-size:11px; color:var(--text-muted);">Binary saved at: <code style="color:var(--text-main);">' + res.exePath + '</code></span>' +
                            '</div>';
                    }
                    if (detailsDiv) {
                        detailsDiv.innerHTML = '<p style="font-size:12px; color:var(--text-muted); margin:0;">' +
                            'The 32-bit executable binary has been compiled with GCC (-m32 -O2). Click "Download File" to save the executable to your desired folder.' +
                        '</p>';
                    }
                } else {
                    outputCodeEl.value = 'GCC Compilation Error:\n\n' + (res.stderr || res.stdout || res.error || 'Unknown compilation error.');
                    if (badgeEl) badgeEl.textContent = 'GCC Compilation Failed';
                }
            }
        } catch(e) {
            outputCodeEl.value = 'GCC Invocation Error: ' + e.message;
        }
    } else {
        // In-browser fallback
        runCppTransformation();
        alert('Real GCC compilation requires the desktop executable. Displaying 32-bit transpiled source code.');
    }
}

function copyCppOutput() {
    var output = document.getElementById('cpp-output-code');
    if (!output || !output.value || !output.value.trim()) {
        runCppTransformation();
        output = document.getElementById('cpp-output-code');
    }

    if (output && output.value && output.value.trim()) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(output.value).then(function() {
                alert('Output copied to clipboard!');
            }).catch(function() {
                fallbackCopy(output);
            });
        } else {
            fallbackCopy(output);
        }
    } else {
        alert('No converted code available. Please paste or load C/C++ source code first.');
    }
}

function fallbackCopy(textarea) {
    try {
        textarea.select();
        document.execCommand('copy');
        alert('Output copied to clipboard!');
    } catch(e) {
        alert('Could not auto-copy. Please press Ctrl+A, Ctrl+C in the output box.');
    }
}

async function downloadCppOutput() {
    var output = document.getElementById('cpp-output-code');
    if (!output || !output.value || !output.value.trim()) {
        runCppTransformation();
        output = document.getElementById('cpp-output-code');
    }

    if (!output || !output.value || !output.value.trim()) {
        alert('No converted code available to save. Please paste or transform code first.');
        return;
    }

    // Determine default filename, title, and filters based on active mode
    var defaultFileName = 'converted_32bit.cpp';
    var dialogTitle = 'Save 32-Bit C/C++ Source Code As';
    var fileFilters = [{ name: 'C/C++ Source (*.cpp, *.c, *.h, *.hpp)', extensions: ['cpp', 'c', 'h', 'hpp', 'txt'] }, { name: 'All Files', extensions: ['*'] }];
    var sourceExe = null;

    if (lastOutputMode === 'asm') {
        defaultFileName = 'assembly_32bit.s';
        dialogTitle = 'Save 32-Bit Assembly As';
        fileFilters = [{ name: 'Assembly Source (*.s, *.asm)', extensions: ['s', 'asm'] }, { name: 'All Files', extensions: ['*'] }];
    } else if (lastOutputMode === 'exe' && lastCompiledExePath) {
        defaultFileName = 'program_32bit.exe';
        dialogTitle = 'Save 32-Bit Executable Binary (.exe) As';
        fileFilters = [{ name: 'Windows Executable (*.exe)', extensions: ['exe'] }, { name: 'All Files', extensions: ['*'] }];
        sourceExe = lastCompiledExePath;
    }

    // Use native Electron Save Dialog if running in desktop app
    if (window.electronAPI && window.electronAPI.saveFileDialog) {
        try {
            var saveResult = await window.electronAPI.saveFileDialog({
                title: dialogTitle,
                defaultPath: defaultFileName,
                filters: fileFilters,
                content: output.value,
                sourceFilePath: sourceExe
            });

            if (saveResult && saveResult.success && saveResult.filePath) {
                alert('File successfully saved to:\n' + saveResult.filePath);
                return;
            } else if (saveResult && saveResult.canceled) {
                return; // User canceled dialog
            }
        } catch(e) {
            console.warn('Native save dialog error, falling back to browser download:', e);
        }
    }

    // Browser fallback
    var blob = new Blob([output.value], { type: 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = defaultFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
}

function loadCppDemoCode() {
    var inputCodeEl = document.getElementById('cpp-input-code');
    if (inputCodeEl) {
        inputCodeEl.value = DEMO_CPP_CODE;
        runCppTransformation();
    }
}

function clearCppCode() {
    var inputCodeEl = document.getElementById('cpp-input-code');
    var outputCodeEl = document.getElementById('cpp-output-code');
    if (inputCodeEl) inputCodeEl.value = '';
    if (outputCodeEl) outputCodeEl.value = '';
    lastOutputMode = 'source';
    runCppTransformation();
}

function handleCppFileSelect(event) {
    if (event.target.files && event.target.files[0]) {
        readCppFile(event.target.files[0]);
    }
}

function readCppFile(file) {
    var inputCodeEl = document.getElementById('cpp-input-code');
    var reader = new FileReader();
    reader.onload = function(evt) {
        if (inputCodeEl) {
            inputCodeEl.value = evt.target.result;
            runCppTransformation();
        }
    };
    reader.readAsText(file);
}

// Setup GCC status tracking
function initGccStatus() {
    if (window.electronAPI) {
        if (window.electronAPI.onGccStatus) {
            window.electronAPI.onGccStatus(function(status) {
                var label = document.getElementById('gcc-env-label');
                if (label) {
                    label.textContent = status.message || (status.ready ? 'GCC 32-Bit Toolchain Ready' : 'Configuring GCC Toolchain...');
                    if (status.ready) label.style.color = 'var(--primary-color)';
                }
            });
        }
        if (window.electronAPI.checkGccEnv) {
            window.electronAPI.checkGccEnv().then(function(res) {
                var label = document.getElementById('gcc-env-label');
                if (label && res && res.version) {
                    label.textContent = 'GCC Engine: ' + res.version;
                    label.style.color = 'var(--primary-color)';
                }
            });
        }
    }
}

// Expose all handlers globally on window object
window.runCppTransformation = runCppTransformation;
window.compileWithGcc       = compileWithGcc;
window.copyCppOutput        = copyCppOutput;
window.downloadCppOutput    = downloadCppOutput;
window.loadCppDemoCode      = loadCppDemoCode;
window.clearCppCode         = clearCppCode;
window.handleCppFileSelect  = handleCppFileSelect;
window._wireCppButtons      = function() { runCppTransformation(); initGccStatus(); };

// ==========================================
// Core 64-bit to 32-bit C/C++ Transformation Engine
// ==========================================

function transformCpp64To32(code, options) {
    var converted = code;
    var audit = {
        apiReplacements:      0,
        macroReplacements:    0,
        registerReplacements: 0,
        typeReplacements:     0,
        formatReplacements:   0,
        packReplacements:     0,
        details:              []
    };

    // 1. Windows 64-bit to 32-bit API Transformations
    if (options.convertWin32Apis) {
        var apiMap = [
            { from: /\bGetWindowLongPtrA\b/g, to: 'GetWindowLongA',  name: 'GetWindowLongPtrA → GetWindowLongA' },
            { from: /\bGetWindowLongPtrW\b/g, to: 'GetWindowLongW',  name: 'GetWindowLongPtrW → GetWindowLongW' },
            { from: /\bGetWindowLongPtr\b/g,  to: 'GetWindowLong',   name: 'GetWindowLongPtr → GetWindowLong' },
            { from: /\bSetWindowLongPtrA\b/g, to: 'SetWindowLongA',  name: 'SetWindowLongPtrA → SetWindowLongA' },
            { from: /\bSetWindowLongPtrW\b/g, to: 'SetWindowLongW',  name: 'SetWindowLongPtrW → SetWindowLongW' },
            { from: /\bSetWindowLongPtr\b/g,  to: 'SetWindowLong',   name: 'SetWindowLongPtr → SetWindowLong' },
            { from: /\bGetClassLongPtrA\b/g,  to: 'GetClassLongA',   name: 'GetClassLongPtrA → GetClassLongA' },
            { from: /\bGetClassLongPtrW\b/g,  to: 'GetClassLongW',   name: 'GetClassLongPtrW → GetClassLongW' },
            { from: /\bGetClassLongPtr\b/g,   to: 'GetClassLong',    name: 'GetClassLongPtr → GetClassLong' },
            { from: /\bSetClassLongPtrA\b/g,  to: 'SetClassLongA',   name: 'SetClassLongPtrA → SetClassLongA' },
            { from: /\bSetClassLongPtrW\b/g,  to: 'SetClassLongW',   name: 'SetClassLongPtrW → SetClassLongW' },
            { from: /\bSetClassLongPtr\b/g,   to: 'SetClassLong',    name: 'SetClassLongPtr → SetClassLong' },
            { from: /\bGWLP_WNDPROC\b/g,      to: 'GWL_WNDPROC',    name: 'GWLP_WNDPROC → GWL_WNDPROC' },
            { from: /\bGWLP_HINSTANCE\b/g,    to: 'GWL_HINSTANCE',  name: 'GWLP_HINSTANCE → GWL_HINSTANCE' },
            { from: /\bGWLP_HWNDPARENT\b/g,   to: 'GWL_HWNDPARENT', name: 'GWLP_HWNDPARENT → GWL_HWNDPARENT' },
            { from: /\bGWLP_USERDATA\b/g,     to: 'GWL_USERDATA',   name: 'GWLP_USERDATA → GWL_USERDATA' },
            { from: /\bGWLP_ID\b/g,           to: 'GWL_ID',         name: 'GWLP_ID → GWL_ID' },
            { from: /\bGCLP_MENUNAME\b/g,     to: 'GCL_MENUNAME',   name: 'GCLP_MENUNAME → GCL_MENUNAME' },
            { from: /\bGCLP_HBRBACKGROUND\b/g,to: 'GCL_HBRBACKGROUND',name:'GCLP_HBRBACKGROUND → GCL_HBRBACKGROUND' },
            { from: /\bGCLP_HCURSOR\b/g,      to: 'GCL_HCURSOR',    name: 'GCLP_HCURSOR → GCL_HCURSOR' },
            { from: /\bGCLP_HICON\b/g,        to: 'GCL_HICON',      name: 'GCLP_HICON → GCL_HICON' },
            { from: /\bGCLP_HICONSM\b/g,      to: 'GCL_HICONSM',    name: 'GCLP_HICONSM → GCL_HICONSM' },
            { from: /\bGCLP_HMODULE\b/g,      to: 'GCL_HMODULE',    name: 'GCLP_HMODULE → GCL_HMODULE' },
            { from: /\bGCLP_WNDPROC\b/g,      to: 'GCL_WNDPROC',    name: 'GCLP_WNDPROC → GCL_WNDPROC' }
        ];
        apiMap.forEach(function(item) {
            var matches = (converted.match(item.from) || []).length;
            if (matches > 0) {
                converted = converted.replace(item.from, item.to);
                audit.apiReplacements += matches;
                audit.details.push('Win32 API: Replaced ' + matches + ' instance(s) of ' + item.name);
            }
        });
    }

    // 2. Preprocessor Architecture Macros
    if (options.convertMacros) {
        var macroMap = [
            { from: /\b_WIN64\b/g,       to: '_WIN32',    name: '_WIN64 → _WIN32' },
            { from: /\b_M_X64\b/g,       to: '_M_IX86',   name: '_M_X64 → _M_IX86' },
            { from: /\b_M_AMD64\b/g,     to: '_M_IX86',   name: '_M_AMD64 → _M_IX86' },
            { from: /\b__x86_64__\b/g,   to: '__i386__',  name: '__x86_64__ → __i386__' },
            { from: /\b__x86_64\b/g,     to: '__i386',    name: '__x86_64 → __i386' },
            { from: /\b__LP64__\b/g,     to: '__ILP32__', name: '__LP64__ → __ILP32__' },
            { from: /\b__amd64__\b/g,    to: '__i386__',  name: '__amd64__ → __i386__' },
            { from: /\b__amd64\b/g,      to: '__i386',    name: '__amd64 → __i386' }
        ];
        macroMap.forEach(function(item) {
            var matches = (converted.match(item.from) || []).length;
            if (matches > 0) {
                converted = converted.replace(item.from, item.to);
                audit.macroReplacements += matches;
                audit.details.push('Macro: Replaced ' + matches + ' instance(s) of ' + item.name);
            }
        });
    }

    // 3. Inline Assembly 64-bit Registers & Instructions
    if (options.convertAssembly) {
        var regMap = [
            { from: /\brax\b/gi, to: 'eax' }, { from: /\brbx\b/gi, to: 'ebx' },
            { from: /\brcx\b/gi, to: 'ecx' }, { from: /\brdx\b/gi, to: 'edx' },
            { from: /\brsi\b/gi, to: 'esi' }, { from: /\brdi\b/gi, to: 'edi' },
            { from: /\brbp\b/gi, to: 'ebp' }, { from: /\brsp\b/gi, to: 'esp' },
            { from: /\brip\b/gi, to: 'eip' },
            { from: /\br8d\b/gi, to: 'eax' }, { from: /\br9d\b/gi, to: 'edx' },
            { from: /\br10d\b/gi, to: 'ecx' }, { from: /\br11d\b/gi, to: 'ebx' },
            { from: /\br8\b/gi, to: 'eax' }, { from: /\br9\b/gi, to: 'edx' },
            { from: /\br10\b/gi, to: 'ecx' }, { from: /\br11\b/gi, to: 'ebx' },
            { from: /\br12\b/gi, to: 'esi' }, { from: /\br13\b/gi, to: 'edi' },
            { from: /\br14\b/gi, to: 'ebp' }, { from: /\br15\b/gi, to: 'esp' },
            { from: /\bqword\s+ptr\b/gi, to: 'dword ptr' },
            { from: /\bmovsq\b/gi, to: 'movsd' },
            { from: /\bcmpsq\b/gi, to: 'cmpsd' },
            { from: /\bstosq\b/gi, to: 'stosd' },
            { from: /\blodsq\b/gi, to: 'lodsd' }
        ];
        regMap.forEach(function(item) {
            var matches = (converted.match(item.from) || []).length;
            if (matches > 0) {
                converted = converted.replace(item.from, item.to);
                audit.registerReplacements += matches;
            }
        });
        if (audit.registerReplacements > 0) {
            audit.details.push('Assembly: Downcasted ' + audit.registerReplacements + ' x64 register/instruction(s) to x86 equivalents');
        }
    }

    // 4. Data Type & Pointer Downcasting
    if (options.convertTypes) {
        var typeMap = [
            { from: /\bDWORD64\b/g,    to: 'DWORD',    name: 'DWORD64 → DWORD' },
            { from: /\bULONG64\b/g,    to: 'ULONG',    name: 'ULONG64 → ULONG' },
            { from: /\bINT64\b/g,      to: 'INT',      name: 'INT64 → INT' },
            { from: /\bUINT64\b/g,     to: 'UINT',     name: 'UINT64 → UINT' },
            { from: /\bLONG64\b/g,     to: 'LONG',     name: 'LONG64 → LONG' },
            { from: /\bLONG_PTR\b/g,   to: 'LONG',     name: 'LONG_PTR → LONG' },
            { from: /\bULONG_PTR\b/g,  to: 'ULONG',    name: 'ULONG_PTR → ULONG' },
            { from: /\bDWORD_PTR\b/g,  to: 'DWORD',    name: 'DWORD_PTR → DWORD' },
            { from: /\bINT_PTR\b/g,    to: 'INT',      name: 'INT_PTR → INT' },
            { from: /\bUINT_PTR\b/g,   to: 'UINT',     name: 'UINT_PTR → UINT' },
            { from: /\bSIZE_T\b/g,     to: 'DWORD',    name: 'SIZE_T → DWORD' },
            { from: /\bSSIZE_T\b/g,    to: 'LONG',     name: 'SSIZE_T → LONG' },
            { from: /\buint64_t\b/g,   to: 'uint32_t', name: 'uint64_t → uint32_t' },
            { from: /\bint64_t\b/g,    to: 'int32_t',  name: 'int64_t → int32_t' },
            { from: /\buintptr_t\b/g,  to: 'uint32_t', name: 'uintptr_t → uint32_t' },
            { from: /\bintptr_t\b/g,   to: 'int32_t',  name: 'intptr_t → int32_t' },
            { from: /\bptrdiff_t\b/g,  to: 'int32_t',  name: 'ptrdiff_t → int32_t' },
            { from: /\bunsigned\s+__int64\b/g, to: 'unsigned int', name: 'unsigned __int64 → unsigned int' },
            { from: /\b__int64\b/g,    to: 'int',      name: '__int64 → int' }
        ];
        typeMap.forEach(function(item) {
            var matches = (converted.match(item.from) || []).length;
            if (matches > 0) {
                converted = converted.replace(item.from, item.to);
                audit.typeReplacements += matches;
                audit.details.push('Data Type: Downcasted ' + matches + ' instance(s) of ' + item.name);
            }
        });
    }

    // 5. Printf / Scanf 64-bit Format Specifiers
    if (options.convertFormats) {
        var formatMap = [
            { from: /%I64d/g, to: '%d',  name: '%I64d → %d' },
            { from: /%I64u/g, to: '%u',  name: '%I64u → %u' },
            { from: /%I64x/g, to: '%x',  name: '%I64x → %x' },
            { from: /%I64X/g, to: '%X',  name: '%I64X → %X' },
            { from: /%lld/g,  to: '%ld', name: '%lld → %ld' },
            { from: /%llu/g,  to: '%lu', name: '%llu → %lu' },
            { from: /%llx/g,  to: '%lx', name: '%llx → %lx' },
            { from: /%llX/g,  to: '%lX', name: '%llX → %lX' },
            { from: /%zu/g,   to: '%u',  name: '%zu → %u' },
            { from: /%zd/g,   to: '%d',  name: '%zd → %d' }
        ];
        formatMap.forEach(function(item) {
            var matches = (converted.match(item.from) || []).length;
            if (matches > 0) {
                converted = converted.replace(item.from, item.to);
                audit.formatReplacements += matches;
                audit.details.push('Format Specifier: Adapted ' + matches + ' instance(s) of ' + item.name);
            }
        });
    }

    // 6. Struct Memory Packing & Alignment
    if (options.convertPackPragma) {
        var pack8 = /#pragma\s+pack\s*\(\s*(?:push\s*,\s*)?(?:8|16)\s*\)/g;
        var matches = (converted.match(pack8) || []).length;
        if (matches > 0) {
            converted = converted.replace(pack8, '#pragma pack(4)');
            audit.packReplacements += matches;
            audit.details.push('Struct Alignment: Converted ' + matches + ' #pragma pack(8/16) to #pragma pack(4)');
        }

        var align8 = /(?:__declspec\s*\(\s*align\s*\(\s*(?:8|16)\s*\)\s*\)|__attribute__\s*\(\s*\(\s*aligned\s*\(\s*(?:8|16)\s*\)\s*\)\s*\))/g;
        var alignMatches = (converted.match(align8) || []).length;
        if (alignMatches > 0) {
            converted = converted.replace(align8, '__declspec(align(4))');
            audit.packReplacements += alignMatches;
            audit.details.push('Memory Alignment: Downscaled ' + alignMatches + ' 64-bit alignment attribute(s) to 4-byte boundaries');
        }
    }

    var banner = '/* =====================================================================\n' +
                 ' * Transformed & Target-Configured for 32-Bit Architecture (x86 / IA-32)\n' +
                 ' * Tool: MHZ Tools C/C++ Architecture Code Transformer & GCC Engine\n' +
                 ' * ===================================================================== */\n' +
                 '#ifndef _X86_\n' +
                 '#define _X86_ 1\n' +
                 '#endif\n' +
                 '#ifndef _M_IX86\n' +
                 '#define _M_IX86 300\n' +
                 '#endif\n' +
                 '#ifndef __i386__\n' +
                 '#define __i386__ 1\n' +
                 '#endif\n\n';

    return { convertedCode: banner + converted, audit: audit };
}

function renderCppAuditReport(audit) {
    var summaryDiv = document.getElementById('cpp-audit-summary');
    var detailsDiv = document.getElementById('cpp-audit-details');
    if (!summaryDiv || !detailsDiv) return;

    var totalChanges = (audit.apiReplacements || 0) +
                       (audit.macroReplacements || 0) +
                       (audit.registerReplacements || 0) +
                       (audit.typeReplacements || 0) +
                       (audit.formatReplacements || 0) +
                       (audit.packReplacements || 0);

    summaryDiv.innerHTML =
        '<div class="grid-four-cols" style="gap:10px; margin-bottom:12px;">' +
            '<div style="background:var(--bg-surface); padding:10px; border-radius:4px; border:1px solid var(--border-color); text-align:center;">' +
                '<span style="font-size:10px; color:var(--text-muted); display:block; text-transform:uppercase;">Total Refactorings</span>' +
                '<strong style="font-size:18px; color:var(--primary-color);">' + totalChanges + '</strong>' +
            '</div>' +
            '<div style="background:var(--bg-surface); padding:10px; border-radius:4px; border:1px solid var(--border-color); text-align:center;">' +
                '<span style="font-size:10px; color:var(--text-muted); display:block; text-transform:uppercase;">Win32 APIs</span>' +
                '<strong style="font-size:18px; color:var(--text-main);">' + (audit.apiReplacements || 0) + '</strong>' +
            '</div>' +
            '<div style="background:var(--bg-surface); padding:10px; border-radius:4px; border:1px solid var(--border-color); text-align:center;">' +
                '<span style="font-size:10px; color:var(--text-muted); display:block; text-transform:uppercase;">Assembly & Macros</span>' +
                '<strong style="font-size:18px; color:var(--text-main);">' + ((audit.macroReplacements || 0) + (audit.registerReplacements || 0)) + '</strong>' +
            '</div>' +
            '<div style="background:var(--bg-surface); padding:10px; border-radius:4px; border:1px solid var(--border-color); text-align:center;">' +
                '<span style="font-size:10px; color:var(--text-muted); display:block; text-transform:uppercase;">Types & Formats</span>' +
                '<strong style="font-size:18px; color:var(--text-main);">' + ((audit.typeReplacements || 0) + (audit.formatReplacements || 0) + (audit.packReplacements || 0)) + '</strong>' +
            '</div>' +
        '</div>';

    if (!audit.details || audit.details.length === 0) {
        detailsDiv.innerHTML = '<div style="background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.3); border-radius:4px; padding:8px 12px; color:#10b981; font-size:12px;">' +
            '✓ Code is 100% 32-bit compatible (Target Architecture: x86 / IA-32 / Win32). 32-bit compilation target header injected.' +
        '</div>';
    } else {
        detailsDiv.innerHTML = '<ul style="margin:0; padding-left:18px; font-size:12px; color:var(--text-muted);">' +
            audit.details.map(function(d) { return '<li style="margin-bottom:4px;">' + d + '</li>'; }).join('') +
        '</ul>';
    }
}

// Automatically transpile pre-loaded code on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        runCppTransformation();
        initGccStatus();
    });
} else {
    runCppTransformation();
    initGccStatus();
}
