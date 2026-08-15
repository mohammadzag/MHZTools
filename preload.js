const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    runPythonAnalysis: (cmd, data, params) => ipcRenderer.invoke('run-python-analysis', { cmd, data, params }),
    checkPythonEnv: () => ipcRenderer.invoke('check-python-env'),
    onPythonStatus: (callback) => ipcRenderer.on('python-env-status', (event, status) => callback(status)),
    openChartWindow: (title, imageData) => ipcRenderer.invoke('open-chart-window', { title, imageData }),
    openPlotlyWindow: (title, chartConfig) => ipcRenderer.invoke('open-plotly-window', { title, chartConfig }),
    compileCppGcc: (code, options) => ipcRenderer.invoke('compile-cpp-gcc', { code, options }),
    checkGccEnv: () => ipcRenderer.invoke('check-gcc-env'),
    onGccStatus: (callback) => ipcRenderer.on('gcc-env-status', (event, status) => callback(status)),
    saveFileDialog: (options) => ipcRenderer.invoke('save-file-dialog', options)
});
