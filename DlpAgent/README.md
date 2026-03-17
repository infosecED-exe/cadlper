# CADLPER

Cadlper is a browser-based monitoring solution that combines a Chrome extension with a Windows native messaging host.

The extension captures selected browser activity such as copy, paste, cut, page navigation, and file selection.
The native host processes these events and stores them locally in structured JSONL format.

---

## Architecture

Chrome Extension
→ Background Service Worker
→ Native Messaging
→ `host.exe`
→ Local JSON logs

---

## Features

* Page open monitoring
* Copy / paste / cut detection
* File selection monitoring
* Pattern-based content inspection
* Native messaging integration
* Local JSONL logging
* Per-user installation (no admin required)

---

## Repository Structure

```
DlpAgent/
├─ extension/
│  ├─ manifest.json
│  ├─ background.js
│  ├─ content.js
│  └─ popup.html
├─ native-host/
│  └─ host.exe
├─ install.ps1
├─ install.cmd
├─ uninstall.ps1
└─ README.md
```

---

## Requirements

* Windows OS
* Google Chrome
* PowerShell
* Chrome extension (Web Store or unpacked)

---

## Installation Modes

### 1. Chrome Web Store (Recommended)

1. Install the extension from Chrome Web Store
2. Open `chrome://extensions`
3. Copy your extension ID
4. Run:

```
Set-ExecutionPolicy -Scope Process Bypass
.\install.ps1 -ExtensionId "YOUR_EXTENSION_ID"
```

---

### 2. Load Unpacked (Development / Testing)

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `extension/` folder
5. Copy the generated extension ID
6. Run:

```
Set-ExecutionPolicy -Scope Process Bypass
.\install.ps1 -ExtensionId "GENERATED_ID"
```

> Note: Unpacked extension IDs may change. If the ID changes, rerun the installer.

---

## What the Installer Does

The installer:

* Creates `%LOCALAPPDATA%\DlpAgent`
* Copies `host.exe`
* Creates native messaging manifest
* Registers Chrome native host (HKCU)
* Links extension via `allowed_origins`

---

## Installed Paths

```
%LOCALAPPDATA%\DlpAgent\
├─ native-host\
│  ├─ host.exe
│  └─ com.dlp.agent.json
└─ logs\
   ├─ events.jsonl
   └─ host-error.log
```

---

## Usage

After installation:

1. Restart Chrome
2. Open `chrome://extensions`
3. Open extension service worker console
4. Perform actions (copy, paste, upload)
5. Check logs

---

## Log Output

Logs are stored in JSONL format:

```
%LOCALAPPDATA%\DlpAgent\logs\events.jsonl
```

Example:

```json
{
  "ts": "2026-03-17T10:15:00Z",
  "device": "PC01",
  "user": "john",
  "event": "paste_detected",
  "rule": "paste_monitor",
  "domain": "example.com",
  "url": "https://example.com",
  "title": "Example",
  "session_id": "...",
  "extra": {
    "text": "sample data",
    "text_length": 11,
    "matches": []
  }
}
```

---

## Troubleshooting

### No logs generated

* Ensure extension is installed
* Check correct Extension ID
* Restart Chrome
* Verify registry:

```
reg query HKCU\Software\Google\Chrome\NativeMessagingHosts\com.dlp.agent
```

---

### Native host not connecting

* Check `allowed_origins` matches extension ID
* Ensure `host.exe` exists
* Verify manifest path

---

### Check error logs

```
%LOCALAPPDATA%\DlpAgent\logs\host-error.log
```

---

### Antivirus blocking

* Add exclusion for `host.exe`
* Use signed binary (recommended for production)

---

## ZIP Usage

If downloaded as ZIP:

1. Extract fully
2. Do NOT run from inside ZIP
3. Run `install.cmd`

Correct structure:

```
DlpAgent/
├─ install.ps1
├─ install.cmd
├─ native-host/
│  └─ host.exe
```

---

## Uninstall

```
.\uninstall.ps1
```

---

## Security & Compliance

This project monitors browser activity and may capture clipboard content.

Use only in authorized environments and ensure compliance with:

* Company policies
* Privacy regulations
* Local laws

---

## Notes

* Works per-user (no admin required)
* Uses `LOCALAPPDATA`
* Portable across systems
* Compatible with enterprise deployment models

---

## Future Improvements

* Central log shipping (ELK / API)
* Windows service mode
* Signed binaries
* Policy-based deployment (GPO)

---

## License

Private / Internal Use
