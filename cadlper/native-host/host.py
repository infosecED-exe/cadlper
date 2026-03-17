import sys
import json
import struct
import os
import socket
import getpass
from datetime import datetime

BASE_DIR = os.environ.get("LOCALAPPDATA") or os.path.expanduser("~")
APP_DIR = os.path.join(BASE_DIR, "DlpAgent")
LOG_DIR = os.path.join(APP_DIR, "logs")

LOG_FILE = os.path.join(LOG_DIR, "events.jsonl")
ERR_FILE = os.path.join(LOG_DIR, "host-error.log")


def ensure_dir():
    os.makedirs(LOG_DIR, exist_ok=True)


def log_error(text):
    ensure_dir()
    with open(ERR_FILE, "a", encoding="utf-8") as f:
        f.write(f"[{datetime.utcnow().isoformat()}] {text}\n")


def clean(v):
    if v is None:
        return ""
    return str(v).replace("\n", " ").replace("\r", " ")


def read_message():
    if sys.stdin is None or not hasattr(sys.stdin, "buffer"):
        raise RuntimeError("stdin unavailable")

    raw_length = sys.stdin.buffer.read(4)
    if not raw_length:
        return None

    if len(raw_length) != 4:
        raise RuntimeError(f"invalid message length header: {len(raw_length)} bytes")

    message_length = struct.unpack("<I", raw_length)[0]
    message_bytes = sys.stdin.buffer.read(message_length)

    if len(message_bytes) != message_length:
        raise RuntimeError(
            f"incomplete message body: expected {message_length}, got {len(message_bytes)}"
        )

    return json.loads(message_bytes.decode("utf-8"))


def send_message(msg):
    if sys.stdout is None or not hasattr(sys.stdout, "buffer"):
        raise RuntimeError("stdout unavailable")

    encoded = json.dumps(msg, ensure_ascii=False).encode("utf-8")
    sys.stdout.buffer.write(struct.pack("<I", len(encoded)))
    sys.stdout.buffer.write(encoded)
    sys.stdout.buffer.flush()


def write_log(msg):
    ensure_dir()

    ts = datetime.utcnow().isoformat()
    device = socket.gethostname()
    user = getpass.getuser()

    log_entry = {
        "ts": ts,
        "device": device,
        "user": user,
        "event": clean(msg.get("event")),
        "rule": clean(msg.get("rule")),
        "domain": clean(msg.get("domain")),
        "url": clean(msg.get("url")),
        "title": clean(msg.get("title")),
        "session_id": clean(msg.get("session_id")),
        "frame_url": clean(msg.get("frame_url")),
        "extra": msg.get("extra", {})
    }

    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(json.dumps(log_entry, ensure_ascii=False) + "\n")


def main():
    try:
        ensure_dir()

        while True:
            msg = read_message()
            if msg is None:
                break

            try:
                write_log(msg)
                send_message({
                    "status": "ok",
                    "log_file": LOG_FILE
                })
            except Exception as e:
                log_error(f"write/send error: {repr(e)}")
                try:
                    send_message({"status": "error", "error": str(e)})
                except Exception as inner:
                    log_error(f"send error response failed: {repr(inner)}")
                    break
    except Exception as e:
        log_error(f"fatal error: {repr(e)}")


if __name__ == "__main__":
    main()