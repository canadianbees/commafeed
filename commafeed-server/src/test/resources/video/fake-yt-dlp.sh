#!/bin/sh
# Fake yt-dlp used by tests: writes a small file to the -o path.
# Video ids starting with "fail" exit with an error, ids starting with "slow" hang,
# ids starting with "prog" report 50% video progress then hang.
output=""
url=""
info=""
while [ $# -gt 0 ]; do
    case "$1" in
        -o) output="$2"; shift ;;
        --dump-single-json) info="yes" ;;
        https://*) url="$1" ;;
    esac
    shift
done

# metadata request: print the video details as json instead of downloading
if [ -n "$info" ]; then
    case "$url" in
        *v=fail*) echo "ERROR: [youtube] Private video" >&2 ; exit 1 ;;
    esac
    printf '%s' '{"id":"test","description":"How the light was set up.\nGear: https://example.com/gear","duration":1531.0,"chapters":[{"start_time":0.0,"end_time":60.0,"title":"Intro"},{"start_time":60.0,"end_time":1531.0,"title":"Setup"}],"formats":[]}'
    exit 0
fi

case "$url" in
    *v=fail*) echo "ERROR: [youtube] Private video" ; exit 1 ;;
    *v=slow*) sleep 30 ;;
    *v=prog*) echo "CFPROGRESS|avc1.640028|500|1000|NA|2048.5|12" ; sleep 30 ;;
esac

echo "[download] Destination: video.f137.mp4"
echo "CFPROGRESS|avc1.640028|1000|1000|NA|2048.5|0"
echo "CFPROGRESS|none|200|NA|400|1024.0|1"
echo "[Merger] Merging formats into \"video.mp4\""

file=$(echo "$output" | sed 's/%(ext)s/mp4/')
printf '0123456789' > "$file"
